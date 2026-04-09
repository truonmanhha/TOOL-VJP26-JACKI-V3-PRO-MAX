// ============================================================
// VJP26 NESTING MENU - ALPHACAM STYLE
// Ribbon Menu for Nesting Operations
// ============================================================

import React from 'react';
import {
    Package, Layers, Settings, Play, Plus, Trash2, Save, FolderOpen,
    LayoutGrid, Maximize2, RotateCw, Percent, Download, FileText,
    RefreshCw, Pause, ChevronDown
} from 'lucide-react';

export interface NestingMenuProps {
    onNewProject: () => void;
    onOpenProject: () => void;
    onSaveProject: () => void;
    onAddParts: () => void;
    onClearParts: () => void;
    onStartNesting: () => void;
    onStopNesting: () => void;
    onShowSheetManager: () => void;
    onShowSettings: () => void;
    onExportReport: () => void;
    isNesting: boolean;
    progress: number;
    utilization: number;
}

const NestingMenu: React.FC<NestingMenuProps> = ({
    onNewProject,
    onOpenProject,
    onSaveProject,
    onAddParts,
    onClearParts,
    onStartNesting,
    onStopNesting,
    onShowSheetManager,
    onShowSettings,
    onExportReport,
    isNesting,
    progress,
    utilization
}) => {
    // Menu Button Component
    const MenuBtn: React.FC<{
        icon: React.ReactNode;
        label: string;
        onClick?: () => void;
        disabled?: boolean;
        active?: boolean;
        danger?: boolean;
        primary?: boolean;
    }> = ({ icon, label, onClick, disabled, active, danger, primary }) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`
                flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-700 cursor-pointer'}
                ${active ? 'bg-blue-600 text-white' : 'text-slate-300'}
                ${danger ? 'hover:bg-red-600/20 text-red-400' : ''}
                ${primary ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg hover:shadow-blue-500/25' : ''}
            `}
            title={label}
        >
            {icon}
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );

    // Separator
    const Separator = () => <div className="w-px h-12 bg-slate-700 mx-1" />;

    // Section Header
    const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
        <div className="flex flex-col">
            <div className="flex items-center gap-1 px-1">
                {children}
            </div>
            <span className="text-[10px] text-slate-500 text-center mt-1">{title}</span>
        </div>
    );

    return (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-4 py-2">
            <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="flex items-center gap-2 pr-4 border-r border-slate-700">
                    <Package className="w-6 h-6 text-cyan-400" />
                    <span className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        NESTING
                    </span>
                </div>

                {/* Project Section */}
                <Section title="Project">
                    <MenuBtn icon={<Plus size={18} />} label="New" onClick={onNewProject} />
                    <MenuBtn icon={<FolderOpen size={18} />} label="Open" onClick={onOpenProject} />
                    <MenuBtn icon={<Save size={18} />} label="Save" onClick={onSaveProject} />
                </Section>

                <Separator />

                {/* Parts Section */}
                <Section title="Parts">
                    <MenuBtn icon={<Plus size={18} />} label="Add Part" onClick={onAddParts} primary />
                    <MenuBtn icon={<Trash2 size={18} />} label="Clear" onClick={onClearParts} danger />
                </Section>

                <Separator />

                {/* Sheet Section */}
                <Section title="Sheets">
                    <MenuBtn icon={<LayoutGrid size={18} />} label="Sheet Manager" onClick={onShowSheetManager} />
                </Section>

                <Separator />

                {/* Nesting Section */}
                <Section title="Nesting">
                    {!isNesting ? (
                        <MenuBtn
                            icon={<Play size={18} />}
                            label="Auto Nest"
                            onClick={onStartNesting}
                            primary
                        />
                    ) : (
                        <MenuBtn
                            icon={<Pause size={18} />}
                            label="Stop"
                            onClick={onStopNesting}
                            danger
                        />
                    )}
                    <MenuBtn icon={<Settings size={18} />} label="Settings" onClick={onShowSettings} />
                </Section>

                <Separator />

                {/* Export Section */}
                <Section title="Export">
                    <MenuBtn icon={<FileText size={18} />} label="Report" onClick={onExportReport} />
                    <MenuBtn icon={<Download size={18} />} label="Export" onClick={() => { }} />
                </Section>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Progress & Stats */}
                {isNesting && (
                    <div className="flex items-center gap-4 px-4 py-2 bg-slate-800/50 rounded-lg">
                        <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                        <div className="w-32">
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Nesting...</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Utilization Badge */}
                <div className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                    ${utilization >= 80 ? 'bg-green-600/20 text-green-400' :
                        utilization >= 60 ? 'bg-yellow-600/20 text-yellow-400' :
                            'bg-slate-700 text-slate-400'}
                `}>
                    <Percent size={16} />
                    <span>{utilization.toFixed(1)}%</span>
                    <span className="text-xs font-normal opacity-70">Utilization</span>
                </div>
            </div>
        </div>
    );
};

export default NestingMenu;
