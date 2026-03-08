const fs = require('fs');
let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// There is a syntax error in the template literal replacement above: 
// ${is3DFullScreen ? "top-[80px] bg-blue-600/20 text-blue-400 border-blue-500/50" : 'bg-blue-600/20 text-blue-400 border-blue-500/50' : 'bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white/10'}

// Let's fix that exactly.
content = content.replace(
    /\$\{is3DFullScreen \? "top-\[80px\] bg-blue-600\/20 text-blue-400 border-blue-500\/50" : 'bg-blue-600\/20 text-blue-400 border-blue-500\/50' : 'bg-slate-800\/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white\/10'\}/g,
    '${is3DFullScreen ? "top-[80px] bg-blue-600/20 text-blue-400 border-blue-500/50" : "top-4 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white/10"}'
);

fs.writeFileSync('components/GCodeViewer.tsx', content);
