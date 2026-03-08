
import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Calculator, FileCode, ShieldCheck, Cpu, Terminal, Binary, Zap, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CalculatorTool from './components/AreaCalculator';
import DxfTool from './components/DxfTool';
import GCodeViewer from './components/GCodeViewer';
import NestingAXApp from './components/NestingAXApp';
import MatrixBackground from './components/MatrixBackground';
import ChatBot from './components/ChatBot';
import { Language, LANGUAGES, TRANSLATIONS } from './constants';
import { CNCDetail, CalculationSettings, DXFEntityResult } from './types';
import { DxfService } from './services/dxfService';

const App: React.FC = () => {
  console.log('🎯 App component rendering');
  
  // Initialize DxfService once
  const [dxfService] = useState<DxfService | null>(() => {
    try {
      const service = new DxfService();
      console.log('✓ DxfService initialized successfully');
      return service;
    } catch (err) {
      console.error('✗ Failed to initialize DxfService:', err);
      return null;
    }
  });
  
  const [activeTab, setActiveTab] = useState<'calc' | 'dxf' | 'gcode' | 'nest'>('calc');
  const [isBooting, setIsBooting] = useState(true);
  const [lang, setLang] = useState<Language>('vi');
  const [bootText, setBootText] = useState<string[]>([]);
  
  // Lite Mode State (Global Performance Mode)
  const [isLiteMode, setIsLiteMode] = useState(() => {
    return localStorage.getItem('vjp26_gc_litemode') === 'true';
  });

  // Calculator State
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcSettings, setCalcSettings] = useState<CalculationSettings>({
    platePrice: 50000,
    laborPercentage: 5,
  });
  const [calcResults, setCalcResults] = useState<CNCDetail[]>([]);

  // DXF State
  const [dxfFile, setDxfFile] = useState<File | null>(null);
  const [dxfResults, setDxfResults] = useState<DXFEntityResult[]>([]);
  const [dxfError, setDxfError] = useState<string | null>(null);
  const [dxfShowStartBtn, setDxfShowStartBtn] = useState(false);
  
  const t = TRANSLATIONS[lang] || TRANSLATIONS['vi'];

  // Handle right-click to show menu (disabled for non-nesting tabs)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // RadialMenu removed - only nesting has its own context menu
  }, []);

  // Persist Lite Mode
  useEffect(() => {
    localStorage.setItem('vjp26_gc_litemode', String(isLiteMode));
    if (isLiteMode) {
        setActiveTab('gcode'); // Force GCode tab when in Lite Mode
    }
  }, [isLiteMode]);

  useEffect(() => {
    const sequence = t.booting || [];
    console.log('🔥 Boot sequence:', sequence);
    setBootText([]);
    let current = 0;
    
    const interval = setInterval(() => {
      if (current < sequence.length) {
        setBootText(prev => [...prev, sequence[current]]);
        console.log(`📝 Boot text ${current}: ${sequence[current]}`);
        current++;
      } else {
        clearInterval(interval);
        console.log('✅ Boot animation complete, setting isBooting to false');
        setTimeout(() => setIsBooting(false), 1000);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [lang]);

  // Hàm xử lý tự động dành cho ChatBot
  const handleAutoProcessDxf = useCallback(async (file: File) => {
    setActiveTab('dxf');
    setDxfFile(file);
    setDxfError(null);
    setDxfShowStartBtn(false);

    try {
      if (!dxfService) {
        setDxfError("DXF Service không khả dụng");
        return;
      }
      
      // 1. Parse file - preserve all entities without auto-joining
      const initialResults = await dxfService.parseFile(file, 0.5);
      
      setDxfResults(initialResults);
      return initialResults;
    } catch (err) {
      setDxfError("Lỗi xử lý file DXF tự động");
      throw err;
    }
  }, []);

  return (
    <div 
      className={`min-h-screen ${isLiteMode ? 'bg-[#0a0e14]' : 'bg-[#0f1419]'} text-slate-200 transition-colors duration-500`}
      onContextMenu={handleContextMenu}
    >
      {/* RadialMenu removed - only nesting AX has its own menu */}
      
      <AnimatePresence>
        {isBooting && (
          <motion.div 
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[1000] bg-black flex items-center justify-center font-mono p-8"
          >
            <div className="max-w-md w-full">
              <div className="flex items-center gap-4 mb-8">
                <Cpu className="w-10 h-10 text-blue-500 animate-pulse" />
                <h1 className="text-2xl font-black tracking-tighter text-white">VJP26 SYSTEM</h1>
              </div>
              <div className="space-y-2">
                {bootText.map((text, i) => (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={i} className="text-sm text-emerald-500">{text}</motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MATRIX BACKGROUND - DISABLED IN LITE MODE */}
      {!isLiteMode && <MatrixBackground />}

      <div className={`relative z-20 ${isLiteMode ? 'w-full h-screen px-2 py-2' : activeTab === 'nest' ? 'w-full px-0 py-0' : activeTab === 'gcode' ? 'w-full px-2 md:px-4 py-4' : 'max-w-[1400px] mx-auto px-4 py-8 md:py-8'}`}>
        
        {/* HEADER & TABS - HIDDEN IN LITE MODE */}
        {!isLiteMode && (
          <>
            <motion.header 
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center mb-10"
            >
              <div className="flex items-center gap-3 mb-4 bg-slate-900/80 px-6 py-3 rounded-full shadow-2xl backdrop-blur-xl group">
                <Terminal className="w-6 h-6 text-blue-400" />
                <span className="font-black tracking-tighter text-2xl text-white italic">{t.systemTitle}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tighter">
                <span className="glitch-text text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-purple-400" data-text="VJP26 JACKI V3">VJP26 JACKI V3</span>
              </h1>
            </motion.header>

            <div className="relative mb-10 w-full md:w-fit mx-auto">
              <div className="flex p-2 bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-3xl overflow-x-auto">
                <button onClick={() => setActiveTab('calc')} className={`relative z-10 flex items-center justify-center gap-3 px-8 md:px-10 py-4 rounded-xl font-black transition-all min-w-max ${activeTab === 'calc' ? 'text-white' : 'text-slate-500'}`}>
                  {activeTab === 'calc' && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl" />}
                  <Calculator className="relative z-10 w-4 h-4" /><span className="relative z-10 tracking-widest text-[10px] sm:text-xs">{t.calcTab}</span>
                </button>
                <button onClick={() => setActiveTab('dxf')} className={`relative z-10 flex items-center justify-center gap-3 px-8 md:px-10 py-4 rounded-xl font-black transition-all min-w-max ${activeTab === 'dxf' ? 'text-white' : 'text-slate-500'}`}>
                  {activeTab === 'dxf' && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl" />}
                  <FileCode className="relative z-10 w-4 h-4" /><span className="relative z-10 tracking-widest text-[10px] sm:text-xs">{t.dxfTab}</span>
                </button>
                <button onClick={() => setActiveTab('gcode')} className={`relative z-10 flex items-center justify-center gap-3 px-8 md:px-10 py-4 rounded-xl font-black transition-all min-w-max ${activeTab === 'gcode' ? 'text-white' : 'text-slate-500'}`}>
                  {activeTab === 'gcode' && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl" />}
                  <Binary className="relative z-10 w-4 h-4" /><span className="relative z-10 tracking-widest text-[10px] sm:text-xs">{t.gcodeTab}</span>
                </button>
                <button onClick={() => setActiveTab('nest')} className={`relative z-10 flex items-center justify-center gap-3 px-8 md:px-10 py-4 rounded-xl font-black transition-all min-w-max ${activeTab === 'nest' ? 'text-white' : 'text-slate-500'}`}>
                  {activeTab === 'nest' && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl" />}
                  <LayoutGrid className="relative z-10 w-4 h-4" /><span className="relative z-10 tracking-widest text-[10px] sm:text-xs">{t.nestingTab}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* LITE MODE HEADER INDICATOR */}
        {isLiteMode && (
            <div className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="bg-amber-900/80 text-amber-200 px-6 py-2 rounded-b-xl border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)] backdrop-blur-md flex items-center gap-2">
                    <Zap className="fill-amber-400 animate-pulse" size={16} />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">CHẾ ĐỘ TỐI ƯU HIỆU SUẤT (LITE MODE)</span>
                </div>
            </div>
        )}

        <main className={`relative ${isLiteMode ? 'h-full' : 'min-h-[600px]'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'calc' && !isLiteMode && (
              <motion.div key="calc-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CalculatorTool lang={lang} input={calcInput} setInput={setCalcInput} settings={calcSettings} setSettings={setCalcSettings} results={calcResults} setResults={setCalcResults} />
              </motion.div>
            )}
            {activeTab === 'dxf' && !isLiteMode && (
              <motion.div key="dxf-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DxfTool lang={lang} file={dxfFile} setFile={setDxfFile} results={dxfResults} setResults={setDxfResults} error={dxfError} setError={setDxfError} showStartBtn={dxfShowStartBtn} setShowStartBtn={setDxfShowStartBtn} />
              </motion.div>
            )}
            {activeTab === 'gcode' && (
               <motion.div key="gcode-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={isLiteMode ? 'h-full' : ''}>
                <GCodeViewer lang={lang} isLiteMode={isLiteMode} setIsLiteMode={setIsLiteMode} />
              </motion.div>
            )}
            {activeTab === 'nest' && !isLiteMode && (
               <motion.div key="nest-tab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                 <NestingAXApp />
               </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* FOOTER & LANG - HIDDEN IN LITE MODE */}
        {!isLiteMode && (
          <>
            <div className="flex justify-center mt-16 mb-8">
              <div className="glass-panel rounded-2xl p-1.5 flex items-center gap-1 bg-black/40">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setLang(l.code)} className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${lang === l.code ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                    <span>{l.flag}</span> <span className="hidden sm:inline uppercase tracking-widest">{l.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <footer className="mt-8 border-t border-white/5 pt-12 pb-20 flex flex-col md:flex-row justify-between items-center gap-10 text-slate-500 text-sm">
              <div className="flex flex-col items-center md:items-start gap-3">
                <div className="flex items-center gap-3 text-slate-200 font-black tracking-[0.3em] text-[10px] uppercase">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />{t.footerOnline}
                </div>
                <span className="font-mono opacity-40 text-[9px] uppercase tracking-widest">{t.footerCopyright}</span>
              </div>
            </footer>
          </>
        )}
      </div>

      {/* CHATBOT - COMPLETELY REMOVED IN LITE MODE */}
      {!isLiteMode && <ChatBot lang={lang} onAutoProcessDxf={handleAutoProcessDxf} currentSettings={{ platePrice: calcSettings.platePrice, laborPercentage: calcSettings.laborPercentage }} />}
    </div>
  );
};

export default App;