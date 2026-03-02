const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAXApp.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Thêm state variables
if (!code.includes('const [nestingStatus, setNestingStatus]')) {
  code = code.replace(
    'const [isNesting, setIsNesting] = useState(false);',
    "const [isNesting, setIsNesting] = useState(false);\n  const [nestingStatus, setNestingStatus] = useState<'idle'|'running'|'done'|'error'>('idle');\n  const [nestingProgress, setNestingProgress] = useState(0);\n  const [nestingMessage, setNestingMessage] = useState('');"
  );
}

// 2. Sửa onStartNesting
if (code.includes('const result = await executeNesting(')) {
  code = code.replace(
    'const onStartNesting = async () => {\n    setIsNesting(true);',
    "const onStartNesting = async () => {\n    setIsNesting(true);\n    setNestingStatus('running');\n    setNestingProgress(0);\n    setNestingMessage('Bắt đầu tính toán nesting...');"
  );
  
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
  
  code = code.replace(
    "toast.success('Nesting hoàn tất!');",
    "toast.success('Nesting hoàn tất!');\n      setNestingStatus('done');"
  );
  
  code = code.replace(
    "toast.error('Có lỗi xảy ra trong quá trình nesting');",
    "toast.error('Có lỗi xảy ra trong quá trình nesting');\n      setNestingStatus('error');"
  );
}

// 3. Thay vì sửa renderModals (rất rủi ro do có >940 lines modal code),
// ta chèn overlay vào ngay trước </Workspace> trong JSX return của app

const insertIndex = code.lastIndexOf('</Workspace>');
if (insertIndex !== -1 && !code.includes('⚙️ Đang tính toán nesting...')) {
  const overlayHtml = `
      {nestingStatus === 'running' && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-[9999] pointer-events-auto">
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
              </div>
            </div>
            <div className="text-slate-400 text-sm mb-4 truncate text-center font-mono">
              {nestingMessage || \`Tiến độ: \${Math.round(nestingProgress)}%\`}
            </div>
            <button 
              onClick={() => { setNestingStatus('idle'); setIsNesting(false); }}
              className="px-4 py-2 bg-slate-700 hover:bg-red-600 text-white rounded-lg text-sm w-full font-medium transition-colors"
            >
              Hủy chạy ngầm (Chạy nền)
            </button>
          </div>
        </div>
      )}
      `;
  
  code = code.slice(0, insertIndex) + overlayHtml + code.slice(insertIndex);
}

fs.writeFileSync(file, code);
console.log('Patched safely');
