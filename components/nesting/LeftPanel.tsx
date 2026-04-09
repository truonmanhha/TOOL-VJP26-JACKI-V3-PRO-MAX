import React from 'react';
import { useNesting } from './NestingContext';
import { Plus, Trash, Database } from 'lucide-react';

export const LeftPanel: React.FC = () => {
    const { parts, sheets, setParts, setSheets } = useNesting();

    const addDemoParts = () => {
        setParts([ // Demo data as requested
            { id: 'P01', name: 'Rect 1', label: 'R1', color: '#3b82f6', width: 120, height: 80, quantity: 2, rotationAllowed: true, priority: 1, enabled: true },
            { id: 'P02', name: 'Rect 2', label: 'R2', color: '#ef4444', width: 200, height: 60, quantity: 1, rotationAllowed: true, priority: 2, enabled: true },
            { id: 'P03', name: 'Poly L', label: 'L', color: '#22c55e', width: 100, height: 100, quantity: 1, rotationAllowed: true, priority: 1, enabled: true, geometry: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 50, y: 100 }, { x: 50, y: 50 }, { x: 0, y: 50 }] }
        ]);
    };

    return (
        <div className="w-80 bg-slate-900 border-r border-slate-700 flex flex-col p-2 gap-4">
            <div className="flex flex-col gap-2">
                <h3 className="text-slate-400 font-bold uppercase text-xs">Parts Input</h3>
                <div className="bg-slate-800 rounded p-2 border border-slate-700 h-60 overflow-y-auto">
                    {parts.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm p-1 hover:bg-slate-700 rounded">
                            <span>{p.name}</span>
                            <span className="text-slate-500">{p.width}x{p.height} ({p.quantity})</span>
                        </div>
                    ))}
                    {parts.length === 0 && <span className="text-slate-500 italic text-sm p-2 block">No parts added</span>}
                </div>
                <div className="flex gap-2">
                    <button className="flex-1 bg-blue-700 hover:bg-blue-600 text-white rounded p-1.5 text-sm font-bold flex items-center justify-center gap-1" onClick={addDemoParts}>
                        <Plus size={14} /> Add Demo
                    </button>
                    <button className="bg-red-900/50 hover:bg-red-900 text-red-200 rounded p-1.5" onClick={() => setParts([])}>
                        <Trash size={14} />
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-slate-400 font-bold uppercase text-xs">Sheets Input</h3>
                <div className="bg-slate-800 rounded p-2 border border-slate-700 h-40 overflow-y-auto">
                    {sheets.map(s => (
                        <div key={s.id} className="flex justify-between items-center text-sm p-1 hover:bg-slate-700 rounded">
                            <span className="text-green-400">{s.name}</span>
                            <span className="text-slate-500">{s.width}x{s.height}</span>
                        </div>
                    ))}
                    {sheets.length === 0 && <span className="text-slate-500 italic text-sm p-2 block">No sheets (Using Default)</span>}
                </div>
                <div className="flex gap-2">
                     <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded p-1.5 text-sm font-bold flex items-center justify-center gap-1" onClick={() => setSheets([{ id: 'S01', name: 'Sheet 1', width: 2440, height: 1220, quantity: 10, margin: 10, material: 'MDF' }])}>
                        <Database size={14} /> Add Standard
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
                <h3 className="text-slate-400 font-bold uppercase text-xs">Parameters</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <label className="text-slate-400">Kerf (mm)</label>
                    <input type="number" className="bg-slate-800 border border-slate-700 rounded px-2" defaultValue={2} />
                    <label className="text-slate-400">Margin</label>
                    <input type="number" className="bg-slate-800 border border-slate-700 rounded px-2" defaultValue={10} />
                </div>
            </div>
        </div>
    );
};
