import re

with open("services/gcodeMotionHelper.ts", "r", encoding="utf-8") as f:
    content = f.read()

# While loop is slow if travelDist is huge compared to segLen.
# For high speeds, travelDist can be way larger than a segment, forcing thousands of while loop iterations
# per frame, which grinds the CPU to a halt. We must skip them fast.

old_while = """  while (travelDist > 0 && tempIndex < commands.length - 1) {
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
  }"""

new_while = """  // Pre-calculate segments if needed for extreme speeds, or just skip very fast
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
      if (travelDist > segLen * 1000) {
        // Fast-forward
        while(travelDist > 0 && tempIndex < commands.length - 1) {
          const skip1 = commands[tempIndex];
          const skip2 = commands[tempIndex+1];
          const sLen = Math.sqrt(
             Math.pow(skip2.x - skip1.x, 2) + 
             Math.pow(skip2.y - skip1.y, 2) + 
             Math.pow(skip2.z - skip1.z, 2)
          );
          if (travelDist >= sLen) {
            travelDist -= sLen;
            tempIndex++;
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
  }"""

content = content.replace(old_while, new_while)

with open("services/gcodeMotionHelper.ts", "w", encoding="utf-8") as f:
    f.write(content)
