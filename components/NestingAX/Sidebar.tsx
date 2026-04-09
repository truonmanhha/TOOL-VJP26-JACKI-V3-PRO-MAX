import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Layer {
  id: string;
  name: string;
  color: string;
  visible?: boolean;
  locked?: boolean;
}

interface SidebarProps {
  layers?: Layer[];
  activeLayerId?: string;
  onLayerVisibility?: (id: string) => void;
  onLayerActive?: (id: string) => void;
}

const PropRow: React.FC<{ label: string; value: string | React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between items-center h-[26px] px-3 border-b border-[#1a2330] hover:bg-[#303c48] group cursor-default">
    <span className="text-[11px] text-[#8a9aaa] w-[120px] flex-none">{label}</span>
    <div className="flex items-center text-[11.5px] text-[#dde4ec] flex-1 justify-end gap-1">
      {value}
      <svg viewBox="0 0 24 24" className="w-[12px] h-[12px] fill-current text-[#4a5a6a] opacity-0 group-hover:opacity-100"><path d="M7 10l5 5 5-5z" /></svg>
    </div>
  </div>
);

const Sidebar: React.FC<SidebarProps> = ({ layers = [], activeLayerId, onLayerVisibility, onLayerActive }) => {
  const [activePanel, setActivePanel] = useState<string | null>('properties');

  const panels = [
    {
      id: 'properties', label: 'Prop.',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" /></svg>
    },
    {
      id: 'layers', label: 'Layers',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
    },
    {
      id: 'blocks', label: 'Blocks',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" /></svg>
    },
    {
      id: 'xrefs', label: 'Xrefs',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg>
    },
    {
      id: 'traces', label: 'Traces',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
    },
    {
      id: 'activity', label: 'Activity',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
    },
    {
      id: 'issues', label: 'Issues',
      icon: <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
    },
  ];

  const renderPanel = () => {
    if (activePanel === 'properties') {
      return (
        <div className="flex flex-col h-full bg-[#27313c] border-r border-[#111820]">
          <div className="flex items-center justify-between h-[40px] px-3 bg-[#2c3845] border-b border-[#111820] flex-none">
            <span className="text-[13px] font-semibold text-[#cdd9e4]">Object Properties</span>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#6a7a8a] cursor-pointer hover:text-white"><path d="M10 14l2-2 2 2 1.41-1.41L14 11l1.41-1.41L14 8.17 12.41 9.59l-1.41-1.42L9.59 9.58 11 11l-1.41 1.41z" /></svg>
          </div>
          <div className="flex-1 overflow-y-auto pt-0.5">
            <PropRow label="Layer" value="0" />
            <PropRow label="Color" value={<><div className="w-3 h-3 bg-white border border-[#4a5a6a]"></div>ByLayer</>} />
            <PropRow label="Linetype" value="ByLayer" />
            <PropRow label="Linetype scale" value="1" />
            <PropRow label="Lineweight" value="ByLayer" />
            <PropRow label="Dimension style" value="Decimal-3" />
            <PropRow label="Text style" value="Arial_3" />
            <PropRow label="Multileader style" value="ML_3" />
          </div>
          {/* Resize handle */}
          <div className="h-[8px] flex items-center justify-center border-t border-b border-[#111820] bg-[#232d38] cursor-ns-resize flex-none">
            <div className="w-8 h-[2px] bg-[#3a4a5a] rounded-full"></div>
          </div>
          <div className="flex items-center justify-between h-[40px] px-3 bg-[#2c3845] border-b border-[#111820] flex-none">
            <span className="text-[13px] font-semibold text-[#cdd9e4]">Model Properties</span>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-[#6a7a8a]"><path d="M7 10l5 5 5-5z" /></svg>
          </div>
          <div className="overflow-y-auto">
            <PropRow label="Plot style" value="None" />
          </div>
        </div>
      );
    }
    if (activePanel === 'layers') {
      return (
        <div className="flex flex-col h-full bg-[#27313c] border-r border-[#111820]">
          <div className="flex items-center h-[40px] px-3 bg-[#2c3845] border-b border-[#111820] flex-none">
            <span className="text-[13px] font-semibold text-[#cdd9e4]">Layers</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {layers.length > 0 ? (
              layers.map(layer => (
                <div
                  key={layer.id}
                  className={`flex items-center h-[28px] px-3 gap-2 cursor-pointer border-b border-[#1a2330] ${activeLayerId === layer.id ? 'bg-[#1f4060]' : 'hover:bg-[#303c48]'}`}
                  onClick={() => onLayerActive?.(layer.id)}
                >
                  <button className="text-[#8a9aaa] hover:text-white" onClick={(e) => { e.stopPropagation(); onLayerVisibility?.(layer.id); }}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
                  </button>
                  <div className="w-3 h-3 rounded-sm border border-[#4a5a6a]" style={{ backgroundColor: layer.color }}></div>
                  <span className="text-[12px] text-[#cdd9e4]">{layer.name}</span>
                </div>
              ))
            ) : (
              <div className="px-3 py-3 text-[11px] text-[#6a7a8a]">No layers found</div>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full bg-[#27313c] border-r border-[#111820]">
        <div className="flex items-center h-[40px] px-3 bg-[#2c3845] border-b border-[#111820] flex-none">
          <span className="text-[13px] font-semibold text-[#cdd9e4] capitalize">{activePanel}</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-[11px] text-[#6a7a8a] p-4 text-center">
          Select objects to view properties
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full z-50 relative pointer-events-none">
      {/* Icon Rail */}
      <aside className="w-[56px] flex-none h-full bg-[#2c3845] border-r border-[#111820] flex flex-col items-center pt-1 pointer-events-auto z-10">
        {panels.map((panel) => {
          const isActive = activePanel === panel.id;
          return (
            <button
              key={panel.id}
              onClick={() => setActivePanel(isActive ? null : panel.id)}
              className={`flex flex-col items-center justify-center w-full h-[56px] gap-0.5 border-none cursor-pointer transition-colors ${isActive ? 'bg-[#1a2330] text-[#4fc2f8]' : 'bg-transparent text-[#8a9aaa] hover:bg-[#354050] hover:text-[#cdd9e4]'}`}
            >
              {panel.icon}
              <span className="text-[9px] font-semibold tracking-tight">{panel.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Flyout Panel */}
      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 276, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
            className="h-full pointer-events-auto overflow-hidden flex-none"
          >
            <div className="w-[276px] h-full">
              {renderPanel()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidebar;
