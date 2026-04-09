import React from 'react';
import { BarChart3, PieChart, Activity, Info, LayoutList, ChevronDown, Gauge } from 'lucide-react';

export const StatsPanel: React.FC = () => {
    return (
        <div className="w-72 glass-panel flex flex-col overflow-hidden border-white/5 relative z-0 h-full animate-in slide-in-from-right-4 fade-in duration-300">
            {/* Header - Matching GCodeViewer Editor Header */}
            <div className="p-3 bg-slate-900 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <BarChart3 size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">THỐNG KÊ CHI TIẾT</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="bg-slate-800 text-slate-500 p-1.5 rounded-lg hover:text-white transition-all">
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Content Area - Matching GCodeViewer custom-scrollbar and background */}
            <div className="flex-1 overflow-y-auto bg-[#0b1120] p-4 custom-scrollbar space-y-6">
                {/* Visual Stats Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                        <Gauge size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Hiệu suất tổng quát</span>
                    </div>

                    <div className="bg-black/40 p-3 rounded-lg border border-white/5 space-y-3">
                        <div className="flex justify-between items-baseline">
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Tỉ lệ sử dụng</span>
                            <span className="text-2xl font-mono font-bold text-slate-600">0.0%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full bg-gradient-to-r from-emerald-600 to-blue-500 w-0" />
                        </div>
                    </div>
                </div>

                {/* Data Grid Section */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <LayoutList size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Thông số chi tiết</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <StatBox label="TỔNG SỐ TẤM" value="0" unit="Tấm" color="text-slate-600" />
                        <StatBox label="LINH KIỆN" value="0" unit="Cái" color="text-slate-600" />
                        <StatBox label="THỜI GIAN" value="--:--" unit="Min" color="text-slate-600" />
                        <StatBox label="DIỆN TÍCH" value="0.0" unit="m²" color="text-slate-600" />
                    </div>
                </div>

                {/* Material Breakdown */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <PieChart size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Phân bổ vật liệu</span>
                    </div>

                    <div className="space-y-2">
                        <StatRow label="Phần hữu ích" value="0.0 m²" percent={0} color="bg-blue-500/20" />
                        <StatRow label="Phần dư thừa" value="0.0 m²" percent={0} color="bg-orange-500/20" />
                    </div>
                </div>
            </div>

            {/* Footer Tip */}
            <div className="p-3 bg-slate-900 border-t border-white/5">
                <div className="flex gap-2">
                    <Info size={14} className="text-blue-500/50 shrink-0" />
                    <p className="text-[9px] text-slate-500 font-medium leading-relaxed uppercase">
                        Dữ liệu sẽ được cập nhật thời gian thực khi thuật toán Nesting hoàn tất.
                    </p>
                </div>
            </div>
        </div>
    );
};

const StatBox: React.FC<{ label: string; value: string; unit: string; color: string }> = ({ label, value, unit, color }) => (
    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5">
        <div className="text-slate-500 text-[9px] font-bold uppercase mb-1">{label}</div>
        <div className="flex items-baseline gap-1">
            <span className={`text-lg font-mono font-bold ${color}`}>{value}</span>
            <span className="text-[9px] text-slate-600 font-black uppercase">{unit}</span>
        </div>
    </div>
);

const StatRow: React.FC<{ label: string; value: string; percent: number; color: string }> = ({ label, value, percent, color }) => (
    <div className="bg-black/20 p-2 rounded-lg border border-white/5 space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold">
            <span className="text-slate-400 uppercase">{label}</span>
            <span className="text-slate-200 font-mono">{value}</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
        </div>
    </div>
);
