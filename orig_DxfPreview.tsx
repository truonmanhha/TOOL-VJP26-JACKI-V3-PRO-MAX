import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { DXFEntityResult, ManualLine } from '../types';
import { ZoomIn, ZoomOut, Maximize, MousePointer2, Info, X, Pencil, Trash2, Scissors, SquareMousePointer, Merge, Undo2, Redo2, Smartphone, Check, Hash, Box, Layers, Database } from 'lucide-react';
import { FORMAT_NUMBER } from '../constants';
import { AnimatePresence, motion } from 'framer-motion';

interface DxfPreviewProps {
  entities: DXFEntityResult[];
  manualLines: ManualLine[];
  onAddManualLine: (line: { start: { x: number, y: number }, end: { x: number, y: number } }) => void;
  onClearManualLines: () => void;
  onDeleteEntity: (id: string) => void;
  onDeleteEntities: (ids: string[]) => void;
  onDeleteManualLine: (id: string) => void;
  onExplodeEntity: (id: string) => void;
  onExplodeEntities: (ids: string[]) => void;
  onJoinEntities: (ids: string[]) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onSelectionChange?: (selectedIds: string[]) => void; // New callback for selection tracking
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

interface PreparedEntity {
  id: string;
  path: Path2D;
  isJoined: boolean;
  isClosed: boolean;
  original: DXFEntityResult;
  bounds: { minX: number, minY: number, maxX: number, maxY: number };
}

const DxfPreview: React.FC<DxfPreviewProps> = ({ 
  entities, 
  manualLines, 
  onAddManualLine, 
  onClearManualLines,
  onDeleteEntity,
  onDeleteEntities,
  onDeleteManualLine,
  onExplodeEntity,
  onExplodeEntities,
  onJoinEntities,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSelectionChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, endX: number, endY: number } | null>(null);
  const [isMarqueeMode, setIsMarqueeMode] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  const [lastPinchDist, setLastPinchDist] = useState<number | null>(null);
  const [lastPinchCenter, setLastPinchCenter] = useState<{x: number, y: number} | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ x: number, y: number } | null>(null);
  const [hoveredGap, setHoveredGap] = useState<{ x: number, y: number } | null>(null);

  // Notify parent when selection changes
  useEffect(() => {
    onSelectionChange?.(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const getEventCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent | React.WheelEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { mx: 0, my: 0, clientX: 0, clientY: 0, touches: [] };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0, clientY = 0;
    const touches = 'touches' in e ? Array.from(e.touches) : [];

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = (e as any).clientX;
      clientY = (e as any).clientY;
    }

    return {
      mx: clientX - rect.left,
      my: clientY - rect.top,
      clientX,
      clientY,
      touches: touches as { clientX: number; clientY: number }[]
    };
  };

  const getTouchMetrics = (t1: { clientX: number, clientY: number }, t2: { clientX: number, clientY: number }) => {
    const dist = Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
    const center = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
    return { dist, center };
  };

  const findNearestGap = useCallback((mx: number, my: number, vs: ViewState) => {
    const dxfX = (mx - vs.x) / vs.scale;
    const dxfY = -(my - vs.y) / vs.scale;
    const threshold = 40 / vs.scale;
    let closest: { x: number, y: number } | null = null;
    let minDist = threshold;
    allGaps.forEach(gap => {
      const d = Math.sqrt(Math.pow(gap.x - dxfX, 2) + Math.pow(gap.y - dxfY, 2));
      if (d < minDist) { minDist = d; closest = gap; }
    });
    return closest;
  }, [entities]);

  const preparedEntities = useMemo<PreparedEntity[]>(() => {
    return entities.map(entity => {
      const path = new Path2D();
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      if (entity.geometry && entity.geometry.length >= 2) {
        const startP = entity.geometry[0];
        const endP = entity.geometry[entity.geometry.length - 1];
        path.moveTo(startP.x, startP.y);
        entity.geometry.forEach(p => {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
        for (let i = 1; i < entity.geometry.length; i++) {
          path.lineTo(entity.geometry[i].x, entity.geometry[i].y);
        }
        // Auto-detect closed paths: if start ≈ end or isClosed flag is true
        const isClosed = entity.isClosed || (Math.sqrt(Math.pow(startP.x - endP.x, 2) + Math.pow(startP.y - endP.y, 2)) < 0.0001);
        if (isClosed) path.closePath();
      }
      return {
        id: entity.id,
        path,
        isJoined: entity.type.includes('JOINED'),
        isClosed: entity.isClosed,
        original: entity,
        bounds: { minX, minY, maxX, maxY }
      };
    });
  }, [entities]);

  const preparedManualLines = useMemo(() => {
    return manualLines.map(line => {
      const path = new Path2D();
      path.moveTo(line.start.x, line.start.y);
      path.lineTo(line.end.x, line.end.y);
      const minX = Math.min(line.start.x, line.end.x);
      const minY = Math.min(line.start.y, line.end.y);
      const maxX = Math.max(line.start.x, line.end.x);
      const maxY = Math.max(line.start.y, line.end.y);
      return { id: line.id, path, original: line, bounds: { minX, minY, maxX, maxY } };
    });
  }, [manualLines]);

  const allGaps = useMemo(() => {
    const gaps: { x: number, y: number }[] = [];
    entities.forEach(entity => {
      if (!entity.isClosed && entity.geometry && entity.geometry.length > 0) {
        gaps.push(entity.geometry[0]);
        gaps.push(entity.geometry[entity.geometry.length - 1]);
      }
    });
    return gaps;
  }, [entities]);

  const selectedItem = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    const ent = preparedEntities.find(e => e.id === id);
    if (ent) return { type: 'ENTITY', data: ent.original };
    const ml = preparedManualLines.find(m => m.id === id);
    if (ml) return { type: 'MANUAL_LINE', data: ml.original };
    return null;
  }, [selectedIds, preparedEntities, preparedManualLines]);

  const getInitialViewState = useCallback(() => {
    if (entities.length === 0 || !containerRef.current) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    entities.forEach(entity => {
      entity.geometry?.forEach(p => {
        if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
      });
    });
    if (minX === Infinity) return null;
    const dxfWidth = maxX - minX;
    const dxfHeight = maxY - minY;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 60;
    const scale = Math.min((rect.width - padding * 2) / (dxfWidth || 1), (500 - padding * 2) / (dxfHeight || 1));
    const centerX = (rect.width - dxfWidth * scale) / 2 - minX * scale;
    const centerY = (500 + dxfHeight * scale) / 2 + minY * scale;
    return { x: centerX, y: centerY, scale };
  }, [entities]);

  const handleResetView = () => {
    const initial = getInitialViewState();
    if (initial) setViewState(initial);
  };

  useEffect(() => {
    const initial = getInitialViewState();
    if (initial) setViewState(initial);
  }, [getInitialViewState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheelRaw = (e: WheelEvent) => {
      e.preventDefault();
    };
    canvas.addEventListener('wheel', handleWheelRaw, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheelRaw);
  }, []);

  const handleZoom = (factor: number, centerX?: number, centerY?: number) => {
    setViewState(prev => {
      if (!prev || !canvasRef.current) return null;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const cx = centerX ?? rect.width / 2;
      const cy = centerY ?? rect.height / 2;

      const newScale = Math.max(0.0001, Math.min(prev.scale * factor, 5000));
      const newX = cx - (cx - prev.x) * (newScale / prev.scale);
      const newY = cy - (cy - prev.y) * (newScale / prev.scale);
      return { x: newX, y: newY, scale: newScale };
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const { mx, my } = getEventCoords(e);
    handleZoom(factor, mx, my);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    const { touches, clientX, clientY, mx, my } = getEventCoords(e);
    
    if (touches.length === 2) {
      setIsPinching(true);
      setIsDragging(false);
      setIsSelecting(false);
      const metrics = getTouchMetrics(touches[0], touches[1]);
      setLastPinchDist(metrics.dist);
      setLastPinchCenter(metrics.center);
      return;
    }

    if ('button' in e && (e.button === 1 || e.button === 2)) {
      setIsDragging(true);
      setLastMousePos({ x: clientX, y: clientY });
      return;
    }

    if ('button' in e && e.button !== 0) return;

    if (isMarqueeMode || (e as any).shiftKey) {
      setIsSelecting(true);
      setSelectionBox({ startX: mx, startY: my, endX: mx, endY: my });
    } else {
      setIsDragging(true);
      setLastMousePos({ x: clientX, y: clientY });
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!viewState || !canvasRef.current) return;
    const { touches, clientX, clientY, mx, my } = getEventCoords(e);

    if (isPinching && touches.length === 2) {
      const metrics = getTouchMetrics(touches[0], touches[1]);
      const rect = canvasRef.current.getBoundingClientRect();
      
      if (lastPinchDist !== null && lastPinchCenter !== null) {
        const zoomFactor = metrics.dist / lastPinchDist;
        const dx = metrics.center.x - lastPinchCenter.x;
        const dy = metrics.center.y - lastPinchCenter.y;

        setViewState(prev => {
          if (!prev) return null;
          const cx = metrics.center.x - rect.left;
          const cy = metrics.center.y - rect.top;
          const newScale = Math.max(0.0001, Math.min(prev.scale * zoomFactor, 5000));
          const newX = (cx - (cx - prev.x) * (newScale / prev.scale)) + dx;
          const newY = (cy - (cy - prev.y) * (newScale / prev.scale)) + dy;
          return { x: newX, y: newY, scale: newScale };
        });
      }
      setLastPinchDist(metrics.dist);
      setLastPinchCenter(metrics.center);
      return;
    }

    if (isSelecting && selectionBox) {
      setSelectionBox({ ...selectionBox, endX: mx, endY: my });
      return;
    }

    const gap = findNearestGap(mx, my, viewState);
    setHoveredGap(gap);

    if (isDragging) {
      const dx = clientX - lastMousePos.x;
      const dy = clientY - lastMousePos.y;
      setViewState(prev => prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : null);
      setLastMousePos({ x: clientX, y: clientY });
    }
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPinching) {
      setIsPinching(false);
      setLastPinchDist(null);
      setLastPinchCenter(null);
      return;
    }

    if (isSelecting && selectionBox) {
      const x1 = Math.min(selectionBox.startX, selectionBox.endX);
      const y1 = Math.min(selectionBox.startY, selectionBox.endY);
      const x2 = Math.max(selectionBox.startX, selectionBox.endX);
      const y2 = Math.max(selectionBox.startY, selectionBox.endY);

      if (Math.abs(x2 - x1) < 20 && Math.abs(y2 - y1) < 20) {
        handleClick(e);
      } else {
        const dX1 = (x1 - viewState!.x) / viewState!.scale;
        const dY1 = -(y1 - viewState!.y) / viewState!.scale;
        const dX2 = (x2 - viewState!.x) / viewState!.scale;
        const dY2 = -(y2 - viewState!.y) / viewState!.scale;
        const minDX = Math.min(dX1, dX2); const maxDX = Math.max(dX1, dX2);
        const minDY = Math.min(dY1, dY2); const maxDY = Math.max(dY1, dY2);
        const newlySelected: string[] = [];
        preparedEntities.forEach(ent => {
          if (ent.bounds.maxX >= minDX && ent.bounds.minX <= maxDX && 
              ent.bounds.maxY >= minDY && ent.bounds.minY <= maxDY) newlySelected.push(ent.id);
        });
        preparedManualLines.forEach(ml => {
          if (ml.bounds.maxX >= minDX && ml.bounds.minX <= maxDX && 
              ml.bounds.maxY >= minDY && ml.bounds.minY <= maxDY) newlySelected.push(ml.id);
        });
        setSelectedIds(prev => (e as any).ctrlKey || (e as any).metaKey ? [...new Set([...prev, ...newlySelected])] : newlySelected);
      }
      setIsSelecting(false); setSelectionBox(null);
    } else if (isDragging) {
      const { clientX, clientY } = getEventCoords(e);
      const dx = Math.abs(clientX - lastMousePos.x);
      const dy = Math.abs(clientY - lastMousePos.y);
      if (dx < 20 && dy < 20 && (!('button' in e) || e.button === 0)) handleClick(e);
      setIsDragging(false);
    }
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!viewState || !canvasRef.current) return;
    const { mx, my } = getEventCoords(e);
    
    // Convert screen coordinates to world coordinates
    const worldX = (mx - viewState.x) / viewState.scale;
    const worldY = -(my - viewState.y) / viewState.scale;
    
    const targetGap = findNearestGap(mx, my, viewState);

    if (isDrawMode && targetGap) {
      if (!pendingPoint) {
        setPendingPoint(targetGap);
      } else {
        if (targetGap.x !== pendingPoint.x || targetGap.y !== pendingPoint.y) {
          onAddManualLine({ start: pendingPoint, end: targetGap });
        }
        setPendingPoint(null); 
      }
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.translate(viewState.x, viewState.y);
    ctx.scale(viewState.scale, -viewState.scale);
    let foundId: string | null = null;
    ctx.lineWidth = 40 / viewState.scale;
    for (let i = preparedManualLines.length - 1; i >= 0; i--) {
      if (ctx.isPointInStroke(preparedManualLines[i].path, worldX, worldY)) { foundId = preparedManualLines[i].id; break; }
    }
    if (!foundId) {
      for (let i = preparedEntities.length - 1; i >= 0; i--) {
        if (ctx.isPointInStroke(preparedEntities[i].path, worldX, worldY)) { foundId = preparedEntities[i].id; break; }
      }
    }
    ctx.restore();
    if (foundId) {
      setSelectedIds(prev => ((e as any).ctrlKey || (e as any).metaKey) ? (prev.includes(foundId!) ? prev.filter(id => id !== foundId) : [...prev, foundId!]) : [foundId!]);
    } else {
      setSelectedIds([]);
    }
    setPendingPoint(null);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !viewState) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const width = canvas.width = containerRef.current?.clientWidth || 800;
    const height = canvas.height = 500;
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);
    
    const vgs = 100 * viewState.scale * Math.pow(10, -Math.floor(Math.log10(viewState.scale)));
    ctx.strokeStyle = 'rgba(14, 165, 233, 0.05)';
    ctx.beginPath();
    for (let x = viewState.x % vgs; x < width; x += vgs) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = viewState.y % vgs; y < height; y += vgs) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    ctx.save();
    ctx.translate(viewState.x, viewState.y);
    ctx.scale(viewState.scale, -viewState.scale);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    
    manualLines.forEach(line => {
      const isS = selectedIds.includes(line.id);
      ctx.strokeStyle = isS ? '#f97316' : '#f43f5e';
      ctx.lineWidth = (isS ? 3 : 2) / viewState.scale;
      ctx.setLineDash([5 / viewState.scale, 5 / viewState.scale]);
      ctx.beginPath(); ctx.moveTo(line.start.x, line.start.y); ctx.lineTo(line.end.x, line.end.y); ctx.stroke();
    });
    ctx.setLineDash([]);

    preparedEntities.forEach(item => {
      const isS = selectedIds.includes(item.id);
      ctx.strokeStyle = isS ? '#f97316' : (item.isJoined ? '#3b82f6' : '#0ea5e9');
      ctx.lineWidth = (isS ? 3 : (item.isJoined ? 1.5 : 1)) / viewState.scale;
      ctx.stroke(item.path);
    });

    allGaps.forEach(gap => {
      const isH = hoveredGap && gap.x === hoveredGap.x && gap.y === hoveredGap.y;
      const isP = pendingPoint && gap.x === pendingPoint.x && gap.y === pendingPoint.y;
      ctx.fillStyle = isH || isP ? '#fbbf24' : '#ef4444';
      ctx.beginPath(); ctx.arc(gap.x, gap.y, (isH || isP ? 11 : 7) / viewState.scale, 0, Math.PI * 2); ctx.fill();
    });

    if (pendingPoint && hoveredGap) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
        ctx.lineWidth = 2.5 / viewState.scale;
        ctx.setLineDash([5 / viewState.scale, 5 / viewState.scale]);
        ctx.beginPath(); ctx.moveTo(pendingPoint.x, pendingPoint.y); ctx.lineTo(hoveredGap.x, hoveredGap.y); ctx.stroke();
        ctx.setLineDash([]);
    }
    ctx.restore();

    if (selectionBox) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      const x = Math.min(selectionBox.startX, selectionBox.endX);
      const y = Math.min(selectionBox.startY, selectionBox.endY);
      const w = Math.abs(selectionBox.startX - selectionBox.endX);
      const h = Math.abs(selectionBox.startY - selectionBox.endY);
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
    }
  }, [preparedEntities, viewState, selectedIds, allGaps, hoveredGap, pendingPoint, manualLines, selectionBox]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden bg-slate-950 rounded-3xl border border-white/5 shadow-2xl group select-none">
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        onMouseLeave={() => { setIsDragging(false); setIsSelecting(false); setIsPinching(false); setHoveredGap(null); }}
        style={{ touchAction: 'none' }}
        className={`block w-full h-[500px] cursor-${hoveredGap ? 'crosshair' : (isSelecting ? 'crosshair' : (isDragging ? 'grabbing' : 'default'))}`} 
      />
      
      {/* HUD Toolbar */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={() => handleZoom(1.5)} className="p-4 bg-slate-900/95 hover:bg-blue-600 text-white rounded-xl border border-white/10 shadow-lg active:scale-95"><ZoomIn size={24} /></button>
        <button onClick={() => handleZoom(0.7)} className="p-4 bg-slate-900/95 hover:bg-blue-600 text-white rounded-xl border border-white/10 shadow-lg active:scale-95"><ZoomOut size={24} /></button>
        <button onClick={handleResetView} className="p-4 bg-slate-900/95 hover:bg-blue-600 text-white rounded-xl border border-white/10 shadow-lg active:scale-95"><Maximize size={24} /></button>
        <div className="h-px bg-white/10 my-1" />
        <button onClick={onUndo} disabled={!canUndo} className={`p-4 rounded-xl border border-white/10 shadow-lg transition-colors active:scale-95 ${canUndo ? 'bg-slate-900/95 text-white hover:bg-blue-600' : 'bg-slate-900/50 text-slate-700 cursor-not-allowed'}`}><Undo2 size={24} /></button>
        <button onClick={onRedo} disabled={!canRedo} className={`p-4 rounded-xl border border-white/10 shadow-lg transition-colors active:scale-95 ${canRedo ? 'bg-slate-900/95 text-white hover:bg-blue-600' : 'bg-slate-900/50 text-slate-700 cursor-not-allowed'}`}><Redo2 size={24} /></button>
        <div className="h-px bg-white/10 my-1" />
        <button onClick={() => setIsMarqueeMode(!isMarqueeMode)} className={`p-4 rounded-xl border border-white/10 shadow-lg transition-colors active:scale-95 ${isMarqueeMode ? 'bg-blue-600 text-white' : 'bg-slate-900/95 text-slate-400'}`}><SquareMousePointer size={24} /></button>
        <button 
          onClick={() => { setIsDrawMode(!isDrawMode); setPendingPoint(null); }} 
          className={`p-4 rounded-xl border border-white/10 shadow-lg transition-all active:scale-95 ${isDrawMode ? 'bg-amber-500 text-white ring-4 ring-amber-500/20' : 'bg-slate-900/95 text-slate-400'}`}
          title="Nối 2 điểm đỏ"
        >
          <Pencil size={24} />
        </button>
      </div>

      {/* Selected Item Info Panel */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-4 w-72 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
               <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Database size={16} /></div>
                 <h4 className="text-white font-black text-[10px] uppercase tracking-widest">THÔNG TIN CHI TIẾT</h4>
               </div>
               <button onClick={() => setSelectedIds([])} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all"><X size={16} /></button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-slate-500"><Hash size={14} /><span className="text-[9px] font-black uppercase">ID</span></div>
                <span className="text-[10px] font-mono font-bold text-white truncate max-w-[120px]">{selectedItem.data.id}</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-slate-500"><Layers size={14} /><span className="text-[9px] font-black uppercase">LOẠI</span></div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">
                  {selectedItem.type === 'MANUAL_LINE' ? 'MANUAL LINE' : (selectedItem.data as any).type}
                </span>
              </div>

              {selectedItem.type === 'ENTITY' && (selectedItem.data as any).area !== undefined && (
                <div className="flex items-center justify-between bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-400"><Box size={14} /><span className="text-[9px] font-black uppercase">DIỆN TÍCH</span></div>
                  <span className="text-sm font-mono font-black text-white">{FORMAT_NUMBER((selectedItem.data as any).area)} <span className="text-[9px] text-slate-500 italic">mm²</span></span>
                </div>
              )}

              {selectedItem.type === 'ENTITY' && (
                <>
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-slate-500"><Hash size={14} /><span className="text-[9px] font-black uppercase">ĐIỂM (NODES)</span></div>
                    <span className="text-[10px] font-mono font-bold text-white">{(selectedItem.data as any).verticesCount}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-2 text-slate-500"><Smartphone size={14} /><span className="text-[9px] font-black uppercase">TRẠNG THÁI</span></div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${(selectedItem.data as any).isClosed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {(selectedItem.data as any).isClosed ? 'KHÉP KÍN' : 'HỞ'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
               <button 
                 onClick={() => {
                   if (selectedItem.type === 'ENTITY') onExplodeEntity(selectedItem.data.id);
                   setSelectedIds([]);
                 }}
                 disabled={selectedItem.type === 'MANUAL_LINE'}
                 className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-orange-600/20 hover:text-orange-400 text-slate-400 py-3 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest disabled:opacity-30"
               >
                 <Scissors size={12} /> PHÁ TÁCH
               </button>
               <button 
                 onClick={() => {
                   if (selectedItem.type === 'ENTITY') onDeleteEntity(selectedItem.data.id);
                   else onDeleteManualLine(selectedItem.data.id);
                   setSelectedIds([]);
                 }}
                 className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-600/20 hover:text-red-400 text-slate-400 py-3 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest"
               >
                 <Trash2 size={12} /> XÓA BỎ
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDrawMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-amber-500 rounded-2xl shadow-2xl text-white font-black uppercase text-[10px] tracking-widest z-40 flex items-center gap-3 border-2 border-white/20"
          >
            <Smartphone size={14} className="animate-pulse" />
            {pendingPoint ? "NHẤN CHỌN ĐIỂM ĐỎ THỨ 2" : "CHỌN ĐIỂM ĐỎ 1 (BẮT ĐẦU)"}
            <button onClick={() => { setIsDrawMode(false); setPendingPoint(null); }} className="ml-2 p-1 bg-black/20 rounded-lg hover:bg-black/40"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 left-4 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-full border border-white/10 w-fit">
            <Smartphone size={12} className="text-blue-400" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Con lăn: Zoom | Chuột Phải/Giữa: Pan</span>
        </div>
      </div>
    </div>
  );
};

export default DxfPreview;