const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// Replace the manual warning popup with an auto-activation modal + API call

const oldPopup = `const [showGpuWarning, setShowGpuWarning] = useState(false);

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
  }, [gpuName, gpuPreference]);`;

const newPopup = `const [showGpuWarning, setShowGpuWarning] = useState(false);
  const [isAutoFixingGpu, setIsAutoFixingGpu] = useState(false);

  useEffect(() => {
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

  const handleAutoFixGPU = async () => {
      setIsAutoFixingGpu(true);
      try {
          // Gọi xuống server local (Node.js) để nó chạy file .bat
          await fetch('http://localhost:3000/api/fix-gpu', { method: 'POST' });
          // Màn hình sẽ chớp và trình duyệt tự khởi động lại nhờ file .bat
      } catch (e) {
          console.error('Không thể tự động fix GPU qua backend', e);
          setIsAutoFixingGpu(false);
          alert('Không thể kết nối đến máy chủ Local. Vui lòng chạy file KHỞI_ĐỘNG_TOOL_GPU.bat thủ công ở thư mục gốc.');
      }
  };`;

content = content.replace(oldPopup, newPopup);

// Update UI
const oldUI = `<h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Trình duyệt đang bị Windows khóa Card Rời!</h3>
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
                                </div>`;

const newUI = `<h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">PHÁT HIỆN CHƯA KÍCH HOẠT CARD RỜI!</h3>
                                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                                    Hệ thống quét thấy trình duyệt của bạn đang bị khóa ở Card Onboard <strong>({gpuName})</strong>. Để Nesting 3D mượt nhất, bạn cần mở khóa sức mạnh Card Rời (RTX/AMD).
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button onClick={() => setShowGpuWarning(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-bold transition-all">Bỏ qua</button>
                                    <button onClick={handleAutoFixGPU} disabled={isAutoFixingGpu} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-black transition-all flex items-center gap-2">
                                        {isAutoFixingGpu ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
                                        {isAutoFixingGpu ? 'Đang kích hoạt...' : 'KÍCH HOẠT TỰ ĐỘNG NGAY'}
                                    </button>
                                </div>
                                {isAutoFixingGpu && <p className="text-[10px] text-red-400 mt-2 font-mono text-right animate-pulse">Trình duyệt sẽ tự động khởi động lại sau 1 giây...</p>}`;

content = content.replace(oldUI, newUI);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Added frontend auto-fix button');
