const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// The issue: "bấm vào xong nó phóng to ra , mất mẹ cái nút để thu nhỏ"
// Wait, when is3DFullScreen is true, it renders:
// {is3DFullScreen && (
//  <div className="absolute top-0 left-0 right-0 z-[9999] pointer-events-none">
//    <div className="pointer-events-auto bg-[#2d2d2d] h-[67px] border-b border-[#3e3e3e] flex items-center justify-between px-2 select-none shadow-lg w-full relative z-[9999]">
//      <div className="flex items-start h-full w-full overflow-visible rounded-xl pb-1">
//         {renderToolbarButtons()}
//      </div>
//    </div>
//  </div>
// )}
// And INSIDE `renderToolbarButtons()`, there is the FULL SCREEN button?
// Actually, `toggleFullScreen` is called by a SEPARATE button inside `ThreeDViewContent`:
// <button onClick={toggleFullScreen} className={`absolute top-4 right-4 z-50 ...`}> {is3DFullScreen ? <Minimize /> : <Maximize />} </button>
// Wait, if that button is "absolute top-4 right-4", and the Toolbar is "absolute top-0 left-0 right-0 h-[67px] z-[9999]", then the Toolbar will overlap and hide the absolute top-4 button!!

// Let's change the position of the full screen button or increase its z-index heavily so it's above the toolbar, OR put the full screen toggle directly inside the toolbar instead of `isWorkspaceLocked`.
// Wait, `isWorkspaceLocked` is triggered by `handleWorkspaceLock`, which is in `renderToolbarButtons()`:
// <ToolbarButton icon={isWorkspaceLocked ? <Minimize size={18} /> : <Maximize size={18} />} label={`Full\nScreen(1)`} color={isWorkspaceLocked ? "text-blue-400" : "text-gray-400"} onClick={handleWorkspaceLock} />

// The user is talking about "cái nút phóng to ở canvas á", which is `toggleFullScreen` !

// Let's modify the `toggleFullScreen` button to be completely visible.
// Old: <button onClick={toggleFullScreen} className={`absolute top-4 right-4 z-50 p-2.5 ...
// If is3DFullScreen is true, we should put it lower so it doesn't overlap with the top header toolbar, maybe top-20 right-4 ?

content = content.replace(
    /className=\{\`absolute top-4 right-4 z-50 p-2\.5 \$\{is3DFullScreen \?/g,
    'className={`absolute right-4 z-[10000] p-2.5 ${is3DFullScreen ? "top-[80px] bg-blue-600/20 text-blue-400 border-blue-500/50" :'
);
content = content.replace(
    /\? 'bg-blue-600\/20 text-blue-400 border-blue-500\/50' : 'bg-slate-800\/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white\/10'\} rounded-xl/g,
    ' "top-4 bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:bg-blue-600 hover:text-white border-white/10"} rounded-xl'
);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Fixed fullscreen button overlapping');
