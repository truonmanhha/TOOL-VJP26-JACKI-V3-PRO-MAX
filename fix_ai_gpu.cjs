const fs = require('fs');
let code = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Thêm tuỳ chọn thay đổi GPU/Performance preference (powerPreference)
if (!code.includes("const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>")) {
    const hooksSearch = `const [cpuThreads, setCpuThreads] = useState<number>(window.navigator.hardwareConcurrency || 4);`;
    const hooksReplace = `const [cpuThreads, setCpuThreads] = useState<number>(window.navigator.hardwareConcurrency || 4);\n  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));\n  const [showGpuMenu, setShowGpuMenu] = useState(false);\n  useEffect(() => localStorage.setItem('vjp26_gc_gpu_pref', JSON.stringify(gpuPreference)), [gpuPreference]);`;
    code = code.replace(hooksSearch, hooksReplace);
}

// Cập nhật <Canvas>
code = code.replace(
    /gl={{ powerPreference: "high-performance", antialias: !isLiteMode, stencil: false, depth: true }}/,
    'gl={{ powerPreference: gpuPreference, antialias: !isLiteMode, stencil: false, depth: true }}'
);

// Thêm nút vào thanh Toolbar
const oldToolbarBtn = `<ToolbarButton icon={isLiteMode ? <Zap size={18} className="fill-amber-400" /> : <Gauge size={18} />} label={\`Lite\\nMode\`} color={isLiteMode ? "text-amber-400" : "text-gray-400"} active={isLiteMode} onClick={() => setIsLiteMode(!isLiteMode)} />`;

const newToolbarBtn = `<ToolbarButton icon={isLiteMode ? <Zap size={18} className="fill-amber-400" /> : <Gauge size={18} />} label={\`Lite\\nMode\`} color={isLiteMode ? "text-amber-400" : "text-gray-400"} active={isLiteMode} onClick={() => setIsLiteMode(!isLiteMode)} />
                <div className="relative">
                    <ToolbarButton icon={<Monitor size={18} />} label={\`GPU\\nMode\`} color={showGpuMenu ? "text-red-400" : "text-gray-400"} active={showGpuMenu} onClick={() => setShowGpuMenu(!showGpuMenu)} />
                    {showGpuMenu && <div className="absolute top-[56px] left-0 bg-slate-900 border border-white/10 rounded p-2 w-48 shadow-2xl z-[100] flex flex-col gap-1">
                        <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Cấu hình Card đồ họa</div>
                        <button onClick={() => { setGpuPreference('high-performance'); setShowGpuMenu(false); window.location.reload(); }} className={\`text-left px-2 py-1.5 rounded text-[10px] \${gpuPreference === 'high-performance' ? 'bg-red-500/20 text-red-400 font-bold' : 'hover:bg-white/5 text-slate-300'}\`}>NVIDIA / AMD (Mạnh mẽ)</button>
                        <button onClick={() => { setGpuPreference('low-power'); setShowGpuMenu(false); window.location.reload(); }} className={\`text-left px-2 py-1.5 rounded text-[10px] \${gpuPreference === 'low-power' ? 'bg-green-500/20 text-green-400 font-bold' : 'hover:bg-white/5 text-slate-300'}\`}>Intel UHD (Tiết kiệm điện)</button>
                        <button onClick={() => { setGpuPreference('default'); setShowGpuMenu(false); window.location.reload(); }} className={\`text-left px-2 py-1.5 rounded text-[10px] \${gpuPreference === 'default' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'hover:bg-white/5 text-slate-300'}\`}>Mặc định của máy</button>
                        <div className="text-[8px] text-slate-500 mt-1 italic">* Ứng dụng sẽ tự tải lại để áp dụng GPU mới</div>
                    </div>}
                </div>`;
                
code = code.replace(oldToolbarBtn, newToolbarBtn);
fs.writeFileSync('components/GCodeViewer.tsx', code);
console.log("Added GPU mode toggle");
