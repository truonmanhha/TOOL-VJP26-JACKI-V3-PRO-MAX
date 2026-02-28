
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Settings, Calculator, CheckCircle2, DollarSign, Share2, Loader2, Send, FileText, AlertCircle, User, UserPlus, UserMinus, ChevronDown, Save, Trash2, Users, FileEdit } from 'lucide-react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { CNCDetail, CalculationSettings, STANDARD_PLATE_AREA, Customer } from '../types';
import { FORMAT_CURRENCY, FORMAT_NUMBER, Language, TRANSLATIONS } from '../constants';
import confetti from 'canvas-confetti';

// Gửi trực tiếp đến Discord để tránh lỗi treo do Proxy hoặc CORS
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1462471174201151724/K_-DjmjGGTvAjc49oXJmYwf_IvfD6FBFiAeWO9I9yFvx4qN2xcSoJ8PuJs2Z055WrLS1";

const Counter: React.FC<{ value: number; isCurrency?: boolean; lang: Language }> = ({ value, isCurrency = true, lang }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration: 1.5,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(latest)
    });
    return () => controls.stop();
  }, [value, lang]);

  return <span>{isCurrency ? FORMAT_CURRENCY(displayValue, lang) : FORMAT_NUMBER(displayValue, lang)}</span>;
};

const MoneyParticle: React.FC<{ id: number }> = ({ id }) => {
  const randomX = Math.random() * 100;
  return (
    <motion.div
      initial={{ y: -50, x: `${randomX}%`, rotate: 0, opacity: 0 }}
      animate={{ y: window.innerHeight + 100, rotate: 360, opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.5, ease: "linear" }}
      className="fixed z-[999] pointer-events-none text-emerald-500"
    >
      <DollarSign size={24 + Math.random() * 24} />
    </motion.div>
  );
};

interface CalculatorToolProps {
  lang: Language;
  input: string;
  setInput: (val: string) => void;
  settings: CalculationSettings;
  setSettings: (val: CalculationSettings) => void;
  results: CNCDetail[];
  setResults: (val: CNCDetail[]) => void;
}

const CalculatorTool: React.FC<CalculatorToolProps> = ({ 
  lang, 
  input, 
  setInput, 
  settings, 
  setSettings, 
  results, 
  setResults 
}) => {
  const t = TRANSLATIONS[lang];
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('vjp26_customers_v3');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Khách lẻ' }];
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('default');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [isAddingMode, setIsAddingMode] = useState(false);
  
  const [manualFileName, setManualFileName] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);
  const [moneyParticles, setMoneyParticles] = useState<number[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem('vjp26_customers_v3', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
  }, []);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId) || customers[0], 
    [customers, selectedCustomerId]
  );

  const handleSaveCustomer = () => {
    if (!newCustomerName.trim()) return;
    const newCust = { id: Date.now().toString(), name: newCustomerName.trim() };
    setCustomers(prev => [...prev, newCust]);
    setNewCustomerName('');
    setIsAddingMode(false);
    setSelectedCustomerId(newCust.id);
  };

  const handleDeleteCustomer = (id: string) => {
    if (id === 'default') return;
    setCustomers(prev => prev.filter(c => c.id !== id));
    if (selectedCustomerId === id) setSelectedCustomerId('default');
  };

  const handleCalculate = () => {
    const areas = input.split(/[\+\n]/).map(s => {
      const normalized = s.trim().replace(',', '.');
      return parseFloat(normalized);
    }).filter(n => !isNaN(n));
    
    if (areas.length > 0) {
      setExportStatus('idle');
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 300);
        const newParticles = Array.from({ length: 15 }, (_, i) => Date.now() + i);
        setMoneyParticles(newParticles);
        setTimeout(() => setMoneyParticles([]), 3000);
      }
      
      const newResults: CNCDetail[] = areas.map((area, idx) => {
        const baseValue = (area / STANDARD_PLATE_AREA) * settings.platePrice;
        const laborFee = baseValue * (settings.laborPercentage / 100);
        return { 
          id: `cnc-${idx}-${Date.now()}`, 
          area, 
          percentage: (area / STANDARD_PLATE_AREA) * 100, 
          basePrice: baseValue, 
          laborFee, 
          total: baseValue + laborFee 
        };
      });
      
      setResults(newResults);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  };

  const handleExportToDiscord = async () => {
    if (results.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportStatus('idle');
    
    const totals = results.reduce((acc, curr) => ({ 
      count: acc.count + 1, 
      base: acc.base + curr.basePrice, 
      labor: acc.labor + curr.laborFee, 
      total: acc.total + curr.total,
      area: acc.area + curr.area
    }), { count: 0, base: 0, labor: 0, total: 0, area: 0 });

    const payload = {
      content: `🚀 **BÁO CÁO VJP26 - ${lang.toUpperCase()}**`,
      embeds: [{
        title: t.discordReportTitle || "📄 PHIẾU BÁO GIÁ CHI TIẾT",
        color: 0x10b981,
        fields: [
          { name: `${t.discordRecipient || "Người nhận"}:`, value: `**${selectedCustomer.name}**`, inline: false },
          { name: t.discordTotalLabel || "💰 TỔNG CỘNG :", value: `**${FORMAT_CURRENCY(totals.total, lang)}**`, inline: false },
          { 
            name: t.discordStatsLabel || "📊 Thống kê :", 
            value: `${t.discordFileLabel || "FILE:"} \`${manualFileName || totals.count}\` | ${t.discordLaborLabel || "Tiền Công:"} \`${FORMAT_CURRENCY(totals.labor, lang)}\``, 
            inline: false 
          },
          { 
            name: t.discordDetailsLabel || "📝 Chi tiết Tổng Diện Tích :", 
            value: `${t.discordAreaPrefix || "AREA="}\`${FORMAT_NUMBER(totals.area, lang)}\``, 
            inline: false 
          }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "Phát triển bởi TRƯƠNG MẠNH HÀ - VJP26 Jacki V3" }
      }]
    };

    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Discord trả về 204 No Content khi thành công. 
      // Không gọi response.json() để tránh lỗi treo do không có body.
      if (response.ok) {
        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 3000);
      } else {
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    } catch (err) {
      console.error("Discord error:", err);
      setExportStatus('error');
      setTimeout(() => setExportStatus('idle'), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const totals = useMemo(() => {
    return results.reduce((acc, curr) => ({ 
      count: acc.count + 1, 
      base: acc.base + curr.basePrice, 
      labor: acc.labor + curr.laborFee, 
      total: acc.total + curr.total 
    }), { count: 0, base: 0, labor: 0, total: 0 });
  }, [results]);

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>{moneyParticles.map(id => <MoneyParticle key={id} id={id} />)}</AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div className="lg:col-span-2 glass-panel border-blue-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-8 border-b border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg">
                  <Users className="text-white w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-blue-400 tracking-tight uppercase">{t.customerTitle}</h2>
                </div>
              </div>
              {!isAddingMode && (
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setIsAddingMode(true)}
                  className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-5 py-2.5 rounded-xl border border-blue-500/30 font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                >
                  <UserPlus size={14} /> {t.customerAdd}
                </motion.button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{t.customerSelect}</label>
                <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                  {customers.map((c) => (
                    <div 
                      key={c.id} 
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all mb-1 group ${
                        selectedCustomerId === c.id ? 'bg-blue-600/20 border border-blue-500/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${selectedCustomerId === c.id ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`} />
                        <span className={`font-bold text-sm ${selectedCustomerId === c.id ? 'text-white' : 'text-slate-400'}`}>{c.name}</span>
                      </div>
                      {c.id !== 'default' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(c.id); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 text-slate-500 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-end">
                <AnimatePresence mode="wait">
                  {isAddingMode ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-blue-600/5 border border-blue-500/20 rounded-2xl p-6 space-y-4"
                    >
                      <input 
                        autoFocus
                        type="text" 
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder={t.customerPlaceholder}
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-blue-500/50 transition-all"
                      />
                      <div className="flex gap-3">
                        <button onClick={handleSaveCustomer} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[11px]">LƯU</button>
                        <button onClick={() => setIsAddingMode(false)} className="px-4 py-3 bg-slate-800 text-slate-400 rounded-xl font-bold text-[11px]">HỦY</button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-900/30 rounded-2xl p-6 border border-dashed border-white/5 text-center">
                      <User size={20} className="text-slate-600 mx-auto mb-2" />
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">{selectedCustomer.name}</h3>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="p-8 bg-emerald-500/5">
            <input 
              type="text" 
              value={manualFileName}
              onChange={(e) => setManualFileName(e.target.value)}
              placeholder={t.fileNamePlaceholder}
              className="w-full bg-slate-950/80 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold outline-none transition-all placeholder:text-slate-800"
            />
          </div>
        </motion.div>

        <motion.div className="glass-panel border-orange-500/20 rounded-3xl p-8 shadow-2xl h-full">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl"><Settings className="text-white w-6 h-6" /></div>
            <h2 className="text-2xl font-black text-orange-400 uppercase tracking-tight">{t.settingsTitle}</h2>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase">{t.platePrice}</label>
              <input type="number" value={settings.platePrice} onChange={(e) => setSettings({...settings, platePrice: Number(e.target.value)})} className="w-full bg-slate-900/80 border border-white/5 rounded-xl px-5 py-4 text-orange-400 font-mono text-xl outline-none" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase">{t.laborPercent}</label>
              <input type="number" value={settings.laborPercentage} onChange={(e) => setSettings({...settings, laborPercentage: Number(e.target.value)})} className="w-full bg-slate-900/80 border border-white/5 rounded-xl px-5 py-4 text-orange-400 font-mono text-xl outline-none" />
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div className="glass-panel border-white/5 rounded-3xl p-8 shadow-2xl relative">
        <textarea 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder={t.inputPlaceholder} 
          className="w-full h-40 bg-slate-900/80 border border-white/5 rounded-2xl p-6 text-slate-100 font-mono text-lg resize-none outline-none focus:border-emerald-500/30 transition-all" 
        />
        <div className="flex gap-4 mt-8">
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            onClick={handleCalculate} 
            className="flex-[2] bg-emerald-600 text-white font-black py-5 px-8 rounded-2xl flex items-center justify-center gap-3 shadow-lg"
          >
            <Calculator className="w-6 h-6" /> <span className="tracking-widest uppercase text-sm">{t.btnCalc}</span>
          </motion.button>
          <motion.button 
            onClick={() => { setInput(''); setResults([]); setManualFileName(''); setExportStatus('idle'); }} 
            className="flex-1 bg-slate-800 text-slate-300 font-black py-5 px-8 rounded-2xl border border-white/5 uppercase text-xs"
          >
            {t.btnReset}
          </motion.button>
        </div>
      </motion.div>

      {results.length > 0 && (
        <div className="space-y-8 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: t.cardCount, value: totals.count, color: 'text-blue-400', currency: false },
              { label: t.cardBase, value: totals.base, color: 'text-emerald-400', currency: true },
              { label: t.cardLabor, value: totals.labor, color: 'text-orange-400', currency: true }
            ].map((card, i) => (
              <div key={i} className="glass-panel border-white/5 p-8 rounded-3xl shadow-xl">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">{card.label}</p>
                <div className={`text-3xl font-black ${card.color} font-mono`}><Counter value={card.value} isCurrency={card.currency} lang={lang} /></div>
              </div>
            ))}
          </div>

          <motion.div className="bg-gradient-to-br from-slate-900 to-blue-900 p-10 rounded-[2.5rem] shadow-3xl flex flex-col md:flex-row items-center justify-between gap-10 border border-white/10">
            <div className="text-center md:text-left">
              <p className="text-white/60 font-black uppercase tracking-[0.4em] text-[10px] mb-3">{t.finalTotal}</p>
              <h2 className="text-5xl md:text-7xl font-black text-white font-mono leading-none tracking-tighter">
                <Counter value={Math.round(totals.total)} lang={lang} />
              </h2>
            </div>
            
            <div className="flex flex-col gap-4 w-full md:w-80">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportToDiscord}
                disabled={isExporting}
                className={`w-full flex items-center justify-center gap-4 px-8 py-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  exportStatus === 'success' ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' :
                  exportStatus === 'error' ? 'bg-red-500 text-white' :
                  'bg-white text-slate-900'
                }`}
              >
                {isExporting ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 exportStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                 exportStatus === 'error' ? <AlertCircle className="w-5 h-5" /> : 
                 <Send className="w-5 h-5" />}
                <span>{isExporting ? t.exporting : exportStatus === 'success' ? t.exportSuccess : exportStatus === 'error' ? 'LỖI GỬI!' : t.btnExport}</span>
              </motion.button>
            </div>
          </motion.div>

          <div className="glass-panel border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <table className="w-full text-left font-mono">
              <thead className="bg-black/50">
                <tr>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase">{t.tableStt}</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase">{t.tableArea}</th>
                  <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase text-right">{t.tableTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-blue-600/5 transition-colors">
                    <td className="px-10 py-5 text-slate-500 font-bold">#{idx + 1}</td>
                    <td className="px-10 py-5 text-slate-200">{FORMAT_NUMBER(item.area, lang)}</td>
                    <td className="px-10 py-5 text-right font-black text-white">{FORMAT_CURRENCY(item.total, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalculatorTool;
