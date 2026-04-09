// ============================================================
// VJP26 NESTING RESULTS - ALPHACAM STYLE
// Display Nesting Results and Statistics
// ============================================================

import React from 'react';
import { BarChart3, Layers, Package, Clock, DollarSign, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { MultiSheetResult, NestingSheet, PlacedPart } from '../../types';

export interface NestingResultsProps {
    results: MultiSheetResult | null;
    sheets: NestingSheet[];
    isNesting: boolean;
    onExportReport: () => void;
    onExportGCode: () => void;
    onSheetClick: (sheetIndex: number) => void;
    activeSheetIndex: number;
}

const NestingResults: React.FC<NestingResultsProps> = ({
    results,
    sheets,
    isNesting,
    onExportReport,
    onExportGCode,
    onSheetClick,
    activeSheetIndex
}) => {
    if (!results) {
        return (
            <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700">
                <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-sm">Nesting Results</span>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    <div className="text-center">
                        <BarChart3 size={40} className="mx-auto mb-2 opacity-30" />
                        <p>Run nesting to see results</p>
                    </div>
                </div>
            </div>
        );
    }

    const utilizationColor = results.utilization >= 80 ? 'text-green-400' :
        results.utilization >= 60 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className="h-full flex flex-col bg-slate-800 border-l border-slate-700 w-[240px]">
            {/* Header */}
            <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white text-sm">Nesting Results</span>
                    <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                </div>
            </div>

            {/* Main Stats */}
            <div className="p-3 border-b border-slate-700 space-y-3">
                {/* Utilization */}
                <div className="text-center p-3 bg-slate-900/50 rounded-lg">
                    <div className={`text-3xl font-bold ${utilizationColor}`}>
                        {results.utilization.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Material Utilization</div>
                    <div className="w-full h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${results.utilization >= 80 ? 'bg-green-500' :
                                    results.utilization >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${results.utilization}%` }}
                        />
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-slate-700/30 rounded text-center">
                        <Layers className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                        <div className="text-lg font-bold text-white">{results.sheetsUsed}</div>
                        <div className="text-[10px] text-slate-400">Sheets Used</div>
                    </div>
                    <div className="p-2 bg-slate-700/30 rounded text-center">
                        <Package className="w-4 h-4 mx-auto text-green-400 mb-1" />
                        <div className="text-lg font-bold text-white">{results.partsPlaced}</div>
                        <div className="text-[10px] text-slate-400">Parts Placed</div>
                    </div>
                </div>

                {/* Remaining Parts Warning */}
                {results.partsRemaining > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-600/20 border border-yellow-600/50 rounded text-xs">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" />
                        <span className="text-yellow-300">
                            {results.partsRemaining} parts remaining
                        </span>
                    </div>
                )}
            </div>

            {/* Sheet Thumbnails */}
            <div className="flex-1 overflow-y-auto p-2">
                <div className="text-[10px] text-slate-500 uppercase mb-2">Sheet Preview</div>
                <div className="space-y-2">
                    {results.sheets.map((sheetResult, index) => {
                        const sheet = sheets[index] || { width: 1000, height: 1000 };
                        const scale = 100 / Math.max(sheet.width, sheet.height);

                        return (
                            <div
                                key={index}
                                onClick={() => onSheetClick(index)}
                                className={`
                                    p-2 rounded-lg cursor-pointer transition-all
                                    ${activeSheetIndex === index
                                        ? 'bg-blue-600/20 border border-blue-500'
                                        : 'bg-slate-700/30 border border-transparent hover:border-slate-600'}
                                `}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-white font-medium">Sheet {index + 1}</span>
                                    <span className={`text-[10px] ${sheetResult.utilization >= 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {sheetResult.utilization.toFixed(1)}%
                                    </span>
                                </div>

                                {/* Mini preview */}
                                <div
                                    className="bg-slate-900 rounded border border-slate-600 mx-auto relative overflow-hidden"
                                    style={{
                                        width: sheet.width * scale,
                                        height: sheet.height * scale
                                    }}
                                >
                                    {sheetResult.placedParts.map((part, pIdx) => (
                                        <div
                                            key={pIdx}
                                            className="absolute"
                                            style={{
                                                left: part.x * scale,
                                                top: part.y * scale,
                                                width: part.width * scale,
                                                height: part.height * scale,
                                                backgroundColor: part.color + '80',
                                                border: '1px solid ' + part.color
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="text-[10px] text-slate-500 text-center mt-1">
                                    {sheetResult.placedParts.length} parts
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Export Actions */}
            <div className="p-2 border-t border-slate-700 space-y-1">
                <button
                    onClick={onExportReport}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                >
                    <Download size={14} />
                    Export Report
                </button>
                <button
                    onClick={onExportGCode}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-500 rounded text-xs text-white font-medium"
                >
                    <Download size={14} />
                    Generate G-Code
                </button>
            </div>
        </div>
    );
};

export default NestingResults;
