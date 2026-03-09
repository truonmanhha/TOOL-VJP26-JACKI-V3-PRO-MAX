with open('components/GCodeViewer.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
if "createPortal" in c:
    print("createPortal found in file")
else:
    print("createPortal missing in file")
