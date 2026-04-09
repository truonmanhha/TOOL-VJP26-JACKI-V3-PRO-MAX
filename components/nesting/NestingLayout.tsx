import React from 'react';
import { useNesting } from './NestingContext';
import { LeftPanel } from './LeftPanel';
import { StatsPanel } from './StatsPanel';
import { RightPanel } from './RightPanel';
import { Play } from 'lucide-react';

const NestingToolbar: React.FC = () => {
    return (
        <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-4 justify-between">
            <span className="font-bold text-slate-400 text-sm">AxNesting V3 <span className="text-xs bg-slate-800 px-1 rounded text-orange-400">IND</span></span>
            <div className="flex gap-2">
                <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1 rounded text-sm font-bold flex items-center gap-1 shadow-lg shadow-emerald-900/50">
                    <Play size={14} fill="currentColor" /> AUTO NEST
                </button>
            </div>
        </div>
    )
}

export const NestingLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-full w-full bg-slate-950 text-slate-200">
            <NestingToolbar />
            <div className="flex flex-1 overflow-hidden">
                <LeftPanel />
                <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center border-x border-slate-800">
                    {/* Placeholder for WebGL Canvas */}
                    <div className="text-slate-600 font-mono text-sm">
                        [WebGL Canvas Placeholder]
                    </div>
                </div>
                <StatsPanel />
                <RightPanel />
            </div>
        </div>
    );
};
