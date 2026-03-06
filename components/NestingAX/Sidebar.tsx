import React, { useState, useEffect } from 'react';
import { NestList, Part } from './services/db';

interface SidebarProps {
  nestLists: NestList[];
  activeListId: string | null;
  onSelectNestList: (id: string) => void;
  parts: Part[];
  onContextMenu: (e: React.MouseEvent, listId: string) => void;
  onPartContextMenu: (e: React.MouseEvent, partId: string) => void;
  onSelectPart: (partId: string | null) => void;
  activePartId: string | null;
  nestingMethod: string;
  onUpdatePart?: (partId: string, updates: Partial<Part>) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  nestLists, 
  activeListId, 
  onSelectNestList, 
  parts, 
  onContextMenu,
  onPartContextMenu,
  onSelectPart,
  activePartId,
  nestingMethod,
  onUpdatePart
}) => {
  // Local state for editing values
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editField, setEditField] = useState<keyof Part | null>(null);

  const handleEditStart = (partId: string, field: keyof Part, value: any) => {
    setEditingPartId(partId);
    setEditField(field);
    setEditValue(String(value));
  };

  const handleEditCommit = () => {
    if (editingPartId && editField && onUpdatePart) {
        let finalVal: any = editValue;
        
        // Parse numbers for numeric fields
        if (['required', 'priority'].includes(editField)) {
            const num = parseInt(editValue);
            if (!isNaN(num) && num >= 0) finalVal = num;
            else return; // Invalid number
        } else if (editField === 'mirrored' || editField === 'smallPart' || editField === 'ignore3D') {
            finalVal = editValue === 'true';
        }

        onUpdatePart(editingPartId, { [editField]: finalVal });
    }
    setEditingPartId(null);
    setEditField(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditCommit();
    if (e.key === 'Escape') {
        setEditingPartId(null);
        setEditField(null);
    }
  };

  // Helper to render editable field
  const renderEditable = (part: Part, field: keyof Part, label: string, widthClass: string = "w-8") => {
    const isEditing = editingPartId === part.id && editField === field;
    const value = part[field];

    return (
        <div 
            className={`text-[9px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex items-center hover:border-cyan-500/50 cursor-text mr-1 mb-1`}
            onClick={(e) => { e.stopPropagation(); handleEditStart(part.id, field, value); }}
            title={`Click to edit ${label}`}
        >
            <span className="text-slate-500 font-bold mr-1">{label}:</span>
            {isEditing ? (
                <input 
                    autoFocus
                    className={`${widthClass} bg-transparent text-cyan-400 outline-none p-0`}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleEditCommit}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="truncate max-w-[60px]">{String(value ?? '')}</span>
            )}
        </div>
    );
  };

  return (
    <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-full overflow-hidden select-none">
      <div className="p-3 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
          <span className="material-symbols-outlined text-sm mr-1.5 text-cyan-500">list_alt</span>
          Nest Lists
        </h2>
        <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
          {nestLists.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {nestLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500 italic text-[11px] opacity-60">
            <span className="material-symbols-outlined text-3xl mb-2">inventory_2</span>
            No nest lists created
          </div>
        ) : (
          nestLists.map((list) => {
            const isActive = list.id === activeListId;
            const listParts = isActive ? parts : [];
            
            return (
              <div key={list.id} className="space-y-1">
                <div
                  onClick={() => onSelectNestList(list.id)}
                  onContextMenu={(e) => onContextMenu(e, list.id)}
                  className={`group flex items-center p-2 rounded cursor-pointer transition-all border ${
                    isActive 
                      ? 'bg-slate-700/80 border-cyan-500/50 shadow-md' 
                      : 'bg-slate-800/40 border-transparent hover:bg-slate-700/40 hover:border-slate-600'
                  }`}
                >
                  <div className={`mr-2.5 w-8 h-8 rounded flex items-center justify-center transition-colors ${
                    isActive ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                  }`}>
                    <span className="material-symbols-outlined text-lg">
                      {isActive ? 'folder_open' : 'folder'}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-hidden">
                    <div className={`text-[11px] font-bold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {list.name}
                    </div>
                    <div className="flex items-center text-[9px] text-slate-500 mt-0.5 space-x-2">
                      <span className="flex items-center">
                        <span className="material-symbols-outlined text-[10px] mr-0.5">extension</span>
                        {listParts.length} parts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Display Parts under the active list */}
                {isActive && listParts.length > 0 && (
                  <div className="ml-6 mt-2 space-y-1">
                    {listParts.map(part => {
                      const isPartActive = activePartId === part.id;
                      
                      let svgPathData = "";
                      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                      let hasPoints = false;

                      if (part.cadEntities && part.cadEntities.length > 0) {
                        part.cadEntities.forEach(entity => {
                          const points = entity.points || [];
                          if (points.length < 2) return;
                          hasPoints = true;
                          points.forEach((pt, i) => {
                            minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
                            minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
                            if (i === 0) svgPathData += `M ${pt.x} ${pt.y} `;
                            else svgPathData += `L ${pt.x} ${pt.y} `;
                          });
                          svgPathData += "Z ";
                        });
                      }

                      const geomW = isFinite(maxX - minX) ? (maxX - minX) : 100;
                      const geomH = isFinite(maxY - minY) ? (maxY - minY) : 100;
                      const pad = Math.max(geomW, geomH) * 0.1;
                      const vb = `${minX - pad} ${minY - pad} ${geomW + pad * 2} ${geomH + pad * 2}`;
                      
                      return (
                        <div key={part.id} className="mb-2">
                          <div 
                            onClick={() => onSelectPart(isPartActive ? null : part.id)}
                            onContextMenu={(e) => onPartContextMenu(e, part.id)}
                            className={`flex flex-col p-2 rounded-md border transition-all group cursor-pointer ${
                              isPartActive 
                                ? 'bg-cyan-900/30 border-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.3)]' 
                                : 'bg-slate-900/60 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-start mb-2">
                                <div className="flex flex-col items-center mr-3 shrink-0">
                                <div className={`text-[7px] font-black mb-1 tracking-tighter uppercase transition-colors ${isPartActive ? 'text-cyan-400' : 'text-slate-500'}`}>Preview</div>
                                <div className={`w-16 h-16 bg-[#020408] border rounded flex items-center justify-center overflow-hidden relative shadow-inner transition-colors ${
                                    isPartActive ? 'border-cyan-500' : 'border-slate-600 group-hover:border-cyan-400'
                                }`}>
                                    {hasPoints ? (
                                    <svg viewBox={vb} className="w-full h-full p-1" preserveAspectRatio="xMidYMid meet">
                                        <path 
                                        d={svgPathData}
                                        fill={isPartActive ? "rgba(34, 211, 238, 0.3)" : "rgba(34, 211, 238, 0.15)"}
                                        stroke={isPartActive ? "#22d3ee" : "#22d3ee"}
                                        strokeWidth={Math.max(geomW, geomH) / (isPartActive ? 30 : 40)}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={isPartActive ? "drop-shadow-[0_0_3px_rgba(34,211,238,1)]" : ""}
                                        />
                                    </svg>
                                    ) : (
                                    <div className="text-[8px] text-red-500 font-bold text-center leading-none uppercase">No<br/>Preview</div>
                                    )}
                                </div>
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <div className={`font-bold text-[11px] truncate leading-tight mb-1 ${isPartActive ? 'text-cyan-300' : 'text-blue-100'}`} title={part.name}>
                                        {renderEditable(part, 'name', 'Name', 'w-full')}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono italic mb-1">
                                        {renderEditable(part, 'dimensions', 'Dim', 'w-full')}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Editable Fields Grid */}
                            <div className="flex flex-wrap items-center bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                                {renderEditable(part, 'required', 'QTY')}
                                {renderEditable(part, 'priority', 'PRI')}
                                {renderEditable(part, 'mirrored', 'Mir', 'w-10')}
                                {renderEditable(part, 'rotation', 'Rot', 'w-12')}
                                {renderEditable(part, 'smallPart', 'Sml', 'w-10')}
                                {renderEditable(part, 'kitNumber', 'Kit', 'w-12')}
                                {renderEditable(part, 'isNested', 'Nst', 'w-10')}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-700 bg-slate-900/30">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Nesting Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
        </div>
        <div className="bg-slate-800/60 rounded p-2 border border-slate-700/50">
          <div className="flex justify-between text-[9px]">
            <span className="text-slate-500 italic">Algorithm:</span>
            <span className="text-cyan-400 font-mono">{nestingMethod}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
