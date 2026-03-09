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
  const currentFeed = currentCmd.f || 1000;
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

  while (travelDist > 0 && tempIndex < commands.length - 1) {
    const c1 = commands[tempIndex];
    const c2 = commands[tempIndex + 1];
    
    // Calculate segment length
    const segLen = Math.sqrt(
      Math.pow(c2.x - c1.x, 2) + 
      Math.pow(c2.y - c1.y, 2) + 
      Math.pow(c2.z - c1.z, 2)
    );
    
    const remainingOnSeg = segLen * (1 - tempProgress);

    if (travelDist >= remainingOnSeg) {
      travelDist -= remainingOnSeg;
      tempIndex++;
      tempProgress = 0;
      elapsedDelta += delta; // Accumulate time spent
    } else {
      const safeLen = segLen > 0.00001 ? segLen : 0.00001;
      tempProgress += travelDist / safeLen;
      travelDist = 0;
      
      const p1 = new THREE.Vector3(c1.x, c1.y, c1.z);
      const p2 = new THREE.Vector3(c2.x, c2.y, c2.z);
      pos.lerpVectors(p1, p2, tempProgress);
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
