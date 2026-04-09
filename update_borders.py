import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace fixed with absolute in the border flash block
block_start = "{showBorderFlash && ("
block_end = "        )}"
start_idx = content.find(block_start)
end_idx = content.find(block_end, start_idx) + len(block_end)

if start_idx != -1 and end_idx != -1:
    old_block = content[start_idx:end_idx]
    new_block = old_block.replace('className="fixed ', 'className="absolute ')
    content = content[:start_idx] + new_block + content[end_idx:]

# Add relative to the workspaceRef container if it's not there
old_div = "<div ref={workspaceRef} className={`flex flex-col gap-0 w-full  ${isWorkspaceLocked ? 'fixed inset-0 z-[9999] bg-[#0f1419] h-screen' : 'h-[calc(100vh-140px)] min-h-[900px]'}`}>"
new_div = "<div ref={workspaceRef} className={`flex flex-col gap-0 w-full  ${isWorkspaceLocked ? 'fixed inset-0 z-[9999] bg-[#0f1419] h-screen' : 'relative h-[calc(100vh-140px)] min-h-[900px]'}`}>"

content = content.replace(old_div, new_div)

with open('components/GCodeViewer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated border positioning.")
