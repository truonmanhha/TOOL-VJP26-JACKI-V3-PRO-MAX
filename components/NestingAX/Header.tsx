import React, { useEffect, useMemo, useState } from 'react';
import { 
  NewNestListIcon, PartLibraryIcon, NestPartsIcon, ManualNestIcon, NestingInfoIcon,
  SaveOffCutIcon, ImportProjectIcon, ExportProjectIcon, ImportDXFIcon, SheetDatabaseIcon,
  LayersIcon, UndoIcon, RedoIcon, FullscreenIcon, ExportDXFIcon, ExportPDFIcon
} from './AnimatedToolbarIcons';
import { Zap } from 'lucide-react';

interface ToolbarButtonProps {
  icon?: React.ReactNode;
  label: string;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, label, color = "text-gray-400", active, onClick }) => (
  <button 
    onClick={onClick}
    className={`toolbar-button flex flex-col items-center justify-center p-0.5 rounded border min-w-[38px]
      ${active 
        ? 'bg-slate-600 border-slate-400 shadow-inner' 
        : 'border-transparent hover:bg-slate-600 hover:border-slate-500 active:bg-slate-700'
      }
      ${!onClick ? 'cursor-default' : ''}
    `}
  >
    <span className={`toolbar-button-icon text-2xl mb-0.5 ${color} w-6 h-6 flex items-center justify-center`}>
      {icon}
    </span>
    <span className="text-[8px] text-center leading-tight whitespace-pre-line text-gray-300">{label}</span>
  </button>
);

interface HeaderProps {
  onNewNestList?: () => void;
  onNestParts?: () => void;
  onManualNest?: () => void;
  onNestingInfo?: () => void;
  onFullScreen?: () => void;
  onToggleLayerPanel?: () => void;
  onExportDXF?: () => void;
  onExportPDF?: () => void;
  onImportProject?: () => void;
  onExportProject?: () => void;
  onPartLibrary?: () => void;
  onImportDXF?: () => void;
  onImportDWG?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isManualNesting?: boolean;
  onOptimizeEntities?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onNewNestList, 
  onNestParts, 
  onManualNest, 
  onNestingInfo,
  onFullScreen,
  onToggleLayerPanel,
  onExportDXF,
  onExportPDF,
  onImportProject,
  onExportProject,
  onPartLibrary,
  onImportDXF,
  onImportDWG,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isManualNesting,
  onOptimizeEntities
}) => {
  const [now, setNow] = useState(() => new Date());
  const [temperatureC, setTemperatureC] = useState<number>(() => {
    const hour = new Date().getHours();
    return 28 + Math.round(Math.sin((hour / 24) * Math.PI * 2) * 4);
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = new Date();
      setNow(next);
      if (next.getSeconds() === 0) {
        const drift = Math.random() > 0.5 ? 1 : -1;
        setTemperatureC(prev => Math.max(18, Math.min(42, prev + drift)));
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeStr = useMemo(
    () => now.toLocaleTimeString('en-GB', { hour12: false }),
    [now]
  );

  return (
    <header className="h-[67px] bg-[#2d2d2d] border-b border-[#3e3e3e] flex items-center justify-between px-2 select-none shadow-lg">
      <div className="flex items-start p-1 space-x-0.5 h-full">
        {/* Nesting Section */}
        <div className="flex flex-col h-full border-r border-slate-600 px-1">
          <div className="flex space-x-0.5 mb-1 flex-1">
            <ToolbarButton 
              icon={<NewNestListIcon className="w-full h-full text-yellow-400" />}
              label={`New Nest\nList`} 
              color="text-yellow-400" 
              onClick={onNewNestList} 
            />
            <ToolbarButton 
              icon={<PartLibraryIcon className="w-full h-full text-green-400" />}
              label={`Part\nLibrary`} 
              color="text-green-400" 
              onClick={onPartLibrary} 
            />
            <ToolbarButton 
              icon={<NestPartsIcon className="w-full h-full text-red-400" />}
              label={`Nest\nParts`} 
              color="text-red-400" 
              onClick={onNestParts} 
            />
            <ToolbarButton 
              icon={<ManualNestIcon className="w-full h-full text-blue-400" />}
              label={`Manual\nNest`} 
              color="text-blue-400" 
              onClick={onManualNest}
              active={isManualNesting}
            />
            <ToolbarButton 
              icon={<NestingInfoIcon className="w-full h-full text-gray-400" />}
              label={`Nesting\nInfo`} 
              color="text-gray-400" 
              onClick={onNestingInfo}
            />
          </div>
          <div className="text-center text-[8px] text-gray-500 -mt-1">Nesting</div>
        </div>

        {/* Database Section */}
        <div className="flex flex-col h-full border-r border-slate-600 px-1">
          <div className="flex space-x-0.5 mb-1 flex-1">
            <ToolbarButton 
              icon={<SaveOffCutIcon className="w-full h-full text-gray-300" />}
              label={`Save\nOff-Cut`} 
              color="text-gray-300" 
            />
            <ToolbarButton 
              icon={<ImportProjectIcon className="w-full h-full text-yellow-400" />}
              label={`Import\nProject`} 
              color="text-yellow-400" 
              onClick={onImportProject} 
            />
            <ToolbarButton 
              icon={<ExportProjectIcon className="w-full h-full text-yellow-400" />}
              label={`Export\nProject`} 
              color="text-yellow-400" 
              onClick={onExportProject} 
            />
            <ToolbarButton
              icon={<ImportDXFIcon className="w-full h-full text-cyan-400" />}
              label={`Import\nDXF`}
              color="text-cyan-400"
              onClick={onImportDXF}
            />
            <ToolbarButton
              icon={<ImportDXFIcon className="w-full h-full text-sky-400" />}
              label={`Import\nDWG`}
              color="text-sky-400"
              onClick={onImportDWG}
            />
            <ToolbarButton 
              icon={<SheetDatabaseIcon className="w-full h-full text-yellow-400" />}
              label={`Sheet\nDatabase`} 
              color="text-yellow-400" 
            />
          </div>
          <div className="text-center text-[8px] text-gray-500 -mt-1">Database</div>
        </div>

        {/* View Section */}
        <div className="flex flex-col h-full border-r border-slate-600 px-1">
          <div className="flex space-x-0.5 mb-1 flex-1">
            <ToolbarButton 
              icon={<LayersIcon className="w-full h-full text-blue-400" />}
              label={`Layers`} 
              color="text-blue-400" 
              onClick={onToggleLayerPanel} 
            />
            <ToolbarButton 
              icon={<UndoIcon className="w-full h-full" />}
              label={`Undo`} 
              color={canUndo ? "text-gray-300" : "text-gray-600"} 
              onClick={onUndo}
            />
            <ToolbarButton 
              icon={<RedoIcon className="w-full h-full" />}
              label={`Redo`} 
              color={canRedo ? "text-gray-300" : "text-gray-600"} 
              onClick={onRedo}
            />
            <ToolbarButton 
              icon={<FullscreenIcon className="w-full h-full text-blue-400" />}
              label={`Full\nScreen`} 
              color="text-blue-400" 
              onClick={onFullScreen}
            />
          </div>
          <div className="text-center text-[8px] text-gray-500 -mt-1">View</div>
        </div>

        {/* Export Section */}
        <div className="flex flex-col h-full px-1">
          <div className="flex space-x-0.5 mb-1 flex-1">
            <ToolbarButton 
              icon={<ExportDXFIcon className="w-full h-full text-green-400" />}
              label={`Export\nDXF`} 
              color="text-green-400" 
              onClick={onExportDXF} 
            />
            <ToolbarButton 
              icon={<ExportPDFIcon className="w-full h-full text-red-400" />}
              label={`Export\nPDF`} 
              color="text-red-400" 
              onClick={onExportPDF}
            />
            <ToolbarButton 
              icon={<Zap className="w-full h-full text-yellow-400" />}
              label={`Giảm\nLag`} 
              color="text-yellow-400" 
              onClick={onOptimizeEntities}
            />
          </div>
          <div className="text-center text-[8px] text-gray-500 -mt-1">Export</div>
        </div>
      </div>

      <div className="flex items-center space-x-4 px-4 bg-[#1e1e1e] h-full border-l border-[#3e3e3e]">
        <div className="flex flex-col items-center">
            <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-[#7ab708] rounded flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/20">AX</div>
                <span className="text-xs font-bold text-gray-200 tracking-wider">NESTING AX 2025</span>
            </div>
            <span className="text-[9px] text-gray-500 font-mono">v3.0.PRO-MAX</span>
            <div className="mt-0.5 flex flex-col items-center font-mono leading-tight">
              <span className="text-[13px] font-black text-red-500 tracking-[0.2em] drop-shadow-[0_0_6px_rgba(239,68,68,0.75)]">
                {timeStr}
              </span>
              <span className="text-[10px] text-red-300/90 font-bold">TEMP {temperatureC}°C</span>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
