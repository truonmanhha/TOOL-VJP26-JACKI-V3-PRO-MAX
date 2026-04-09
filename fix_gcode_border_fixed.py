import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make it completely fixed to the screen edges, just like NestingAXApp
# NestingAXApp uses fixed (we had changed to absolute to "hug the container")
# The user wants it to hug the screen edges, like NestingAXApp.
# Let's revert back to `fixed` so it attaches to the window edges with no gap.
block_start = "{showBorderFlash && ("
block_end = "        )}"
start_idx = content.find(block_start)
end_idx = content.find(block_end, start_idx) + len(block_end)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    new_block = old_block.replace('className="absolute ', 'className="fixed ')
    new_block = new_block.replace('z-[90]', 'z-[10000]')
    new_block = new_block.replace('z-[80]', 'z-[9998]')
    content = content[:start_idx] + new_block + content[end_idx:]

with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Reverted to fixed positioning for edge-to-edge border flash.")
