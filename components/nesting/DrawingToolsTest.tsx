// ============================================================
// DRAWING TOOLS - TEST & VERIFICATION
// ============================================================
// File này dùng để test các công cụ vẽ trong ứng dụng
// Chạy: npm run dev -> http://localhost:5173/
// ============================================================

import React, { useState } from 'react';
import DrawingWorkspace, { type CadEntity } from './DrawingWorkspace';

const DrawingToolsTest: React.FC = () => {
  const [entities, setEntities] = useState<CadEntity[]>([]);
  const [activeTool, setActiveTool] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 p-4 w-full h-full bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-700 pb-4">
        <h1 className="text-2xl font-bold text-cyan-400">🎨 Drawing Tools Test</h1>
        <p className="text-sm text-slate-400 mt-1">
          Test all drawing tools and features
        </p>
      </div>

      {/* Info Panel */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Active Tool</p>
          <p className="text-lg font-mono text-cyan-400">
            {activeTool ? activeTool.toUpperCase() : 'NONE'}
          </p>
        </div>
        <div className="bg-slate-800 rounded p-3 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Total Entities</p>
          <p className="text-lg font-mono text-green-400">{entities.length}</p>
        </div>
      </div>

      {/* Entities List */}
      {entities.length > 0 && (
        <div className="bg-slate-800 rounded p-3 border border-slate-700 mb-4">
          <p className="text-xs text-slate-500 mb-2">Entities:</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {entities.map((entity, idx) => (
              <div key={entity.id} className="text-xs text-slate-300 font-mono">
                <span className="text-green-400">{idx + 1}.</span> {entity.type.toUpperCase()} ({entity.points.length} pts)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawing Workspace */}
      <div className="flex-1 min-h-[400px] bg-slate-900 rounded border border-slate-700">
        <DrawingWorkspace
          width={1000}
          height={500}
          activeDrawTool={activeTool}
          onToolChange={setActiveTool}
          onCadEntitiesChange={setEntities}
        />
      </div>

      {/* Instructions */}
      <div className="bg-slate-800 rounded p-3 border border-slate-700 text-xs text-slate-400">
        <p className="font-bold text-cyan-400 mb-2">📋 Instructions:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><span className="text-cyan-400">L</span> - Line tool (2 points)</li>
          <li><span className="text-cyan-400">R</span> - Rectangle tool (diagonal)</li>
          <li><span className="text-cyan-400">C</span> - Circle tool (center + radius)</li>
          <li><span className="text-cyan-400">P</span> - Polyline tool (multi-point, Right Click or Enter to finish)</li>
          <li><span className="text-cyan-400">S</span> - Spline tool (smooth curve, Right Click or Enter to finish)</li>
          <li><span className="text-cyan-400">Esc</span> - Cancel tool</li>
          <li><span className="text-cyan-400">Mouse Wheel</span> - Zoom in/out</li>
          <li><span className="text-cyan-400">Middle Mouse</span> - Pan/drag view</li>
          <li><span className="text-cyan-400">Right Click</span> - Finish polyline/spline</li>
        </ul>
      </div>
    </div>
  );
};

export default DrawingToolsTest;
