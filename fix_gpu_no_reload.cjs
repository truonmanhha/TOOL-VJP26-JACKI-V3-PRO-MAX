const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// 1. Remove window.location.reload() from the buttons
content = content.replace(/window\.location\.reload\(\);\s*/g, '');

// 2. Give the Canvas a key so it remounts when gpuPreference changes
// Search for <Canvas camera={{ position: [100, -100, 100], fov: 45, far: 100000, near: 0.1 }}
// Add key={gpuPreference} to it.

content = content.replace(
  /<Canvas camera=\{\{ position:/g,
  '<Canvas key={gpuPreference} camera={{ position:'
);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Fixed reload and added Canvas key');
