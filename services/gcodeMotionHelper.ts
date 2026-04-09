import * as THREE from 'three';
import { GCodeCommand } from '@/types';

export interface MotionState {
  index: number;
  progress: number;
  lastTime: number;
}

export interface MotionResult {
  newIndex: number;
  newProgress: number;
  elapsedDelta: number;
  position: THREE.Vector3;
  isFinished: boolean;
}

/**
 * Calculates the next motion state based on current state, delta time, and commands.
 * Shared between realtime playback and video rendering for motion parity.
 *
 * @param state Current simulation state
 * @param commands Array of GCode commands
 * @param delta Time step in seconds
 * @param playbackSpeed Speed multiplier
 * @returns Resulting motion state and position
 */
export function advanceMotion(
  state: MotionState,
  commands: GCodeCommand[],
  delta: number,
  playbackSpeed: number
): MotionResult {
  if (!commands || commands.length === 0) {
    return {
      newIndex: 0,
      newProgress: 0,
      elapsedDelta: 0,
      position: new THREE.Vector3(),
      isFinished: true
    };
  }

  let { index: tempIndex, progress: tempProgress } = state;
  let elapsedDelta = 0;
  
  if (tempIndex >= commands.length - 1) {
    const last = commands[commands.length - 1];
    return {
      newIndex: commands.length - 1,
      newProgress: 0,
      elapsedDelta: 0,
      position: new THREE.Vector3(last.x, last.y, last.z),
      isFinished: true
    };
  }

  const currentCmd = commands[tempIndex];
  // G0 commands move at rapid machine traverse speed, usually much faster than any cutting feed
  const isRapid = currentCmd.type === 'G0';
  const currentFeed = isRapid ? 30000 : (currentCmd.f || 1000);
  let travelDist = (currentFeed / 60) * playbackSpeed * delta;
  const pos = new THREE.Vector3();
  
  if (travelDist === 0) {
    // If we have some progress on the current segment, we must preserve the interpolated position
    if (tempProgress > 0 && tempIndex < commands.length - 1) {
      const c1 = commands[tempIndex];
      const c2 = commands[tempIndex + 1];
      const p1 = new THREE.Vector3(c1.x, c1.y, c1.z);
      const p2 = new THREE.Vector3(c2.x, c2.y, c2.z);
      pos.lerpVectors(p1, p2, tempProgress);
    } else {
      const c = commands[tempIndex];
      pos.set(c.x, c.y, c.z);
    }
    
    return {
      newIndex: tempIndex,
      newProgress: tempProgress,
      elapsedDelta: 0,
      position: pos,
      isFinished: false
    };
  }

  // Pre-calculate segments if needed for extreme speeds, or just skip very fast
  while (travelDist > 0 && tempIndex < commands.length - 1) {
    const c1 = commands[tempIndex];
    const c2 = commands[tempIndex + 1];
    
    // Fast path for distance
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const dz = c2.z - c1.z;
    const segLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    const remainingOnSeg = segLen * (1 - tempProgress);

    if (travelDist >= remainingOnSeg) {
      travelDist -= remainingOnSeg;
      tempIndex++;
      tempProgress = 0;
      
      // If speed is extremely high, we might skip hundreds of segments per frame.
      // Prevent CPU stall if travelDist is astronomically high by jumping chunks.
      if (travelDist > segLen * 10) {
        // Fast-forward
        while(travelDist > 0 && tempIndex < commands.length - 1) {
          const skip1 = commands[tempIndex];
          const skip2 = commands[tempIndex+1];
          
          const dxS = skip2.x - skip1.x;
          const dyS = skip2.y - skip1.y;
          const dzS = skip2.z - skip1.z;
          const sLen = Math.sqrt(dxS*dxS + dyS*dyS + dzS*dzS);
             
          if (travelDist >= sLen) {
            travelDist -= sLen;
            tempIndex++;
            // MUST accumulate elapsedDelta when we skip!
            
            // Recalculate feed for skipped segments correctly in case we skipped a G0 vs G1
            const skipIsRapid = skip1.type === 'G0';
            const skipFeed = skipIsRapid ? 30000 : (skip1.f || 1000);
            elapsedDelta += delta * (sLen / ((skipFeed / 60) * playbackSpeed * delta));

          } else {
            break;
          }
        }
      }
      
    } else {
      const safeLen = segLen > 0.00001 ? segLen : 0.00001;
      tempProgress += travelDist / safeLen;
      travelDist = 0;
      
      pos.set(
        c1.x + dx * tempProgress,
        c1.y + dy * tempProgress,
        c1.z + dz * tempProgress
      );
    }
  }

  const isFinished = tempIndex >= commands.length - 1;
  if (isFinished) {
    const last = commands[commands.length - 1];
    pos.set(last.x, last.y, last.z);
  } else if (travelDist > 0) {
    // Edge case: if loop exits but we didn't calculate pos yet
    const c = commands[tempIndex];
    pos.set(c.x, c.y, c.z);
  }

  return {
    newIndex: tempIndex,
    newProgress: tempProgress,
    elapsedDelta,
    position: pos,
    isFinished
  };
}
