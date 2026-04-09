import React, { useState } from 'react';
import ribbonData from '../../extracted_ribbon.json';

interface CommandsRibbonProps {
  onSelectTool?: (tool: string) => void;
  activeTool?: string | null;
}

const CommandsRibbon: React.FC<CommandsRibbonProps> = ({ onSelectTool, activeTool }) => {
  const [ribbonJSON] = useState<any[]>(Array.isArray(ribbonData) ? ribbonData : []);

  if (ribbonJSON.length === 0) return <div className="h-[66px] bg-[#222831] border-b border-[#0d1014]"></div>;

  return (
    <div className="w-full bg-[#27303a] border-b border-[#111820] select-none flex flex-col" style={{ zIndex: 90 }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .acad-ribbon-btn svg { width: 24px; height: 24px; display: block; }
        .acad-ribbon-btn svg .greyDefault, .acad-ribbon-btn svg [class*="cls-1"] { fill: #9AACBA !important; }
        .acad-ribbon-btn svg .blueDefault, .acad-ribbon-btn svg [class*="cls-2"] { fill: #4FC2F8 !important; }
        .acad-ribbon-btn svg .greyAccent { fill: #6B7D8E !important; }
        .acad-ribbon-btn:hover svg .greyDefault { fill: #B5C7D4 !important; }
        .acad-ribbon-btn:hover svg .blueDefault { fill: #81D4FA !important; }
        .acad-ribbon-btn.active { background: rgba(33,133,208,0.25) !important; }
        .acad-ribbon-btn.active svg .greyDefault { fill: #CFD8DC !important; }
        .acad-ribbon-btn.active svg .blueDefault { fill: #81D4FA !important; }
      ` }} />

      {/* Single flat ribbon row */}
      <div className="flex items-stretch h-[66px] overflow-x-auto overflow-y-hidden">
        {ribbonJSON.map((category: any, catIdx: number) => (
          <div key={catIdx} className="flex flex-col flex-none">
            {/* Category tools row */}
            <div className="flex items-center gap-0.5 px-2 pt-1.5 pb-0.5 flex-1">
              {category.commands.map((tool: any, cIdx: number) => {
                const toolId = tool.name.toLowerCase();
                const isActive = activeTool === toolId;
                return (
                  <button
                    key={cIdx}
                    onClick={() => onSelectTool?.(toolId)}
                    className={`acad-ribbon-btn ${isActive ? 'active' : ''} flex flex-col items-center justify-center w-[40px] h-[46px] rounded-[2px] border-none bg-transparent cursor-pointer transition-all hover:bg-[#323d48]`}
                    title={tool.name}
                  >
                    <div dangerouslySetInnerHTML={{ __html: tool.svg }} />
                  </button>
                );
              })}
            </div>
            {/* Category label at bottom */}
            <div className="flex items-center justify-center h-[14px] px-2 border-r border-[#1a2330] relative">
              <span className="text-[10px] text-[#7a8ea0] font-medium tracking-wide">{category.title}</span>
              {catIdx < ribbonJSON.length - 1 && (
                <div className="absolute right-0 top-0 h-full w-px bg-[#1a2330]"></div>
              )}
            </div>
          </div>
        ))}
        <div className="flex-1" />
      </div>
    </div>
  );
};

export default CommandsRibbon;
