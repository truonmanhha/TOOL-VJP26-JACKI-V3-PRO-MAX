import re

with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

in_func = False
for i, line in enumerate(lines):
    if "const handleSendReport = async () => {" in line:
        in_func = True
    if in_func and "alert" in line:
        print(f"Line {i+1}: {line.strip()}")
    if in_func and i > 1560:
        break
