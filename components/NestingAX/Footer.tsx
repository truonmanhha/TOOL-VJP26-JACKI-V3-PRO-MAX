import React, { useState, useRef, useEffect } from 'react';
import { SnapMode, ALL_SNAP_MODES, SNAP_INDICATOR_COLORS, SNAP_INDICATOR_LABELS } from './services/snapService';
import { undoManager } from './services/undoManager';

interface FooterProps {
  x: number;
  y: number;
  zoom?: number;
  snapEnabled: boolean;
  onToggleSnap: () => void;
  activeSnaps: Set<SnapMode>;
  onToggleSnapMode: (mode: SnapMode) => void;
  orthoEnabled: boolean;
  onToggleOrtho: () => void;
  activeTool?: string | null;
  entityCount?: number;
  selectionCount?: number;
  activeLayer?: string;
  onExport?: (format: 'dxf' | 'svg' | 'pdf') => void;

  // AutoCAD Dynamic Input / Status integration
  commandPrompt?: string;
  commandOptions?: string[];
  onCommandOptionClick?: (opt: string) => void;
  commandInput?: string;
  onCommandInputChange?: (val: string) => void;
  onCommandInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  showDynInput?: boolean;
  showCrosshair?: boolean;
  crosshairSize?: number;
  onCrosshairSizeChange?: (size: number) => void;
  onCloseAllOverlays?: () => void;
}

const Footer: React.FC<FooterProps> = ({
  x, y, zoom = 1,
  snapEnabled, onToggleSnap, activeSnaps, onToggleSnapMode,
  orthoEnabled, onToggleOrtho,
  activeTool,
  entityCount = 0,
  selectionCount = 0,
  activeLayer = 'Layer 0',
  onExport,
  commandPrompt,
  commandOptions,
  onCommandOptionClick,
  commandInput = '',
  onCommandInputChange,
  onCommandInputKeyDown,
  showDynInput = true,
  showCrosshair = true,
  crosshairSize = 100,
  onCrosshairSizeChange,
  onCloseAllOverlays
}) => {
  const [showSnapPanel, setShowSnapPanel] = useState(false);
  const snapPanelRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Undo/Redo reactive state from singleton
  const [undoState, setUndoState] = useState({
    canUndo: undoManager.canUndo(),
    canRedo: undoManager.canRedo(),
    undoDesc: undoManager.getUndoDescription(),
    redoDesc: undoManager.getRedoDescription()
  });

  useEffect(() => {
    const unsubscribe = undoManager.subscribe(() => {
      setUndoState({
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
        undoDesc: undoManager.getUndoDescription(),
        redoDesc: undoManager.getRedoDescription()
      });
    });
    return unsubscribe;
  }, []);

  // Close snap panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (snapPanelRef.current && !snapPanelRef.current.contains(e.target as Node)) {
        setShowSnapPanel(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showSnapPanel || showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSnapPanel, showExportMenu]);

  // Focus command input on global keydown (A-Z) if enabled
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        commandInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <footer className="bg-slate-900/95 border-t border-slate-700 flex items-center justify-between px-2 h-7 flex-none z-50 select-none font-mono text-[11px]" onWheel={e => e.preventDefault()}>

      {/* LEFT: Coordinates + Zoom + Selection Info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-white/80">
          <span className="text-cyan-400 font-bold">X:</span>
          <span className="w-16 text-green-400">{x.toFixed(2)}</span>
          <span className="text-cyan-400 font-bold ml-1">Y:</span>
          <span className="w-16 text-green-400">{y.toFixed(2)}</span>
        </div>

        <div className="h-4 w-px bg-slate-700"></div>

        <div className="flex items-center gap-1 text-white/60">
          <span>Zoom:</span>
          <span className="text-yellow-400">{Math.round(zoom * 100)}%</span>
        </div>

        {selectionCount > 0 && (
          <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-900/20 px-1.5 rounded animate-pulse border border-yellow-700/30">
            <span className="material-icons-outlined text-[12px]">check_box</span>
            <span>{selectionCount} Selected</span>
          </div>
        )}
      </div>

      {/* CENTER: Command Input (AutoCAD Style) */}
      <div className="flex-1 max-w-2xl mx-4 h-full flex items-center justify-center">
        <div className="flex-1 h-[22px] flex items-center bg-black/40 border border-slate-700 px-2 rounded-sm overflow-hidden focus-within:border-cyan-500/50 transition-colors">
          <div className="text-white/40 mr-2 flex-none">
            <span className="material-icons-outlined text-[14px]">chevron_right</span>
          </div>
          
          {/* Command Prompt & Options (AutoCAD Layout) */}
          {(commandPrompt || (commandOptions && commandOptions.length > 0)) && (
            <div className="flex items-center gap-1 mr-2 text-slate-300 whitespace-nowrap">
              {commandPrompt && <span>{commandPrompt}</span>}
              {commandOptions && commandOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onCommandOptionClick?.(opt)}
                  className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                >
                  [{opt}]
                </button>
              ))}
              <span className="text-slate-400">:</span>
            </div>
          )}

          <input
            ref={commandInputRef}
            type="text"
            className="w-full h-full bg-transparent text-white font-mono text-[11px] outline-none placeholder-slate-600"
            placeholder={
              !commandPrompt && !activeTool 
                ? "Type command..." 
                : (!commandPrompt && activeTool ? `ACTIVE: ${activeTool.toUpperCase()}` : "")
            }
            value={commandInput}
            onChange={(e) => onCommandInputChange?.(e.target.value)}
            onKeyDown={onCommandInputKeyDown}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      </div>

      {/* RIGHT: Status Indicators & Tools */}
      <div className="flex items-center gap-2">

        {/* Undo/Redo Mini */}
        <div className="flex items-center bg-slate-800/50 border border-slate-700 rounded-sm overflow-hidden h-[22px]">
          <button
            onClick={() => undoManager.canUndo() && undoManager.undo()}
            disabled={!undoState.canUndo}
            className={`w-6 h-full flex items-center justify-center transition-colors ${undoState.canUndo ? 'text-blue-400 hover:bg-slate-700' : 'text-slate-700'
              }`}
            title="Undo (Ctrl+Z)"
          >
            <span className="material-icons-outlined text-[14px]">undo</span>
          </button>
          <button
            onClick={() => undoManager.canRedo() && undoManager.redo()}
            disabled={!undoState.canRedo}
            className={`w-6 h-full flex items-center justify-center border-l border-slate-700 transition-colors ${undoState.canRedo ? 'text-blue-400 hover:bg-slate-700' : 'text-slate-700'
              }`}
            title="Redo (Ctrl+Y)"
          >
            <span className="material-icons-outlined text-[14px]">redo</span>
          </button>
        </div>

        <div className="h-4 w-px bg-slate-700"></div>

        {/* Feature Toggles */}
        <div className="flex items-center gap-1">
          {/* ORTHO */}
          <button
            onClick={onToggleOrtho}
            className={`px-1.5 h-[22px] rounded-sm border font-bold transition-colors ${orthoEnabled ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
              }`}
            title="Ortho Mode (F8)"
          >
            ORTHO
          </button>

          {/* SNAP */}
          <div className="flex items-center bg-slate-800 h-[22px] relative" ref={snapPanelRef}>
            <button
              onClick={onToggleSnap}
              className={`px-1.5 h-full font-bold transition-colors border border-slate-700 rounded-l-sm ${snapEnabled ? 'bg-blue-600 border-blue-500 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              title="Object Snap (F3)"
            >
              SNAP
            </button>
            <button
              onClick={() => setShowSnapPanel(!showSnapPanel)}
              className={`w-4 h-full flex items-center justify-center border-y border-r border-slate-700 rounded-r-sm transition-colors ${showSnapPanel ? 'bg-cyan-900/40 text-cyan-300' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <span className="material-icons-outlined text-[14px]">
                {showSnapPanel ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showSnapPanel && (
              <div className="absolute bottom-full right-0 mb-1 bg-slate-900 border border-slate-700 rounded shadow-2xl py-1 min-w-[180px] z-[100]">
                <div className="px-3 py-1 text-[10px] text-cyan-400 border-b border-slate-800 mb-1 font-bold uppercase tracking-wider">Object Snap Settings</div>
                {ALL_SNAP_MODES.map(mode => (
                  <label key={mode} className="w-full flex items-center px-3 py-1.5 hover:bg-slate-800 transition-colors cursor-pointer text-slate-300">
                    <input type="checkbox" checked={activeSnaps.has(mode)} onChange={() => onToggleSnapMode(mode)} className="mr-3 h-3.5 w-3.5 bg-slate-800 border-slate-600 text-cyan-500 rounded-sm" />
                    <span className="material-icons-outlined text-sm mr-2" style={{ color: SNAP_INDICATOR_COLORS[mode] }}>
                      {{ point: 'square', midpoint: 'change_history', center: 'radio_button_unchecked', intersection: 'close', tangent: 'touch_app', perpendicular: 'grid_on' }[mode]}
                    </span>
                    <span className="text-[11px]">{SNAP_INDICATOR_LABELS[mode]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* DYN & CROSSHAIR Indicators (AutoCAD style) */}
          <div className={`px-1.5 h-[22px] flex items-center rounded-sm border font-bold ${showDynInput ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-600'}`} title="Dynamic Input">
            DYN
          </div>
          <div className={`px-1.5 h-[22px] flex items-center rounded-sm border font-bold ${showCrosshair ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-600'}`} title="Crosshair">
            +
          </div>
        </div>

        <div className="h-4 w-px bg-slate-700 mx-1"></div>

        {/* Crosshair Size (if on) */}
        {showCrosshair && (
          <div className="flex items-center gap-1.5 text-white/50">
            <span className="material-icons-outlined text-[14px]">straighten</span>
            <input
              type="number" className="w-10 h-[18px] bg-slate-800 border border-slate-700 rounded text-center text-emerald-400 font-bold text-[10px] outline-none focus:border-emerald-500"
              min={10} max={100} value={crosshairSize}
              onChange={e => onCrosshairSizeChange?.(Number(e.target.value))}
            />
            <span className="text-[10px] w-4">%</span>
          </div>
        )}

        {/* EXPORT and CLOSE ALL */}
        <div className="flex items-center gap-1 ml-1" ref={exportMenuRef}>
          <button
            onClick={() => onExport && setShowExportMenu(!showExportMenu)}
            className={`px-2 h-[22px] rounded-sm border border-slate-700 bg-slate-800 text-slate-300 flex items-center gap-1 transition-colors hover:bg-slate-700 ${showExportMenu ? 'border-purple-500/50 text-purple-400' : ''}`}
          >
            <span className="material-icons text-[12px]">download</span>
            EXPORT
          </button>

          {showExportMenu && onExport && (
            <div className="absolute bottom-full mb-1 right-8 bg-slate-900 border border-slate-700 rounded shadow-2xl py-1 min-w-[120px] z-[100]">
              {(['dxf', 'svg', 'pdf'] as const).map(fmt => (
                <button key={fmt} onClick={() => { onExport(fmt); setShowExportMenu(false); }} className="w-full px-3 py-1.5 text-left text-slate-300 hover:bg-slate-800 flex items-center gap-2">
                  <span className="material-icons text-[14px] text-slate-500">{{ dxf: 'description', svg: 'image', pdf: 'picture_as_pdf' }[fmt]}</span>
                  <span className="uppercase text-[10px]">Export {fmt}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={onCloseAllOverlays}
            className="w-6 h-[22px] flex items-center justify-center rounded-sm border border-slate-700 bg-slate-800 text-slate-500 hover:bg-red-900/40 hover:border-red-500 hover:text-red-400 transition-colors"
            title="Close all panels"
          >
            <span className="material-icons-outlined text-[14px]">close</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
