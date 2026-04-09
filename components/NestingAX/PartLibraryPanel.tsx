import React, { useState } from 'react';
import { partLibrary, PartTemplate } from './services/partLibrary';
import { CadEntity } from './services/db';

interface PartLibraryPanelProps {
  onAddPart: (name: string, entities: CadEntity[]) => void;
  onClose: () => void;
}

const PartLibraryPanel: React.FC<PartLibraryPanelProps> = ({ onAddPart, onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PartTemplate | null>(null);
  const [paramsStates, setParamsStates] = useState<Record<string, any>>({});

  const handleSelectTemplate = (t: PartTemplate) => {
    setSelectedTemplate(t);
    const defaults: Record<string, any> = {};
    t.params.forEach(p => defaults[p.key] = p.default);
    setParamsStates(defaults);
  };

  const handleParamChange = (key: string, val: string) => {
    setParamsStates(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
  };

  const handleAddToProject = () => {
    if (selectedTemplate) {
      const entities = selectedTemplate.getEntities(paramsStates);
      onAddPart(selectedTemplate.name, entities);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#2d2d2d] w-[800px] h-[550px] border border-slate-600 shadow-2xl rounded-lg overflow-hidden flex scale-in-center">
        {/* Left: Library browser */}
        <div className="w-[300px] border-r border-slate-700 bg-[#1e1e1e] flex flex-col">
          <div className="p-4 border-b border-slate-700 bg-slate-800/50">
            <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Part Library</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {partLibrary.map(t => (
              <button 
                key={t.name}
                onClick={() => handleSelectTemplate(t)}
                className={`w-full flex items-center space-x-3 p-3 rounded text-left transition ${selectedTemplate?.name === t.name ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-slate-700/50 border border-transparent opacity-70 hover:opacity-100'}`}
              >
                <span className="material-icons-outlined text-blue-400">{t.icon}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-200">{t.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase">{t.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Params & Preview */}
        <div className="flex-1 flex flex-col bg-[#2d2d2d]">
          <div className="px-4 py-3 bg-[#1e1e1e] flex justify-between items-center border-b border-slate-700">
            <span className="text-xs font-bold text-gray-400">TEMPLATE PARAMETERS</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded">
                <span className="material-icons-outlined">close</span>
            </button>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            {selectedTemplate ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 grid grid-cols-1 gap-6 content-start overflow-y-auto pr-4">
                  <div className="mb-4">
                    <h2 className="text-xl font-black text-white mb-1">{selectedTemplate.name}</h2>
                    <p className="text-xs text-gray-500">Configure geometry dimensions below.</p>
                  </div>
                  
                  {selectedTemplate.params.map(p => (
                    <div key={p.key} className="flex flex-col space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{p.label}</label>
                      <input 
                        type="number"
                        value={paramsStates[p.key]}
                        onChange={(e) => handleParamChange(p.key, e.target.value)}
                        className="bg-[#1e1e1e] border border-slate-600 rounded p-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none transition"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-auto border-t border-slate-700 pt-6 flex justify-end space-x-3">
                  <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 text-xs font-bold rounded shadow transition duration-200"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleAddToProject}
                    className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded shadow-lg transition duration-200 border border-blue-400/20"
                  >
                    ADD TO NEST LIST
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 select-none">
                <span className="material-icons-outlined text-9xl mb-4">settings_input_composite</span>
                <p className="text-lg font-bold">Select a template from the library</p>
                <p className="text-sm">Standard shapes and parametric components ready to nest.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartLibraryPanel;
