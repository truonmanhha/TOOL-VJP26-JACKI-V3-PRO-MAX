with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "const handleSendReport = async () => {" in line:
        start_idx = i
    if start_idx != -1 and i > start_idx:
        if "};" in line and len(line.strip()) == 2:
            end_idx = i
            break

if start_idx != -1 and end_idx != -1:
    print("".join(lines[start_idx:end_idx+1]))
