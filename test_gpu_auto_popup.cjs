const fs = require('fs');

// We will add a logic to show a prominent modal telling the user to use the batch file or change settings 
// if we detect that `gpuPreference === 'high-performance'` but the detected GPU name still says "Intel" or "AMD Radeon" (which means the OS blocked it).

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const popupCode = `
  const [showGpuWarning, setShowGpuWarning] = useState(false);

  useEffect(() => {
    // If user prefers high-performance, but we detect an integrated GPU, warn them ONCE
    if (gpuPreference === 'high-performance' && gpuName) {
        const isIntel = gpuName.toLowerCase().includes('intel');
        const isAMDOnboard = gpuName.toLowerCase().includes('radeon graphics');
        const isAngle = gpuName.toLowerCase().includes('angle') || gpuName.toLowerCase().includes('swiftshader');
        
        const hasWarned = sessionStorage.getItem('vjp26_gpu_warned');
        
        if ((isIntel || isAMDOnboard || isAngle) && !hasWarned && gpuName !== 'Unknown GPU') {
            setShowGpuWarning(true);
            sessionStorage.setItem('vjp26_gpu_warned', 'true');
        }
    }
  }, [gpuName, gpuPreference]);
`;

// Insert state
content = content.replace(
  `  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));`,
  `  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));\n${popupCode}`
);

const warningUIMarkup = `
          {/* Cảnh báo Windows chặn GPU */}
          <AnimatePresence>
            {showGpuWarning && (
                <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div initial={{scale: 0.9, y: 20}} animate={{scale: 1, y: 0}} className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-lg shadow-2xl relative">
                        <button onClick={() => setShowGpuWarning(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-red-500/20 text-red-500 rounded-full"><AlertCircle size={32} /></div>
                            <div>
                                <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Trình duyệt đang bị Windows khóa Card Rời!</h3>
                                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                                    Ứng dụng đã yêu cầu sử dụng Card Rời, nhưng Windows hiện đang ép trình duyệt chạy bằng Card Onboard <strong>({gpuName})</strong> để tiết kiệm pin. Khung hình 3D có thể sẽ bị giật lag.
                                </p>
                                <div className="bg-black/50 rounded-xl p-4 border border-white/10 mb-4 text-xs text-slate-400 font-mono">
                                    <strong>Cách khắc phục vĩnh viễn:</strong><br/>
                                    1. Mở thư mục chứa code Tool này.<br/>
                                    2. Tìm và chạy file <span className="text-yellow-400 font-bold">Auto_Fix_GPU.bat</span><br/>
                                    3. Khởi động lại trình duyệt Edge/Chrome.
                                </div>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowGpuWarning(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all">Đã hiểu, bỏ qua</button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
          </AnimatePresence>
`;

// Insert UI into render
content = content.replace(
  `{/* Ghost Line (Background/Dimmed) */}`,
  `${warningUIMarkup}\n      {/* Ghost Line (Background/Dimmed) */}`
);

// Ah wait, warningUIMarkup is React, it should be placed where other overlays are, like near AnimatePresence for isProcessing.

content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8'); // reload
content = content.replace(
  `  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));`,
  `  const [gpuPreference, setGpuPreference] = useState<'high-performance' | 'low-power' | 'default'>(() => loadSetting('vjp26_gc_gpu_pref', 'high-performance'));\n${popupCode}`
);

content = content.replace(
  `<AnimatePresence>{isProcessing && <motion.div`,
  `${warningUIMarkup}\n          <AnimatePresence>{isProcessing && <motion.div`
);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Added GPU block warning modal.');
