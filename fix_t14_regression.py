with open('components/GCodeViewer.tsx', 'r') as f:
    content = f.read()

assert 'const [is3DFullScreen, setIs3DFullScreen]' in content, "Missing is3DFullScreen state"
assert 'createPortal' in content, "Missing createPortal"
assert 'is3DFullScreen && createPortal' in content, "Missing fullscreen render logic"
assert 'toggleFullScreen' in content, "Missing toggle logic"

print("Regression checks passed: Fullscreen logic intact")
