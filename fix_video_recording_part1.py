import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's check how WebMWriter is imported or used.
matches = re.findall(r"WebMWriter|webm-wasm", content, re.IGNORECASE)
print(f"WebMWriter references: {matches}")

# Let's see the dependencies in package.json
