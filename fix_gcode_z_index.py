import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure z-[10000] is z-[10] for absolute (relative to container) so it doesn't overlap weirdly
block_start = "{showBorderFlash && ("
block_end = "        )}"
start_idx = content.find(block_start)
end_idx = content.find(block_end, start_idx) + len(block_end)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    new_block = old_block.replace('z-[10000]', 'z-[90]')
    new_block = new_block.replace('z-[9998]', 'z-[80]')
    content = content[:start_idx] + new_block + content[end_idx:]

with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed z-index.")
