const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// The main issue is the toolbar container has 'overflow-x-auto overflow-y-visible'.
// But the wrapper div has overflow-hidden which clips the dropdowns.
// Line 1557: <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-1 bg-[#25252b] p-1 w-full rounded-b-xl border border-t-0 border-black/50 overflow-hidden">
// The toolbar is above this in the DOM, so it SHOULD overflow, BUT the dropdowns inside the toolbar need a higher z-index than the grid below.
// Let's check the header wrapper.
// Line 1551: <header className="h-[67px] shrink-0 bg-[#2d2d2d] border-b border-[#3e3e3e] flex items-center justify-between px-2 select-none shadow-lg w-full relative z-[100]">

// The dropdowns have z-[100]. But maybe the scrollbar container clips them?
// Line 1552: <div className="flex items-start h-full w-full overflow-x-auto overflow-y-visible rounded-xl scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pb-1">
// "overflow-x-auto overflow-y-visible" is actually invalid in CSS. If you set overflow-x to auto, overflow-y computes to auto as well! You cannot have one axis scrollable and the other visible. This is why dropdowns get clipped inside the toolbar.

// Let's replace overflow-x-auto with just scrolling or change the dropdown strategy.
// Let's remove overflow-x-auto from the toolbar to see if it fixes the clipping.

const oldHeader = `<div className="flex items-start h-full w-full overflow-x-auto overflow-y-visible rounded-xl scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent pb-1">`;
const newHeader = `<div className="flex items-start h-full w-full overflow-visible rounded-xl pb-1">`;

code = code.replace(oldHeader, newHeader);

// We should also wrap the main app layout in a way that doesn't clip.
// But first let's also fix z-index of the popups to be 9999 just in case.
code = code.replace(/z-\[100\]/g, 'z-[9999]');

fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Fixed overflow clipping and z-index");
