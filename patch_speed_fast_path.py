import re

with open("services/gcodeMotionHelper.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Current Fast-Forward condition might never be hit: `travelDist > segLen * 1000`
# Also, currentFeed is originally in mm/min, so travelDist = (currentFeed / 60) * playbackSpeed * delta.
# If playbackSpeed is 50000, travelDist = (1000/60) * 50000 * (1/50) = 16,666 mm per frame!
# But segLen might be 5mm. segLen * 1000 = 5000mm.
# The fast forward loop subtracts `sLen` but does not add anything to `elapsedDelta`!
# This is a huge bug in the motion helper, making it skip calculating elapsedDelta.

# Second problem: If playbackSpeed is insanely high, we shouldn't even step through it, we should just leap.

old_while = """      // If speed is extremely high, we might skip hundreds of segments per frame.
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
      }"""

new_while = """      // If speed is extremely high, we might skip hundreds of segments per frame.
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
            elapsedDelta += delta * (sLen / ((currentFeed / 60) * playbackSpeed * delta));
          } else {
            break;
          }
        }
      }"""

content = content.replace(old_while, new_while)

with open("services/gcodeMotionHelper.ts", "w", encoding="utf-8") as f:
    f.write(content)

