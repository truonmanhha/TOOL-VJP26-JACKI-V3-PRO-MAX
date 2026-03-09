import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Let's read exactly the rest of the handleSendReport function.
block_start = "const encConfig ="
start_idx = content.find(block_start)
end_idx = content.find("const handleContentChange", start_idx)

if start_idx != -1 and end_idx != -1:
    print(content[start_idx:end_idx])

