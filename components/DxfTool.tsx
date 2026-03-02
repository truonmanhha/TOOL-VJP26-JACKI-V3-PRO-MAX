
import React, { useState, useRef, useCallback } from 'react';
import { FileUp, Copy, AlertCircle, LayoutGrid, Merge, Loader2, Zap, Trash2, Eye, Wrench, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DxfService } from '../services/dxfService';
import { DXFEntityResult, ManualLine } from '../types';
import { FORMAT_NUMBER, Language, TRANSLATIONS } from '../constants';
import DxfPreview from './DxfPreview';

const dxfService = new DxfService();

interface HistoryState {
  results: DXFEntityResult[];
  manualLines: ManualLine[];
}

interface DxfToolProps {
  lang: Language;
  file: File | null;
  setFile: React.Dispatch<React.SetStateAction<File | null>>;
  results: DXFEntityResult[];
  setResults: React.Dispatch<React.SetStateAction<DXFEntityResult[]>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  showStartBtn: boolean;
  setShowStartBtn: React.Dispatch<React.SetStateAction<boolean>>;
  onSelectionChange?: (selectedIds: string[]) => void; // New callback for selection changes
}

const DxfTool: React.FC<DxfToolProps> = ({ 
  lang, 
  file, 
  setFile, 
  results, 
  setResults, 
  error, 
  setError, 
  showStartBtn, 
  setShowStartBtn,
  onSelectionChange
}) => {
  const t = TRANSLATIONS[lang];
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [joinTolerance, setJoinTolerance] = useState(0.5); 
  const [showSuccess, setShowSuccess] = useState(false);
  const [manualLines, setManualLines] = useState<ManualLine[]>([]);
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [future, setFuture] = useState<HistoryState[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const initAudioContext = () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    return audioContextRef.current;
  };

  const playBeepSequence = (type: 'process' | 'success' | 'draw' | 'delete' | 'undo' = 'process') => {
    const ctx = initAudioContext();
    const now = ctx.currentTime;
    let count = 2; let freq = 1200;
    if (type === 'success') { count = 3; freq = 1500; }
    if (type === 'draw') { count = 1; freq = 2000; }
    if (type === 'delete') { count = 1; freq = 600; }
    if (type === 'undo') { count = 1; freq = 800; }
    for (let i = 0; i < count; i++) {
      const startTime = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq + (i * 100), startTime); 
      gain.gain.setValueAtTime(0, startTime); gain.gain.linearRampToValueAtTime(0.05, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(startTime); osc.stop(startTime + 0.1);
    }
  };

  const pushToHistory = useCallback(() => {
    setHistory(prev => [...prev, { results: [...results], manualLines: [...manualLines] }]);
    setFuture([]); 
  }, [results, manualLines]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [{ results: [...results], manualLines: [...manualLines] }, ...prev]);
    setResults(previous.results);
    setManualLines(previous.manualLines);
    setHistory(history.slice(0, history.length - 1));
    playBeepSequence('undo');
  }, [history, results, manualLines, setResults]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, { results: [...results], manualLines: [...manualLines] }]);
    setResults(next.results);
    setManualLines(next.manualLines);
    setFuture(future.slice(1));
    playBeepSequence('draw');
  }, [future, results, manualLines, setResults]);

  const processFile = async () => {
    if (!file || isProcessing) return;
    playBeepSequence();
    setIsProcessing(true);
    setIsImporting(true);
    setImportProgress(0);
    setError(null);
    setResults([]);
    setProgress(0);
    setHistory([]);
    setFuture([]);
    setStatusText('Parsing DXF with Worker...');
    
    try {
      // Simulate parsing progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const next = prev + Math.random() * 30;
          return next > 95 ? 95 : next;
        });
      }, 200);

      const data = await dxfService.parseFile(file, joinTolerance);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      if (data.length === 0) {
        setError(t.dxfError);
      }
      setResults(data);
      console.log(`✓ DXF import complete: ${data.length} entities, simplified to 0.1mm tolerance`);
    } catch (err) {
      console.error('Import error:', err);
      setError(t.dxfError);
    } finally {
      setIsProcessing(false);
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleSmartRepair = () => {
    if (results.length === 0 || isProcessing) return;
    pushToHistory();
    setIsProcessing(true); setStatusText("ĐANG TỐI ƯU HÓA BIÊN DẠNG...");
    setTimeout(() => {
      const manualEntities: DXFEntityResult[] = manualLines.map(line => ({ id: line.id, type: 'LINE', area: 0, verticesCount: 2, isClosed: false, geometry: [line.start, line.end] }));
      const repaired = dxfService.smartJoin([...results, ...manualEntities], joinTolerance);
      setResults(repaired); setManualLines([]);
      setIsProcessing(false); setStatusText(''); playBeepSequence('success'); setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 800);
  };

  const handleJoinSelected = (ids: string[]) => {
    pushToHistory();
    const toJoin = results.filter(r => ids.includes(r.id));
    const others = results.filter(r => !ids.includes(r.id));
    const manualToJoin = manualLines.filter(ml => ids.includes(ml.id)).map(ml => ({ id: ml.id, type: 'LINE', area: 0, verticesCount: 2, isClosed: false, geometry: [ml.start, ml.end] }));
    const joined = dxfService.smartJoin([...toJoin, ...manualToJoin], joinTolerance);
    setResults([...others, ...joined]);
    setManualLines(prev => prev.filter(ml => !ids.includes(ml.id)));
    playBeepSequence('success');
  };

  const handleAddManualLine = (line: { start: { x: number, y: number }, end: { x: number, y: number } }) => {
    pushToHistory();
    setManualLines(prev => [...prev, { id: `ML-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, ...line }]);
    playBeepSequence('draw');
  };

  const handleDeleteEntity = (id: string) => { pushToHistory(); setResults(prev => prev.filter(e => e.id !== id)); playBeepSequence('delete'); };
  const handleDeleteEntities = (ids: string[]) => { pushToHistory(); setResults(prev => prev.filter(e => !ids.includes(e.id))); setManualLines(prev => prev.filter(ml => !ids.includes(ml.id))); playBeepSequence('delete'); };
  const handleDeleteManualLine = (id: string) => { pushToHistory(); setManualLines(prev => prev.filter(ml => ml.id !== id)); playBeepSequence('delete'); };

  const handleExplodeEntity = (id: string) => {
    const ent = results.find(e => e.id === id);
    if (!ent) return;
    pushToHistory();
    setResults(prev => [...prev.filter(e => e.id !== id), ...dxfService.explode(ent)]);
    playBeepSequence('draw');
  };

  const handleExplodeEntities = (ids: string[]) => {
    pushToHistory();
    let newEntities: DXFEntityResult[] = [];
    const remaining = results.filter(e => {
      if (ids.includes(e.id)) { newEntities.push(...dxfService.explode(e)); return false; }
      return true;
    });
    setResults([...remaining, ...newEntities]);
    playBeepSequence('draw');
  };

  const totalArea = results.reduce((sum, item) => sum + item.area, 0);
  const openProfilesCount = results.filter(r => !r.isClosed).length;

  return (
    <div className="space-y-8 pb-20">
      <motion.div className="glass-panel border-2 border-dashed border-blue-500/20 rounded-[2.5rem] p-16 text-center group transition-all relative overflow-hidden">
        <input type="file" accept=".dxf" className="hidden" ref={fileInputRef} onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setResults([]); setManualLines([]); setError(null); setShowStartBtn(true); setHistory([]); setFuture([]); } }} />
        <div onClick={() => !isProcessing && fileInputRef.current?.click()} className="cursor-pointer flex flex-col items-center gap-6 relative z-10">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center border border-white/10 group-hover:border-blue-500/50 transition-colors">
            {isProcessing ? <Loader2 className="w-12 h-12 text-blue-400 animate-spin" /> : <FileUp className="w-12 h-12 text-blue-400" />}
          </div>
          <div>
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">{file ? file.name : t.dxfUpload}</h3>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.25em]">{t.dxfParserSub}</p>
          </div>
        </div>
        {isProcessing && (
          <div className="mt-10 max-w-md mx-auto space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-400"><span>{statusText}</span><span>{progress}%</span></div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden"><motion.div animate={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-500" /></div>
          </div>
        )}
        <AnimatePresence>
          {file && !results.length && !isProcessing && showStartBtn && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <motion.button initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onClick={processFile} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-5 px-14 rounded-2xl flex items-center justify-center gap-4 shadow-lg active:scale-95 transition-all">
                <Zap className="w-5 h-5 fill-white" /> {t.dxfBtnStart}
              </motion.button>
              <motion.button onClick={() => { setFile(null); setResults([]); setManualLines([]); setError(null); setIsProcessing(false); setShowStartBtn(false); setHistory([]); setFuture([]); }} className="bg-slate-800 text-slate-300 font-bold py-5 px-8 rounded-2xl border border-white/5 active:scale-95 transition-all"><Trash2 className="w-5 h-5" /></motion.button>
            </div>
          )}
        </AnimatePresence>
      </motion.div>

      {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex items-center gap-4"><AlertCircle className="w-6 h-6" /><p className="font-bold">{error}</p></motion.div>}

      {results.length > 0 && !isProcessing && (
        <div className="space-y-8">
          <div className={`p-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase transition-colors ${openProfilesCount > 0 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
            <Merge className="w-4 h-4" /> <span>{openProfilesCount > 0 ? `PHÁT HIỆN ${openProfilesCount} ĐIỂM HỞ. NHẤN "VÁ ĐƯỜNG HỞ" ĐỂ TỰ ĐỘNG KHÉP KÍN THEO SAI SỐ.` : "BẢN VẼ KHÉP KÍN HOÀN TOÀN."}</span>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-black border border-white/5 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div><p className="text-blue-500/60 text-[10px] font-black uppercase tracking-[0.4em] mb-3">{t.dxfTotalArea}</p><h2 className="text-5xl md:text-7xl font-black text-white font-mono">{FORMAT_NUMBER(totalArea, lang)} <span className="text-2xl text-slate-700 italic">mm²</span></h2></div>
            <div className="flex gap-3"><button onClick={() => navigator.clipboard.writeText(totalArea.toString())} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-8 py-5 rounded-xl font-bold border border-white/5 flex items-center gap-3"><Copy className="w-5 h-5" /> {t.dxfCopy}</button></div>
          </div>

          <div className="glass-panel border-orange-500/20 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 shadow-xl relative overflow-hidden">
            <AnimatePresence>{showSuccess && <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-500/95 backdrop-blur-xl flex items-center justify-center z-20 gap-4 text-white font-black uppercase tracking-[0.2em] text-sm"><CheckCircle2 className="w-8 h-8" /> ĐÃ VÁ LỖI & KẾT NỐI BIÊN DẠNG THÀNH CÔNG!</motion.div>}</AnimatePresence>
            <div className="flex items-center gap-4 flex-1">
              <div className="p-3 bg-orange-500/20 rounded-xl text-orange-400"><Wrench size={24} /></div>
              <div className="flex-1">
                <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-2">TỐI ƯU HÓA BIÊN DẠNG</h4>
                <div className="flex items-center gap-4"><span className="text-[10px] text-slate-500 font-black uppercase">Sai số vá</span><input type="range" min="0.01" max="10" step="0.01" value={joinTolerance} onChange={e => setJoinTolerance(parseFloat(e.target.value))} className="flex-1 accent-orange-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer" /><span className="text-sm font-mono text-orange-400 font-bold w-12">{joinTolerance}</span></div>
              </div>
            </div>
            <button onClick={handleSmartRepair} className="bg-orange-500 hover:bg-orange-600 text-white font-black px-8 py-4 rounded-xl text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg active:scale-95"><Zap size={14} /> {t.dxfJoinBtn}</button>
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex items-center gap-3"><Eye className="w-5 h-5 text-blue-400" /><span className="font-black text-slate-100 uppercase tracking-widest text-sm">{t.dxfPreview}</span></div>
            <DxfPreview 
                entities={results} manualLines={manualLines} onAddManualLine={handleAddManualLine} onClearManualLines={() => { pushToHistory(); setManualLines([]); }}
                onDeleteEntity={handleDeleteEntity} onDeleteEntities={handleDeleteEntities} onDeleteManualLine={handleDeleteManualLine}
                onExplodeEntity={handleExplodeEntity} onExplodeEntities={handleExplodeEntities} onJoinEntities={handleJoinSelected}
                onUndo={handleUndo} onRedo={handleRedo} canUndo={history.length > 0} canRedo={future.length > 0}
                onSelectionChange={onSelectionChange}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DxfTool;
