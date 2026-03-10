import re

with open("components/GCodeViewer.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Modify the WebGLRenderer initialization to strictly enforce GPU preference
old_renderer = """const renderer = new THREE.WebGLRenderer({
            canvas: offscreenCanvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          });"""

new_renderer = """const renderer = new THREE.WebGLRenderer({
            canvas: offscreenCanvas,
            antialias: false, // Turn off antialias to speed up rendering significantly
            alpha: false,
            powerPreference: gpuPreference, // Use the user's selected GPU preference
            failIfMajorPerformanceCaveat: false, // Don't crash if it falls back, but let's try our best
            precision: "lowp" // Speed over pixel-perfect precision
          });"""

content = content.replace(old_renderer, new_renderer)

with open("components/GCodeViewer.tsx", "w", encoding="utf-8") as f:
    f.write(content)

