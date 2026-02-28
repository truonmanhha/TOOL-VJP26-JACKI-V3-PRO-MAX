
import React, { useState } from 'react';
import { Layer, CadEntity } from './services/db';
import { layerManager } from './services/layerManager';

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string;
  onLayerChange: () => void;
  entities: CadEntity[];
  onEntitiesUpdate: (entities: CadEntity[]) => void;
}

const LayerPanel: React.FC<LayerPanelProps> = ({ 
  layers, 
  activeLayerId, 
  onLayerChange, 
  entities, 
  onEntitiesUpdate 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAddLayer = () => {
    const name = `Layer ${layers.length}`;
    layerManager.addLayer(name);
    onLayerChange();
  };

  const handleRemoveLayer = (id: string) => {
    if (id === 'default') return;
    const { updatedEntities } = layerManager.removeLayer(id, entities);
    onEntitiesUpdate(updatedEntities);
    onLayerChange();
  };

  const handleToggleVisible = (id: string) => {
    layerManager.toggleVisible(id);
    onLayerChange();
  };

  const handleToggleLocked = (id: string) => {
    layerManager.toggleLocked(id);
    onLayerChange();
  };

  const handleSetColor = (id: string, color: string) => {
    layerManager.setColor(id, color);
    onLayerChange();
  };

  const handleSetActive = (id: string) => {
    layerManager.setActiveLayer(id);
    onLayerChange();
  };

  const startEditing = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const submitRename = (id: string) => {
    if (editName.trim()) {
      layerManager.renameLayer(id, editName.trim());
    }
    setEditingId(null);
    onLayerChange();
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-700 rounded-md shadow-xl text-[11px] overflow-hidden w-64 max-h-[400px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="material-icons-outlined text-sm text-blue-400">layers</span>
          <span className="font-bold text-slate-200 uppercase tracking-wider">Layers</span>
        </div>
        <button 
          onClick={handleAddLayer}
          className="p-1 hover:bg-slate-700 rounded text-blue-400"
          title="Add New Layer"
        >
          <span className="material-icons-outlined text-sm">add_box</span>
        </button>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-700">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-800/50 text-slate-400 text-left border-b border-slate-700">
              <th className="px-2 py-1 font-normal w-6"></th>
              <th className="px-2 py-1 font-normal w-6"><span className="material-icons-outlined text-xs">visibility</span></th>
              <th className="px-2 py-1 font-normal w-6"><span className="material-icons-outlined text-xs">lock</span></th>
              <th className="px-2 py-1 font-normal w-6"><span className="material-icons-outlined text-xs">palette</span></th>
              <th className="px-2 py-1 font-normal">Name</th>
              <th className="px-2 py-1 font-normal w-6"></th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr 
                key={layer.id}
                onClick={() => handleSetActive(layer.id)}
                className={`group border-b border-slate-800/50 transition-colors cursor-pointer ${
                  layer.id === activeLayerId ? 'bg-blue-600/20' : 'hover:bg-slate-800'
                }`}
              >
                <td className="px-2 py-1">
                  {layer.id === activeLayerId && (
                    <span className="material-icons-outlined text-xs text-blue-400">play_arrow</span>
                  )}
                </td>
                <td className="px-2 py-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleVisible(layer.id); }}
                    className={`material-icons-outlined text-sm transition-colors ${
                      layer.visible ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-500'
                    }`}
                  >
                    {layer.visible ? 'visibility' : 'visibility_off'}
                  </button>
                </td>
                <td className="px-2 py-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleToggleLocked(layer.id); }}
                    className={`material-icons-outlined text-sm transition-colors ${
                      layer.locked ? 'text-yellow-600' : 'text-slate-600 hover:text-slate-500'
                    }`}
                  >
                    {layer.locked ? 'lock' : 'lock_open'}
                  </button>
                </td>
                <td className="px-2 py-1 overflow-hidden relative">
                  <div 
                    className="w-3 h-3 rounded-full border border-slate-600"
                    style={{ backgroundColor: layer.color }}
                  ></div>
                  <input 
                    type="color" 
                    value={layer.color}
                    onChange={(e) => handleSetColor(layer.id, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </td>
                <td className="px-2 py-1">
                  {editingId === layer.id ? (
                    <input 
                      autoFocus
                      className="bg-slate-700 text-white px-1 py-0.5 rounded border border-blue-500 w-full outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => submitRename(layer.id)}
                      onKeyDown={(e) => e.key === 'Enter' && submitRename(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span 
                      onDoubleClick={() => startEditing(layer)}
                      className={`truncate block ${layer.id === activeLayerId ? 'text-blue-300 font-bold' : 'text-slate-300'}`}
                    >
                      {layer.name}
                    </span>
                  )}
                </td>
                <td className="px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {layer.id !== 'default' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveLayer(layer.id); }}
                      className="material-icons-outlined text-sm text-red-500 hover:text-red-400"
                    >
                      delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LayerPanel;
