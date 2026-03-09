import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# WebM-muxer uses ArrayBufferTarget, let's see how muxer is configured:
match = re.search(r"(const muxer = new Muxer.*?)(?=\n\n|\r\n\r\n|//)", content, re.DOTALL | re.MULTILINE)
if match:
    print(match.group(1)[:500])
else:
    print("Muxer definition not found easily")

