// ============================================================
// DRAWING TOOLS INTEGRATION EXAMPLE
// Ví dụ tích hợp DrawingWorkspace vào NestingWorkspace
// ============================================================

import React, { useState } from 'react';
import DrawingWorkspace, { type CadEntity } from './DrawingWorkspace';
import DrawingTools from './DrawingTools';

/**
 * EXAMPLE 1: Standalone Drawing Tool
 * Sử dụng DrawingWorkspace như một independent component
 */
export function StandaloneDrawingExample() {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="w-full h-96 flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold text-cyan-400">Drawing Tool - Standalone</h2>
      
      <DrawingWorkspace
        activeDrawTool={activeTool}
        onToolChange={setActiveTool}
        onCadEntitiesChange={setCadEntities}
        width={800}
        height={500}
      />

      <div className="text-sm text-slate-400">
        Entities: {cadEntities.length} | Active Tool: {activeTool || 'None'}
      </div>
    </div>
  );
}

/**
 * EXAMPLE 2: Drawing Tool with Entity Display
 * Hiển thị danh sách các entity được vẽ
 */
export function DrawingWithEntityDisplay() {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="w-full flex gap-4 p-4">
      <div className="flex-1">
        <h2 className="text-lg font-bold text-cyan-400 mb-2">Canvas</h2>
        <DrawingWorkspace
          activeDrawTool={activeTool}
          onToolChange={setActiveTool}
          onCadEntitiesChange={setCadEntities}
          width={800}
          height={600}
        />
      </div>

      <div className="w-64 bg-slate-800 rounded-lg p-4 overflow-auto max-h-96">
        <h3 className="text-cyan-400 font-bold mb-3">Entities ({cadEntities.length})</h3>
        {cadEntities.length === 0 ? (
          <p className="text-slate-500 text-sm">No entities drawn yet</p>
        ) : (
          <div className="space-y-2">
            {cadEntities.map((entity, idx) => (
              <div key={entity.id} className="text-xs p-2 bg-slate-700 rounded border border-slate-600">
                <div className="font-mono text-cyan-400">
                  #{idx + 1}: {entity.type.toUpperCase()}
                </div>
                <div className="text-slate-400 mt-1">
                  Points: {entity.points.length}
                  {entity.points.map((p, i) => (
                    <div key={i} className="text-slate-500 ml-2">
                      [{p.x.toFixed(1)}, {p.y.toFixed(1)}]
                    </div>
                  ))}
                </div>
                {entity.properties?.radius && (
                  <div className="text-slate-400 mt-1">
                    Radius: {entity.properties.radius.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * EXAMPLE 3: Integration with Part Parameters Dialog
 * Sử dụng DrawingWorkspace để vẽ part geometry
 */
export interface DrawingIntegrationProps {
  onPartGeometryCreate?: (geometry: CadEntity) => void;
  onCancel?: () => void;
}

export function PartDrawingIntegration({ onPartGeometryCreate, onCancel }: DrawingIntegrationProps) {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>('rect');

  const handleCreatePart = () => {
    if (cadEntities.length > 0) {
      // Sử dụng entity đầu tiên làm part geometry
      onPartGeometryCreate?.(cadEntities[0]);
    }
  };

  const handleClear = () => {
    setCadEntities([]);
  };

  return (
    <div className="w-full bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="mb-4">
        <h3 className="text-cyan-400 font-bold mb-2">Draw Part Geometry</h3>
        <p className="text-slate-400 text-sm">
          Vẽ hình dạng của chi tiết (Part) bằng cách chọn công cụ và vẽ trên canvas
        </p>
      </div>

      <DrawingWorkspace
        activeDrawTool={activeTool}
        onToolChange={setActiveTool}
        onCadEntitiesChange={setCadEntities}
        width={700}
        height={400}
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-slate-400">
          Entities: {cadEntities.length}
          {cadEntities.length > 0 && (
            <span className="ml-3 text-green-400">
              Ready to create part
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm font-medium transition-all"
          >
            Clear
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreatePart}
            disabled={cadEntities.length === 0}
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-all"
          >
            Create Part
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * EXAMPLE 4: Integration with Full Nesting Workspace
 * Tích hợp hoàn toàn vào NestingWorkspace
 */
export function FullNestingWorkspaceIntegration() {
  const [mode, setMode] = useState<'normal' | 'drawing'>('normal');
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [parts, setParts] = useState<any[]>([]);

  const handleStartDrawing = () => {
    setMode('drawing');
    setCadEntities([]);
  };

  const handleFinishDrawing = () => {
    if (cadEntities.length > 0) {
      // Chuyển CAD entity thành Part
      const newPart = {
        id: `part-${Date.now()}`,
        name: `Part ${parts.length + 1}`,
        geometry: cadEntities[0],
        width: 100,
        height: 100,
        quantity: 1
      };
      setParts([...parts, newPart]);
    }
    setMode('normal');
  };

  return (
    <div className="w-full space-y-4">
      {mode === 'normal' ? (
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-cyan-400">Nesting Workspace</h2>
            <button
              onClick={handleStartDrawing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-all"
            >
              + Draw Part
            </button>
          </div>

          <div className="text-slate-400">
            <p>Total Parts: {parts.length}</p>
            <div className="mt-2 space-y-1">
              {parts.map(part => (
                <div key={part.id} className="text-sm text-slate-500">
                  - {part.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-cyan-400 text-sm font-medium">Drawing Mode Active</span>
          </div>

          <DrawingWorkspace
            onCadEntitiesChange={setCadEntities}
            width={1000}
            height={600}
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setMode('normal')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleFinishDrawing}
              disabled={cadEntities.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium transition-all"
            >
              Create Part ({cadEntities.length} entities)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * EXAMPLE 5: Export/Import CAD Entities
 * Lưu và tải CAD entities
 */
export function DrawingExportImport() {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);

  const handleExport = () => {
    const json = JSON.stringify(cadEntities, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drawing-${Date.now()}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        setCadEntities(Array.isArray(imported) ? imported : []);
      } catch (error) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full space-y-4 p-4">
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={cadEntities.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium transition-all"
        >
          📥 Export Drawing
        </button>
        <label className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-all cursor-pointer">
          📤 Import Drawing
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </label>
      </div>

      <DrawingWorkspace
        onCadEntitiesChange={setCadEntities}
        width={900}
        height={500}
      />
    </div>
  );
}
