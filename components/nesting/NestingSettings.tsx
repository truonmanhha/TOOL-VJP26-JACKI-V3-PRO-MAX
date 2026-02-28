// ============================================================
// VJP26 NESTING SETTINGS - ALPHACAM STYLE
// Configure Nesting Parameters
// ============================================================

import React from 'react';
import { Settings, X, RotateCw, Ruler, ArrowRight, Zap, Layers } from 'lucide-react';
import { NestingSettings as NestingSettingsType } from '../../types';

export interface NestingSettingsProps {
    settings: NestingSettingsType;
    onUpdateSettings: (settings: NestingSettingsType) => void;
    onClose: () => void;
    onResetDefaults: () => void;
}

const NestingSettingsPanel: React.FC<NestingSettingsProps> = ({
    settings,
    onUpdateSettings,
    onClose,
    onResetDefaults
}) => {
    const updateField = <K extends keyof NestingSettingsType>(field: K, value: NestingSettingsType[K]) => {
        onUpdateSettings({ ...settings, [field]: value });
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[360px] max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-white">Nesting Settings</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Spacing Section */}
                <div>
                    <div className="text-xs font-medium text-white mb-2 flex items-center gap-2">
                        <Ruler size={14} className="text-cyan-400" />
                        Spacing
                    </div>
                    <div className="grid grid-cols-2 gap-3 bg-slate-700/30 rounded-lg p-3">
                        <div>
                            <label className="text-[10px] text-slate-400">Part Gap (mm)</label>
                            <input
                                type="number"
                                value={settings.partGap}
                                onChange={e => updateField('partGap', Number(e.target.value))}
                                min={0}
                                max={100}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400">Edge Margin (mm)</label>
                            <input
                                type="number"
                                value={settings.edgeMargin}
                                onChange={e => updateField('edgeMargin', Number(e.target.value))}
                                min={0}
                                max={100}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Rotation Section */}
                <div>
                    <div className="text-xs font-medium text-white mb-2 flex items-center gap-2">
                        <RotateCw size={14} className="text-cyan-400" />
                        Rotation
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.allowRotation}
                                onChange={e => updateField('allowRotation', e.target.checked)}
                                className="accent-blue-500"
                            />
                            Allow Part Rotation
                        </label>
                        <div>
                            <label className="text-[10px] text-slate-400">Rotation Step</label>
                            <select
                                value={settings.rotationStep}
                                onChange={e => updateField('rotationStep', Number(e.target.value))}
                                disabled={!settings.allowRotation}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            >
                                <option value={90}>90° (Rectangular)</option>
                                <option value={45}>45°</option>
                                <option value={15}>15°</option>
                                <option value={1}>1° (Free rotation)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Strategy Section */}
                <div>
                    <div className="text-xs font-medium text-white mb-2 flex items-center gap-2">
                        <Layers size={14} className="text-cyan-400" />
                        Strategy
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 space-y-3">
                        <div>
                            <label className="text-[10px] text-slate-400">Sort Strategy</label>
                            <select
                                value={settings.sortStrategy}
                                onChange={e => updateField('sortStrategy', e.target.value as any)}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            >
                                <option value="AREA_DESC">Area (Largest First)</option>
                                <option value="HEIGHT_DESC">Height (Tallest First)</option>
                                <option value="WIDTH_DESC">Width (Widest First)</option>
                                <option value="PERIMETER_DESC">Perimeter</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400">Placement Strategy</label>
                            <select
                                value={settings.placementStrategy}
                                onChange={e => updateField('placementStrategy', e.target.value as any)}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            >
                                <option value="BOTTOM_LEFT">Bottom-Left</option>
                                <option value="BEST_FIT">Best Fit</option>
                                <option value="BEST_SHORT_SIDE">Best Short Side</option>
                                <option value="BEST_LONG_SIDE">Best Long Side</option>
                                <option value="BEST_AREA">Best Area Fit</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-400">Fill Direction</label>
                            <select
                                value={settings.fillDirection}
                                onChange={e => updateField('fillDirection', e.target.value as any)}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                            >
                                <option value="LEFT_TO_RIGHT">Left to Right</option>
                                <option value="BOTTOM_TO_TOP">Bottom to Top</option>
                                <option value="ZIGZAG">Zigzag</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Advanced Options */}
                <div>
                    <div className="text-xs font-medium text-white mb-2 flex items-center gap-2">
                        <Zap size={14} className="text-cyan-400" />
                        Advanced
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-3 space-y-2">
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.multiSheet}
                                onChange={e => updateField('multiSheet', e.target.checked)}
                                className="accent-blue-500"
                            />
                            Multi-Sheet Nesting
                        </label>
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.priorityEnabled}
                                onChange={e => updateField('priorityEnabled', e.target.checked)}
                                className="accent-blue-500"
                            />
                            Use Part Priority
                        </label>
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.grainDirection}
                                onChange={e => updateField('grainDirection', e.target.checked)}
                                className="accent-blue-500"
                            />
                            Respect Grain Direction
                        </label>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between p-3 border-t border-slate-700 bg-slate-900/50">
                <button
                    onClick={onResetDefaults}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                    Reset Defaults
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium"
                >
                    Apply
                </button>
            </div>
        </div>
    );
};

export default NestingSettingsPanel;
