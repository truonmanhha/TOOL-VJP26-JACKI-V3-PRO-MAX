// ============================================================
// DRAWING TOOLS - Sao chép từ BB1 NestingAX Workspace
// Công cụ vẽ: Line, Rectangle, Circle, Polyline, Spline
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Minus, Square, Circle, Pen, Spline, RotateCcw, X, MousePointer, Zap
} from 'lucide-react';

// Type definitions
export type DrawState = {
  step: number;
  points: { x: number; y: number }[];
  currentPos: { x: number; y: number } | null;
};

export type CadEntity = {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  properties?: any;
  layerId?: string;
};

interface DrawingToolsProps {
  activeDrawTool?: string | null;
  onToolSelect?: (tool: string | null) => void;
  onClearDrawing?: () => void;
  isDrawing?: boolean;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({
  activeDrawTool,
  onToolSelect,
  onClearDrawing,
  isDrawing = false
}) => {
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [drawState, setDrawState] = useState<DrawState>({
    step: 0,
    points: [],
    currentPos: null
  });

  const tools = [
    { id: 'pointer', label: 'Pointer', icon: MousePointer, shortcut: 'Esc' },
    { id: 'line', label: 'Line', icon: Minus, shortcut: 'L' },
    { id: 'rect', label: 'Rectangle', icon: Square, shortcut: 'R' },
    { id: 'circle', label: 'Circle', icon: Circle, shortcut: 'C' },
    { id: 'polyline', label: 'Polyline', icon: Pen, shortcut: 'P' },
    { id: 'spline', label: 'Spline', icon: Spline, shortcut: 'S' },
    { id: 'lag_reduce', label: 'Giảm Lag', icon: Zap, shortcut: 'G' }
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if (key === 'escape') {
        onToolSelect?.(null);
        return;
      }

      const tool = tools.find(t => t.shortcut.toLowerCase() === key);
      if (tool) {
        e.preventDefault();
        onToolSelect?.(tool.id === 'pointer' ? null : tool.id);
      }

      // Finish polyline/spline on Enter
      if ((activeDrawTool === 'polyline' || activeDrawTool === 'spline') && 
          key === 'enter' && drawState.points.length > 1) {
        saveCadEntity();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDrawTool, drawState]);

  const saveCadEntity = useCallback(() => {
    if (drawState.points.length === 0) return;

    const entity: CadEntity = {
      id: crypto.randomUUID(),
      type: activeDrawTool || 'line',
      points: drawState.points
    };

    setCadEntities(prev => [...prev, entity]);
    setDrawState({ step: 0, points: [], currentPos: null });
  }, [activeDrawTool, drawState.points]);

  const handleDrawingClick = useCallback((worldPos: { x: number; y: number }) => {
    if (!activeDrawTool) return;

    if (activeDrawTool === 'line' || activeDrawTool === 'rect') {
      if (drawState.step === 0) {
        setDrawState({ ...drawState, step: 1, points: [worldPos] });
      } else {
        const entity: CadEntity = {
          id: crypto.randomUUID(),
          type: activeDrawTool,
          points: [drawState.points[0], worldPos]
        };
        setCadEntities(prev => [...prev, entity]);
        setDrawState({ step: 0, points: [], currentPos: null });
      }
    } else if (activeDrawTool === 'circle') {
      if (drawState.step === 0) {
        setDrawState({ ...drawState, step: 1, points: [worldPos] });
      } else {
        const center = drawState.points[0];
        const radius = Math.sqrt(
          Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2)
        );
        
        const entity: CadEntity = {
          id: crypto.randomUUID(),
          type: 'circle',
          points: [center, worldPos],
          properties: { radius }
        };
        setCadEntities(prev => [...prev, entity]);
        setDrawState({ step: 0, points: [], currentPos: null });
      }
    } else if (activeDrawTool === 'polyline' || activeDrawTool === 'spline') {
      setDrawState({
        ...drawState,
        step: drawState.step + 1,
        points: [...drawState.points, worldPos]
      });
    }
  }, [activeDrawTool, drawState]);

  const handleClearAll = useCallback(() => {
    setCadEntities([]);
    setDrawState({ step: 0, points: [], currentPos: null });
    onClearDrawing?.();
  }, [onClearDrawing]);

  return (
    <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-2 border border-slate-700">
      {/* Drawing Tools */}
      <div className="flex items-center gap-1 border-r border-slate-600 pr-2">
        {tools.map(tool => {
          const Icon = tool.icon;
          const isActive = (activeDrawTool === tool.id) || 
                          (tool.id === 'pointer' && !activeDrawTool);

          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect?.(tool.id === 'pointer' ? null : tool.id)}
              title={`${tool.label} (${tool.shortcut})`}
              className={`p-2 rounded transition-all ${
                isActive
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/50'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-cyan-400'
              }`}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      {/* Info & Controls */}
      <div className="flex items-center gap-3 ml-2">
        {activeDrawTool && (
          <div className="text-xs text-cyan-400 font-mono">
            Tool: <span className="font-bold uppercase">{activeDrawTool}</span>
            {drawState.points.length > 0 && (
              <span className="ml-2 text-slate-400">
                Points: {drawState.points.length}
              </span>
            )}
          </div>
        )}

        {cadEntities.length > 0 && (
          <div className="text-xs text-green-400">
            {cadEntities.length} entities
          </div>
        )}

        <button
          onClick={handleClearAll}
          disabled={cadEntities.length === 0}
          title="Clear all drawings"
          className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
};

export default DrawingTools;

// ============ HELPERS ============

// Helper functions for coordinate conversion and drawing preview
export const DrawingToolsHelpers = {
  // Screen to World coordinates conversion
  screenToWorld: (screenX: number, screenY: number, viewOffset: { x: number; y: number }, pixelsPerUnit: number) => {
    return {
      x: viewOffset.x + (screenX / pixelsPerUnit),
      y: viewOffset.y - (screenY / pixelsPerUnit)
    };
  },

  // World to Screen coordinates conversion
  worldToScreen: (worldX: number, worldY: number, viewOffset: { x: number; y: number }, pixelsPerUnit: number) => {
    return {
      x: (worldX - viewOffset.x) * pixelsPerUnit,
      y: (viewOffset.y - worldY) * pixelsPerUnit
    };
  },

  // Render drawing preview
  renderDrawingPreview: (
    activeDrawTool: string | null | undefined,
    drawState: DrawState,
    worldToScreen: (x: number, y: number) => { x: number; y: number },
    pixelsPerUnit: number
  ) => {
    if (!activeDrawTool || !drawState.currentPos) return null;

    const screenCurrent = worldToScreen(drawState.currentPos.x, drawState.currentPos.y);

    if (drawState.points.length > 0) {
      const startWorld = drawState.points[0];
      const screenStart = worldToScreen(startWorld.x, startWorld.y);

      if (activeDrawTool === 'line' || activeDrawTool === 'polyline' || activeDrawTool === 'spline') {
        return (
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            {activeDrawTool === 'polyline' &&
              drawState.points.map((pt, i) => {
                if (i === 0) return null;
                const prev = worldToScreen(drawState.points[i - 1].x, drawState.points[i - 1].y);
                const curr = worldToScreen(pt.x, pt.y);
                return (
                  <line
                    key={i}
                    x1={prev.x}
                    y1={prev.y}
                    x2={curr.x}
                    y2={curr.y}
                    stroke="cyan"
                    strokeWidth="2"
                  />
                );
              })}
            <line
              x1={
                activeDrawTool === 'polyline'
                  ? worldToScreen(
                      drawState.points[drawState.points.length - 1].x,
                      drawState.points[drawState.points.length - 1].y
                    ).x
                  : screenStart.x
              }
              y1={
                activeDrawTool === 'polyline'
                  ? worldToScreen(
                      drawState.points[drawState.points.length - 1].x,
                      drawState.points[drawState.points.length - 1].y
                    ).y
                  : screenStart.y
              }
              x2={screenCurrent.x}
              y2={screenCurrent.y}
              stroke="cyan"
              strokeWidth="2"
              strokeDasharray="4"
            />
          </svg>
        );
      } else if (activeDrawTool === 'rect') {
        const w = Math.abs(screenCurrent.x - screenStart.x);
        const h = Math.abs(screenCurrent.y - screenStart.y);
        const left = Math.min(screenCurrent.x, screenStart.x);
        const top = Math.min(screenCurrent.y, screenStart.y);

        return (
          <div
            className="absolute border-2 border-cyan-400 border-dashed pointer-events-none"
            style={{ left, top, width: w, height: h }}
          />
        );
      } else if (activeDrawTool === 'circle') {
        const dx = drawState.currentPos.x - startWorld.x;
        const dy = drawState.currentPos.y - startWorld.y;
        const radiusWorld = Math.sqrt(dx * dx + dy * dy);
        const radiusPx = radiusWorld * pixelsPerUnit;

        return (
          <div
            className="absolute border-2 border-cyan-400 border-dashed rounded-full pointer-events-none"
            style={{
              left: screenStart.x - radiusPx,
              top: screenStart.y - radiusPx,
              width: radiusPx * 2,
              height: radiusPx * 2
            }}
          />
        );
      }
    }

    return (
      <div
        className="absolute w-4 h-4 border border-cyan-400 rounded-full pointer-events-none -ml-2 -mt-2 bg-cyan-400/20"
        style={{ left: screenCurrent.x, top: screenCurrent.y }}
      />
    );
  }
};
