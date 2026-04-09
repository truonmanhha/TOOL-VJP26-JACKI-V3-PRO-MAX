import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure we're actually picking up the fast path speed configs
# Let's add a debug log in handleVideoExport

log_inject = """    const exportConfig = getExportConfig(speedSliderVal);
    console.log('[Export] Policy determined:', exportConfig);"""

content = content.replace("const exportConfig = getExportConfig(speedSliderVal);", log_inject)

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)
