import React from 'react';
import { X, Settings2 } from 'lucide-react';
import { useNestingStore } from '../store';

interface NestingSettingsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NestingSettingsDialog: React.FC<NestingSettingsDialogProps> = ({ isOpen, onClose }) => {
    const config = useNestingStore(state => state.config);
    const setConfig = useNestingStore(state => state.setConfig);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[440px] overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Settings2 size={16} className="text-cyan-400" /> Nesting Settings
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-3 text-xs text-slate-200">
                    <label className="flex flex-col gap-1">
                        Kerf (mm)
                        <input
                            type="number"
                            value={config.kerf}
                            onChange={e => setConfig({ kerf: Number(e.target.value) })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        Margin (mm)
                        <input
                            type="number"
                            value={config.margin}
                            onChange={e => setConfig({ margin: Number(e.target.value) })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        Spacing (mm)
                        <input
                            type="number"
                            value={config.spacing}
                            onChange={e => setConfig({ spacing: Number(e.target.value) })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        Rotation Step
                        <select
                            value={config.rotationStep}
                            onChange={e => setConfig({ rotationStep: Number(e.target.value) })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        >
                            <option value={90}>90°</option>
                            <option value={45}>45°</option>
                            <option value={15}>15°</option>
                            <option value={1}>1°</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        Strategy
                        <select
                            value={config.strategy}
                            onChange={e => setConfig({ strategy: e.target.value as 'rect' | 'polygon' })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        >
                            <option value="rect">Rectangular (Fast)</option>
                            <option value="polygon">Polygon (True Shape)</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        Solver
                        <select
                            value={config.solver}
                            onChange={e => setConfig({ solver: e.target.value as 'basic' | 'genetic' })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        >
                            <option value="basic">Greedy / Fast</option>
                            <option value="genetic">Hybrid Genetic</option>
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 col-span-2">
                        Sort Strategy
                        <select
                            value={config.sortStrategy}
                            onChange={e => setConfig({ sortStrategy: e.target.value as any })}
                            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5"
                        >
                            <option value="AREA_DESC">Area (Largest First)</option>
                            <option value="HEIGHT_DESC">Height (Tallest First)</option>
                            <option value="WIDTH_DESC">Width (Widest First)</option>
                            <option value="PERIMETER_DESC">Perimeter (Approx)</option>
                        </select>
                    </label>
                </div>

                <div className="px-4 pb-4 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
