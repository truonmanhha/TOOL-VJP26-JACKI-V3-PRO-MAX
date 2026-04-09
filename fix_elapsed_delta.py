import re

with open("services/gcodeMotionHelper.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure elapsedDelta is properly taking the rapid speed into account during fast forward
old_elapsed = "elapsedDelta += delta * (sLen / ((currentFeed / 60) * playbackSpeed * delta));"

new_elapsed = """
            // Recalculate feed for skipped segments correctly in case we skipped a G0 vs G1
            const skipIsRapid = skip1.type === 'G0';
            const skipFeed = skipIsRapid ? 30000 : (skip1.f || 1000);
            elapsedDelta += delta * (sLen / ((skipFeed / 60) * playbackSpeed * delta));
"""

content = content.replace(old_elapsed, new_elapsed)

with open("services/gcodeMotionHelper.ts", "w", encoding="utf-8") as f:
    f.write(content)
