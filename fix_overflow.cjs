const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// I can see the header wrapper still has overflow-x-auto in line 1552!
// It seems my previous regex missed it or didn't save properly.

code = code.replace(
    /className="flex items-start h-full w-full overflow-x-auto overflow-y-visible rounded-xl scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pb-1"/,
    'className="flex items-start h-full w-full rounded-xl overflow-visible"'
);

fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed overflow-x-auto again");
