import React, { useState, useRef, useEffect } from 'react';
import { SnapMode, ALL_SNAP_MODES, SNAP_INDICATOR_COLORS, SNAP_INDICATOR_LABELS } from './services/snapService';
import { undoManager } from './services/undoManager';

interface FooterProps {
  x: number;
  y: number;
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
}

const Footer: React.FC<FooterProps> = ({ 
  x, y, 
  snapEnabled, onToggleSnap, activeSnaps, onToggleSnapMode,
  orthoEnabled, onToggleOrtho,
  activeTool,
  entityCount = 0,
  selectionCount = 0,
  activeLayer = 'Layer 0',
  onExport
}) => {
  const [showSnapPanel, setShowSnapPanel] = useState(false);
  const snapPanelRef = useRef<HTMLDivElement>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

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

  return (
    <footer className="bg-gradient-to-b from-slate-800 to-slate-900 border-t border-slate-600 py-1 px-2 flex items-center justify-between text-[11px] h-6 flex-none z-20">
      <div className="flex items-center space-x-6">
        {/* Coordinates Display */}
        <div className="flex items-center space-x-2 text-blue-300 font-mono bg-slate-800 border border-slate-600 px-2 py-0.5 rounded-sm min-w-[150px]">
          <span>X {x.toFixed(1)}</span>
          <span>Y {y.toFixed(2)}</span>
        </div>
        
        {/* Status Bar info (Task 24) */}
        <div className="flex items-center space-x-4 border-r border-slate-700 pr-4">
          <div className={`${activeTool ? 'text-emerald-300 font-medium' : 'text-slate-400'}`}>
            {activeTool ? `Tool: ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}` : 'Ready'}
          </div>
          <div className="text-gray-500">
             Entities: <span className="text-gray-200">{entityCount}</span>
          </div>
          {selectionCount > 0 && (
             <div className="text-yellow-500 font-bold bg-yellow-900/20 px-1 rounded animate-pulse">
               Selected: {selectionCount}
             </div>
          )}
          <div className="text-gray-500">
             Layer: <span className="text-blue-300">{activeLayer}</span>
          </div>
        </div>

        {/* Undo/Redo Indicators */}
        <div className="flex items-center space-x-1 border-l border-slate-600 pl-4 ml-2">
          <button
            onClick={() => undoManager.canUndo() && undoManager.undo()}
            disabled={!undoState.canUndo}
            className={`px-1.5 py-0.5 rounded-sm transition-colors select-none ${
              undoState.canUndo 
                ? 'text-blue-300 hover:bg-slate-700 cursor-pointer' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title={undoState.canUndo ? `Undo: ${undoState.undoDesc} (Ctrl+Z)` : 'Nothing to undo'}
          >
            ↩
          </button>
          <button
            onClick={() => undoManager.canRedo() && undoManager.redo()}
            disabled={!undoState.canRedo}
            className={`px-1.5 py-0.5 rounded-sm transition-colors select-none ${
              undoState.canRedo 
                ? 'text-blue-300 hover:bg-slate-700 cursor-pointer' 
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title={undoState.canRedo ? `Redo: ${undoState.redoDesc} (Ctrl+Y)` : 'Nothing to redo'}
          >
            ↪
          </button>
          {(undoState.canUndo || undoState.canRedo) && (
            <span className="text-slate-500 ml-1 truncate max-w-[120px]">
              {undoState.canUndo ? undoState.undoDesc : undoState.redoDesc}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1">
        {/* Action Icons */}
        <div className="flex mr-4 space-x-2 border-r border-slate-600 pr-4">
          <span className="material-icons-outlined text-sm text-red-500 cursor-pointer hover:text-red-400">home</span>
          <span className="material-icons-outlined text-sm text-blue-500 cursor-pointer hover:text-blue-400">transform</span>
          <span className="material-icons-outlined text-sm text-green-500 cursor-pointer hover:text-green-400">straighten</span>
        </div>

        {/* Toggle Buttons */}
        <div className="relative" ref={snapPanelRef}>
          <button 
            onClick={onToggleSnap}
            onContextMenu={(e) => { e.preventDefault(); setShowSnapPanel(prev => !prev); }}
            className={`px-2 py-0.5 border border-slate-500 text-gray-300 
              ${snapEnabled ? 'shadow-retro-pressed bg-emerald-700 text-emerald-100' : 'shadow-retro bg-slate-700 hover:bg-slate-600'}
              active:shadow-retro-pressed active:bg-slate-600 transition-colors select-none`}
            title="Left-click: toggle SNAP | Right-click: snap modes"
          >
            SNAP
          </button>

          {/* Snap Modes Popup */}
          {showSnapPanel && (
            <div className="absolute bottom-full left-0 mb-1 bg-slate-800 border border-slate-500 rounded shadow-lg py-1 min-w-[160px] z-50">
              <div className="px-2 py-0.5 text-[10px] text-slate-400 border-b border-slate-600 mb-1">Snap Modes</div>
              {ALL_SNAP_MODES.map(mode => (
                <button
                  key={mode}
                  onClick={() => onToggleSnapMode(mode)}
                  className={`w-full flex items-center px-2 py-0.5 text-left hover:bg-slate-700 transition-colors ${
                    activeSnaps.has(mode) ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  <span 
                    className="w-3 h-3 mr-2 rounded-sm border flex items-center justify-center text-[8px]"
                    style={{ 
                      borderColor: SNAP_INDICATOR_COLORS[mode],
                      backgroundColor: activeSnaps.has(mode) ? SNAP_INDICATOR_COLORS[mode] + '40' : 'transparent'
                    }}
                  >
                    {activeSnaps.has(mode) && '\u2713'}
                  </span>
                  <span style={{ color: activeSnaps.has(mode) ? SNAP_INDICATOR_COLORS[mode] : undefined }}>
                    {SNAP_INDICATOR_LABELS[mode]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => onExport ? setShowExportMenu(!showExportMenu) : null}
            disabled={!onExport}
            className={`px-2 py-0.5 border border-slate-500 text-gray-300 transition-colors select-none flex items-center gap-1 ${
              !onExport
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : showExportMenu
                ? 'shadow-retro-pressed bg-purple-600/30 border border-purple-500/50 text-purple-400'
                : 'shadow-retro bg-slate-700 hover:bg-slate-600'
            }`}
            title="Export visible entities (DXF/SVG/PDF)"
          >
            <span className="material-icons text-[12px]">download</span>
            EXPORT
          </button>
          {showExportMenu && onExport && (
            <div className="absolute bottom-full mb-1 right-0 bg-slate-800 border border-slate-600 rounded shadow-xl z-[70] min-w-[140px] py-1">
              <button
                onClick={() => { onExport('dxf'); setShowExportMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-blue-600/40 flex items-center gap-2"
              >
                <span className="material-icons text-[14px] text-blue-400">description</span>
                Export DXF
              </button>
              <button
                onClick={() => { onExport('svg'); setShowExportMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-green-600/40 flex items-center gap-2"
              >
                <span className="material-icons text-[14px] text-green-400">image</span>
                Export SVG
              </button>
              <button
                onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                className="w-full px-3 py-1.5 text-left text-[11px] text-slate-200 hover:bg-red-600/40 flex items-center gap-2"
              >
                <span className="material-icons text-[14px] text-red-400">picture_as_pdf</span>
                Export PDF
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={onToggleOrtho}
          className={`px-2 py-0.5 border border-slate-500 text-gray-300 
            ${orthoEnabled ? 'shadow-retro-pressed bg-blue-700 text-blue-100' : 'shadow-retro bg-slate-700 hover:bg-slate-600'}
            active:shadow-retro-pressed active:bg-slate-600 transition-colors select-none`}
        >
          ORTHO
        </button>
        <FooterToggle label="AUTO" />
        <FooterToggle label="HIDE" />
      </div>
    </footer>
  );
};

const FooterToggle: React.FC<{ label: string }> = ({ label }) => {
  const [active, setActive] = React.useState(false);
  
  return (
    <button 
      onClick={() => setActive(!active)}
      className={`px-2 py-0.5 border border-slate-500 text-gray-300 
        ${active ? 'shadow-retro-pressed bg-slate-600' : 'shadow-retro bg-slate-700 hover:bg-slate-600'}
        active:shadow-retro-pressed active:bg-slate-600 transition-colors select-none`}
    >
      {label}
    </button>
  );
};

export default Footer;