const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// The original gpu button modification added an absolute div underneath. 
// But Tailwind's ToolbarButton is inside a flex row, so this absolute div might overlap others.
// We will just put it there, the toolbar has spacing.
// Let's verify it still compiles.
