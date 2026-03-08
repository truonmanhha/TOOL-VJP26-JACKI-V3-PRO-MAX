const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// The replacement logic:
// Instead of modifying the GPU mode button simply to "GPU Mode", we'll make it show the currently active gpu (gpuName) or some short indicator if possible.
// Because gpuName is available inside the component, we can just replace the ToolbarButton's label or the div next to it.

// Let's modify line 1453
// Original: <ToolbarButton icon={<Monitor size={18} />} label={`GPU\nMode`} color={showGpuMenu ? "text-red-400" : "text-gray-400"} active={showGpuMenu} onClick={() => setShowGpuMenu(!showGpuMenu)} />

// But first, let's just make it simpler by adding a small text under the `GPU Mode` icon, or just making `GPU Mode` more verbose.
// Or we can add it to the button title.

const originalBtn = `<ToolbarButton icon={<Monitor size={18} />} label={\`GPU\\nMode\`} color={showGpuMenu ? "text-red-400" : "text-gray-400"} active={showGpuMenu} onClick={() => setShowGpuMenu(!showGpuMenu)} />`;
const newBtn = `<div className="relative group flex flex-col items-center">
                    <ToolbarButton icon={<Monitor size={18} />} label={\`GPU\\nMode\`} color={showGpuMenu ? "text-red-400" : "text-gray-400"} active={showGpuMenu} onClick={() => setShowGpuMenu(!showGpuMenu)} />
                    <div className="absolute -bottom-2 whitespace-nowrap text-[6px] text-emerald-400 font-mono scale-75 opacity-70 max-w-[50px] overflow-hidden text-ellipsis pointer-events-none">{gpuName.replace(/ANGLE \\((.*)\\)/, '$1').split(' ')[0]}</div>
                </div>`;

content = content.replace(originalBtn, newBtn);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Modified GCodeViewer.tsx');
