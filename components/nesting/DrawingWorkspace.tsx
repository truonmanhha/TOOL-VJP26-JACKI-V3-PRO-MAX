// ============================================================
// DRAWING WORKSPACE - Sao chép từ AX NestingAX Workspace
// Canvas workspace với hỗ trợ vẽ Line, Rect, Circle, Polyline, Spline
// ============================================================

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import DrawingTools, { 
  DrawingToolsHelpers, 
  type CadEntity, 
  type DrawState 
} from './DrawingTools';
import { GeometryUtils } from '@/services/GeometryUtils';

interface DrawingWorkspaceProps {
  onCadEntitiesChange?: (entities: CadEntity[]) => void;
  onToolChange?: (tool: string | null) => void;
  activeDrawTool?: string | null;
  width?: number;
  height?: number;
}

const BASE_PIXELS_PER_UNIT = 2; // Default zoom level

const DrawingWorkspace: React.FC<DrawingWorkspaceProps> = ({
  onCadEntitiesChange,
  onToolChange,
  activeDrawTool: externalActiveTool,
  width = 1200,
  height = 600
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // State
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const [drawState, setDrawState] = useState<DrawState>({
    step: 0,
    points: [],
    currentPos: null
  });
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(externalActiveTool || null);

  // View/Zoom State
  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartView, setDragStartView] = useState({ x: 0, y: 0 });
  const [isMouseInWorkspace, setIsMouseInWorkspace] = useState(false);

  // Grid State
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(50);

  // Sync external tool
  useEffect(() => {
    if (externalActiveTool !== undefined) {
      setActiveDrawTool(externalActiveTool);
    }
  }, [externalActiveTool]);

  // Notify parent of CAD entities change
  useEffect(() => {
    onCadEntitiesChange?.(cadEntities);
  }, [cadEntities, onCadEntitiesChange]);

  // Reset drawing state when tool changes
  useEffect(() => {
    setDrawState({ step: 0, points: [], currentPos: null });
  }, [activeDrawTool]);

  // Prevent page scrolling when mouse in workspace
  useEffect(() => {
    if (isMouseInWorkspace) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMouseInWorkspace]);

  const pixelsPerUnit = useMemo(() => BASE_PIXELS_PER_UNIT * zoom, [zoom]);
  const gridSizePx = gridSize * pixelsPerUnit;

  // Coordinate conversion functions
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => ({
      x: viewOffset.x + screenX / pixelsPerUnit,
      y: viewOffset.y - screenY / pixelsPerUnit
    }),
    [viewOffset, pixelsPerUnit]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => ({
      x: (worldX - viewOffset.x) * pixelsPerUnit,
      y: (viewOffset.y - worldY) * pixelsPerUnit
    }),
    [viewOffset, pixelsPerUnit]
  );

  // Drawing click handler
  const handleDrawingClick = useCallback(
    (worldPos: { x: number; y: number }, currentDrawState: DrawState) => {
      if (!activeDrawTool) return;

      if (activeDrawTool === 'line' || activeDrawTool === 'rect') {
        if (currentDrawState.step === 0) {
          setDrawState({ step: 1, points: [worldPos], currentPos: null });
        } else {
          setCadEntities(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: activeDrawTool,
              points: [currentDrawState.points[0], worldPos]
            }
          ]);
          setDrawState({ step: 0, points: [], currentPos: null });
        }
      } else if (activeDrawTool === 'circle') {
        if (currentDrawState.step === 0) {
          setDrawState({ step: 1, points: [worldPos], currentPos: null });
        } else {
          const center = currentDrawState.points[0];
          const radius = Math.sqrt(
            Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2)
          );
          setCadEntities(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: 'circle',
              points: [center, worldPos],
              properties: { radius }
            }
          ]);
          setDrawState({ step: 0, points: [], currentPos: null });
        }
      } else if (activeDrawTool === 'arc') {
        // AutoCAD Style: 3-Point Arc
        if (currentDrawState.step < 2) {
          setDrawState({ 
            step: currentDrawState.step + 1, 
            points: [...currentDrawState.points, worldPos], 
            currentPos: null 
          });
        } else {
          setCadEntities(prev => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: 'arc',
              points: [...currentDrawState.points, worldPos]
            }
          ]);
          setDrawState({ step: 0, points: [], currentPos: null });
        }
      } else if (activeDrawTool === 'polyline' || activeDrawTool === 'spline') {
        setDrawState({
          step: currentDrawState.step + 1,
          points: [...currentDrawState.points, worldPos],
          currentPos: null
        });
      }
    },
    [activeDrawTool]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

      // Left mouse button
      if (e.button === 0) {
        if (activeDrawTool) {
          handleDrawingClick(worldPos, drawState);
          return;
        } else {
          // SELECTION MODE - Precision Hit Testing
          const hitThreshold = 10 / zoom; // Adjust sensitivity based on zoom
          const hitEntity = [...cadEntities].reverse().find(entity => {
            if (entity.type === 'line') {
              return GeometryUtils.isPointOnLine(worldPos, entity.points[0], entity.points[1], hitThreshold);
            } else if (entity.type === 'circle' && entity.properties?.radius) {
              const dist = Math.sqrt((worldPos.x - entity.points[0].x)**2 + (worldPos.y - entity.points[0].y)**2);
              return Math.abs(dist - entity.properties.radius) < hitThreshold;
            } else if (entity.type === 'arc' && entity.points.length === 3) {
              const centerData = GeometryUtils.getArcCenter(entity.points[0], entity.points[1], entity.points[2]);
              if (!centerData) return false;
              
              const startAngle = Math.atan2(entity.points[0].y - centerData.y, entity.points[0].x - centerData.x);
              const endAngle = Math.atan2(entity.points[2].y - centerData.y, entity.points[2].x - centerData.x);
              
              // Determine direction like in rendering
              const crossProduct = (entity.points[1].x - entity.points[0].x) * (entity.points[2].y - entity.points[0].y) - (entity.points[1].y - entity.points[0].y) * (entity.points[2].x - entity.points[0].x);
              const anticlockwise = crossProduct > 0;

              return GeometryUtils.isPointOnArc(worldPos, centerData, centerData.radius, startAngle, endAngle, anticlockwise, hitThreshold);
            }
            return false;
          });

          if (hitEntity) {
            console.log('🎯 Selected Entity:', hitEntity.type, hitEntity.id);
            // logic to highlight or select can be added here
          }
        }
      } 
      // Middle mouse button: Pan
      else if (e.button === 1) {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragStartView({ ...viewOffset });
      }
      // Right mouse button: Handle context menu / finish drawing
      else if (e.button === 2) {
        e.preventDefault();
        if (activeDrawTool && (activeDrawTool === 'polyline' || activeDrawTool === 'spline')) {
          if (drawState.points.length > 1) {
            setCadEntities(prev => [
              ...prev,
              {
                id: crypto.randomUUID(),
                type: activeDrawTool,
                points: drawState.points
              }
            ]);
            setDrawState({ step: 0, points: [], currentPos: null });
          }
        }
      }
    },
    [activeDrawTool, screenToWorld, handleDrawingClick, viewOffset, drawState]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY);

      if (activeDrawTool) {
        setDrawState(prev => ({ ...prev, currentPos: worldPos }));
      }

      if (isDragging) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        setViewOffset({
          x: dragStartView.x - dx / pixelsPerUnit,
          y: dragStartView.y + dy / pixelsPerUnit
        });
      }
    },
    [activeDrawTool, screenToWorld, isDragging, dragStart, dragStartView, pixelsPerUnit]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const scaleFactor = 1.1;
      const newZoom = e.deltaY < 0 ? zoom * scaleFactor : zoom / scaleFactor;
      if (newZoom < 0.01 || newZoom > 50) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldMouseBefore = screenToWorld(mouseX, mouseY);
      setZoom(newZoom);

      const newPixelsPerUnit = BASE_PIXELS_PER_UNIT * newZoom;
      const newViewOffset = {
        x: worldMouseBefore.x - mouseX / newPixelsPerUnit,
        y: worldMouseBefore.y + mouseY / newPixelsPerUnit
      };
      setViewOffset(newViewOffset);
    },
    [zoom, screenToWorld]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Context menu now handled in handleMouseDown for right click
      // This is just a fallback to prevent the default browser context menu
    },
    []
  );

  // Render CAD entities on canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 0.5;

      const gridOffsetX = (viewOffset.x % gridSize) * pixelsPerUnit;
      const gridOffsetY = (viewOffset.y % gridSize) * pixelsPerUnit;

      // Vertical lines
      for (let x = gridOffsetX; x < canvas.width; x += gridSizePx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = gridOffsetY; y < canvas.height; y += gridSizePx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw entities
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';

    cadEntities.forEach(entity => {
      const screenPoints = entity.points.map(p => worldToScreen(p.x, p.y));

      if (entity.type === 'line') {
        const [p1, p2] = screenPoints;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      } else if (entity.type === 'rect') {
        const [p1, p2] = screenPoints;
        const w = p2.x - p1.x;
        const h = p2.y - p1.y;
        ctx.fillRect(p1.x, p1.y, w, h);
        ctx.strokeRect(p1.x, p1.y, w, h);
      } else if (entity.type === 'circle' && entity.properties?.radius) {
        const [center] = screenPoints;
        const radius = entity.properties.radius * pixelsPerUnit;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (entity.type === 'arc' && entity.points.length === 3) {
        // AutoCAD 3-Point Arc Logic
        const [A, B, C] = entity.points;
        const sA = worldToScreen(A.x, A.y);
        const sB = worldToScreen(B.x, B.y);
        const sC = worldToScreen(C.x, C.y);

        // Helper to find circle center from 3 points
        const getCenter = (p1: any, p2: any, p3: any) => {
          const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y, x3 = p3.x, y3 = p3.y;
          const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
          if (Math.abs(D) < 0.001) return null; // Thẳng hàng
          const centerX = ((x1**2 + y1**2) * (y2 - y3) + (x2**2 + y2**2) * (y3 - y1) + (x3**2 + y3**2) * (y1 - y2)) / D;
          const centerY = ((x1**2 + y1**2) * (x3 - x2) + (x2**2 + y2**2) * (x1 - x3) + (x3**2 + y3**2) * (x2 - x1)) / D;
          return { x: centerX, y: centerY };
        };

        const center = getCenter(A, B, C);
        if (center) {
          const sCenter = worldToScreen(center.x, center.y);
          const radius = Math.sqrt((A.x - center.x)**2 + (A.y - center.y)**2) * pixelsPerUnit;
          
          // Tính toán góc (Canvas Y-down)
          const startAngle = Math.atan2(A.y - center.y, A.x - center.x);
          const midAngle = Math.atan2(B.y - center.y, B.x - center.x);
          const endAngle = Math.atan2(C.y - center.y, C.x - center.x);

          // Thuật toán AutoCAD: Xác định hướng dựa trên điểm B
          // Chúng ta kiểm tra xem hướng từ A -> B là CW hay CCW
          const normalize = (a: number) => (a < 0 ? a + Math.PI * 2 : a);
          const s = normalize(startAngle);
          const m = normalize(midAngle);
          const e = normalize(endAngle);

          // Nếu khoảng cách góc từ S đến M (theo chiều CCW) nhỏ hơn từ S đến E
          // Nghĩa là điểm B nằm giữa A và C theo chiều CCW
          let sweepCCW = s - m;
          if (sweepCCW < 0) sweepCCW += Math.PI * 2;
          let totalCCW = s - e;
          if (totalCCW < 0) totalCCW += Math.PI * 2;

          const isAnticlockwise = sweepCCW < totalCCW;

          ctx.beginPath();
          // Vẽ trực tiếp bằng tọa độ đã tính, không đảo dấu
          ctx.arc(sCenter.x, sCenter.y, radius, startAngle, endAngle, isAnticlockwise);
          ctx.stroke();
        }
      } else if (entity.type === 'polyline' || entity.type === 'spline') {
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        screenPoints.slice(1).forEach(p => {
          ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // Draw points
        screenPoints.forEach(p => {
          ctx.fillStyle = '#00ff88';
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        });
      }
    });
  }, [cadEntities, width, height, worldToScreen, pixelsPerUnit, showGrid, gridSize, gridSizePx, viewOffset]);

  // Render drawing preview
  const renderDrawingPreview = useMemo(() => {
    return DrawingToolsHelpers.renderDrawingPreview(activeDrawTool, drawState, worldToScreen, pixelsPerUnit);
  }, [activeDrawTool, drawState, worldToScreen, pixelsPerUnit]);

  return (
    <div className="flex flex-col gap-2 w-full h-full bg-slate-950 rounded-lg border border-slate-700 p-2">
      {/* Toolbar */}
      <DrawingTools
        activeDrawTool={activeDrawTool}
        onToolSelect={tool => {
          setActiveDrawTool(tool);
          onToolChange?.(tool);
        }}
        onClearDrawing={() => {
          setCadEntities([]);
          setDrawState({ step: 0, points: [], currentPos: null });
        }}
      />

      {/* Canvas */}
      <div
        ref={containerRef}
        className={`flex-1 relative overflow-hidden rounded-lg border border-slate-600 bg-[#1a1a2e] ${
          activeDrawTool ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-default'
        }`}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsMouseInWorkspace(true)}
        onMouseLeave={() => setIsMouseInWorkspace(false)}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
        />
        {renderDrawingPreview}
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800 rounded px-2 py-1">
        <div>
          Zoom: {zoom.toFixed(2)}x | Entities: {cadEntities.length} | Grid: {showGrid ? 'On' : 'Off'}
        </div>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className="px-2 py-0.5 rounded hover:bg-slate-700 transition-all"
        >
          Toggle Grid
        </button>
      </div>
    </div>
  );
};

export default DrawingWorkspace;
export type { CadEntity, DrawState };
