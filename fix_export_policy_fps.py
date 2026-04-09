import re

with open("services/exportPolicy.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Change max fps from 90/60 to 50
content = content.replace("const BASE_EXPORT_FPS = 60;", "const BASE_EXPORT_FPS = 30;")
content = content.replace("const MAX_EXPORT_FPS = 90;", "const MAX_EXPORT_FPS = 50;")
content = content.replace("const MIN_FAST_FPS = 30;", "const MIN_FAST_FPS = 15;")

with open("services/exportPolicy.ts", "w", encoding="utf-8") as f:
    f.write(content)
