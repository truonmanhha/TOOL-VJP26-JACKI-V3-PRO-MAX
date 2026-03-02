const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAXApp.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Thêm state variables (sau const [isNesting, setIsNesting] = useState(false);)
if (!code.includes('const [nestingStatus, setNestingStatus]')) {
  code = code.replace(
    'const [isNesting, setIsNesting] = useState(false);',
    "const [isNesting, setIsNesting] = useState(false);\n  const [nestingStatus, setNestingStatus] = useState<'idle'|'running'|'done'|'error'>('idle');\n  const [nestingProgress, setNestingProgress] = useState(0);\n  const [nestingMessage, setNestingMessage] = useState('');"
  );
}

// 2. Sửa onStartNesting để dùng state mới
if (!code.includes("setNestingStatus('running')")) {
  code = code.replace(
    'const onStartNesting = async () => {\n    setIsNesting(true);',
    "const onStartNesting = async () => {\n    setIsNesting(true);\n    setNestingStatus('running');\n    setNestingProgress(0);\n    setNestingMessage('Bắt đầu tính toán nesting...');"
  );
  
  code = code.replace(
    'const result = await executeNesting(',
    'const result = await executeNesting('
  );
  
  // Replace the executeNesting call to include progress callback
  code = code.replace(
    /const result = await executeNesting\([\s\S]*?settings\s*\);/,
    `const result = await executeNesting(
        nestingParts,
        currentSheets,
        settings,
        (percent, message) => {
          setNestingProgress(percent);
          setNestingMessage(message);
        }
      );`
  );
  
  // Fix try/catch handlers
  code = code.replace(
    "toast.success('Nesting hoàn tất!');",
    "toast.success('Nesting hoàn tất!');\n      setNestingStatus('done');"
  );
  
  code = code.replace(
    "toast.error('Có lỗi xảy ra trong quá trình nesting');",
    "toast.error('Có lỗi xảy ra trong quá trình nesting');\n      setNestingStatus('error');"
  );
  
  code = code.replace(
    "setIsNesting(false);\n  };",
    "setIsNesting(false);\n    }\n  };"
  );
}

// 3. Thêm UI Overlay (ở hàm renderModals)
if (!code.includes("nestingStatus === 'running'")) {
  code = code.replace(
    'const renderModals = () => {',
    `const renderModals = () => {
    return (
      <>
        {nestingStatus === 'running' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-[9999]">
            <div className="glass-panel p-6 rounded-xl min-w-80 border border-slate-700 shadow-2xl">
              <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                Đang tính toán nesting...
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-700">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 relative"
                  style={{ width: \`\${nestingProgress}%\` }}
                >
                  <div className="absolute inset-0 bg-white/20" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)' }}></div>
                </div>
              </div>
              <div className="text-slate-400 text-sm mb-4 truncate text-center font-mono">
                {nestingMessage || \`Tiến độ: \${Math.round(nestingProgress)}%\`}
              </div>
              <button 
                onClick={() => setNestingStatus('idle')}
                className="px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg text-sm w-full font-medium transition-colors"
              >
                Hủy chạy ngầm (Chạy nền)
              </button>
            </div>
          </div>
        )}`
  );
  
  code = code.replace(
    // End of renderModals
    'return null;\n  };',
    '</>\n    );\n  };'
  );
}

fs.writeFileSync(file, code);
console.log('Patched NestingAXApp.tsx successfully');
