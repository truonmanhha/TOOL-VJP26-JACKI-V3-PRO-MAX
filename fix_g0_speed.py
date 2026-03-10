import re

with open("services/gcodeMotionHelper.ts", "r", encoding="utf-8") as f:
    content = f.read()

# G0 is a rapid move. In CNC, rapid moves ignore feed rate (F) and move at maximum machine velocity.
# The current code says: const currentFeed = currentCmd.f || 1000;
# This means if it's a G0 without an F word (which is normal), it falls back to 1000 mm/min.
# Real CNC machines do G0 at 20000 - 60000 mm/min!
# We should boost G0 speed drastically so it doesn't drag the simulation time down.

old_feed = "const currentFeed = currentCmd.f || 1000;"
new_feed = """// G0 commands move at rapid machine traverse speed, usually much faster than any cutting feed
  const isRapid = currentCmd.type === 'G0';
  const currentFeed = isRapid ? 30000 : (currentCmd.f || 1000);"""

content = content.replace(old_feed, new_feed)

with open("services/gcodeMotionHelper.ts", "w", encoding="utf-8") as f:
    f.write(content)
