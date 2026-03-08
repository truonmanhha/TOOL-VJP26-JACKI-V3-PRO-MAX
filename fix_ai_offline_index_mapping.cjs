const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const oldMapping = `const cmdIndex = Math.floor((i / numFrames) * commands.length);`;
const newMapping = `// Since GCode moves at different speeds, linearly interpolating index isn't 100% accurate, 
                      // but for offline rendering this creates a smooth 0-100% path timeline without skipping edges.
                      const cmdIndex = Math.min(commands.length - 1, Math.floor((i / numFrames) * commands.length));`;

code = code.replace(oldMapping, newMapping);
fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed frame index clamping");
