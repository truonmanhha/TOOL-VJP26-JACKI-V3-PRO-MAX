const fs = require('fs');

let fileContent = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Looking at the pointer-events-none class issue
// In GCodeViewer.tsx line 1191:
// {is3DFullScreen && <div className="absolute top-4 left-4 right-16 z-50 flex justify-end pointer-events-none"><div className="pointer-events-auto bg-slate-900/90 p-2 rounded-2xl backdrop-blur border border-white/10 shadow-2xl flex flex-wrap gap-2 justify-center max-w-[80vw]">{renderToolbarButtons()}</div></div>}
// 
// Let's check line 1211, the bottom panel
const oldClass = 'className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl z-10 w-[95%] max-w-lg"';
const newClass = 'className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur border border-white/10 rounded-2xl p-3 flex flex-col gap-2 shadow-2xl z-50 w-[95%] max-w-lg pointer-events-auto"';

if (fileContent.includes(oldClass)) {
    console.log("Found bottom panel class, updating pointer-events and z-index");
    fileContent = fileContent.replace(oldClass, newClass);
} else {
    console.log("Could not find bottom panel class exactly. Searching...");
}

// Ensure the ThreeDViewContent wrapper doesn't have pointer-events-none globally that ruins the bottom panel
// Line 1254 wrapper: <div className={`col-span-1 ... glass-panel ... pointer-events-none???

fs.writeFileSync('components/GCodeViewer.tsx', fileContent);
