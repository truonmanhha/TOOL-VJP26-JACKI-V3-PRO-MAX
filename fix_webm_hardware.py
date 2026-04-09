import re

with open("services/WebMEncoder.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Force WebCodecs to use hardware acceleration if available
old_hw = "hardwareAcceleration: 'no-preference',"
new_hw = "hardwareAcceleration: 'prefer-hardware', // Force GPU encode"

content = content.replace(old_hw, new_hw)

with open("services/WebMEncoder.ts", "w", encoding="utf-8") as f:
    f.write(content)
