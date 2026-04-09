import re

with open('components/GCodeViewer.tsx', 'r') as f:
    content = f.read()

# Add states
state_decl = """
  const [videoExportState, setVideoExportState] = useState<'idle' | 'rendering' | 'uploading' | 'done' | 'error'>('idle');
  const [videoExportProgress, setVideoExportProgress] = useState(0);

  const handleDummyVideoExport = () => {
    if (videoExportState !== 'idle' && videoExportState !== 'error') return;
    
    setVideoExportState('rendering');
    setVideoExportProgress(0);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setVideoExportProgress(p / 100);
      if (p >= 100) {
        clearInterval(interval);
        setVideoExportState('uploading');
        setTimeout(() => {
          setVideoExportState('done');
          setTimeout(() => setVideoExportState('idle'), 3000);
        }, 1500);
      }
    }, 200);
  };
"""

# Insert state after `const [aiAnalysis, setAiAnalysis] = useState<string>('');`
if "const [aiAnalysis, setAiAnalysis] = useState<string>('');" in content:
    content = content.replace(
        "const [aiAnalysis, setAiAnalysis] = useState<string>('');\n  const [isAnalyzing, setIsAnalyzing] = useState(false);",
        "const [aiAnalysis, setAiAnalysis] = useState<string>('');\n  const [isAnalyzing, setIsAnalyzing] = useState(false);\n" + state_decl
    )

# Add button
button_code = """
<button 
    onClick={handleDummyVideoExport} 
    disabled={videoExportState === 'rendering' || videoExportState === 'uploading' || !analysis} 
    className={`${videoExportState === 'error' ? 'bg-red-600/20 border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white' : videoExportState === 'done' ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400' : 'bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white'} px-2 py-1.5 rounded-lg border flex items-center gap-1 transition-all`}
>
    {videoExportState === 'idle' && <><Share2 size={12} /> <span className="text-[10px] font-bold uppercase">Gửi Video</span></>}
    {videoExportState === 'rendering' && <><Activity size={12} className="animate-spin" /> <span className="text-[10px] font-bold uppercase">Đang tạo video ({Math.round(videoExportProgress * 100)}%)</span></>}
    {videoExportState === 'uploading' && <><Upload size={12} className="animate-pulse" /> <span className="text-[10px] font-bold uppercase">Đang tải lên Discord...</span></>}
    {videoExportState === 'done' && <><Check size={12} /> <span className="text-[10px] font-bold uppercase">Gửi thành công!</span></>}
    {videoExportState === 'error' && <><AlertCircle size={12} /> <span className="text-[10px] font-bold uppercase">Lỗi gửi báo cáo</span></>}
</button>
"""

# Insert button in the panel header near `<span className="text-xs font-black uppercase tracking-widest">KẾT QUẢ PHÂN TÍCH</span></div></div>`
target = '<span className="text-xs font-black uppercase tracking-widest">KẾT QUẢ PHÂN TÍCH</span></div></div>'
replacement = '<span className="text-xs font-black uppercase tracking-widest">KẾT QUẢ PHÂN TÍCH</span></div>' + button_code + '</div>'
content = content.replace(target, replacement)

with open('components/GCodeViewer.tsx', 'w') as f:
    f.write(content)

print("Done")
