import React from 'react';
import { useNesting } from './NestingContext';
import { PieChart, Download } from 'lucide-react';

export const RightPanel: React.FC = () => {
    const { results } = useNesting();

    if (!results) return (
        <div className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col p-4 items-center justify-center text-slate-500 text-sm">
            <PieChart className="mb-2 opacity-50" size={32} />
            Waiting for Nesting...
        </div>
    );

    return (
        <div className="w-64 bg-slate-900 border-l border-slate-700 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-slate-700 font-bold text-slate-200 flex gap-2 items-center bg-slate-800">
                <PieChart size={16} className="text-emerald-400" /> Results
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
                <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Utilization</div>
                    <div className="text-3xl font-bold text-emerald-400">{results.utilization.toFixed(1)}%</div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${results.utilization}%` }} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-800 p-2 rounded">
                        <div className="text-slate-500 text-xs">Sheets</div>
                        <div className="font-bold text-lg text-white">{results.sheetsUsed}</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded">
                        <div className="text-slate-500 text-xs">Parts</div>
                        <div className="font-bold text-lg text-white">{results.placedParts.length}</div>
                    </div>
                </div>

                <button className="w-full bg-slate-700 hover:bg-slate-600 p-2 rounded flex items-center justify-center gap-2 font-bold text-sm text-white border border-slate-600">
                    <Download size={16} /> Export JSON
                </button>
                <button className="w-full bg-blue-900/50 hover:bg-blue-800/50 p-2 rounded flex items-center justify-center gap-2 font-bold text-sm text-blue-200 border border-blue-800">
                    <Download size={16} /> Export G-Code
                </button>
            </div>
        </div>
    );
};
