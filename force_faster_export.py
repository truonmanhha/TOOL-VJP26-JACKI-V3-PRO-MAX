import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Make sure it actually hits the new fast logic 
# and give it a hint about what export Config returns
log_inject_new = """    const exportConfig = getExportConfig(speedSliderVal);
    console.log('[Export] Policy determined:', exportConfig);
    // FORCE High Speed if they are at max
    if (speedSliderVal >= 90) {
       exportConfig.playbackSpeed = 100000; // Ultra instinct
    }
"""

content = content.replace("""    const exportConfig = getExportConfig(speedSliderVal);
    console.log('[Export] Policy determined:', exportConfig);""", log_inject_new)

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)
