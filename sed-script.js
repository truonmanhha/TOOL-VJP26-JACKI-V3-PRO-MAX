const fs = require('fs');

const code = fs.readFileSync('components/GCodeViewer.tsx', 'utf-8');

const oldStr = `<div className="flex-1 overflow-y-auto text-sm text-slate-300 leading-relaxed font-mono custom-scrollbar">{isAnalyzing ? <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50"><Activity className="animate-spin text-purple-500" size={24} /><span className="text-[9px] uppercase tracking-widest">ĐANG PHÂN TÍCH...</span></div> : aiAnalysis ? <div className="whitespace-pre-wrap">{aiAnalysis}</div> : <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 text-center"><Zap size={24} /><span className="text-[9px] uppercase tracking-widest">NHẤN NÚT PHÂN TÍCH ĐỂ BẮT ĐẦU</span></div>}</div>`;

const newStr = `<div className="flex-1 overflow-y-auto text-sm text-slate-300 leading-relaxed font-mono custom-scrollbar">
{isAnalyzing ? (
    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
        <Activity className="animate-spin text-purple-500" size={24} />
        <span className="text-[9px] uppercase tracking-widest">ĐANG PHÂN TÍCH...</span>
    </div>
) : aiAnalysis ? (
    <div className="flex flex-col gap-4">
        <div className="whitespace-pre-wrap">{aiAnalysis}</div>
        <div className="bg-black/50 rounded-lg border border-white/10 p-2 overflow-hidden aspect-video relative flex items-center justify-center group mt-4">
            {!isPlaying ? (
                <button onClick={() => { setIsPlaying(true); setCurrentIndex(0); }} className="absolute z-10 w-12 h-12 bg-blue-600/80 hover:bg-blue-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all group-hover:scale-110">
                    <Play size={20} className="ml-1" fill="currentColor" />
                </button>
            ) : (
                <button onClick={() => setIsPlaying(false)} className="absolute z-10 w-12 h-12 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all group-hover:scale-110">
                    <Pause size={20} fill="currentColor" />
                </button>
            )}
            {isPlaying && (
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-1 rounded text-[8px] font-mono text-green-400 flex items-center gap-1 border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    PLAYING: {Math.floor((currentIndex / Math.max(1, commands.length)) * 100)}%
                </div>
            )}
            <div className="absolute inset-0 opacity-50 pointer-events-none">
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                    <Monitor size={32} className="mb-2 opacity-50" />
                    <span className="text-[8px] font-black uppercase tracking-widest">MINI PLAYER</span>
                </div>
            </div>
            
            {/* Minimal line progress bar at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: \`\${(currentIndex / Math.max(1, commands.length)) * 100}%\` }}></div>
            </div>
        </div>
    </div>
) : (
    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30 text-center">
        <Zap size={24} />
        <span className="text-[9px] uppercase tracking-widest">NHẤN NÚT PHÂN TÍCH ĐỂ BẮT ĐẦU</span>
    </div>
)}
</div>`;

fs.writeFileSync('components/GCodeViewer.tsx', code.replace(oldStr, newStr));
console.log('done');
