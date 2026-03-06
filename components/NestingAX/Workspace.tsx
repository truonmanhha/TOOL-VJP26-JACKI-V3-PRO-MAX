import { renderGeneralSVG, renderEngineSVG, renderRectEngineSVG } from "./renderSettingsSVG";

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
import { Part, Sheet, StockSheet, db, AppSettings, Layer, CadEntity } from './services/db';
import { createPartFromSelection, getSelectionBox, getEntitiesInSelection } from './AutoPartCreation';
import VectorPreview, { cadEntitiesToGeometry } from '../nesting/NewNestList/VectorPreview';
import { SnapMode, SnapResult, findNearestSnapPoint, applyOrthoConstraint, SNAP_INDICATOR_COLORS, SNAP_INDICATOR_LABELS } from './services/snapService';
import { undoManager, UndoAction } from './services/undoManager';
import { dxfService } from './services/dxfService';
import { motion, AnimatePresence } from 'framer-motion';
import LayerPanel from './LayerPanel';
import { FireworksOverlay } from './FireworksOverlay';

interface WorkspaceProps {
  onMouseMove: (x: number, y: number) => void;
  showModal?: boolean;
  onCloseModal?: () => void;
  activeNestList?: string;
  showSettingsModal?: boolean;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onStoreDXFHandler?: (handler: () => void) => void;
  onStoreDXFAsPartHandler?: (handler: () => void) => void;
  onStoreExportHandler?: (handler: (format: 'dxf' | 'svg' | 'pdf') => void) => void;
  
  // Nesting Trigger
  onStartNesting?: () => void;
  onMouseWorldPos?: (pos: { x: number; y: number }) => void;

  // FOOTER 1 — Broadcast state to parent (read-only mirror)
  onZoomChange?: (zoom: number) => void;
  onCrosshairChange?: (show: boolean) => void;
  onCrosshairSizeChange?: (size: number) => void;
  onDynInputChange?: (show: boolean) => void;
  // FOOTER 1 — Store setter for crosshair size (write-back from slider)
  onSetCrosshairSize?: (fn: (size: number) => void) => void;

  // Part Workflow
  isSelecting?: boolean;
  onAddPartFromDrawing?: () => void;
  onOpenPartParamsDirect?: () => void;
  showPartParamsModal?: boolean;
  onClosePartParams?: () => void;
  parts?: Part[];
  onAddPart?: (part: Omit<Part, 'id' | 'nestListId'>) => void;
  onUpdatePart?: (partId: string, data: Partial<Part>) => void;

  // Sheet Workflow
  isSelectingSheet?: boolean;
  onAddSheetFromDrawing?: () => void;
  showSheetParamsModal?: boolean;
  onCloseSheetParams?: () => void;
  sheets?: Sheet[];
  onAddSheet?: (sheet: Omit<Sheet, 'id' | 'nestListId'>) => void;
  onUpdateSheet?: (sheetId: string, data: Partial<Sheet>) => void;


  // Manual Nest
  isManualNesting?: boolean;
  onCloseManualNest?: () => void;

  // Nesting Info
  showNestingInfo?: boolean;
  onCloseNestingInfo?: () => void;

  // Drawing Tools
  activeDrawTool?: string | null;
  onCancelDraw?: () => void;
  onSelectTool?: (tool: string) => void;

  // Snap & Ortho
  snapEnabled?: boolean;
  activeSnaps?: Set<SnapMode>;
  orthoEnabled?: boolean;
  onToggleSnap?: () => void;
  onToggleOrtho?: () => void;

  // Layer System (Task 18)
  layers?: Layer[];
  activeLayerId?: string;
  onLayerChange?: () => void;
  showLayerPanel?: boolean; // Task 18
  
  // Real-Time Selection Preview (for Preview 2)
  onSelectionChange?: (selectedIds: Set<string>, allEntities: CadEntity[]) => void;
  onOptimizeEntities?: (entityIds: Set<string>) => void;
  activePartId?: string | null;
}

// REMOVE duplicate CadEntity if exists and use import
// interface CadEntity {
//   id: string;
//   type: string;
//   points: { x: number; y: number }[];
//   properties?: any;
// }

const Workspace: React.FC<WorkspaceProps> = ({ 
  onMouseMove, 
  showModal, 
  onCloseModal, 
  activeNestList,
  showSettingsModal,
  onOpenSettings,
  onCloseSettings,
  onContextMenu,
  onStoreDXFHandler,
  onStoreDXFAsPartHandler,
  onStoreExportHandler,
  onStartNesting,
  onMouseWorldPos,

  onZoomChange,
  onCrosshairChange,
  onCrosshairSizeChange,
  onDynInputChange,
  onSetCrosshairSize,
  
  isSelecting,
  onAddPartFromDrawing,
  onOpenPartParamsDirect,
  showPartParamsModal,
  onClosePartParams,
  parts = [],
  onAddPart,
  onUpdatePart,

  isSelectingSheet,
  onAddSheetFromDrawing,
  showSheetParamsModal,
  onCloseSheetParams,
  sheets = [],
  onAddSheet,
  onUpdateSheet,


  isManualNesting,
  onCloseManualNest,

  showNestingInfo,
  onCloseNestingInfo,

  activeDrawTool,
  onCancelDraw,
  onSelectTool,

  snapEnabled,
  activeSnaps,
  orthoEnabled,
  onToggleSnap,
  onToggleOrtho,
  onSelectionChange,
  onOptimizeEntities,
  activePartId,

  // Layer System
  layers = [],
  activeLayerId = 'default',
  onLayerChange,
  showLayerPanel = false, // Task 18
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dxfImportRef = useRef<HTMLInputElement>(null);
  const dxfAsPartImportRef = useRef<HTMLInputElement>(null);
  
  // Snap State (current active snap point for rendering)
  const [currentSnap, setCurrentSnap] = useState<SnapResult | null>(null);
  
  // Settings Logic
  const [settingsTab, setSettingsTab] = useState<'general' | 'engine' | 'rectengine' | 'extensions'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(db.getSettings());

  // Drawing State
  const [drawState, setDrawState] = useState<{
    step: number;
    points: { x: number, y: number }[];
    currentPos: { x: number, y: number } | null;
    properties?: Record<string, any>;
  }>({ step: 0, points: [], currentPos: null, properties: {} });

  // === MEASURE TOOL STATE ===
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureResult, setMeasureResult] = useState<{
    distance: number;
    p1: { x: number; y: number };
    p2: { x: number; y: number };
  } | null>(null);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === NEW MEASURE TOOLS STATE ===
  const [measureRadiusPoints, setMeasureRadiusPoints] = useState<{ x: number; y: number }[]>([]);
  const [measureAnglePoints, setMeasureAnglePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureAreaPoints, setMeasureAreaPoints] = useState<{ x: number; y: number }[]>([]);
  
  // === FIREWORKS STATE ===
  const [showFireworksOverlay, setShowFireworksOverlay] = useState(false);

  // === JOIN TOOL STATE ===
  const [joinFirstEntityId, setJoinFirstEntityId] = useState<string | null>(null);

  // === EDIT TOOL STATE (Offset, Trim, Extend, Fillet, Chamfer) ===
  const EDIT_TOOLS = ['offset', 'trim', 'extend', 'fillet', 'chamfer'];
  const [editToolState, setEditToolState] = useState<{
    step: number;
    distance: number;       // offset distance, fillet radius, chamfer distance
    sourceEntityId: string | null;  // boundary or source entity
    targetEntityId: string | null;  // entity to modify
    clickPos: { x: number; y: number } | null; // click position for side detection
  }>({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });

  // === TRANSFORM EDIT TOOLS (Move, Copy, Mirror, Rotate, Scale) ===
  const TRANSFORM_EDIT_TOOLS = ['move', 'copy', 'mirror', 'rotate', 'scale'];
  const [transformEditState, setTransformEditState] = useState<{
    step: number;
    points: { x: number; y: number }[];
    currentPos: { x: number; y: number } | null;
  }>({ step: 0, points: [], currentPos: null });

  // CAD Entities (Drawn Geometry)
  const [cadEntities, setCadEntities] = useState<CadEntity[]>([]);
  const cadEntitiesRef = useRef<CadEntity[]>([]);
  cadEntitiesRef.current = cadEntities;

  // === PERFORMANCE: RAF throttle for mouse move ===
  const rafMouseMoveRef = useRef<number | null>(null);

  // === UNDO/REDO STATE (for UI reactivity) ===
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false, undoDesc: '', redoDesc: '' });
  useEffect(() => {
    const unsub = undoManager.subscribe(() => {
      setUndoState({
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
        undoDesc: undoManager.getUndoDescription(),
        redoDesc: undoManager.getRedoDescription()
      });
    });
    return unsub;
  }, []);

  // Register apply callback so undoManager can update cadEntities from anywhere (Footer, keyboard, etc.)
  useEffect(() => {
    const unregister = undoManager.registerApplyCallback((state: any, direction: 'undo' | 'redo') => {
      setCadEntities([...state]);
      console.log(direction === 'undo' ? '↩️ Undo applied' : '↪️ Redo applied');
    });
    return unregister;
  }, []);

  /** Push undo action and update cadEntities atomically */
  const setCadEntitiesWithUndo = useCallback((
    updater: (prev: CadEntity[]) => CadEntity[],
    description: string,
    type: 'draw' | 'edit' | 'delete' = 'draw',
    entityIds?: string[]
  ) => {
    try {
      const before = cadEntitiesRef.current;
      setCadEntities(prev => {
        const after = updater(prev);
        undoManager.push({ type, before: [...before], after: [...after], entityIds, description });
        return after;
      });
    } catch (err) {
      console.error('❌ Undo push failed:', err);
    }
  }, []);

  /** Execute undo (keyboard shortcut handler) */
  const handleUndo = useCallback(() => {
    undoManager.undo();
  }, []);

  /** Execute redo (keyboard shortcut handler) */
  const handleRedo = useCallback(() => {
    undoManager.redo();
  }, []);
  // === ZOOM FIT: Calculate content bounds from cadEntities + sheets ===
  const getContentBounds = useCallback((): { minX: number; minY: number; maxX: number; maxY: number } | null => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasContent = false;

    // Include all cadEntities
    cadEntities.forEach(entity => {
      entity.points?.forEach((p: { x: number; y: number }) => {
        if (isFinite(p.x) && isFinite(p.y)) {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
          hasContent = true;
        }
      });
      // Handle circle/arc radius
      if (entity.type === 'circle' || entity.type === 'arc') {
        const cx = entity.properties?.centerX ?? entity.points?.[0]?.x ?? 0;
        const cy = entity.properties?.centerY ?? entity.points?.[0]?.y ?? 0;
        const r = entity.properties?.radius ?? 0;
        if (isFinite(cx) && isFinite(cy) && isFinite(r) && r > 0) {
          minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
          minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
          hasContent = true;
        }
      }
      // Handle ellipse rx/ry
      if (entity.type === 'ellipse') {
        const cx = entity.points?.[0]?.x ?? 0;
        const cy = entity.points?.[0]?.y ?? 0;
        const rx = entity.properties?.rx ?? 0;
        const ry = entity.properties?.ry ?? 0;
        if (isFinite(cx) && isFinite(cy) && (rx > 0 || ry > 0)) {
          minX = Math.min(minX, cx - rx); maxX = Math.max(maxX, cx + rx);
          minY = Math.min(minY, cy - ry); maxY = Math.max(maxY, cy + ry);
          hasContent = true;
        }
      }
    });

    // Include sheets (use x/y if defined, default to 0)
    sheets.forEach(sheet => {
      const match = sheet.dimensions.match(/(\d+)\s*[xX×]\s*(\d+)/);
      if (!match) return;
      const sw = Number(match[1]);
      const sh = Number(match[2]);
      const sheetX = sheet.x ?? 0;
      const sheetY = sheet.y ?? 0;
      minX = Math.min(minX, sheetX);
      minY = Math.min(minY, sheetY);
      maxX = Math.max(maxX, sheetX + sw);
      maxY = Math.max(maxY, sheetY + sh);
      hasContent = true;
    });

    return hasContent ? { minX, minY, maxX, maxY } : null;
  }, [cadEntities, sheets]);
  const [isMouseInWorkspace, setIsMouseInWorkspace] = useState(false);

  // === TOAST / ERROR MESSAGE STATE ===
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, durationMs = 2500) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), durationMs);
  };

  // === DXF IMPORT LOADING STATE ===
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatusText, setImportStatusText] = useState('');


  const getVisibleEntities = useCallback((): CadEntity[] => {
    return cadEntities.filter(entity => {
      const layer = layers.find(l => l.id === entity.layerId);
      return !layer || layer.visible;
    });
  }, [cadEntities, layers]);

  const getSheetDimensions = useCallback((): { w: number; h: number } => {
    if (sheets.length > 0) {
      const dimStr = sheets[0].dimensions;
      const match = dimStr.match(/(\d+)\s*[xX×]\s*(\d+)/);
      if (match) return { w: Number(match[1]), h: Number(match[2]) };
    }
    return { w: 1000, h: 1000 };
  }, [sheets]);

  // === EXPORT HANDLER (Lifted to be called from Footer) ===
  const handleExport = useCallback((format: 'dxf' | 'svg' | 'pdf') => {
    const visible = getVisibleEntities();
    if (visible.length === 0) {
      showToast('⚠️ No visible entities to export');
      return;
    }
    const { w, h } = getSheetDimensions();
    const timestamp = new Date().toISOString().slice(0, 10);
    try {
      if (format === 'dxf') {
        const content = dxfService.exportToDxf(visible, w, h);
        dxfService.downloadFile(content, `nesting-${timestamp}.dxf`, 'application/dxf');
      } else if (format === 'svg') {
        const content = dxfService.exportToSvg(visible, w, h);
        dxfService.downloadFile(content, `nesting-${timestamp}.svg`, 'image/svg+xml');
      } else {
        const blob = dxfService.exportToPdf(visible, w, h);
        dxfService.downloadBlob(blob, `nesting-${timestamp}.pdf`);
      }
      showToast(`✅ Exported ${visible.length} entities as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('❌ Export failed:', err);
      showToast(`❌ Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [getVisibleEntities, getSheetDimensions, showToast]);

  // Store export handler for Footer to use
  useEffect(() => {
    onStoreExportHandler?.(handleExport);
  }, [handleExport, onStoreExportHandler]);

  // === SELECTION STATE (AutoCAD Style Window Selection) ===
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [isWindowSelecting, setIsWindowSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number, y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number, y: number } | null>(null);

  // Broadcast selection changes to parent
  useEffect(() => {
    // Notify parent about selection change
    onSelectionChange?.(selectedEntities, cadEntities);
  }, [selectedEntities, cadEntities, onSelectionChange]);
  // === PENDING DELETE MODE: tracks if user activated delete with no selection ===
  const [pendingDeleteMode, setPendingDeleteMode] = useState(false);

  // === SHEET DRAGGING STATE ===
  // === SHEET DRAGGING STATE ===
  const [draggingSheet, setDraggingSheet] = useState<{ id: string; startMouseWorld: { x: number; y: number }; origSheetX: number; origSheetY: number } | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  // === PART DRAGGING STATE ===
  const [draggingPart, setDraggingPart] = useState<{ id: string; sheetId: string; startMouseWorld: { x: number; y: number }; origPartX: number; origPartY: number } | null>(null);

  // === CROSSHAIR & COORDINATE INPUT STATE (AutoCAD Style) ===
  const [mouseScreenPos, setMouseScreenPos] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });
  const [showCrosshair, setShowCrosshair] = useState(true);
  const [crosshairSize, setCrosshairSize] = useState(100); // percentage of screen (100 = full screen)

  // === FOOTER 1: Store crosshair size setter for external access ===
  useEffect(() => {
    onSetCrosshairSize?.(setCrosshairSize);
  }, [onSetCrosshairSize]);
  
  // Command Input State (AutoCAD Dynamic Input)
  const [commandInput, setCommandInput] = useState('');
  const [showCommandInput, setShowCommandInput] = useState(true);

  // === FOOTER 1: Broadcast dynamic input mode ===
  useEffect(() => {
    onDynInputChange?.(showCommandInput);
  }, [showCommandInput, onDynInputChange]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const commandInputRef = useRef<HTMLInputElement>(null);

  /** Broadcast mouse world position to parent via callback */
  useEffect(() => {
    onMouseWorldPos?.(mouseWorldPos);
  }, [mouseWorldPos, onMouseWorldPos]);

  // === SIDEBAR TO CANVAS SELECTION SYNC ===
  useEffect(() => {
    if (activePartId) {
      const activePart = parts.find(p => p.id === activePartId);
      if (activePart && activePart.cadEntities) {
        const idsToSelect = new Set<string>();
        activePart.cadEntities.forEach((ent: any) => {
          if (ent.properties?.originalId) {
            idsToSelect.add(ent.properties.originalId);
          }
        });
        
        if (idsToSelect.size > 0) {
          console.log('🔗 Syncing Sidebar selection to Canvas:', idsToSelect.size, 'entities');
          setSelectedEntities(idsToSelect);
        }
      }
    }
  }, [activePartId, parts]);

  // FOOTER 1: Broadcast crosshair visibility
  useEffect(() => {
    onCrosshairChange?.(showCrosshair);
  }, [showCrosshair, onCrosshairChange]);

  // === FOOTER 1: Broadcast crosshair size ===
  useEffect(() => {
    onCrosshairSizeChange?.(crosshairSize);
  }, [crosshairSize, onCrosshairSizeChange]);

  // === KEYBOARD SHORTCUTS (AutoCAD Style) ===
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're focused on the workspace area
      if (!isMouseInWorkspace) return;
      
      // F6: Toggle Crosshair
      if (e.key === 'F6') {
        e.preventDefault();
        setShowCrosshair(prev => !prev);
      }

      // F3: Toggle Snap (AutoCAD standard)
      if (e.key === 'F3') {
        e.preventDefault();
        onToggleSnap?.();
      }

      // F8: Toggle Ortho (AutoCAD standard)
      if (e.key === 'F8') {
        e.preventDefault();
        onToggleOrtho?.();
      }
      
      // F12: Toggle Dynamic Input
      if (e.key === 'F12') {
        e.preventDefault();
        setShowCommandInput(prev => !prev);
      }

      // Tab: Focus command input when drawing
      if (e.key === 'Tab' && activeDrawTool && showCommandInput) {
        e.preventDefault();
        commandInputRef.current?.focus();
      }

      // Delete/Backspace: Delete selected entities
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntities.size > 0) {
        e.preventDefault();
        console.log('🗑️ Deleting selected entities:', selectedEntities.size);
        const ids = Array.from(selectedEntities);
        setCadEntitiesWithUndo(
          prev => prev.filter(ent => !selectedEntities.has(ent.id)),
          `Delete ${ids.length} entit${ids.length === 1 ? 'y' : 'ies'}`,
          'delete',
          ids
        );
        // Keep selection (user may want to undo/inspect)
      }

      // Ctrl+Z: Undo
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }

      // Escape: Clear selection or cancel transform edit
      if (e.key === 'Escape') {
        if (showSettingsModal && onCloseSettings) {
            onCloseSettings();
            return;
        }

        if (showModal && onCloseModal) {
            onCloseModal();
            return;
        }

        // Cancel transform edit tool first
        if (activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
          console.log('❌ Cancelling transform edit:', activeDrawTool);
          setTransformEditState({ step: 0, points: [], currentPos: null });
          if (onCancelDraw) onCancelDraw();
        } else if (activeDrawTool === 'measure') {
          console.log('❌ Clearing measure tool');
          setMeasurePoints([]);
          setMeasureResult(null);
          if (measureTimerRef.current) { clearTimeout(measureTimerRef.current); measureTimerRef.current = null; }
        } else if (activeDrawTool === 'measure_quick') {
          console.log('❌ Cancelling measure_quick tool');
          if (onCancelDraw) onCancelDraw();
        } else if (activeDrawTool === 'join') {
          console.log('❌ Clearing join tool');
          setJoinFirstEntityId(null);
          setSelectedEntities(new Set());
        } else if (selectedEntities.size > 0) {
          console.log('❌ Clearing selection');
          setSelectedEntities(new Set());
        }
      }

      // Ctrl+A: Select all
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        console.log('✅ Selecting all entities');
        setSelectedEntities(new Set(cadEntities.map(ent => ent.id)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMouseInWorkspace, activeDrawTool, showCommandInput, selectedEntities, cadEntities, onToggleSnap, onToggleOrtho, handleUndo, handleRedo, setCadEntitiesWithUndo, showModal, onCloseModal, showSettingsModal, onCloseSettings]);

  // Reset drawing state when tool changes
  useEffect(() => {
    // console.log('🔧 Active draw tool changed:', activeDrawTool);
setDrawState({ step: 0, points: [], currentPos: null });
setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
    setTransformEditState({ step: 0, points: [], currentPos: null });
    setMeasurePoints([]);
    setMeasureResult(null);
    if (measureTimerRef.current) { clearTimeout(measureTimerRef.current); measureTimerRef.current = null; }
    setMeasureRadiusPoints([]);
    setMeasureAnglePoints([]);
    setMeasureAreaPoints([]);
    setJoinFirstEntityId(null);
    
    // Validate transform edit tools require selection
    if (activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool) && selectedEntities.size === 0) {
      console.warn('⚠️ Transform edit tool requires selection! No entities selected.');
      showToast('Select entities first! Use window selection or Ctrl+A before using ' + activeDrawTool.toUpperCase() + ' tool.');
      if (onCancelDraw) onCancelDraw();
    }
  }, [activeDrawTool]);

  // === ZOOM FIT: When activeDrawTool === 'zoom_fit', fit all content in view ===
  useEffect(() => {
    if (activeDrawTool !== 'zoom_fit') return;
    if (!containerRef.current) {
      onCancelDraw?.();
      return;
    }

    const bounds = getContentBounds();
    if (!bounds) {
      console.log('⚠️ Zoom Fit: No content to fit');
      onCancelDraw?.();
      return;
    }

    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    if (containerW <= 0 || containerH <= 0) {
      onCancelDraw?.();
      return;
    }

    const contentW = bounds.maxX - bounds.minX;
    const contentH = bounds.maxY - bounds.minY;
    if (contentW <= 0 && contentH <= 0) {
      onCancelDraw?.();
      return;
    }

    // 10% padding on each side → content occupies 80% of viewport
    const paddingFactor = 0.8;
    const zoomX = contentW > 0 ? (containerW * paddingFactor) / (contentW * BASE_PIXELS_PER_UNIT) : Infinity;
    const zoomY = contentH > 0 ? (containerH * paddingFactor) / (contentH * BASE_PIXELS_PER_UNIT) : Infinity;
    const newZoom = Math.max(0.01, Math.min(Math.min(zoomX, zoomY), 50));

    const newPixelsPerUnit = BASE_PIXELS_PER_UNIT * newZoom;
    const contentCenterX = (bounds.minX + bounds.maxX) / 2;
    const contentCenterY = (bounds.minY + bounds.maxY) / 2;

    // viewOffset.x = worldX at screen left → center content horizontally
    // viewOffset.y = worldY at screen top → center content vertically (Y inverted)
    const newViewOffsetX = contentCenterX - (containerW / (2 * newPixelsPerUnit));
    const newViewOffsetY = contentCenterY + (containerH / (2 * newPixelsPerUnit));

    setZoom(newZoom);
    setViewOffset({ x: newViewOffsetX, y: newViewOffsetY });
    console.log('🔍 Zoom Fit applied:', { newZoom: newZoom.toFixed(3), offsetX: newViewOffsetX.toFixed(0), offsetY: newViewOffsetY.toFixed(0) });

    onCancelDraw?.();
  }, [activeDrawTool]);

  // === DELETE TOOL: When activeDrawTool === 'delete', delete selected entities or switch to select mode ===
  useEffect(() => {
    if (activeDrawTool !== 'delete') return;
    
    if (selectedEntities.size > 0) {
      // State A: Entities already selected → delete them immediately
      console.log('🗑️ Delete tool activated', { selectedCount: selectedEntities.size, mode: 'immediate' });
      const ids = Array.from(selectedEntities);
      setCadEntitiesWithUndo(
        prev => prev.filter(ent => !selectedEntities.has(ent.id)),
        `Delete ${ids.length} entit${ids.length === 1 ? 'y' : 'ies'}`,
        'delete',
        ids
      );
      // Keep selection (user may want to undo/inspect)
      setPendingDeleteMode(false);
      onCancelDraw?.();
    } else {
      // State B: No entities selected → activate selection mode, let user pick entities
      console.log('🗑️ Delete tool activated', { selectedCount: 0, mode: 'select-to-delete' });
      setPendingDeleteMode(true);
      onSelectTool?.('select');
      showToast('🗑️ Chọn đối tượng cần xóa (quét chọn), sau đó nhấn CHUỘT PHẢI để xóa');
    }
  }, [activeDrawTool]);

  // Clear pendingDeleteMode when tool changes away from 'select' (user cancelled or picked another tool)
  useEffect(() => {
    if (pendingDeleteMode && activeDrawTool !== 'select' && activeDrawTool !== 'delete') {
      setPendingDeleteMode(false);
    }
  }, [activeDrawTool, pendingDeleteMode]);

  // Load settings when modal opens
  useEffect(() => {
    if (showSettingsModal) {
      setAppSettings(db.getSettings());
    }
  }, [showSettingsModal]);

  // Register DXF import handler with parent component
  useEffect(() => {
    if (onStoreDXFHandler) {
      onStoreDXFHandler(() => handleDXFImportFile());
    }
  }, [onStoreDXFHandler]);

  // Register DXF→Part import handler with parent component
  useEffect(() => {
    if (onStoreDXFAsPartHandler) {
      onStoreDXFAsPartHandler(() => handleDXFImportAsPart());
    }
  }, [onStoreDXFAsPartHandler]);
  const handleSaveSettings = () => {
    db.saveSettings(appSettings);
    if (onCloseSettings) onCloseSettings();
  };

  const handleExportSettings = () => {
    const json = db.exportSettingsToJson();
    if (!json) {
      showToast('❌ Export failed');
      return;
    }
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nesting-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Settings exported');
  };

  const handleImportSettings = () => {
    fileInputRef.current?.click();
  };

  const handleDXFImportFile = () => {
    dxfImportRef.current?.click();
  };

  const handleDXFFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (isImporting) return;

    setIsImporting(true);
    setImportProgress(0);
    const importSteps = [
      { text: 'Đang tải file...', progress: 15 },
      { text: 'Đang phân tích cấu trúc...', progress: 35 },
      { text: 'Đang đọc entities...', progress: 60 },
      { text: 'Đang chuyển đổi hình học...', progress: 85 },
      { text: 'Hoàn tất!', progress: 100 },
    ];
    for (const step of importSteps) {
      setImportStatusText(step.text);
      await new Promise(r => setTimeout(r, 150));
      setImportProgress(step.progress);
    }

    try {
      const result = await dxfService.parseImportFile(file, activeLayerId);
      if (result.entities.length === 0) {
        showToast('❌ No entities found in file', 5000);
        return;
      }

      setCadEntitiesWithUndo(
        prev => [...prev, ...result.entities],
        `Import ${result.fileType.toUpperCase()} file: ${result.fileName}`,
        'draw',
        result.entities.map(e => e.id)
      );
      
      showToast(`✅ Imported ${result.entities.length} entities from ${result.fileName}`);
    } catch (err) {
      showToast(`❌ Import error: ${err instanceof Error ? err.message : 'Unknown'}`, 5000);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportStatusText('');
    }
    
    if (dxfImportRef.current) dxfImportRef.current.value = '';
  };


  const handleDXFImportAsPart = () => {
    dxfAsPartImportRef.current?.click();
  };

  const handleDXFAsPartFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!onAddPart) {
      showToast('⚠️ No active Nest List. Select a list first.');
      if (dxfAsPartImportRef.current) dxfAsPartImportRef.current.value = '';
      return;
    }

    try {
      const result = await dxfService.parseImportFile(file, activeLayerId);
      if (result.entities.length === 0) {
        showToast('❌ No entities found in file');
        if (dxfAsPartImportRef.current) dxfAsPartImportRef.current.value = '';
        return;
      }

      // Compute bounding box across all entity points + circle/arc radii
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      result.entities.forEach(entity => {
        entity.points?.forEach((p: { x: number; y: number }) => {
          if (isFinite(p.x) && isFinite(p.y)) {
            minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
          }
        });
        if (entity.type === 'circle' || entity.type === 'arc') {
          const cx = entity.properties?.centerX ?? entity.points?.[0]?.x ?? 0;
          const cy = entity.properties?.centerY ?? entity.points?.[0]?.y ?? 0;
          const r = entity.properties?.radius ?? (entity as any).radius ?? 0;
          if (isFinite(cx) && isFinite(cy) && isFinite(r)) {
            minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
            minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
          }
        }
      });

      if (!isFinite(minX) || !isFinite(minY)) {
        showToast('❌ Could not compute bounding box');
        if (dxfAsPartImportRef.current) dxfAsPartImportRef.current.value = '';
        return;
      }

      const width = Math.max(1, maxX - minX);
      const height = Math.max(1, maxY - minY);

      // Normalize to origin (0,0) by translating all points
      const normalizedEntities: CadEntity[] = result.entities.map(entity => ({
        ...entity,
        points: entity.points?.map((p: { x: number; y: number }) => ({ x: p.x - minX, y: p.y - minY })) ?? [],
        properties: entity.properties ? {
          ...entity.properties,
          ...(entity.properties.centerX !== undefined ? { centerX: entity.properties.centerX - minX } : {}),
          ...(entity.properties.centerY !== undefined ? { centerY: entity.properties.centerY - minY } : {}),
        } : entity.properties,
      }));

      // Pre-fill form state BEFORE opening modal
      const baseName = result.fileName.replace(/\.(dxf|dwg|svg)$/i, '');
      setFormPartName(baseName || `Part_${parts.length + 1}`);
      setFormPartWidth(Math.round(width));
      setFormPartHeight(Math.round(height));
      setFormReqType('fixed');
      setFormNumReq(1);
      setFormRotation('Any Angle');
      setFormMirrored(false);
      setFormSmallPart(false);
      setFormPriority(1);
      setFormKitNum('');
      setDxfImportedGeometry(normalizedEntities); // Store for Part Modal preview
      setIsDxfPreFilled(true); // Flag to prevent useEffect from overwriting pre-filled data

      showToast(`📐 ${result.entities.length} entities loaded: ${Math.round(width)}×${Math.round(height)}mm`, 3000);

      // Open Part Params modal directly (no canvas selection needed)
      // Use a tiny delay so state updates are applied before modal opens
      setTimeout(() => {
        // Trigger showPartParamsModal via onOpenPartParamsDirect prop
        onOpenPartParamsDirect?.();
      }, 0);

    } catch (err) {
      showToast(`❌ Import error: ${err instanceof Error ? err.message : 'Unknown'}`);
      setIsDxfPreFilled(false);
    }

    if (dxfAsPartImportRef.current) dxfAsPartImportRef.current.value = '';
  };


  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const result = db.importSettingsFromJson(json);
        if (result.success) {
          setAppSettings(db.getSettings());
          undoManager.push({
            type: 'edit',
            before: appSettings,
            after: db.getSettings(),
            description: 'Import Settings'
          });
          showToast('✅ Settings imported');
        } else {
          showToast(`❌ Import failed: ${result.error}`);
        }
      } catch (err) {
        showToast(`❌ Import error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSettingChange = (field: keyof AppSettings, value: any) => {
    setAppSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleGapChange = (field: keyof AppSettings['gaps'], value: number) => {
     setAppSettings(prev => ({
       ...prev,
       gaps: { ...prev.gaps, [field]: value }
     }));
  };

  const handleRectEngineChange = (field: keyof AppSettings['rectEngine'], value: any) => {
    setAppSettings(prev => ({
      ...prev,
      rectEngine: { ...prev.rectEngine, [field]: value }
    }));
  };

  const handleExtensionsChange = (field: keyof AppSettings['extensions'], value: any) => {
    setAppSettings(prev => ({
      ...prev,
      extensions: { ...prev.extensions, [field]: value }
    }));
  };

  // Stock Database Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockSheets, setStockSheets] = useState<StockSheet[]>([]);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null);

  const handleOpenStockModal = () => {
    setStockSheets(db.getStockSheets());
    setShowStockModal(true);
    if (onCloseModal) onCloseModal(); 
  };

  const handleAddFromStock = () => {
    if (!selectedStockId || !onAddSheet) return;
    const stock = stockSheets.find(s => s.id === selectedStockId);
    if (stock) {
        onAddSheet({
            material: stock.material,
            dimensions: `${stock.width}x${stock.height}`,
            thickness: stock.thickness,
            quantity: 1,
            cost: stock.cost || 0,
            category: stock.category || 'General',
            supplier: stock.supplier || 'Unknown',
            grainDirection: stock.grainDirection || 'None'
        });
        setSelectedStockId('');
    }
  };

  // Viewport State
  const [zoom, setZoom] = useState(0.8); 

  // === FOOTER 1: Broadcast zoom changes ===
  useEffect(() => {
    onZoomChange?.(zoom);
  }, [zoom, onZoomChange]);
  const [viewOffset, setViewOffset] = useState({ x: -200, y: 3500 }); 
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartView, setDragStartView] = useState({ x: 0, y: 0 });

  // --- Part Form State ---
  const [formPartName, setFormPartName] = useState("From Screen 1");
  const [formReqType, setFormReqType] = useState<'fixed' | 'max'>('fixed');
  const [formNumReq, setFormNumReq] = useState(1);
  const [formRotation, setFormRotation] = useState("Any Angle");
  const [formMirrored, setFormMirrored] = useState(false);
  const [formSmallPart, setFormSmallPart] = useState(false);
  const [formPriority, setFormPriority] = useState(1);
  const [formKitNum, setFormKitNum] = useState("");
  // REMOVED: const [selectedPartGeometry, setSelectedPartGeometry] - now computed live below
  const [formPartWidth, setFormPartWidth] = useState(100); // NEW: Calculated width
  const [formPartHeight, setFormPartHeight] = useState(100); // NEW: Calculated height

  // --- Sheet Form State ---
  const [formSheetMaterial, setFormSheetMaterial] = useState("Mild Steel");
  const [formSheetThickness, setFormSheetThickness] = useState(5.0);
  const [formSheetWidth, setFormSheetWidth] = useState(3000);
  const [formSheetHeight, setFormSheetHeight] = useState(1500);
  const [formSheetQty, setFormSheetQty] = useState(5);
  const [selectedSheetGeometry, setSelectedSheetGeometry] = useState<CadEntity[] | null>(null); // NEW: Store geometry for sheet preview
  
  const [isDxfPreFilled, setIsDxfPreFilled] = useState(false); // Flag for DXF-imported parts
  const [dxfImportedGeometry, setDxfImportedGeometry] = useState<CadEntity[] | null>(null); // Geometry from DXF import (bypasses canvas)
  
  // ============ LIVE PART GEOMETRY (Real-time computed) ============
  // Priority 1: DXF-imported geometry (when bypassing canvas)
  // Priority 2: Live selection from canvas (updates in real-time)
  // Priority 2: Live selection from canvas (updates in real-time)
  const selectedPartGeometry = React.useMemo(() => {
    if (!showPartParamsModal) return null;
    
    // Priority 1: Use DXF-imported geometry if available
    if (isDxfPreFilled && dxfImportedGeometry && dxfImportedGeometry.length > 0) {
      return dxfImportedGeometry;
    }
    
    // Priority 2: Compute from current canvas selection (live updates)
    const selected = cadEntities.filter(e => selectedEntities.has(e.id));
    if (selected.length === 0) {
      console.log('⚠️ selectedPartGeometry: No entities selected');
      return null;
    }
    
    console.log('📦 selectedPartGeometry: Returning', selected.length, 'entities (NO normalization)');
    console.log('  Entity types:', selected.map(e => e.type).join(', '));
    
    // IMPORTANT: Return entities AS-IS without normalization
    // VectorPreview will handle bounding box calculation and scaling internally
    return selected;
  }, [showPartParamsModal, isDxfPreFilled, dxfImportedGeometry, cadEntities, selectedEntities]);
  // Cleanup: Clear DXF-imported geometry when modal closes
  useEffect(() => {
    if (!showPartParamsModal) {
      setIsDxfPreFilled(false);
      setDxfImportedGeometry(null);
    }
  }, [showPartParamsModal]);
  

  // Reset Part form (dimensions now auto-calculated from live selectedPartGeometry)
  useEffect(() => {
    if (showPartParamsModal) {
      console.log('🚀 Part Modal OPENED');
      console.log('  📦 cadEntities:', cadEntities.length);
      console.log('  ✅ selectedEntities:', Array.from(selectedEntities));
      console.log('  🔶 selectedPartGeometry:', selectedPartGeometry?.length || 0, 'entities');
      if (selectedPartGeometry && selectedPartGeometry.length > 0) {
        console.log('    Entity types:', selectedPartGeometry.map(e => e.type).join(', '));
      }
      console.log('  📦 cadEntities:', cadEntities.length);
      console.log('  ✅ selectedEntities:', Array.from(selectedEntities));
      
      // Reset form fields
      setFormPartName(`Part_${parts.length + 1}`);
      setFormReqType('fixed');
      setFormNumReq(1);
      setFormRotation("Any Angle");
      setFormMirrored(false);
      setFormSmallPart(false);
      setFormPriority(1);
      setFormKitNum("");
    }
  }, [showPartParamsModal, parts.length]);
  
  // Calculate part dimensions from live geometry (updates in real-time)
  useEffect(() => {
    if (!showPartParamsModal || !selectedPartGeometry || selectedPartGeometry.length === 0) {
      return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    try {
      const geometry = cadEntitiesToGeometry(selectedPartGeometry);
      geometry.paths.forEach(path => {
        path.points.forEach(point => {
          if (isFinite(point.x) && isFinite(point.y)) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
          }
        });
      });
    } catch (err) {
      console.error('❌ Failed to calculate part dimensions:', err);
    }

    const width = isFinite(minX) ? maxX - minX : 0;
    const height = isFinite(minY) ? maxY - minY : 0;
    
    console.log('📐 Live dimensions:', { width, height });
    
    setFormPartWidth(Math.round(width));
    setFormPartHeight(Math.round(height));
  }, [showPartParamsModal, selectedPartGeometry]);

  // Reset Sheet form
  useEffect(() => {
    if (showSheetParamsModal) {
      // Store selected entities geometry for sheet preview
      const selected = cadEntities.filter(e => selectedEntities.has(e.id));
      console.log('🔍 Selected SHEET entities for preview:', selected);
      
      // Calculate sheet dimensions from selection
      if (selected.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        try {
          const geometry = cadEntitiesToGeometry(selected);
          geometry.paths.forEach(path => {
            path.points.forEach(point => {
              if (isFinite(point.x) && isFinite(point.y)) {
                minX = Math.min(minX, point.x);
                maxX = Math.max(maxX, point.x);
                minY = Math.min(minY, point.y);
                maxY = Math.max(maxY, point.y);
              }
            });
          });
        } catch (err) {
          console.error('❌ Failed to calculate sheet dimensions via geometry:', err);
        }

        const width = isFinite(minX) ? maxX - minX : 0;
        const height = isFinite(minY) ? maxY - minY : 0;
        
        console.log('📐 Calculated sheet dimensions:', { width, height });
        
        setFormSheetWidth(Math.round(width));
        setFormSheetHeight(Math.round(height));
      }
      
      setSelectedSheetGeometry(selected);
      setFormSheetMaterial("Mild Steel");
      setFormSheetThickness(5.0);
      setFormSheetQty(0);
    }
  }, [showSheetParamsModal, cadEntities, selectedEntities]);

  // Auto fit zoom theo chiều ngang - canvas sẽ lấp đầy 100% width
  // Tự động recalculate khi window resize
  useEffect(() => {
    if (!containerRef.current || !sheets || sheets.length === 0) return;

    const calculateAndSetZoom = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth <= 0) return;

      // Tìm sheet có width lớn nhất
      let maxSheetWidth = 0;
      sheets.forEach(sheet => {
        const [w] = sheet.dimensions.split('x').map(Number);
        if (w && w > maxSheetWidth) {
          maxSheetWidth = w;
        }
      });

      if (maxSheetWidth <= 0) return;

      // Tính zoom để fit sheet width vào container width (với buffer 50px)
      const targetZoom = (containerWidth - 50) / maxSheetWidth;
      
      // Giới hạn zoom: min 0.1, max 5
      const finalZoom = Math.max(0.1, Math.min(targetZoom, 5));
      
      setZoom(finalZoom);
    };

    // Gọi lần đầu
    calculateAndSetZoom();

    // Setup ResizeObserver để theo dõi thay đổi kích thước container
    const resizeObserver = new ResizeObserver(() => {
      calculateAndSetZoom();
    });

    resizeObserver.observe(containerRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [sheets]);

  // === AUTO-COMMIT DRAWING WHEN SELECTING STARTS ===
  useEffect(() => {
    if (isSelecting && drawState.points.length > 1) {
      console.log('⚡ Auto-Committing active drawing before selection...');
      const type = activeDrawTool || 'polyline';
      const newEntity: CadEntity = {
        id: crypto.randomUUID(),
        type: type,
        points: [...drawState.points],
        properties: { ...(drawState.properties || {}), sides: 6 }, // Preserve polygon sides
        layerId: activeLayerId
      };
      
      setCadEntities(prev => [...prev, newEntity]);
      setSelectedEntities(new Set([newEntity.id])); // Auto-select it!
      setDrawState({ step: 0, points: [], currentPos: null });
      showToast('✅ Auto-captured active drawing');
    }
  }, [isSelecting]);

  const handleParamsOK = () => {
    if (onAddPart) {
      console.log('🎯 Alphacam Core: Finalizing Selection Capture...');
      
      // STEP 1: Identify what to save
      let entsToProcess: CadEntity[] = [];
      
      // Priority 1: Use explicit selection
      const selection = cadEntities.filter(e => selectedEntities.has(e.id));
      if (selection.length > 0) {
        entsToProcess = selection;
      } 
      // Priority 2: If nothing selected, but we have entities on canvas, use the last one!
      else if (cadEntities.length > 0) {
        console.log('💡 Auto-selecting the most recent entity on canvas.');
        entsToProcess = [cadEntities[cadEntities.length - 1]];
      }
      // Priority 3: Failsafe - use current drawing if it has points
      else if (drawState.points.length > 1) {
        console.log('📝 Auto-capturing current sketch.');
        entsToProcess = [{
          id: 'sketch_capture',
          type: activeDrawTool || 'polyline',
          points: [...drawState.points],
          properties: { ...(drawState.properties || {}) }
        } as CadEntity];
      }

      // STEP 2: Explode into Point-Stream
      let entitiesToSave: CadEntity[] = [];
      if (entsToProcess.length > 0) {
        // IMPORTANT: Map original IDs to the exploded paths so we can highlight them later
        const geometry = cadEntitiesToGeometry(entsToProcess);
        let minX = Infinity, minY = Infinity;
        
        geometry.paths.forEach(p => p.points.forEach(pt => {
          minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
        }));

        entitiesToSave = geometry.paths.map((path, idx) => {
          // Find which original entity this path came from (best effort)
          // For simple selection, it's usually 1-to-1
          const sourceEntity = entsToProcess[Math.min(idx, entsToProcess.length - 1)];
          
          return {
            id: `fixed_${idx}_${Date.now()}`,
            type: 'polyline',
            points: path.points.map(pt => ({
              x: pt.x - minX,
              y: pt.y - minY
            })),
            properties: {
              originalId: sourceEntity.id // THE LINK!
            }
          };
        });
      }

      // Final Part Assembly
      const newPart: Omit<Part, 'id' | 'nestListId'> = {
        name: formPartName,
        dimensions: `${formPartWidth}x${formPartHeight}`,
        required: formReqType === 'max' ? 9999 : Number(formNumReq),
        priority: Number(formPriority),
        rotation: formRotation,
        mirrored: formMirrored,
        smallPart: formSmallPart,
        kitNumber: formKitNum,
        ignore3D: false,
        cadEntities: entitiesToSave, // THE REPAIRED CORE
        grainDirection: 'None',
        allowedRotations: [0, 90, 180, 270]
      };

      onAddPart(newPart);
    }
  };

  const handleSheetParamsOK = () => {
    if (onAddSheet) {
      // Fix: Add missing properties for Sheet
      const newSheet: Omit<Sheet, 'id' | 'nestListId'> = {
        material: formSheetMaterial,
        dimensions: `${formSheetWidth}x${formSheetHeight}`,
        thickness: Number(formSheetThickness),
        quantity: Number(formSheetQty),
        cost: 0,
        category: 'General',
        supplier: 'Manual',
        grainDirection: 'None'
      };
      onAddSheet(newSheet);
    }
  };


  // Constants
  const BASE_PIXELS_PER_UNIT = 0.1; 
  const pixelsPerUnit = BASE_PIXELS_PER_UNIT * zoom;

  const screenToWorld = React.useCallback((screenX: number, screenY: number) => {
    return {
      x: viewOffset.x + (screenX / pixelsPerUnit),
      y: viewOffset.y - (screenY / pixelsPerUnit)
    };
  }, [viewOffset, pixelsPerUnit]);

  const worldToScreen = React.useCallback((worldX: number, worldY: number) => {
    return {
      x: (worldX - viewOffset.x) * pixelsPerUnit,
      y: (viewOffset.y - worldY) * pixelsPerUnit
    };
  }, [viewOffset, pixelsPerUnit]);

  // === SELECTION HELPER FUNCTIONS ===
  const isPointNearEntity = React.useCallback((point: { x: number, y: number }, entity: CadEntity, threshold: number): boolean => {
    // Check if entity's layer is locked
    const entityLayer = layers.find(l => l.id === entity.layerId);
    if (entityLayer?.locked) return false;

    if (entity.type === 'line') {
      // Distance from point to line segment
      const [p1, p2] = entity.points;
      const A = point.x - p1.x;
      const B = point.y - p1.y;
      const C = p2.x - p1.x;
      const D = p2.y - p1.y;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      
      let xx, yy;
      if (param < 0) {
        xx = p1.x;
        yy = p1.y;
      } else if (param > 1) {
        xx = p2.x;
        yy = p2.y;
      } else {
        xx = p1.x + param * C;
        yy = p1.y + param * D;
      }
      
      const dx = point.x - xx;
      const dy = point.y - yy;
      return Math.sqrt(dx * dx + dy * dy) <= threshold;
    } else if (entity.type === 'rect') {
      // Check if point is near any of the 4 edges
      const [p1, p2] = entity.points;
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      
      // Check distance to edges
      const distToLeft = Math.abs(point.x - minX);
      const distToRight = Math.abs(point.x - maxX);
      const distToBottom = Math.abs(point.y - minY);
      const distToTop = Math.abs(point.y - maxY);
      
      const isNearVertical = (distToLeft <= threshold || distToRight <= threshold) && point.y >= minY - threshold && point.y <= maxY + threshold;
      const isNearHorizontal = (distToBottom <= threshold || distToTop <= threshold) && point.x >= minX - threshold && point.x <= maxX + threshold;
      
      return isNearVertical || isNearHorizontal;
    } else if (entity.type === 'circle') {
      const center = entity.points[0];
      const radius = entity.properties?.radius || 0;
      const dist = Math.sqrt(Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2));
      return Math.abs(dist - radius) <= threshold;
    } else if (entity.type === 'arc') {
      // Check distance to arc curve
      const props = entity.properties;
      if (props && props.centerX !== undefined) {
        const cx = props.centerX, cy = props.centerY, r = props.radius;
        const dist = Math.sqrt(Math.pow(point.x - cx, 2) + Math.pow(point.y - cy, 2));
        if (Math.abs(dist - r) > threshold) return false;
        // Check if angle is within arc span
        const startAngle = Math.atan2(entity.points[0].y - cy, entity.points[0].x - cx);
        const midAngle = Math.atan2(entity.points[1].y - cy, entity.points[1].x - cx);
        const endAngle = Math.atan2(entity.points[2].y - cy, entity.points[2].x - cx);
        const pointAngle = Math.atan2(point.y - cy, point.x - cx);
        // Normalize angles: check if pointAngle is on the same side as midAngle
        const normalizeAngle = (a: number) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const ns = normalizeAngle(startAngle);
        const nm = normalizeAngle(midAngle);
        const ne = normalizeAngle(endAngle);
        const np = normalizeAngle(pointAngle);
        // Check if mid is between start and end going one way; point should be on same arc
        const isAngleBetween = (a: number, s: number, e2: number) => {
          if (s <= e2) return a >= s && a <= e2;
          return a >= s || a <= e2;
        };
        const midBetweenSE = isAngleBetween(nm, ns, ne);
        if (midBetweenSE) {
          return isAngleBetween(np, ns, ne);
        } else {
          return isAngleBetween(np, ne, ns);
        }
      }
      return false;
    } else if (entity.type === 'ellipse') {
      const center = entity.points[0];
      const rx = entity.properties?.rx || 0;
      const ry = entity.properties?.ry || 0;
      if (rx === 0 || ry === 0) return false;
      // Normalize point to unit circle space
      const nx = (point.x - center.x) / rx;
      const ny = (point.y - center.y) / ry;
      const normalizedDist = Math.sqrt(nx * nx + ny * ny);
      // Threshold needs to be scaled — approximate
      const avgRadius = (rx + ry) / 2;
      return Math.abs(normalizedDist - 1) <= (threshold / avgRadius);
    } else if (entity.type === 'polygon') {
      const center = entity.points[0];
      const sides = entity.properties?.sides || 6;
      const radius = entity.properties?.radius || 0;
      const edgePt = entity.points[1];
      const angleOffset = Math.atan2(edgePt.y - center.y, edgePt.x - center.x);
      // Generate polygon vertices and check distance to each edge
      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = angleOffset + (2 * Math.PI * i) / sides;
        verts.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
      }
      for (let i = 0; i < verts.length; i++) {
        const p1 = verts[i];
        const p2 = verts[(i + 1) % verts.length];
        // Distance from point to line segment
        const A = point.x - p1.x, B = point.y - p1.y;
        const C = p2.x - p1.x, D2 = p2.y - p1.y;
        const dot = A * C + B * D2;
        const lenSq = C * C + D2 * D2;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx: number, yy: number;
        if (param < 0) { xx = p1.x; yy = p1.y; }
        else if (param > 1) { xx = p2.x; yy = p2.y; }
        else { xx = p1.x + param * C; yy = p1.y + param * D2; }
        const dx = point.x - xx, dy = point.y - yy;
        if (Math.sqrt(dx * dx + dy * dy) <= threshold) return true;
      }
      return false;
    } else if (entity.type === 'slot') {
      // Slot: stadium shape — check distance to the two semicircle ends and two lines
      const c1 = entity.points[0], c2 = entity.points[1];
      const halfW = (entity.properties?.width || 0) / 2;
      // Check distance to center line axis (capsule test)
      const A = point.x - c1.x, B = point.y - c1.y;
      const C = c2.x - c1.x, D2 = c2.y - c1.y;
      const dot = A * C + B * D2;
      const lenSq = C * C + D2 * D2;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      let xx: number, yy: number;
      if (param < 0) { xx = c1.x; yy = c1.y; }
      else if (param > 1) { xx = c2.x; yy = c2.y; }
      else { xx = c1.x + param * C; yy = c1.y + param * D2; }
      const dist = Math.sqrt(Math.pow(point.x - xx, 2) + Math.pow(point.y - yy, 2));
      return Math.abs(dist - halfW) <= threshold;
    } else if (entity.type === 'obround') {
      // Obround: rectangle with rounded corners — check distance to perimeter
      const [p1, p2] = entity.points;
      const eMinX = Math.min(p1.x, p2.x), eMaxX = Math.max(p1.x, p2.x);
      const eMinY = Math.min(p1.y, p2.y), eMaxY = Math.max(p1.y, p2.y);
      const cr = entity.properties?.cornerRadius || 0;
      // Check straight edges (inset by cornerRadius)
      const nearTop = Math.abs(point.y - eMaxY) <= threshold && point.x >= eMinX + cr && point.x <= eMaxX - cr;
      const nearBot = Math.abs(point.y - eMinY) <= threshold && point.x >= eMinX + cr && point.x <= eMaxX - cr;
      const nearLeft = Math.abs(point.x - eMinX) <= threshold && point.y >= eMinY + cr && point.y <= eMaxY - cr;
      const nearRight = Math.abs(point.x - eMaxX) <= threshold && point.y >= eMinY + cr && point.y <= eMaxY - cr;
      if (nearTop || nearBot || nearLeft || nearRight) return true;
      // Check corner arcs
      const corners = [
        { x: eMinX + cr, y: eMinY + cr },
        { x: eMaxX - cr, y: eMinY + cr },
        { x: eMaxX - cr, y: eMaxY - cr },
        { x: eMinX + cr, y: eMaxY - cr }
      ];
      for (const corner of corners) {
        const d = Math.sqrt(Math.pow(point.x - corner.x, 2) + Math.pow(point.y - corner.y, 2));
        // Only check if point is in the corner quadrant
        if (Math.abs(d - cr) <= threshold && (
          (point.x < eMinX + cr || point.x > eMaxX - cr) &&
          (point.y < eMinY + cr || point.y > eMaxY - cr)
        )) return true;
      }
      return false;
    } else if (entity.type === 'dimension') {
      // Dimension: distance to line between start and end points
      const [p1, p2] = entity.points;
      const A = point.x - p1.x, B = point.y - p1.y;
      const C = p2.x - p1.x, D2 = p2.y - p1.y;
      const dot = A * C + B * D2;
      const lenSq = C * C + D2 * D2;
      let param = -1;
      if (lenSq !== 0) param = dot / lenSq;
      let xx: number, yy: number;
      if (param < 0) { xx = p1.x; yy = p1.y; }
      else if (param > 1) { xx = p2.x; yy = p2.y; }
      else { xx = p1.x + param * C; yy = p1.y + param * D2; }
      const dx = point.x - xx, dy = point.y - yy;
      if (Math.sqrt(dx * dx + dy * dy) <= threshold) return true;
      // Also check extension lines and text position
      if (entity.points.length >= 3) {
        const textPos = entity.points[2];
        const dtx = point.x - textPos.x, dty = point.y - textPos.y;
        if (Math.sqrt(dtx * dtx + dty * dty) <= threshold * 3) return true;
      }
      return false;
    } else if (entity.type === 'text') {
      // Text: bounding box check around text position
      const pos = entity.points[0];
      const fontSize = entity.properties?.fontSize || 14;
      const textStr = entity.properties?.text || '';
      const approxWidth = textStr.length * fontSize * 0.6;
      const approxHeight = fontSize * 1.2;
      // Check if point is within bounding box (in world units, approximate)
      const halfW = (approxWidth / 2) * (threshold / 5); // Scale by threshold for consistent feel
      const halfH = (approxHeight / 2) * (threshold / 5);
      return Math.abs(point.x - pos.x) <= Math.max(halfW, threshold * 3) &&
             Math.abs(point.y - pos.y) <= Math.max(halfH, threshold * 2);
    } else if (entity.type === 'leader') {
      // Leader: distance to polyline segments
      for (let i = 0; i < entity.points.length - 1; i++) {
        const p1 = entity.points[i], p2 = entity.points[i + 1];
        const A = point.x - p1.x, B = point.y - p1.y;
        const C = p2.x - p1.x, D2 = p2.y - p1.y;
        const dot = A * C + B * D2;
        const lenSq = C * C + D2 * D2;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx: number, yy: number;
        if (param < 0) { xx = p1.x; yy = p1.y; }
        else if (param > 1) { xx = p2.x; yy = p2.y; }
        else { xx = p1.x + param * C; yy = p1.y + param * D2; }
        const dx = point.x - xx, dy = point.y - yy;
        if (Math.sqrt(dx * dx + dy * dy) <= threshold) return true;
      }
      return false;
    } else if (entity.type === 'hatch') {
      // Hatch: check if point is near the click point or within a threshold of target entity
      const clickPt = entity.points[0];
      const dx = point.x - clickPt.x, dy = point.y - clickPt.y;
      return Math.sqrt(dx * dx + dy * dy) <= threshold * 2;
    }
    return false;
  }, []);

  const isEntityInWindow = React.useCallback((entity: CadEntity, minX: number, minY: number, maxX: number, maxY: number, crossing: boolean): boolean => {
    if (entity.type === 'line' || entity.type === 'rect' || entity.type === 'polyline' || entity.type === 'spline') {
      // Check if all points are in window (window mode) or any point is in window (crossing mode)
      const pointsInWindow = entity.points.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
      
      if (crossing) {
        return pointsInWindow.length > 0; // At least one point inside
      } else {
        return pointsInWindow.length === entity.points.length; // All points inside
      }
    } else if (entity.type === 'circle') {
      const center = entity.points[0];
      const radius = entity.properties?.radius || 0;
      
      if (crossing) {
        // Circle intersects or is inside window
        const nearestX = Math.max(minX, Math.min(center.x, maxX));
        const nearestY = Math.max(minY, Math.min(center.y, maxY));
        const dist = Math.sqrt(Math.pow(center.x - nearestX, 2) + Math.pow(center.y - nearestY, 2));
        return dist <= radius;
      } else {
        // Entire circle must be inside window
        return center.x - radius >= minX && center.x + radius <= maxX &&
               center.y - radius >= minY && center.y + radius <= maxY;
      }
    } else if (entity.type === 'arc') {
      // Use bounding points (start, through, end) for selection
      const pts = entity.points;
      const pointsInWindow = pts.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
      if (crossing) {
        return pointsInWindow.length > 0;
      } else {
        // Also check the arc's center-based bounding box
        const props = entity.properties;
        if (props && props.centerX !== undefined) {
          const cx = props.centerX, cy = props.centerY, r = props.radius;
          return cx - r >= minX && cx + r <= maxX && cy - r >= minY && cy + r <= maxY;
        }
        return pointsInWindow.length === pts.length;
      }
    } else if (entity.type === 'ellipse') {
      const center = entity.points[0];
      const rx = entity.properties?.rx || 0;
      const ry = entity.properties?.ry || 0;
      
      if (crossing) {
        // Ellipse intersects or is inside window (approximate with AABB)
        const nearestX = Math.max(minX, Math.min(center.x, maxX));
        const nearestY = Math.max(minY, Math.min(center.y, maxY));
        // Approximate: check if nearest point on window bbox is within ellipse
        const nx = (nearestX - center.x) / (rx || 1);
        const ny = (nearestY - center.y) / (ry || 1);
        return (nx * nx + ny * ny) <= 1 || 
          (center.x + rx >= minX && center.x - rx <= maxX && center.y + ry >= minY && center.y - ry <= maxY);
      } else {
        return center.x - rx >= minX && center.x + rx <= maxX &&
               center.y - ry >= minY && center.y + ry <= maxY;
      }
    } else if (entity.type === 'polygon') {
      const center = entity.points[0];
      const sides = entity.properties?.sides || 6;
      const radius = entity.properties?.radius || 0;
      const edgePt = entity.points[1];
      const angleOffset = Math.atan2(edgePt.y - center.y, edgePt.x - center.x);
      // Generate vertices
      const verts: { x: number; y: number }[] = [];
      for (let i = 0; i < sides; i++) {
        const angle = angleOffset + (2 * Math.PI * i) / sides;
        verts.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
      }
      const vertsInWindow = verts.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
      if (crossing) {
        return vertsInWindow.length > 0;
      } else {
        return vertsInWindow.length === verts.length;
      }
    } else if (entity.type === 'slot') {
      // Slot: use capsule bounding box
      const c1 = entity.points[0], c2 = entity.points[1];
      const halfW = (entity.properties?.width || 0) / 2;
      const slotMinX = Math.min(c1.x, c2.x) - halfW;
      const slotMaxX = Math.max(c1.x, c2.x) + halfW;
      const slotMinY = Math.min(c1.y, c2.y) - halfW;
      const slotMaxY = Math.max(c1.y, c2.y) + halfW;
      if (crossing) {
        // AABB overlap
        return slotMinX <= maxX && slotMaxX >= minX && slotMinY <= maxY && slotMaxY >= minY;
      } else {
        return slotMinX >= minX && slotMaxX <= maxX && slotMinY >= minY && slotMaxY <= maxY;
      }
    } else if (entity.type === 'obround') {
      const [p1, p2] = entity.points;
      const eMinX = Math.min(p1.x, p2.x), eMaxX = Math.max(p1.x, p2.x);
      const eMinY = Math.min(p1.y, p2.y), eMaxY = Math.max(p1.y, p2.y);
      if (crossing) {
        return eMinX <= maxX && eMaxX >= minX && eMinY <= maxY && eMaxY >= minY;
      } else {
        return eMinX >= minX && eMaxX <= maxX && eMinY >= minY && eMaxY <= maxY;
      }
    } else if (entity.type === 'dimension' || entity.type === 'leader') {
      // Use all points for bounding
      const pointsInWindow = entity.points.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
      if (crossing) {
        return pointsInWindow.length > 0;
      } else {
        return pointsInWindow.length === entity.points.length;
      }
    } else if (entity.type === 'text') {
      const pos = entity.points[0];
      if (crossing) {
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      } else {
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      }
    } else if (entity.type === 'hatch') {
      const pos = entity.points[0];
      if (crossing) {
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      } else {
        return pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY;
      }
    }
    return false;
  }, []);

  // ============ ENTITY TRANSFORMATION FUNCTIONS (Move, Copy, Mirror, Rotate, Scale) ============
  
  /** Translate an entity by (dx, dy) — modifies all points and center-based properties */
  const translateEntity = (entity: CadEntity, dx: number, dy: number): CadEntity => {
    const newPoints = entity.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
    const newProps = entity.properties ? { ...entity.properties } : undefined;
    if (newProps && newProps.centerX !== undefined) {
      newProps.centerX = newProps.centerX + dx;
      newProps.centerY = newProps.centerY + dy;
    }
    return { ...entity, points: newPoints, properties: newProps };
  };

  /** Mirror an entity across a line defined by p1→p2 */
  const mirrorEntity = (entity: CadEntity, p1: { x: number; y: number }, p2: { x: number; y: number }): CadEntity => {
    const mirrorPoint = (pt: { x: number; y: number }) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1e-10) return { ...pt };
      const t = ((pt.x - p1.x) * dx + (pt.y - p1.y) * dy) / lenSq;
      const closestX = p1.x + t * dx;
      const closestY = p1.y + t * dy;
      return { x: 2 * closestX - pt.x, y: 2 * closestY - pt.y };
    };
    const newPoints = entity.points.map(mirrorPoint);
    const newProps = entity.properties ? { ...entity.properties } : undefined;
    if (newProps && newProps.centerX !== undefined) {
      const mc = mirrorPoint({ x: newProps.centerX, y: newProps.centerY });
      newProps.centerX = mc.x;
      newProps.centerY = mc.y;
    }
    return { ...entity, points: newPoints, properties: newProps };
  };

  /** Rotate an entity around a center point by angleDeg degrees */
  const rotateEntity = (entity: CadEntity, center: { x: number; y: number }, angleDeg: number): CadEntity => {
    const angleRad = angleDeg * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);
    const rotatePoint = (pt: { x: number; y: number }) => {
      const dx = pt.x - center.x;
      const dy = pt.y - center.y;
      return { x: center.x + dx * cosA - dy * sinA, y: center.y + dx * sinA + dy * cosA };
    };
    const newPoints = entity.points.map(rotatePoint);
    const newProps = entity.properties ? { ...entity.properties } : undefined;
    if (newProps && newProps.centerX !== undefined) {
      const rc = rotatePoint({ x: newProps.centerX, y: newProps.centerY });
      newProps.centerX = rc.x;
      newProps.centerY = rc.y;
    }
    return { ...entity, points: newPoints, properties: newProps };
  };

  /** Scale an entity from a center point by a scale factor */
  const scaleEntity = (entity: CadEntity, center: { x: number; y: number }, factor: number): CadEntity => {
    const scalePoint = (pt: { x: number; y: number }) => ({
      x: center.x + (pt.x - center.x) * factor,
      y: center.y + (pt.y - center.y) * factor
    });
    const newPoints = entity.points.map(scalePoint);
    const newProps = entity.properties ? { ...entity.properties } : undefined;
    if (newProps) {
      if (newProps.centerX !== undefined) {
        const sc = scalePoint({ x: newProps.centerX, y: newProps.centerY });
        newProps.centerX = sc.x;
        newProps.centerY = sc.y;
      }
      if (newProps.radius !== undefined) newProps.radius = newProps.radius * Math.abs(factor);
      if (newProps.rx !== undefined) newProps.rx = newProps.rx * Math.abs(factor);
      if (newProps.ry !== undefined) newProps.ry = newProps.ry * Math.abs(factor);
      if (newProps.width !== undefined) newProps.width = newProps.width * Math.abs(factor);
      if (newProps.cornerRadius !== undefined) newProps.cornerRadius = newProps.cornerRadius * Math.abs(factor);
      if (newProps.fontSize !== undefined) newProps.fontSize = newProps.fontSize * Math.abs(factor);
    }
    return { ...entity, points: newPoints, properties: newProps };
  };

  /** Apply a transformation to all selected entities (modify in place) */
  const applyTransformToSelected = React.useCallback((transformFn: (entity: CadEntity) => CadEntity, description?: string) => {
    const ids = Array.from(selectedEntities);
    setCadEntitiesWithUndo(
      prev => prev.map(ent => selectedEntities.has(ent.id) ? transformFn(ent) : ent),
      description || `Edit ${ids.length} entit${ids.length === 1 ? 'y' : 'ies'}`,
      'edit',
      ids
    );
  }, [selectedEntities, setCadEntitiesWithUndo]);

  /** Clone selected entities with transformation (for Copy) */
  const cloneSelectedWithTransform = React.useCallback((transformFn: (entity: CadEntity) => CadEntity, description?: string) => {
    const ids = Array.from(selectedEntities);
    setCadEntitiesWithUndo(
      prev => {
        const clones = prev
          .filter(ent => selectedEntities.has(ent.id))
          .map(ent => ({
            ...transformFn(ent),
            id: crypto.randomUUID()
          }));
        return [...prev, ...clones];
      },
      description || `Copy ${ids.length} entit${ids.length === 1 ? 'y' : 'ies'}`,
      'draw',
      ids
    );
  }, [selectedEntities, setCadEntitiesWithUndo]);

  // ============ EDIT TOOL GEOMETRY HELPERS ============

  const lineLineIntersection = (p1: {x:number,y:number}, p2: {x:number,y:number}, p3: {x:number,y:number}, p4: {x:number,y:number}) => {
    const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
    const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
    const denom = d1x * d2y - d1y * d2x;
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
    const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
    return { x: p1.x + t * d1x, y: p1.y + t * d1y, t, u };
  };

  const offsetLine = (p1: {x:number,y:number}, p2: {x:number,y:number}, dist: number, sidePoint: {x:number,y:number}): [{x:number,y:number},{x:number,y:number}] => {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 1e-10) return [p1, p2];
    let nx = -dy / len, ny = dx / len;
    const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2;
    const sideVx = sidePoint.x - midX, sideVy = sidePoint.y - midY;
    const dot = sideVx * nx + sideVy * ny;
    if (dot < 0) { nx = -nx; ny = -ny; }
    return [
      { x: p1.x + nx * dist, y: p1.y + ny * dist },
      { x: p2.x + nx * dist, y: p2.y + ny * dist }
    ];
  };

  const offsetCircle = (center: {x:number,y:number}, radius: number, dist: number, sidePoint: {x:number,y:number}): number => {
    const dx = sidePoint.x - center.x, dy = sidePoint.y - center.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    return d > radius ? radius + dist : Math.max(0.1, radius - dist);
  };

  const offsetRect = (p1: {x:number,y:number}, p2: {x:number,y:number}, dist: number, sidePoint: {x:number,y:number}): [{x:number,y:number},{x:number,y:number}] => {
    const cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
    const dx = sidePoint.x - cx, dy = sidePoint.y - cy;
    const hw = Math.abs(p2.x - p1.x) / 2, hh = Math.abs(p2.y - p1.y) / 2;
    const isOutside = Math.abs(dx) > hw || Math.abs(dy) > hh;
    const sign = isOutside ? 1 : -1;
    const newHw = Math.max(0.1, hw + sign * dist);
    const newHh = Math.max(0.1, hh + sign * dist);
    return [
      { x: cx - newHw, y: cy - newHh },
      { x: cx + newHw, y: cy + newHh }
    ];
  };

  // ============ EDIT TOOL CLICK HANDLER ============
  const handleEditToolClick = React.useCallback((worldPos: {x: number, y: number}) => {
    if (!activeDrawTool || !EDIT_TOOLS.includes(activeDrawTool)) return;
    console.log(`✏️ Edit tool [${activeDrawTool}] click at`, worldPos, 'state:', editToolState);

    const findNearEntity = (): CadEntity | null => {
      const threshold = 10 / pixelsPerUnit;
      for (const entity of cadEntities) {
        if (isPointNearEntity(worldPos, entity, threshold)) return entity;
      }
      return null;
    };

    const findCornerEntities = (): { e1: CadEntity; e2: CadEntity } | null => {
      const threshold = 15 / pixelsPerUnit;
      const nearEntities: CadEntity[] = [];
      for (const entity of cadEntities) {
        if (entity.type === 'line' && isPointNearEntity(worldPos, entity, threshold)) {
          nearEntities.push(entity);
        }
      }
      if (nearEntities.length >= 2) return { e1: nearEntities[0], e2: nearEntities[1] };
      return null;
    };

    if (activeDrawTool === 'offset') {
      if (editToolState.step === 0) { console.log('⏳ Offset: Type distance in command line'); return; }
      if (editToolState.step === 1) {
        const entity = findNearEntity();
        if (!entity) { console.log('⚠️ Offset: No entity found'); return; }
        setEditToolState(prev => ({ ...prev, step: 2, sourceEntityId: entity.id }));
        return;
      }
      if (editToolState.step === 2) {
        const entity = cadEntities.find(e => e.id === editToolState.sourceEntityId);
        if (!entity) return;
        const dist = editToolState.distance;
        if (entity.type === 'line' && entity.points.length >= 2) {
          const [np1, np2] = offsetLine(entity.points[0], entity.points[1], dist, worldPos);
           setCadEntitiesWithUndo(prev => [...prev, { id: crypto.randomUUID(), type: 'line', points: [np1, np2], properties: { ...entity.properties }, layerId: activeLayerId }], 'Offset Line', 'draw');
        } else if (entity.type === 'circle' && entity.points.length >= 1) {
          const center = entity.points[0];
          const r = entity.properties?.radius || 50;
          const newR = offsetCircle(center, r, dist, worldPos);
           setCadEntitiesWithUndo(prev => [...prev, { id: crypto.randomUUID(), type: 'circle', points: [center], properties: { ...entity.properties, radius: newR }, layerId: activeLayerId }], 'Offset Circle', 'draw');
        } else if (entity.type === 'rect' && entity.points.length >= 2) {
          const [np1, np2] = offsetRect(entity.points[0], entity.points[1], dist, worldPos);
           setCadEntitiesWithUndo(prev => [...prev, { id: crypto.randomUUID(), type: 'rect', points: [np1, np2], properties: { ...entity.properties }, layerId: activeLayerId }], 'Offset Rect', 'draw');
        } else { console.log('⚠️ Offset: Unsupported type:', entity.type); }
        setEditToolState(prev => ({ ...prev, step: 1, sourceEntityId: null, clickPos: null }));
        return;
      }
    }

    if (activeDrawTool === 'trim') {
      if (editToolState.step === 0) {
        const entity = findNearEntity();
        if (!entity) { console.log('⚠️ Trim: No boundary found'); return; }
        setEditToolState(prev => ({ ...prev, step: 1, sourceEntityId: entity.id }));
        return;
      }
      if (editToolState.step === 1) {
        const entity = findNearEntity();
        if (!entity || entity.type !== 'line') { console.log('⚠️ Trim: Only lines'); return; }
        const boundary = cadEntities.find(e => e.id === editToolState.sourceEntityId);
        if (!boundary || boundary.type !== 'line') { console.log('⚠️ Trim: Boundary must be line'); return; }
        const ix = lineLineIntersection(entity.points[0], entity.points[1], boundary.points[0], boundary.points[1]);
        if (!ix || ix.t < 0 || ix.t > 1) { console.log('⚠️ Trim: No intersection'); return; }
        const d1 = Math.sqrt(Math.pow(worldPos.x - entity.points[0].x, 2) + Math.pow(worldPos.y - entity.points[0].y, 2));
        const d2 = Math.sqrt(Math.pow(worldPos.x - entity.points[1].x, 2) + Math.pow(worldPos.y - entity.points[1].y, 2));
        const ixPt = { x: ix.x, y: ix.y };
        setCadEntitiesWithUndo(prev => prev.map(e => {
          if (e.id !== entity.id) return e;
          return d1 < d2 ? { ...e, points: [ixPt, e.points[1]] } : { ...e, points: [e.points[0], ixPt] };
        }), 'Trim Line', 'edit', [entity.id]);
        console.log('✅ Trimmed', entity.id);
        return;
      }
    }

    if (activeDrawTool === 'extend') {
      if (editToolState.step === 0) {
        const entity = findNearEntity();
        if (!entity) { console.log('⚠️ Extend: No boundary found'); return; }
        setEditToolState(prev => ({ ...prev, step: 1, sourceEntityId: entity.id }));
        return;
      }
      if (editToolState.step === 1) {
        const entity = findNearEntity();
        if (!entity || entity.type !== 'line') { console.log('⚠️ Extend: Only lines'); return; }
        const boundary = cadEntities.find(e => e.id === editToolState.sourceEntityId);
        if (!boundary || boundary.type !== 'line') { console.log('⚠️ Extend: Boundary must be line'); return; }
        const ix = lineLineIntersection(entity.points[0], entity.points[1], boundary.points[0], boundary.points[1]);
        if (!ix) { console.log('⚠️ Extend: Parallel lines'); return; }
        if (ix.u < 0 || ix.u > 1) { console.log('⚠️ Extend: Outside boundary'); return; }
        const ixPt = { x: ix.x, y: ix.y };
        const d1 = Math.sqrt(Math.pow(ixPt.x - entity.points[0].x, 2) + Math.pow(ixPt.y - entity.points[0].y, 2));
        const d2 = Math.sqrt(Math.pow(ixPt.x - entity.points[1].x, 2) + Math.pow(ixPt.y - entity.points[1].y, 2));
        setCadEntitiesWithUndo(prev => prev.map(e => {
          if (e.id !== entity.id) return e;
          return d1 < d2 ? { ...e, points: [ixPt, e.points[1]] } : { ...e, points: [e.points[0], ixPt] };
        }), 'Extend Line', 'edit', [entity.id]);
        console.log('✅ Extended', entity.id);
        return;
      }
    }

    if (activeDrawTool === 'fillet') {
      if (editToolState.step === 0) { console.log('⏳ Fillet: Type radius in command line'); return; }
      if (editToolState.step === 1) {
        const corner = findCornerEntities();
        if (!corner) { console.log('⚠️ Fillet: Need 2 lines near click'); return; }
        const { e1, e2 } = corner;
        const radius = editToolState.distance;
        const ix = lineLineIntersection(e1.points[0], e1.points[1], e2.points[0], e2.points[1]);
        if (!ix) { console.log('⚠️ Fillet: Parallel'); return; }
        const ixPt = { x: ix.x, y: ix.y };
        const getUnitDir = (pa: {x:number,y:number}, pb: {x:number,y:number}) => {
          const ddx = pb.x - pa.x, ddy = pb.y - pa.y;
          const l = Math.sqrt(ddx*ddx + ddy*ddy);
          return l > 0 ? { x: ddx/l, y: ddy/l } : { x: 1, y: 0 };
        };
        const dir1 = getUnitDir(ixPt, ix.t > 0.5 ? e1.points[0] : e1.points[1]);
        const dir2 = getUnitDir(ixPt, ix.u > 0.5 ? e2.points[0] : e2.points[1]);
        const t1 = { x: ixPt.x + dir1.x * radius, y: ixPt.y + dir1.y * radius };
        const t2 = { x: ixPt.x + dir2.x * radius, y: ixPt.y + dir2.y * radius };
        const bisX = dir1.x + dir2.x, bisY = dir1.y + dir2.y;
        const bisLen = Math.sqrt(bisX*bisX + bisY*bisY);
        if (bisLen < 1e-10) { console.log('⚠️ Fillet: Collinear'); return; }
        const ang = Math.acos(Math.max(-1, Math.min(1, dir1.x * dir2.x + dir1.y * dir2.y)));
        const centerDist = radius / Math.sin(ang / 2);
        const center = { x: ixPt.x + (bisX / bisLen) * centerDist, y: ixPt.y + (bisY / bisLen) * centerDist };
        const startAngle = Math.atan2(t1.y - center.y, t1.x - center.x) * 180 / Math.PI;
        const endAngle = Math.atan2(t2.y - center.y, t2.x - center.x) * 180 / Math.PI;
        setCadEntitiesWithUndo(prev => {
          const updated = prev.map(e => {
            if (e.id === e1.id) {
              const d0 = Math.sqrt(Math.pow(t1.x - e.points[0].x, 2) + Math.pow(t1.y - e.points[0].y, 2));
              const d1e = Math.sqrt(Math.pow(t1.x - e.points[1].x, 2) + Math.pow(t1.y - e.points[1].y, 2));
              return d0 < d1e ? { ...e, points: [t1, e.points[1]] } : { ...e, points: [e.points[0], t1] };
            }
            if (e.id === e2.id) {
              const d0 = Math.sqrt(Math.pow(t2.x - e.points[0].x, 2) + Math.pow(t2.y - e.points[0].y, 2));
              const d1e = Math.sqrt(Math.pow(t2.x - e.points[1].x, 2) + Math.pow(t2.y - e.points[1].y, 2));
              return d0 < d1e ? { ...e, points: [t2, e.points[1]] } : { ...e, points: [e.points[0], t2] };
            }
            return e;
          });
          return [...updated, { id: crypto.randomUUID(), type: 'arc' as const, points: [center, t1, t2], properties: { radius, startAngle, endAngle } }];
        }, 'Fillet', 'edit', [e1.id, e2.id]);
        console.log('✅ Fillet r=', radius);
        return;
      }
    }

    if (activeDrawTool === 'chamfer') {
      if (editToolState.step === 0) { console.log('⏳ Chamfer: Type distance in command line'); return; }
      if (editToolState.step === 1) {
        const corner = findCornerEntities();
        if (!corner) { console.log('⚠️ Chamfer: Need 2 lines near click'); return; }
        const { e1, e2 } = corner;
        const dist = editToolState.distance;
        const ix = lineLineIntersection(e1.points[0], e1.points[1], e2.points[0], e2.points[1]);
        if (!ix) { console.log('⚠️ Chamfer: Parallel'); return; }
        const ixPt = { x: ix.x, y: ix.y };
        const getUnitDir = (pa: {x:number,y:number}, pb: {x:number,y:number}) => {
          const ddx = pb.x - pa.x, ddy = pb.y - pa.y;
          const l = Math.sqrt(ddx*ddx + ddy*ddy);
          return l > 0 ? { x: ddx/l, y: ddy/l } : { x: 1, y: 0 };
        };
        const dir1 = getUnitDir(ixPt, ix.t > 0.5 ? e1.points[0] : e1.points[1]);
        const dir2 = getUnitDir(ixPt, ix.u > 0.5 ? e2.points[0] : e2.points[1]);
        const c1 = { x: ixPt.x + dir1.x * dist, y: ixPt.y + dir1.y * dist };
        const c2 = { x: ixPt.x + dir2.x * dist, y: ixPt.y + dir2.y * dist };
        setCadEntitiesWithUndo(prev => {
          const updated = prev.map(e => {
            if (e.id === e1.id) {
              const d0 = Math.sqrt(Math.pow(c1.x - e.points[0].x, 2) + Math.pow(c1.y - e.points[0].y, 2));
              const d1e = Math.sqrt(Math.pow(c1.x - e.points[1].x, 2) + Math.pow(c1.y - e.points[1].y, 2));
              return d0 < d1e ? { ...e, points: [c1, e.points[1]] } : { ...e, points: [e.points[0], c1] };
            }
            if (e.id === e2.id) {
              const d0 = Math.sqrt(Math.pow(c2.x - e.points[0].x, 2) + Math.pow(c2.y - e.points[0].y, 2));
              const d1e = Math.sqrt(Math.pow(c2.x - e.points[1].x, 2) + Math.pow(c2.y - e.points[1].y, 2));
              return d0 < d1e ? { ...e, points: [c2, e.points[1]] } : { ...e, points: [e.points[0], c2] };
            }
            return e;
          });
          return [...updated, { id: crypto.randomUUID(), type: 'line' as const, points: [c1, c2] }];
        }, 'Chamfer', 'edit', [e1.id, e2.id]);
        console.log('✅ Chamfer d=', dist);
        return;
      }
    }
  }, [activeDrawTool, editToolState, cadEntities, pixelsPerUnit, isPointNearEntity]);

  // --- Drawing Handlers ---
  const handleDrawingClick = React.useCallback((worldPos: {x: number, y: number}) => {
    // console.log('🎨 handleDrawingClick called with:', { activeDrawTool, worldPos });
    
    if (!activeDrawTool) {
      console.log('⚠️ No active draw tool');
      return;
    }

    setDrawState(prevDrawState => {
      console.log('📊 prevDrawState:', prevDrawState);
      
      if (activeDrawTool === 'line' || activeDrawTool === 'rect') {
        if (prevDrawState.step === 0) {
          console.log('📍 Step 0: Saving first point', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          // Finish Drawing
          const p1 = prevDrawState.points[0];
          const p2 = worldPos;
          
          console.log('✅ Step 1→0: Saving entity', { type: activeDrawTool, points: [p1, p2] });
          
           // Save to CAD Entities
           setCadEntitiesWithUndo(prev => {
             const newEntity = {
               id: crypto.randomUUID(),
               type: activeDrawTool,
               points: [p1, p2],
               layerId: activeLayerId
             };
             const newEntities = [...prev, newEntity];
             console.log('📊 cadEntities updated:', newEntities);
             return newEntities;
           }, `Draw ${activeDrawTool.charAt(0).toUpperCase() + activeDrawTool.slice(1)}`, 'draw');
          
          // Reset state but keep tool active
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'circle') {
        if (prevDrawState.step === 0) {
          console.log('📍 Circle Step 0: Saving center', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          const center = prevDrawState.points[0];
          const radius = Math.sqrt(Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2));
          
          console.log('✅ Circle Step 1→0: Saving entity', { center, radius });
          
           setCadEntitiesWithUndo(prev => {
             const newEntity = {
               id: crypto.randomUUID(),
               type: 'circle',
               points: [center, worldPos],
               properties: { radius },
               layerId: activeLayerId
             };
             return [...prev, newEntity];
           }, 'Draw Circle', 'draw');

          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'polyline' || activeDrawTool === 'spline') {
          console.log(`📍 ${activeDrawTool} point added:`, worldPos);
          // Add point
          return { 
              step: prevDrawState.step + 1, 
              points: [...prevDrawState.points, worldPos],
              currentPos: null 
          };
      } else if (activeDrawTool === 'arc') {
        // 3-point arc: start, through, end
        if (prevDrawState.step === 0) {
          console.log('📍 Arc Step 0: Start point', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          console.log('📍 Arc Step 1: Through point', worldPos);
          return { step: 2, points: [...prevDrawState.points, worldPos], currentPos: null };
        } else if (prevDrawState.step === 2) {
          const [start, through] = prevDrawState.points;
          const end = worldPos;
          console.log('✅ Arc Step 2→0: Saving arc entity', { start, through, end });

          // Compute center and radius from 3 points
          const ax = start.x, ay = start.y;
          const bx = through.x, by = through.y;
          const cx = end.x, cy = end.y;
          const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));

          if (Math.abs(D) < 1e-10) {
            // Degenerate (collinear) — save as a line instead
             setCadEntitiesWithUndo(prev => [...prev, {
               id: crypto.randomUUID(),
               type: 'line',
               points: [start, end],
               layerId: activeLayerId
             }], 'Draw Arc (line)', 'draw');
          } else {
            const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
            const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
            const radius = Math.sqrt((ax - ux) * (ax - ux) + (ay - uy) * (ay - uy));

             setCadEntitiesWithUndo(prev => [...prev, {
               id: crypto.randomUUID(),
               type: 'arc',
               points: [start, through, end],
               properties: { centerX: ux, centerY: uy, radius },
               layerId: activeLayerId
             }], 'Draw Arc', 'draw');
          }
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'ellipse') {
        // 2 steps: center, edge point
        if (prevDrawState.step === 0) {
          console.log('📍 Ellipse Step 0: Center', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          const center = prevDrawState.points[0];
          const rx = Math.abs(worldPos.x - center.x);
          const ry = Math.abs(worldPos.y - center.y);
          console.log('✅ Ellipse Step 1→0: Saving ellipse', { center, rx, ry });

           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'ellipse',
             points: [center, worldPos],
             properties: { rx, ry },
             layerId: activeLayerId
           }], 'Draw ellipse', 'draw');
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'polygon') {
        // 2 steps: center, vertex
        if (prevDrawState.step === 0) {
          console.log('📍 Polygon Step 0: Center', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          const center = prevDrawState.points[0];
          const radius = Math.sqrt(Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2));
          const sides = 6; // default hexagon
          console.log('✅ Polygon Step 1→0: Saving polygon', { center, radius, sides });

           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'polygon',
             points: [center, worldPos],
             properties: { sides, radius },
             layerId: activeLayerId
           }], 'Draw polygon', 'draw');
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'slot') {
        // 2 steps: center1, center2. properties={ width }
        if (prevDrawState.step === 0) {
          console.log('📍 Slot Step 0: Center1', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          const center1 = prevDrawState.points[0];
          const center2 = worldPos;
          const dist = Math.sqrt(Math.pow(center2.x - center1.x, 2) + Math.pow(center2.y - center1.y, 2));
          const width = dist * 0.3; // default width = 30% of length
          console.log('✅ Slot Step 1→0: Saving slot', { center1, center2, width });

           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'slot',
             points: [center1, center2],
             properties: { width },
             layerId: activeLayerId
           }], 'Draw slot', 'draw');
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'obround') {
        // 2 steps: corner1, corner2. properties={ cornerRadius }
        if (prevDrawState.step === 0) {
          console.log('📍 Obround Step 0: Corner1', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          const corner1 = prevDrawState.points[0];
          const corner2 = worldPos;
          const w = Math.abs(corner2.x - corner1.x);
          const h = Math.abs(corner2.y - corner1.y);
          const cornerRadius = Math.min(w, h) / 2;
          console.log('✅ Obround Step 1→0: Saving obround', { corner1, corner2, cornerRadius });

           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'obround',
             points: [corner1, corner2],
             properties: { cornerRadius },
             layerId: activeLayerId
           }], 'Draw obround', 'draw');
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'dimension') {
        // 3-point dimension: start point, end point, text offset position
        if (prevDrawState.step === 0) {
          console.log('📍 Dimension Step 0: Start point', worldPos);
          return { step: 1, points: [worldPos], currentPos: null };
        } else if (prevDrawState.step === 1) {
          console.log('📍 Dimension Step 1: End point', worldPos);
          return { step: 2, points: [...prevDrawState.points, worldPos], currentPos: null };
        } else if (prevDrawState.step === 2) {
          const [start, end] = prevDrawState.points;
          const textPos = worldPos;
          const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
          console.log('✅ Dimension Step 2→0: Saving dimension', { start, end, textPos, distance });

           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'dimension',
             points: [start, end, textPos],
             properties: { value: Math.round(distance * 100) / 100, unit: 'mm' },
             layerId: activeLayerId
           }], 'Draw dimension', 'draw');
          return { step: 0, points: [], currentPos: null };
        }
      } else if (activeDrawTool === 'text') {
        // 1-point text: click position, then type text in command input
        if (prevDrawState.step === 0) {
          console.log('📍 Text Step 0: Position set, type text in command input', worldPos);
          // Move to step 1 = waiting for text input from command line
          return { step: 1, points: [worldPos], currentPos: null };
        }
        // Step 1 is handled by command input handler (handleCommandInputKeyDown)
      } else if (activeDrawTool === 'leader') {
        // Multi-point leader: arrowTip, through-points... (finish with right-click or Enter)
        console.log(`📍 Leader point added:`, worldPos);
        return {
          step: prevDrawState.step + 1,
          points: [...prevDrawState.points, worldPos],
          currentPos: null
        };
      } else if (activeDrawTool === 'hatch') {
        // 1-click hatch: click inside a closed entity to fill it
        console.log('📍 Hatch: Finding closest entity at', worldPos);
        
        // Find the closest entity to fill with hatch
        let closestEntityId: string | null = null;
        let closestDist = Infinity;
        
        // Search through entities for closest closed shape
        const closedTypes = ['rect', 'circle', 'ellipse', 'polygon', 'obround'];
        for (const ent of cadEntities) {
          if (!closedTypes.includes(ent.type)) continue;
          
          // Check distance to entity center
          let cx = 0, cy = 0;
          if (ent.type === 'circle' || ent.type === 'ellipse' || ent.type === 'polygon') {
            cx = ent.points[0].x;
            cy = ent.points[0].y;
          } else if (ent.type === 'rect' || ent.type === 'obround') {
            cx = (ent.points[0].x + ent.points[1].x) / 2;
            cy = (ent.points[0].y + ent.points[1].y) / 2;
          }
          const dist = Math.sqrt(Math.pow(worldPos.x - cx, 2) + Math.pow(worldPos.y - cy, 2));
          if (dist < closestDist) {
            closestDist = dist;
            closestEntityId = ent.id;
          }
        }
        
        if (closestEntityId) {
          console.log('✅ Hatch: Applying to entity', closestEntityId);
           setCadEntitiesWithUndo(prev => [...prev, {
             id: crypto.randomUUID(),
             type: 'hatch',
             points: [worldPos],
             properties: { pattern: 'lines', angle: 45, spacing: 5, targetEntityId: closestEntityId },
             layerId: activeLayerId
           }], 'Draw hatch', 'draw');
        } else {
          console.log('⚠️ Hatch: No closed entity found nearby');
        }
        return { step: 0, points: [], currentPos: null };
      } else if (activeDrawTool === 'measure') {
        // Measure tool: 2-click distance measurement
        if (measurePoints.length === 0) {
          // First point
          console.log('📏 Measure: First point set', worldPos);
          setMeasurePoints([worldPos]);
        } else {
          // Second point — calculate and display
          const p1 = measurePoints[0];
          const p2 = worldPos;
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          console.log('📏 Measure: Distance =', distance.toFixed(2), 'mm');

          setMeasureResult({ distance, p1, p2 });
          setMeasurePoints([]);

          // Auto-clear after 4 seconds
          if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
          measureTimerRef.current = setTimeout(() => setMeasureResult(null), 4000);
        }
        return prevDrawState; // Don't change drawState for measure tool
      } else if (activeDrawTool === 'measure_quick') {
        // Quick Measure: hit-test entity under cursor, show bounding box dimensions
        const threshold = 10 / pixelsPerUnit;
        let hitEntity: CadEntity | null = null;
        for (const ent of cadEntities) {
          if (isPointNearEntity(worldPos, ent, threshold)) {
            hitEntity = ent;
            break;
          }
        }
        if (hitEntity) {
          // Calculate bounding box for the hit entity
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          hitEntity.points?.forEach((p: { x: number; y: number }) => {
            if (isFinite(p.x) && isFinite(p.y)) {
              minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
              minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
            }
          });
          // Handle circle / arc radius
          if (hitEntity.type === 'circle' || hitEntity.type === 'arc') {
            const cx = hitEntity.properties?.centerX ?? hitEntity.points?.[0]?.x ?? 0;
            const cy = hitEntity.properties?.centerY ?? hitEntity.points?.[0]?.y ?? 0;
            const r = hitEntity.properties?.radius ?? 0;
            if (isFinite(cx) && isFinite(cy) && isFinite(r) && r > 0) {
              minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
              minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
            }
          }
          // Handle ellipse rx/ry
          if (hitEntity.type === 'ellipse') {
            const cx = hitEntity.points?.[0]?.x ?? 0;
            const cy = hitEntity.points?.[0]?.y ?? 0;
            const rx = hitEntity.properties?.rx ?? 0;
            const ry = hitEntity.properties?.ry ?? 0;
            if (isFinite(cx) && isFinite(cy)) {
              minX = Math.min(minX, cx - rx); maxX = Math.max(maxX, cx + rx);
              minY = Math.min(minY, cy - ry); maxY = Math.max(maxY, cy + ry);
            }
          }
          if (isFinite(minX) && isFinite(maxX)) {
            const w = Math.abs(maxX - minX);
            const h = Math.abs(maxY - minY);
            showToast(`📐 Kích thước: ${w.toFixed(2)} x ${h.toFixed(2)} mm`, 3000);
          } else {
            showToast('⚠️ Không tính được kích thước', 2000);
          }
        } else {
          showToast('⚠️ Không tìm thấy đối tượng. Hãy click gần hơn.', 2000);
        }
        // Keep tool active for measuring next entity
        return prevDrawState;
      } else if (activeDrawTool === 'measure_radius') {
        setMeasureRadiusPoints(prev => {
          const newPts = [...prev, worldPos];
          if (newPts.length === 2) {
            // Calculate radius (distance from point 1 to point 2)
            const r = Math.sqrt(Math.pow(newPts[1].x - newPts[0].x, 2) + Math.pow(newPts[1].y - newPts[0].y, 2));
            showToast?.(`Bán kính: ${r.toFixed(2)} mm`);
            return []; // reset
          }
          return newPts;
        });
        return prevDrawState;
      } else if (activeDrawTool === 'measure_angle') {
        setMeasureAnglePoints(prev => {
          const newPts = [...prev, worldPos];
          if (newPts.length === 3) {
            // Calculate angle between three points
            const [p1, p2, p3] = newPts;
            const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const angle2 = Math.atan2(p3.y - p1.y, p3.x - p1.x);
            let diff = (angle2 - angle1) * 180 / Math.PI;
            if (diff < 0) diff += 360;
            showToast?.(`Góc: ${diff.toFixed(2)} độ`);
            return [];
          }
          return newPts;
        });
        return prevDrawState;
      } else if (activeDrawTool === 'measure_area') {
        setMeasureAreaPoints(prev => {
          const newPts = [...prev, worldPos];
          showToast?.(`Đã chọn ${newPts.length} điểm. Nhấn ESC để tính diện tích.`);
          return newPts;
        });
        return prevDrawState;
      } else if (activeDrawTool === 'join') {
        // Join tool: select 2 entities and merge at nearest endpoints
        // Find entity at click position
        let clickedJoinEntity: string | null = null;
        for (const ent of cadEntities) {
          if (isPointNearEntity(worldPos, ent, 10 / pixelsPerUnit)) {
            // Only allow lines and polylines
            if (ent.type === 'line' || ent.type === 'polyline') {
              clickedJoinEntity = ent.id;
              break;
            }
          }
        }

        if (!clickedJoinEntity) {
          console.log('⚠️ Join: No line/polyline found at click position');
          return prevDrawState;
        }

        if (!joinFirstEntityId) {
          // First entity selected
          console.log('🔗 Join: First entity selected', clickedJoinEntity);
          setJoinFirstEntityId(clickedJoinEntity);
          setSelectedEntities(new Set([clickedJoinEntity]));
        } else if (clickedJoinEntity !== joinFirstEntityId) {
          // Second entity selected — attempt join
          const ent1 = cadEntities.find(e => e.id === joinFirstEntityId);
          const ent2 = cadEntities.find(e => e.id === clickedJoinEntity);

          if (!ent1 || !ent2) {
            console.log('⚠️ Join: Entity not found');
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Get endpoints
          const getEndpoints = (ent: CadEntity): { start: { x: number; y: number }; end: { x: number; y: number } } | null => {
            if (ent.type === 'line' && ent.points.length >= 2) {
              return { start: ent.points[0], end: ent.points[1] };
            }
            if (ent.type === 'polyline' && ent.points.length >= 2) {
              return { start: ent.points[0], end: ent.points[ent.points.length - 1] };
            }
            return null;
          };

          const getPoints = (ent: CadEntity): { x: number; y: number }[] => {
            if (ent.type === 'line') return [ent.points[0], ent.points[1]];
            if (ent.type === 'polyline') return [...ent.points];
            return [];
          };

          const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
            Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

          const eps1 = getEndpoints(ent1);
          const eps2 = getEndpoints(ent2);

          if (!eps1 || !eps2) {
            console.log('⚠️ Join: Cannot get endpoints');
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Find closest endpoint pair
          const combos = [
            { d: dist(eps1.end, eps2.start), flip1: false, flip2: false },
            { d: dist(eps1.end, eps2.end), flip1: false, flip2: true },
            { d: dist(eps1.start, eps2.start), flip1: true, flip2: false },
            { d: dist(eps1.start, eps2.end), flip1: true, flip2: true },
          ];
          const best = combos.reduce((a, b) => a.d < b.d ? a : b);

          const TOLERANCE = 2; // mm
          if (best.d > TOLERANCE) {
            console.log('⚠️ Join: Endpoints too far apart (', best.d.toFixed(2), 'mm > ', TOLERANCE, 'mm)');
            showToast?.(`Không thể nối: khoảng cách ${best.d.toFixed(2)}mm > ${TOLERANCE}mm`);
            setJoinFirstEntityId(null);
            setSelectedEntities(new Set());
            return prevDrawState;
          }

          // Get point arrays and flip if needed
          let pts1 = getPoints(ent1);
          let pts2 = getPoints(ent2);
          if (best.flip1) pts1 = pts1.reverse();
          if (best.flip2) pts2 = pts2.reverse();

          // Merge: pts1 + pts2 (skip first of pts2 since it overlaps)
          const mergedPoints = [...pts1, ...pts2.slice(1)];

          const newId = crypto.randomUUID();
          const newEntity: CadEntity = {
            id: newId,
            type: 'polyline',
            points: mergedPoints,
            properties: {
              closed: false,
              layer: ent1.properties?.layer || 'default',
              color: ent1.properties?.color || '#ffffff',
            },
            layerId: ent1.layerId || activeLayerId,
          };

          console.log('✅ Join: Merged', ent1.id, '+', ent2.id, '→', newId, '(', mergedPoints.length, 'points)');

          setCadEntitiesWithUndo(
            prev => [...prev.filter(e => e.id !== ent1!.id && e.id !== ent2!.id), newEntity],
            'Join entities',
            'edit',
            [ent1.id, ent2.id]
          );

          setJoinFirstEntityId(null);
          setSelectedEntities(new Set([newId]));
        }
        return prevDrawState;
      }
      
      return prevDrawState;
    });
  }, [activeDrawTool, setCadEntities, setCadEntitiesWithUndo, setDrawState, cadEntities, measurePoints, measureRadiusPoints, measureAnglePoints, measureAreaPoints, joinFirstEntityId, isPointNearEntity, pixelsPerUnit, activeLayerId, showToast]);

  // ============ TRANSFORM EDIT CLICK HANDLER (Move, Copy, Mirror, Rotate, Scale) ============
  const handleTransformEditClick = React.useCallback((worldPos: { x: number; y: number }) => {
    if (!activeDrawTool || !TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) return;
    if (selectedEntities.size === 0) {
      console.warn('⚠️ No entities selected for transform edit');
      return;
    }

    console.log(`🔄 Transform Edit [${activeDrawTool}] click:`, worldPos, 'step:', transformEditState.step);

    // === MOVE: 2-step (base point → destination) ===
    if (activeDrawTool === 'move') {
      if (transformEditState.step === 0) {
        // Step 0: Set base point
        setTransformEditState({ step: 1, points: [worldPos], currentPos: null });
      } else if (transformEditState.step === 1) {
        // Step 1: Set destination → apply translation
        const base = transformEditState.points[0];
        const dx = worldPos.x - base.x;
        const dy = worldPos.y - base.y;
        console.log('✅ Move: translating by', { dx, dy });
        applyTransformToSelected(ent => translateEntity(ent, dx, dy), 'Move Entity');
        setTransformEditState({ step: 0, points: [], currentPos: null });
        if (onCancelDraw) onCancelDraw();
      }
    }

    // === COPY: 2-step (base point → destination) ===
    else if (activeDrawTool === 'copy') {
      if (transformEditState.step === 0) {
        setTransformEditState({ step: 1, points: [worldPos], currentPos: null });
      } else if (transformEditState.step === 1) {
        const base = transformEditState.points[0];
        const dx = worldPos.x - base.x;
        const dy = worldPos.y - base.y;
        console.log('✅ Copy: cloning with translation', { dx, dy });
        cloneSelectedWithTransform(ent => translateEntity(ent, dx, dy), 'Copy Entity');
        // Stay in copy mode for repeated copies from same base
        // Reset to step 1 but keep base point
        setTransformEditState(prev => ({ ...prev, currentPos: null }));
      }
    }

    // === MIRROR: 2-step (first point of mirror line → second point) ===
    else if (activeDrawTool === 'mirror') {
      if (transformEditState.step === 0) {
        setTransformEditState({ step: 1, points: [worldPos], currentPos: null });
      } else if (transformEditState.step === 1) {
        const p1 = transformEditState.points[0];
        const p2 = worldPos;
        console.log('✅ Mirror: reflecting across line', { p1, p2 });
        applyTransformToSelected(ent => mirrorEntity(ent, p1, p2), 'Mirror Entity');
        setTransformEditState({ step: 0, points: [], currentPos: null });
        if (onCancelDraw) onCancelDraw();
      }
    }

    // === ROTATE: 3-step (center → reference point → target angle point) ===
    else if (activeDrawTool === 'rotate') {
      if (transformEditState.step === 0) {
        // Step 0: Set rotation center
        setTransformEditState({ step: 1, points: [worldPos], currentPos: null });
      } else if (transformEditState.step === 1) {
        // Step 1: Set reference angle point
        setTransformEditState(prev => ({ step: 2, points: [...prev.points, worldPos], currentPos: null }));
      } else if (transformEditState.step === 2) {
        // Step 2: Set target angle → compute rotation
        const center = transformEditState.points[0];
        const refPt = transformEditState.points[1];
        const refAngle = Math.atan2(refPt.y - center.y, refPt.x - center.x);
        const targetAngle = Math.atan2(worldPos.y - center.y, worldPos.x - center.x);
        const angleDeg = (targetAngle - refAngle) * 180 / Math.PI;
        console.log('✅ Rotate: angle =', angleDeg.toFixed(2), '°');
        applyTransformToSelected(ent => rotateEntity(ent, center, angleDeg), 'Rotate Entity');
        setTransformEditState({ step: 0, points: [], currentPos: null });
        if (onCancelDraw) onCancelDraw();
      }
    }

    // === SCALE: 3-step (center → reference distance → target distance) ===
    else if (activeDrawTool === 'scale') {
      if (transformEditState.step === 0) {
        // Step 0: Set scale center
        setTransformEditState({ step: 1, points: [worldPos], currentPos: null });
      } else if (transformEditState.step === 1) {
        // Step 1: Set reference distance point
        setTransformEditState(prev => ({ step: 2, points: [...prev.points, worldPos], currentPos: null }));
      } else if (transformEditState.step === 2) {
        // Step 2: Set target distance → compute scale factor
        const center = transformEditState.points[0];
        const refPt = transformEditState.points[1];
        const refDist = Math.sqrt(Math.pow(refPt.x - center.x, 2) + Math.pow(refPt.y - center.y, 2));
        const targetDist = Math.sqrt(Math.pow(worldPos.x - center.x, 2) + Math.pow(worldPos.y - center.y, 2));
        const factor = refDist > 1e-6 ? targetDist / refDist : 1;
        console.log('✅ Scale: factor =', factor.toFixed(4));
        applyTransformToSelected(ent => scaleEntity(ent, center, factor), 'Scale Entity');
        setTransformEditState({ step: 0, points: [], currentPos: null });
        if (onCancelDraw) onCancelDraw();
      }
    }
  }, [activeDrawTool, selectedEntities, transformEditState, applyTransformToSelected, cloneSelectedWithTransform, onCancelDraw]);

  // --- Input Handlers ---
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault(); // Prevent page scrolling
    if (!containerRef.current) return;
    const scaleFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * scaleFactor : zoom / scaleFactor;
    if (newZoom < 0.01 || newZoom > 50) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldMouseBefore = {
      x: viewOffset.x + (mouseX / (BASE_PIXELS_PER_UNIT * zoom)),
      y: viewOffset.y - (mouseY / (BASE_PIXELS_PER_UNIT * zoom))
    };
    setZoom(newZoom);
    const newPixelsPerUnit = BASE_PIXELS_PER_UNIT * newZoom;
    const newViewOffset = {
      x: worldMouseBefore.x - (mouseX / newPixelsPerUnit),
      y: worldMouseBefore.y + (mouseY / newPixelsPerUnit)
    };
    setViewOffset(newViewOffset);
  }, [zoom, viewOffset]);

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    // console.log('🖱️ Mouse down:', { button: e.button, activeDrawTool });
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = screenToWorld(screenX, screenY);

    // Apply snap/ortho to click position for precise placement
    let snappedPos = worldPos;
    if (activeDrawTool) {
      if (orthoEnabled && drawState.points.length > 0) {
        snappedPos = applyOrthoConstraint(snappedPos, drawState.points[drawState.points.length - 1]);
      }
      if (snapEnabled && activeSnaps.size > 0) {
        const threshold = 20 / pixelsPerUnit;
        const snap = findNearestSnapPoint(snappedPos, cadEntities, activeSnaps, threshold);
        if (snap) {
          snappedPos = { x: snap.x, y: snap.y };
        }
      }
    }
    
    // Left mouse button
    if (e.button === 0) {
        if (activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
            // Transform Edit mode (move, copy, mirror, rotate, scale)
            console.log('✅ Transform edit mode active, processing click');
            handleTransformEditClick(snappedPos);
            return;
        } else if (activeDrawTool && EDIT_TOOLS.includes(activeDrawTool)) {
            // Edit tools mode (offset, trim, extend, fillet, chamfer)
            console.log('✅ Edit tool mode active, processing click');
            handleEditToolClick(snappedPos);
            return;
        } else if (activeDrawTool && activeDrawTool !== 'lag_reduce') {
            // Drawing mode
            console.log('✅ Drawing mode active, processing click');
            handleDrawingClick(snappedPos);
            return;
        } else {
            // Selection mode - Start window selection
            // console.log('📦 Starting window selection');
            setIsWindowSelecting(true);
            setSelectionStart(worldPos);
            setSelectionEnd(worldPos);
            
            // Check if clicking on an entity (for single selection)
            let clickedEntity: string | null = null;
            for (const entity of cadEntities) {
                if (isPointNearEntity(worldPos, entity, 10 / pixelsPerUnit)) {
                    clickedEntity = entity.id;
                    break;
                }
            }
            
            if (clickedEntity) {
                if (e.shiftKey) {
                    // Shift+Click: DESELECT the clicked entity
                    setSelectedEntities(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(clickedEntity!);
                        return newSet;
                    });
                } else if (e.ctrlKey || e.metaKey) {
                    // Ctrl/Cmd+Click: TOGGLE (add or remove)
                    setSelectedEntities(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(clickedEntity!)) {
                            newSet.delete(clickedEntity!);
                        } else {
                            newSet.add(clickedEntity!);
                        }
                        return newSet;
                    });
                } else {
                    // Normal Click: Select ONLY this entity (clear others)
                    setSelectedEntities(new Set([clickedEntity]));
                }
            } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                // Click on empty space: Clear all selections
                setSelectedEntities(new Set());
                setSelectedSheets(new Set());
            }
            
            return;
        }
    }
    // Middle mouse button: Pan (single-click) or Zoom Fit (double-click)
    else if (e.button === 1) {
        e.preventDefault();
        
        // Double-click: Zoom Fit
        if (e.detail === 2) {
            console.log('🔍 Double-click middle mouse: Zoom Fit');
            const bounds = getContentBounds();
            if (!bounds) {
                console.log('⚠️ Zoom Fit: No content to fit');
                return;
            }
            
            if (!containerRef.current) return;
            const containerW = containerRef.current.clientWidth;
            const containerH = containerRef.current.clientHeight;
            if (containerW <= 0 || containerH <= 0) return;
            
            const contentW = bounds.maxX - bounds.minX;
            const contentH = bounds.maxY - bounds.minY;
            if (contentW <= 0 && contentH <= 0) return;
            
            // 10% padding on each side → content occupies 80% of viewport
            const paddingFactor = 0.8;
            const zoomX = contentW > 0 ? (containerW * paddingFactor) / (contentW * BASE_PIXELS_PER_UNIT) : Infinity;
            const zoomY = contentH > 0 ? (containerH * paddingFactor) / (contentH * BASE_PIXELS_PER_UNIT) : Infinity;
            const newZoom = Math.max(0.01, Math.min(Math.min(zoomX, zoomY), 50));
            
            const newPixelsPerUnit = BASE_PIXELS_PER_UNIT * newZoom;
            const contentCenterX = (bounds.minX + bounds.maxX) / 2;
            const contentCenterY = (bounds.minY + bounds.maxY) / 2;
            
            const newViewOffsetX = contentCenterX - (containerW / (2 * newPixelsPerUnit));
            const newViewOffsetY = contentCenterY + (containerH / (2 * newPixelsPerUnit));
            
            setZoom(newZoom);
            setViewOffset({ x: newViewOffsetX, y: newViewOffsetY });
            console.log('✅ Zoom Fit applied (middle double-click):', { newZoom: newZoom.toFixed(3), offsetX: newViewOffsetX.toFixed(0), offsetY: newViewOffsetY.toFixed(0) });
            return;
        }
        
        // Single-click: Start pan
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragStartView({ ...viewOffset });
    }
  }, [activeDrawTool, screenToWorld, handleDrawingClick, handleTransformEditClick, handleEditToolClick, viewOffset, cadEntities, pixelsPerUnit, snapEnabled, activeSnaps, orthoEnabled, drawState.points]);

  const handleMouseUp = React.useCallback((e: React.MouseEvent) => {
    // Finish window selection
    if (isWindowSelecting && selectionStart && selectionEnd) {
      console.log('📦 Finishing window selection');
      
      // Calculate selection box
      const selectionBox = getSelectionBox(
        selectionStart.x,
        selectionStart.y,
        selectionEnd.x,
        selectionEnd.y
      );
      
      console.log('📦 Selection box:', selectionBox);
      
      // Find entities in selection window
      const entitiesInWindow = getEntitiesInSelection(cadEntities, selectionBox);
      
      console.log('✅ Selected entities:', entitiesInWindow.length);
      
      // ============================================================
      // PART SELECTION MODE: Just select entities, don't auto-create
      // Dialog will open via handleFinishSelectPart() from parent
      // ============================================================
      if (isSelecting && entitiesInWindow.length > 0) {
        console.log('🎯 PART SELECTION MODE: Selected', entitiesInWindow.length, 'entities');
        
        // Mark entities as selected
        const newSelected = new Set(selectedEntities);
        entitiesInWindow.forEach(e => newSelected.add(e.id));
        setSelectedEntities(newSelected);
        
        console.log('✅ Entities marked as selected, waiting for dialog to open...');
      } else {
        // Normal selection mode (not ADD_PART)
        // Update selection highlight only
        if (e.ctrlKey || e.metaKey) {
          // Add to existing selection
          setSelectedEntities(prev => {
            const newSet = new Set(prev);
            entitiesInWindow.forEach(entity => newSet.add(entity.id));
            return newSet;
          });
        } else {
          // Replace selection
          setSelectedEntities(new Set(entitiesInWindow.map(e => e.id)));
        }
        // Show reminder toast when in pendingDeleteMode and entities were selected
        if (pendingDeleteMode && entitiesInWindow.length > 0) {
          showToast(`🗑️ Đã chọn ${entitiesInWindow.length} đối tượng — nhấn CHUỘT PHẢI để xóa`);
        }
      }
      
      setIsWindowSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    
    // End sheet dragging
    if (draggingSheet) {
      setDraggingSheet(null);
    }
    
    // End part dragging + overflow warning
    if (draggingPart) {
      // Check if part overflows its sheet
      const partData = parts.find(p => p.id === draggingPart.id);
      const sheetData = sheets.find(s => s.id === draggingPart.sheetId);
      if (partData && sheetData) {
        const [sw, sh] = sheetData.dimensions.split('x').map(Number);
        const [pw, ph] = partData.dimensions.split('x').map(Number);
        const isRotated = partData.rotationAngle === 90;
        const finalW = isRotated ? ph : pw;
        const finalH = isRotated ? pw : ph;
        const px = partData.x ?? 0;
        const py = partData.y ?? 0;
        if (px < 0 || py < 0 || px + finalW > sw || py + finalH > sh) {
          showToast('⚠️ Chi tiết nằm ngoài phạm vi tấm! Vui lòng kiểm tra lại vị trí.');
        }
      }
      setDraggingPart(null);
    }
    
    setIsDragging(false);
  }, [isWindowSelecting, selectionStart, selectionEnd, cadEntities, isSelecting, parts, onAddPart, draggingSheet, pendingDeleteMode, draggingPart, sheets]);

  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = screenToWorld(mouseX, mouseY);

    // Update crosshair position (AutoCAD style)
    setMouseScreenPos({ x: mouseX, y: mouseY });
    setMouseWorldPos(worldPos);

    // Update selection box during drag
    if (isWindowSelecting && selectionStart) {
      setSelectionEnd(worldPos);
    }

    // === SHEET DRAGGING ===
    if (draggingSheet) {
      const newX = draggingSheet.origSheetX + (worldPos.x - draggingSheet.startMouseWorld.x);
      const newY = draggingSheet.origSheetY + (worldPos.y - draggingSheet.startMouseWorld.y);
      onUpdateSheet?.(draggingSheet.id, { x: newX, y: newY });
    }

    // === PART DRAGGING ===
    if (draggingPart) {
      const newPX = draggingPart.origPartX + (worldPos.x - draggingPart.startMouseWorld.x);
      const newPY = draggingPart.origPartY + (worldPos.y - draggingPart.startMouseWorld.y);
      onUpdatePart?.(draggingPart.id, { x: newPX, y: newPY });
    }

    if (activeDrawTool) {
        let finalPos = worldPos;

        // 1) ORTHO constraint: lock to H/V axis from last point
        if (orthoEnabled && drawState.points.length > 0) {
          finalPos = applyOrthoConstraint(finalPos, drawState.points[drawState.points.length - 1]);
        }

        // 2) SNAP: find nearest snap point within 20px screen-space threshold
        if (snapEnabled && activeSnaps.size > 0) {
          // Throttle snap calculation using RAF to prevent lag with many entities
          if (!rafMouseMoveRef.current) {
            rafMouseMoveRef.current = requestAnimationFrame(() => {
              rafMouseMoveRef.current = null;
              const threshold = 20 / pixelsPerUnit;
              const snap = findNearestSnapPoint(finalPos, cadEntitiesRef.current, activeSnaps, threshold);
              setCurrentSnap(snap);
            });
          }
          // Use previous snap result for immediate position
          if (currentSnap) {
            finalPos = { x: currentSnap.x, y: currentSnap.y };
          }
        } else {
          setCurrentSnap(null);
        }

        setDrawState(prev => ({ ...prev, currentPos: finalPos }));

        // Also track currentPos for transform edit tools (for ghost preview)
        if (TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
          setTransformEditState(prev => ({ ...prev, currentPos: finalPos }));
        }

        onMouseMove(finalPos.x, finalPos.y);
    } else {
        setCurrentSnap(null);
        onMouseMove(worldPos.x, worldPos.y);
    }

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setViewOffset({
        x: dragStartView.x - (dx / pixelsPerUnit),
        y: dragStartView.y + (dy / pixelsPerUnit)
      });
    }
  }, [activeDrawTool, screenToWorld, isDragging, dragStart, dragStartView, pixelsPerUnit, onMouseMove, isWindowSelecting, selectionStart, snapEnabled, activeSnaps, orthoEnabled, drawState.points, cadEntities, draggingSheet, onUpdateSheet]);

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafMouseMoveRef.current) cancelAnimationFrame(rafMouseMoveRef.current);
    };
  }, []);

  // === GLOBAL ESC KEY HANDLER ===
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't handle if focus is in a modal input or settings
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        
        setDrawState({ step: 0, points: [], currentPos: null });
        setTransformEditState({ step: 0, points: [], currentPos: null });
        setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
        setMeasurePoints([]);
        setMeasureResult(null);
        setMeasureRadiusPoints([]);
        setMeasureAnglePoints([]);
        setMeasureAreaPoints([]);
        setShowFireworksOverlay(false);
        setSelectedEntities(new Set());
        setCurrentSnap(null);
        if (onCancelDraw) onCancelDraw();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [onCancelDraw]);

  // === DXF/SVG FILE DRAG-DROP IMPORT (Task 19) ===
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      e.dataTransfer.dropEffect = 'copy';
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isImporting) return;
    setIsImporting(true);
    setImportProgress(0);
    setImportStatusText('');

    try {
      // Cosmetic progress animation
      const importSteps = [
        { text: 'Đang tải file...', progress: 15 },
        { text: 'Đang phân tích cấu trúc...', progress: 35 },
        { text: 'Đang đọc entities...', progress: 60 },
        { text: 'Đang chuyển đổi hình học...', progress: 85 },
        { text: 'Hoàn tất!', progress: 100 },
      ];
      for (const step of importSteps) {
        setImportStatusText(step.text);
        await new Promise(r => setTimeout(r, 150));
        setImportProgress(step.progress);
      }

      const files: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        files.push(e.dataTransfer.files[i]);
      }
      const supportedFiles = files.filter((f: File) => {
        const name = f.name.toLowerCase();
        return name.endsWith('.dxf') || name.endsWith('.svg') || name.endsWith('.dwg');
      });

      if (supportedFiles.length === 0) {
        showToast('⚠️ Unsupported file type. Drop .dxf, .svg or .dwg files.');
        return;
      }

      let totalImported = 0;
      const fileNames: string[] = [];

      for (const file of supportedFiles) {
        try {
          const result = await dxfService.parseImportFile(file, activeLayerId);
          if (result.entities.length > 0) {
            const importedEntities = result.entities;
            const entityIds = importedEntities.map(e => e.id);
            setCadEntitiesWithUndo(
              prev => [...prev, ...importedEntities],
              `Import ${result.entities.length} entities from ${result.fileName}`,
              'draw',
              entityIds
            );
            totalImported += result.entities.length;
            fileNames.push(result.fileName);
          } else {
            showToast(`⚠️ No entities found in ${result.fileName}`, 5000);
          }
        } catch (err) {
          console.error('❌ Import failed:', file.name, err);
          showToast(`❌ Failed to import ${file.name}`, 5000);
        }
      }

      if (totalImported > 0) {
        showToast(`✅ Imported ${totalImported} entities from ${fileNames.join(', ')}`, 3500);
      }
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportStatusText('');
    }
  }, [activeLayerId, setCadEntitiesWithUndo, showToast, isImporting]);

  // === COMMAND INPUT HANDLER (AutoCAD Style) ===
  const handleCommandInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = commandInput.trim();
      if (!input) return;

      console.log('📝 Command input:', input, 'DrawState:', drawState, 'Tool:', activeDrawTool);

      // Add to history
      setCommandHistory(prev => [...prev.slice(-19), input]);

      // === TEXT TOOL: Accept text content from command input ===
      if (activeDrawTool === 'text' && drawState.step === 1 && drawState.points.length === 1) {
        const textPos = drawState.points[0];
        console.log('✅ Text tool: Creating text entity', { text: input, position: textPos });
         setCadEntitiesWithUndo(prev => [...prev, {
           id: crypto.randomUUID(),
           type: 'text',
           points: [textPos],
           properties: { text: input, fontSize: 14, rotation: 0 },
           layerId: activeLayerId
         }], 'Draw text', 'draw');
        setDrawState({ step: 0, points: [], currentPos: null });
        setCommandInput('');
        return;
      }

      // === LEADER TOOL: Accept text content from command input to finish leader ===
      if (activeDrawTool === 'leader' && drawState.step >= 2 && drawState.points.length >= 2) {
        const points = drawState.points;
        console.log('✅ Leader tool: Finishing leader with text', { text: input, points });
         setCadEntitiesWithUndo(prev => [...prev, {
           id: crypto.randomUUID(),
           type: 'leader',
           points: points,
           properties: { text: input },
           layerId: activeLayerId
         }], 'Draw leader', 'draw');
        setDrawState({ step: 0, points: [], currentPos: null });
        setCommandInput('');
        if (onCancelDraw) onCancelDraw();
        return;
      }

      // === EDIT TOOLS: Distance/Radius input (Offset, Fillet, Chamfer at step 0) ===
      if (activeDrawTool && EDIT_TOOLS.includes(activeDrawTool) && editToolState.step === 0) {
        const numVal = parseFloat(input);
        if (!isNaN(numVal) && numVal > 0) {
          if (activeDrawTool === 'offset') {
            console.log('📏 Offset distance set:', numVal);
            setEditToolState(prev => ({ ...prev, step: 1, distance: numVal }));
            setCommandInput('');
            return;
          }
          if (activeDrawTool === 'fillet') {
            console.log('📏 Fillet radius set:', numVal);
            setEditToolState(prev => ({ ...prev, step: 1, distance: numVal }));
            setCommandInput('');
            return;
          }
          if (activeDrawTool === 'chamfer') {
            console.log('📏 Chamfer distance set:', numVal);
            setEditToolState(prev => ({ ...prev, step: 1, distance: numVal }));
            setCommandInput('');
            return;
          }
        } else {
          console.log('⚠️ Invalid distance/radius:', input);
        }
      }

      // === COMMAND SHORTCUTS (AutoCAD style) ===
      const COMMAND_SHORTCUTS: Record<string, string> = {
        'L': 'line', 'C': 'circle', 'R': 'rect', 'PL': 'polyline',
        'E': 'ellipse', 'PG': 'polygon', 'A': 'arc', 'SL': 'slot', 'OB': 'obround',
        'M': 'move', 'CP': 'copy', 'MI': 'mirror', 'RO': 'rotate', 'SC': 'scale',
        'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',
        'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',
      };
      const shortcutTool = COMMAND_SHORTCUTS[input.toUpperCase()];
      if (shortcutTool && onSelectTool) {
        console.log('⌨️ Command shortcut:', input, '→', shortcutTool);
        onSelectTool(shortcutTool);
        setCommandInput('');
        return;
      }

      // Parse coordinate input: "x,y" or "@dx,dy" (relative)
      const coordMatch = input.match(/^(@?)(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
      if (coordMatch) {
        const isRelative = coordMatch[1] === '@';
        const x = parseFloat(coordMatch[2]);
        const y = parseFloat(coordMatch[3]);

        console.log('📐 Parsed coordinates:', { isRelative, x, y });

        // Route to transform edit tools if active
        if (activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
          const targetPos = isRelative && transformEditState.points.length > 0
            ? { x: transformEditState.points[transformEditState.points.length - 1].x + x, y: transformEditState.points[transformEditState.points.length - 1].y + y }
            : { x, y };
          console.log('✅ Transform edit coordinate:', targetPos);
          handleTransformEditClick(targetPos);
          setCommandInput('');
          return;
        }

        if (activeDrawTool && drawState.step > 0 && drawState.points.length > 0) {
          // If drawing rectangle and at step 1, treat as WIDTH,HEIGHT
          if (activeDrawTool === 'rect') {
            const firstPoint = drawState.points[0];
            console.log('📏 Rectangle: First point:', firstPoint, 'Width:', x, 'Height:', y);
            
            // Calculate second point based on width and height
            const targetPos = {
              x: firstPoint.x + x,
              y: firstPoint.y + y
            };
            
            console.log('✅ Rectangle target:', targetPos);
            handleDrawingClick(targetPos);
          } else {
            // For other tools: Relative to last point
            const lastPoint = drawState.points[drawState.points.length - 1];
            const targetPos = isRelative 
              ? { x: lastPoint.x + x, y: lastPoint.y + y }
              : { x, y };
            
            console.log('✅ Drawing target:', targetPos);
            handleDrawingClick(targetPos);
          }
        } else if (activeDrawTool) {
          // Absolute coordinate for first point
          console.log('✅ First point:', { x, y });
          handleDrawingClick({ x, y });
        }
      }

      // Parse polar coordinate: "distance<angle" (e.g., "100<45" = 100 units at 45 degrees)
      const polarMatch = input.match(/^(-?\d+\.?\d*)\s*<\s*(-?\d+\.?\d*)$/);
      if (polarMatch && activeDrawTool && drawState.step > 0 && drawState.points.length > 0) {
        const distance = parseFloat(polarMatch[1]);
        const angleDeg = parseFloat(polarMatch[2]);
        const angleRad = angleDeg * Math.PI / 180;
        const lastPoint = drawState.points[drawState.points.length - 1];
        
        const targetPos = {
          x: lastPoint.x + distance * Math.cos(angleRad),
          y: lastPoint.y + distance * Math.sin(angleRad)
        };
        handleDrawingClick(targetPos);
      }
      
      // === TRANSFORM EDIT: Single number input for rotate angle / scale factor ===
      const distMatch = input.match(/^(-?\d+\.?\d*)$/);
      if (distMatch && activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
        const numValue = parseFloat(distMatch[1]);
        
        // ROTATE: At step 1 (after center is set), type angle directly to skip reference point
        if (activeDrawTool === 'rotate' && transformEditState.step >= 1 && transformEditState.points.length >= 1) {
          const center = transformEditState.points[0];
          console.log('✅ Rotate: direct angle input =', numValue, '°');
          applyTransformToSelected(ent => rotateEntity(ent, center, numValue));
          setTransformEditState({ step: 0, points: [], currentPos: null });
          if (onCancelDraw) onCancelDraw();
          setCommandInput('');
          return;
        }
        
        // SCALE: At step 1 (after center is set), type factor directly to skip reference point
        if (activeDrawTool === 'scale' && transformEditState.step >= 1 && transformEditState.points.length >= 1) {
          const center = transformEditState.points[0];
          console.log('✅ Scale: direct factor input =', numValue);
          applyTransformToSelected(ent => scaleEntity(ent, center, numValue));
          setTransformEditState({ step: 0, points: [], currentPos: null });
          if (onCancelDraw) onCancelDraw();
          setCommandInput('');
          return;
        }
        
        // MOVE/COPY: At step 1, single distance along mouse direction
        if ((activeDrawTool === 'move' || activeDrawTool === 'copy') && transformEditState.step === 1 && transformEditState.currentPos && transformEditState.points.length >= 1) {
          const base = transformEditState.points[0];
          const cur = transformEditState.currentPos;
          const dx = cur.x - base.x;
          const dy = cur.y - base.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const targetPos = { x: base.x + (dx / len) * numValue, y: base.y + (dy / len) * numValue };
            console.log('✅', activeDrawTool, ': distance input =', numValue, 'along mouse direction');
            handleTransformEditClick(targetPos);
            setCommandInput('');
            return;
          }
        }
      }
      
      // Parse single dimension input (for distance/length during drawing)
      if (distMatch && activeDrawTool && drawState.step > 0) {
        const distance = parseFloat(distMatch[1]);
        const lastPoint = drawState.points[drawState.points.length - 1];
        
        // Calculate direction from last point to current mouse position
        if (drawState.currentPos) {
          const dx = drawState.currentPos.x - lastPoint.x;
          const dy = drawState.currentPos.y - lastPoint.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const targetPos = {
              x: lastPoint.x + (dx / len) * distance,
              y: lastPoint.y + (dy / len) * distance
            };
            handleDrawingClick(targetPos);
          }
        }
      }

      setCommandInput('');
    } else if (e.key === 'Escape') {
      // === ESC: Cancel current operation, clear selection, reset all tool states ===
      setCommandInput('');
      setDrawState({ step: 0, points: [], currentPos: null });
      setTransformEditState({ step: 0, points: [], currentPos: null });
      setEditToolState({ step: 0, distance: 0, sourceEntityId: null, targetEntityId: null, clickPos: null });
      setSelectedEntities(new Set());
      setCurrentSnap(null);
      if (onCancelDraw) onCancelDraw();
    } else if (e.key === 'ArrowUp') {
      // Navigate command history
      e.preventDefault();
      if (commandHistory.length > 0) {
        const lastCmd = commandHistory[commandHistory.length - 1];
        setCommandInput(lastCmd);
      }
    }
  }, [commandInput, activeDrawTool, drawState, editToolState, handleDrawingClick, handleTransformEditClick, transformEditState, onCancelDraw, onSelectTool, commandHistory, applyTransformToSelected]);

  // Handler cho Full Screen scroll
  const handleFullScreenScroll = () => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  };

  // --- Drawing Logic ---
  const generateTicks = (start: number, end: number, isVertical: boolean) => {
    const range = Math.abs(end - start);
    if (range === 0) return [];
    const containerSize = isVertical ? containerRef.current?.clientHeight || 800 : containerRef.current?.clientWidth || 1200;
    const targetTickSpacingPx = 80;
    const targetTickSpacingUnits = targetTickSpacingPx / pixelsPerUnit;
    const exponent = Math.floor(Math.log10(targetTickSpacingUnits));
    const fraction = targetTickSpacingUnits / Math.pow(10, exponent);
    let niceFraction;
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3.5) niceFraction = 2;
    else if (fraction < 7.5) niceFraction = 5;
    else niceFraction = 10;
    const step = niceFraction * Math.pow(10, exponent);
    const ticks = [];
    const firstTick = Math.ceil(Math.min(start, end) / step) * step;
    const lastTick = Math.floor(Math.max(start, end) / step) * step;
    for (let val = firstTick; val <= lastTick; val += step) {
      const cleanVal = Math.round(val * 1000) / 1000;
      ticks.push(cleanVal);
    }
    return ticks;
  };

  const width = containerRef.current?.clientWidth || 0;
  const height = containerRef.current?.clientHeight || 0;
  const viewLeft = viewOffset.x;
  const viewRight = viewOffset.x + (width / pixelsPerUnit);
  const viewTop = viewOffset.y;
  const viewBottom = viewOffset.y - (height / pixelsPerUnit);
  const xTicks = useMemo(() => generateTicks(viewLeft, viewRight, false), [viewLeft, viewRight, pixelsPerUnit, width]);
  const yTicks = useMemo(() => generateTicks(viewBottom, viewTop, true), [viewBottom, viewTop, pixelsPerUnit, height]);
  const gridSizeUnits = 1000; 
  const gridSizePx = gridSizeUnits * pixelsPerUnit;
  const gridOffsetX = -(viewOffset.x % gridSizeUnits) * pixelsPerUnit;
  const gridOffsetY = (viewOffset.y % gridSizeUnits) * pixelsPerUnit;

  // --- Render CAD Entities (Drawn Geometry) ---
  // Memoize visible entities with viewport culling for large datasets
  const visibleCadEntities = React.useMemo(() => {
    // First filter by layer visibility
    const layerVisible = cadEntities.filter(entity => {
      const layer = layers.find(l => l.id === entity.layerId);
      return !layer || layer.visible;
    });

    // Viewport culling only for large datasets (200+ entities)
    if (layerVisible.length < 200 || !containerRef.current) return layerVisible;

    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const vpLeft = viewOffset.x;
    const vpRight = viewOffset.x + (cw / pixelsPerUnit);
    const vpTop = viewOffset.y;
    const vpBottom = viewOffset.y - (ch / pixelsPerUnit);
    const margin = 50 / pixelsPerUnit; // 50px margin for partially visible entities

    return layerVisible.filter(ent => {
      // Quick bounding box check
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of ent.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      // For circles, expand bounds by radius
      if (ent.type === 'circle' && ent.properties?.radius) {
        const r = ent.properties.radius;
        minX -= r; maxX += r; minY -= r; maxY += r;
      }
      // Check intersection with viewport (with margin)
      return maxX >= (vpLeft - margin) && minX <= (vpRight + margin) &&
             maxY >= (vpBottom - margin) && minY <= (vpTop + margin);
    });
  }, [cadEntities, layers, viewOffset, pixelsPerUnit]);


   const renderCadEntities = () => {
      // console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length);
      const visibleEntities = visibleCadEntities;
      return (
         <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
             <defs>
               <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur stdDeviation="2.5" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
             </defs>
             {visibleEntities.map(ent => {
                const isSelected = selectedEntities.has(ent.id);
                
                // NEW: Highlight if part is active in Sidebar
                const activePart = parts.find(p => p.id === activePartId);
                const isPartActive = activePart?.cadEntities?.some((ce: any) => ce.id === ent.id || ce.properties?.originalId === ent.id);
                
                const strokeColor = isPartActive ? "#22d3ee" : (isSelected ? "#00ff00" : "white");
                const strokeWidth = isPartActive ? "4" : (isSelected ? "2" : "1");
                const opacity = (isPartActive || isSelected) ? "1" : "0.9";
                const filter = isPartActive ? "url(#glow)" : "none";
                const className = isPartActive ? "animate-pulse" : "";
                
                if (ent.type === 'line') {
                    const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
                    return (
                      <g key={ent.id}>
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'rect') {
                    const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p2.x - p1.x);
                    const h = Math.abs(p2.y - p1.y);
                    return (
                      <g key={ent.id}>
                        <rect x={x} y={y} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
                            <circle cx={p1.x} cy={p2.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p1.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'circle') {
                    const center = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const radius = (ent.properties?.radius || 0) * pixelsPerUnit;
                    return (
                      <g key={ent.id}>
                        <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
                            <circle cx={center.x} cy={center.y - radius} r="4" fill="#00ff00" />
                            <circle cx={center.x} cy={center.y + radius} r="4" fill="#00ff00" />
                            <circle cx={center.x - radius} cy={center.y} r="4" fill="#00ff00" />
                            <circle cx={center.x + radius} cy={center.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'polyline' || ent.type === 'spline') {
                    // Check if closed flag is true
                    const isClosed = ent.properties?.closed === true;
                    
                    // Fix: Auto-close 4-point rectangles even if marked unclosed
                    // (Common DXF import issue where rectangle has closed=false)
                    let pointsToRender = ent.points;
                    if (!isClosed && pointsToRender.length === 4) {
                      // Append first point to close the rectangle
                      pointsToRender = [...pointsToRender, pointsToRender[0]];
                    }
                    
                    const pointsStr = pointsToRender.map(p => {
                        const s = worldToScreen(p.x, p.y);
                        return `${s.x},${s.y}`;
                    }).join(' ');
                    
                    return (
                      <g key={ent.id}>
                        {isClosed
                          ? <polygon points={pointsStr} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                          : <polyline points={pointsStr} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        }
                        {isSelected && ent.points.map((pt, idx) => {
                          const s = worldToScreen(pt.x, pt.y);
                          return <circle key={idx} cx={s.x} cy={s.y} r="4" fill="#00ff00" />;
                        })}
                      </g>
                    );
                }
                if (ent.type === 'arc') {
                    // 3-point arc render using SVG arc
                    const props = ent.properties;
                    if (props && props.centerX !== undefined) {
                      const cScreen = worldToScreen(props.centerX, props.centerY);
                      const rPx = props.radius * pixelsPerUnit;
                      const sScreen = worldToScreen(ent.points[0].x, ent.points[0].y);
                      const eScreen = worldToScreen(ent.points[2].x, ent.points[2].y);
                      const mScreen = worldToScreen(ent.points[1].x, ent.points[1].y);

                      // Determine sweep direction using cross product
                      const v1x = mScreen.x - sScreen.x, v1y = mScreen.y - sScreen.y;
                      const v2x = eScreen.x - sScreen.x, v2y = eScreen.y - sScreen.y;
                      const cross = v1x * v2y - v1y * v2x;
                      const sweepFlag = cross > 0 ? 1 : 0;
                      // Check if arc is more than 180 degrees
                      const startAngle = Math.atan2(sScreen.y - cScreen.y, sScreen.x - cScreen.x);
                      const endAngle = Math.atan2(eScreen.y - cScreen.y, eScreen.x - cScreen.x);
                      let angleDiff = endAngle - startAngle;
                      if (sweepFlag === 1 && angleDiff < 0) angleDiff += 2 * Math.PI;
                      if (sweepFlag === 0 && angleDiff > 0) angleDiff -= 2 * Math.PI;
                      const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;

                      const d = `M ${sScreen.x} ${sScreen.y} A ${rPx} ${rPx} 0 ${largeArcFlag} ${sweepFlag} ${eScreen.x} ${eScreen.y}`;
                      return (
                        <g key={ent.id}>
                          <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                          {isSelected && (
                            <>
                              <circle cx={sScreen.x} cy={sScreen.y} r="4" fill="#00ff00" />
                              <circle cx={mScreen.x} cy={mScreen.y} r="4" fill="#00ff00" />
                              <circle cx={eScreen.x} cy={eScreen.y} r="4" fill="#00ff00" />
                              <circle cx={cScreen.x} cy={cScreen.y} r="3" fill="none" stroke="#00ff00" strokeWidth="1" />
                            </>
                          )}
                        </g>
                      );
                    }
                }
                if (ent.type === 'ellipse') {
                    const center = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const rx = (ent.properties?.rx || 0) * pixelsPerUnit;
                    const ry = (ent.properties?.ry || 0) * pixelsPerUnit;
                    return (
                      <g key={ent.id}>
                        <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
                            <circle cx={center.x + rx} cy={center.y} r="4" fill="#00ff00" />
                            <circle cx={center.x - rx} cy={center.y} r="4" fill="#00ff00" />
                            <circle cx={center.x} cy={center.y - ry} r="4" fill="#00ff00" />
                            <circle cx={center.x} cy={center.y + ry} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'polygon') {
                    const center = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const sides = ent.properties?.sides || 6;
                    const radius = (ent.properties?.radius || 0) * pixelsPerUnit;
                    // Calculate vertex angle offset from center to first vertex
                    const edgePt = worldToScreen(ent.points[1].x, ent.points[1].y);
                    const angleOffset = Math.atan2(edgePt.y - center.y, edgePt.x - center.x);
                    const pts: string[] = [];
                    for (let i = 0; i < sides; i++) {
                      const angle = angleOffset + (2 * Math.PI * i) / sides;
                      pts.push(`${center.x + radius * Math.cos(angle)},${center.y + radius * Math.sin(angle)}`);
                    }
                    return (
                      <g key={ent.id}>
                        <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
                            {pts.map((pt, idx) => {
                              const [px, py] = pt.split(',').map(Number);
                              return <circle key={idx} cx={px} cy={py} r="4" fill="#00ff00" />;
                            })}
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'slot') {
                    // Slot: stadium/discorectangle — two semicircles connected by lines
                    const c1 = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const c2 = worldToScreen(ent.points[1].x, ent.points[1].y);
                    const wPx = (ent.properties?.width || 0) * pixelsPerUnit;
                    const halfW = wPx / 2;
                    // Direction vector and perpendicular
                    const dx = c2.x - c1.x;
                    const dy = c2.y - c1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    if (len < 0.001) return null;
                    const nx = (-dy / len) * halfW; // perpendicular
                    const ny = (dx / len) * halfW;
                    // Build slot path: line + arc + line + arc
                    const d = `M ${c1.x + nx} ${c1.y + ny} L ${c2.x + nx} ${c2.y + ny} A ${halfW} ${halfW} 0 1 1 ${c2.x - nx} ${c2.y - ny} L ${c1.x - nx} ${c1.y - ny} A ${halfW} ${halfW} 0 1 1 ${c1.x + nx} ${c1.y + ny} Z`;
                    return (
                      <g key={ent.id}>
                        <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={c1.x} cy={c1.y} r="4" fill="#00ff00" />
                            <circle cx={c2.x} cy={c2.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'obround') {
                    // Obround: rectangle with rounded corners (cornerRadius = min(w,h)/2)
                    const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
                    const x = Math.min(p1.x, p2.x);
                    const y = Math.min(p1.y, p2.y);
                    const w = Math.abs(p2.x - p1.x);
                    const h = Math.abs(p2.y - p1.y);
                    const cornerRadius = (ent.properties?.cornerRadius || 0) * pixelsPerUnit;
                    return (
                      <g key={ent.id}>
                        <rect x={x} y={y} width={w} height={h} rx={cornerRadius} ry={cornerRadius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
                        {isSelected && (
                          <>
                            <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
                            <circle cx={p1.x} cy={p2.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p1.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'dimension') {
                    // Dimension: line between start/end + perpendicular ticks + text showing distance
                    const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
                    const textPos = ent.points.length >= 3 ? worldToScreen(ent.points[2].x, ent.points[2].y) : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 15 };
                    const value = ent.properties?.value ?? 0;
                    const unit = ent.properties?.unit || 'mm';
                    
                    // Dimension line direction
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const len = Math.sqrt(dx * dx + dy * dy);
                    const tickSize = 8;
                    const nx = len > 0 ? (-dy / len) * tickSize : 0;
                    const ny = len > 0 ? (dx / len) * tickSize : tickSize;
                    
                    const dimColor = isSelected ? "#00ff00" : "#ff6b6b";
                    
                    return (
                      <g key={ent.id}>
                        {/* Dimension line */}
                        <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={dimColor} strokeWidth={isSelected ? "2" : "1"} opacity={opacity} />
                        {/* Start tick */}
                        <line x1={p1.x - nx} y1={p1.y - ny} x2={p1.x + nx} y2={p1.y + ny} stroke={dimColor} strokeWidth={isSelected ? "2" : "1"} />
                        {/* End tick */}
                        <line x1={p2.x - nx} y1={p2.y - ny} x2={p2.x + nx} y2={p2.y + ny} stroke={dimColor} strokeWidth={isSelected ? "2" : "1"} />
                        {/* Extension line to text */}
                        <line x1={(p1.x + p2.x) / 2} y1={(p1.y + p2.y) / 2} x2={textPos.x} y2={textPos.y} stroke={dimColor} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
                        {/* Dimension text */}
                        <rect x={textPos.x - 25} y={textPos.y - 10} width={50} height={16} rx={2} fill="rgba(0,0,0,0.7)" style={{ pointerEvents: 'none' }} />
                        <text x={textPos.x} y={textPos.y + 3} fill={dimColor} fontSize="11" fontFamily="Noto Sans, sans-serif" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
                          {value} {unit}
                        </text>
                        {isSelected && (
                          <>
                            <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
                            <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
                            <circle cx={textPos.x} cy={textPos.y} r="4" fill="#00ff00" />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'text') {
                    const pos = worldToScreen(ent.points[0].x, ent.points[0].y);
                    const textStr = ent.properties?.text || '';
                    const fontSize = ent.properties?.fontSize || 14;
                    const rotation = ent.properties?.rotation || 0;
                    const textColor = isSelected ? "#00ff00" : "#fbbf24";
                    
                    return (
                      <g key={ent.id} transform={rotation ? `rotate(${-rotation}, ${pos.x}, ${pos.y})` : undefined}>
                        <text 
                          x={pos.x} 
                          y={pos.y} 
                          fill={textColor} 
                          fontSize={fontSize} 
                          fontFamily="Noto Sans, sans-serif" 
                          dominantBaseline="middle"
                          style={{ userSelect: 'none' }}
                        >
                          {textStr}
                        </text>
                        {isSelected && (
                          <>
                            <circle cx={pos.x} cy={pos.y} r="4" fill="#00ff00" />
                            <rect 
                              x={pos.x - 2} 
                              y={pos.y - fontSize * 0.6} 
                              width={textStr.length * fontSize * 0.6 + 4} 
                              height={fontSize * 1.2} 
                              fill="none" 
                              stroke="#00ff00" 
                              strokeWidth="1" 
                              strokeDasharray="3,3" 
                            />
                          </>
                        )}
                      </g>
                    );
                }
                if (ent.type === 'leader') {
                    const screenPts = ent.points.map(p => worldToScreen(p.x, p.y));
                    const leaderColor = isSelected ? "#00ff00" : "#a78bfa";
                    const textStr = ent.properties?.text || '';
                    
                    // Arrowhead at first point (the arrow tip)
                    let arrowHead = null;
                    if (screenPts.length >= 2) {
                      const tip = screenPts[0];
                      const next = screenPts[1];
                      const adx = next.x - tip.x;
                      const ady = next.y - tip.y;
                      const alen = Math.sqrt(adx * adx + ady * ady);
                      if (alen > 0) {
                        const arrowLen = 12;
                        const arrowW = 5;
                        const ux = adx / alen, uy = ady / alen;
                        const px = -uy, py = ux;
                        arrowHead = (
                          <polygon 
                            points={`${tip.x},${tip.y} ${tip.x + ux * arrowLen + px * arrowW},${tip.y + uy * arrowLen + py * arrowW} ${tip.x + ux * arrowLen - px * arrowW},${tip.y + uy * arrowLen - py * arrowW}`}
                            fill={leaderColor}
                          />
                        );
                      }
                    }
                    
                    const pathD = screenPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                    const lastPt = screenPts[screenPts.length - 1];
                    
                    return (
                      <g key={ent.id}>
                        <path d={pathD} fill="none" stroke={leaderColor} strokeWidth={isSelected ? "2" : "1.5"} opacity={opacity} />
                        {arrowHead}
                        {textStr && (
                          <>
                            <line x1={lastPt.x} y1={lastPt.y} x2={lastPt.x + 30} y2={lastPt.y} stroke={leaderColor} strokeWidth="1" />
                            <text x={lastPt.x + 33} y={lastPt.y + 4} fill={leaderColor} fontSize="12" fontFamily="Noto Sans, sans-serif">
                              {textStr}
                            </text>
                          </>
                        )}
                        {isSelected && screenPts.map((pt, idx) => (
                          <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#00ff00" />
                        ))}
                      </g>
                    );
                }
                if (ent.type === 'hatch') {
                    const targetId = ent.properties?.targetEntityId;
                    const pattern = ent.properties?.pattern || 'lines';
                    const angle = ent.properties?.angle || 45;
                    const spacing2 = (ent.properties?.spacing || 5) * pixelsPerUnit;
                    const hatchColor = isSelected ? "#00ff00" : "rgba(255,255,255,0.3)";
                    
                    const targetEntity = cadEntities.find(e => e.id === targetId);
                    if (!targetEntity) return null;
                    
                    let clipPath = '';
                    let bMinX = 0, bMinY = 0, bMaxX = 0, bMaxY = 0;
                    
                    if (targetEntity.type === 'rect' || targetEntity.type === 'obround') {
                      const tp1 = worldToScreen(targetEntity.points[0].x, targetEntity.points[0].y);
                      const tp2 = worldToScreen(targetEntity.points[1].x, targetEntity.points[1].y);
                      bMinX = Math.min(tp1.x, tp2.x);
                      bMinY = Math.min(tp1.y, tp2.y);
                      bMaxX = Math.max(tp1.x, tp2.x);
                      bMaxY = Math.max(tp1.y, tp2.y);
                      clipPath = `M ${bMinX} ${bMinY} L ${bMaxX} ${bMinY} L ${bMaxX} ${bMaxY} L ${bMinX} ${bMaxY} Z`;
                    } else if (targetEntity.type === 'circle') {
                      const center = worldToScreen(targetEntity.points[0].x, targetEntity.points[0].y);
                      const r = (targetEntity.properties?.radius || 0) * pixelsPerUnit;
                      bMinX = center.x - r; bMinY = center.y - r;
                      bMaxX = center.x + r; bMaxY = center.y + r;
                      clipPath = `M ${center.x - r} ${center.y} A ${r} ${r} 0 1 0 ${center.x + r} ${center.y} A ${r} ${r} 0 1 0 ${center.x - r} ${center.y} Z`;
                    } else if (targetEntity.type === 'ellipse') {
                      const center = worldToScreen(targetEntity.points[0].x, targetEntity.points[0].y);
                      const rx = (targetEntity.properties?.rx || 0) * pixelsPerUnit;
                      const ry = (targetEntity.properties?.ry || 0) * pixelsPerUnit;
                      bMinX = center.x - rx; bMinY = center.y - ry;
                      bMaxX = center.x + rx; bMaxY = center.y + ry;
                      clipPath = `M ${center.x - rx} ${center.y} A ${rx} ${ry} 0 1 0 ${center.x + rx} ${center.y} A ${rx} ${ry} 0 1 0 ${center.x - rx} ${center.y} Z`;
                    } else if (targetEntity.type === 'polygon') {
                      const center = worldToScreen(targetEntity.points[0].x, targetEntity.points[0].y);
                      const sides = targetEntity.properties?.sides || 6;
                      const radius = (targetEntity.properties?.radius || 0) * pixelsPerUnit;
                      const edgePt = worldToScreen(targetEntity.points[1].x, targetEntity.points[1].y);
                      const angleOff = Math.atan2(edgePt.y - center.y, edgePt.x - center.x);
                      const verts: string[] = [];
                      for (let i = 0; i < sides; i++) {
                        const a = angleOff + (2 * Math.PI * i) / sides;
                        const vx = center.x + radius * Math.cos(a);
                        const vy = center.y + radius * Math.sin(a);
                        verts.push(`${i === 0 ? 'M' : 'L'} ${vx} ${vy}`);
                        if (i === 0) { bMinX = vx; bMinY = vy; bMaxX = vx; bMaxY = vy; }
                        else { bMinX = Math.min(bMinX, vx); bMinY = Math.min(bMinY, vy); bMaxX = Math.max(bMaxX, vx); bMaxY = Math.max(bMaxY, vy); }
                      }
                      clipPath = verts.join(' ') + ' Z';
                    }
                    
                    if (!clipPath) return null;
                    
                    const hatchLines: React.ReactNode[] = [];
                    const clipId = `hatch-clip-${ent.id}`;
                    const bW = bMaxX - bMinX;
                    const bH = bMaxY - bMinY;
                    const diagonal = Math.sqrt(bW * bW + bH * bH);
                    const cx = (bMinX + bMaxX) / 2;
                    const cy = (bMinY + bMaxY) / 2;
                    const angleRad = (angle * Math.PI) / 180;
                    const cosA = Math.cos(angleRad);
                    const sinA = Math.sin(angleRad);
                    const actualSpacing = Math.max(spacing2, 3);
                    
                    const numLines = Math.ceil(diagonal / actualSpacing) + 2;
                    for (let i = -numLines; i <= numLines; i++) {
                      const offset = i * actualSpacing;
                      const x1 = cx + offset * cosA - diagonal * sinA;
                      const y1 = cy + offset * sinA + diagonal * cosA;
                      const x2 = cx + offset * cosA + diagonal * sinA;
                      const y2 = cy + offset * sinA - diagonal * cosA;
                      hatchLines.push(
                        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hatchColor} strokeWidth="0.8" />
                      );
                    }
                    
                    if (pattern === 'crosshatch') {
                      const angleRad2 = angleRad + Math.PI / 2;
                      const cosA2 = Math.cos(angleRad2);
                      const sinA2 = Math.sin(angleRad2);
                      for (let i = -numLines; i <= numLines; i++) {
                        const offset = i * actualSpacing;
                        const x1 = cx + offset * cosA2 - diagonal * sinA2;
                        const y1 = cy + offset * sinA2 + diagonal * cosA2;
                        const x2 = cx + offset * cosA2 + diagonal * sinA2;
                        const y2 = cy + offset * sinA2 - diagonal * cosA2;
                        hatchLines.push(
                          <line key={`c${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hatchColor} strokeWidth="0.8" />
                        );
                      }
                    }
                    
                    if (pattern === 'dots') {
                      hatchLines.length = 0;
                      const dotSpacing = Math.max(actualSpacing, 6);
                      for (let ix = bMinX; ix <= bMaxX; ix += dotSpacing) {
                        for (let iy = bMinY; iy <= bMaxY; iy += dotSpacing) {
                          hatchLines.push(
                            <circle key={`d${ix}_${iy}`} cx={ix} cy={iy} r="1.5" fill={hatchColor} />
                          );
                        }
                      }
                    }
                    
                    return (
                      <g key={ent.id}>
                        <defs>
                          <clipPath id={clipId}>
                            <path d={clipPath} />
                          </clipPath>
                        </defs>
                        <g clipPath={`url(#${clipId})`}>
                          {hatchLines}
                        </g>
                        {isSelected && (
                          <path d={clipPath} fill="none" stroke="#00ff00" strokeWidth="2" strokeDasharray="4,4" />
                        )}
                      </g>
                    );
                }
                return null;
            })}
        </svg>
     );
  };

  // --- Render Nested Items ---
  const renderSheetsAndParts = () => {
     // Sheets use persisted x/y positions (no auto-layout yCursor)
     return sheets.map((sheet, index) => {
        const [sw, sh] = sheet.dimensions.split('x').map(Number);
        const sheetWorldX = sheet.x ?? 0;
        const sheetWorldY = sheet.y ?? 0;
        
        const pos = worldToScreen(sheetWorldX, sheetWorldY + sh); 
        const wPx = sw * pixelsPerUnit;
        const hPx = sh * pixelsPerUnit;

        const partsOnSheet = parts.filter(p => p.isNested && (p.sheetId === sheet.id || (!p.sheetId && index === 0)));
        
        const sheetNode = (
           <div key={sheet.id} className={`absolute border-2 ${selectedSheets.has(sheet.id) ? 'border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]' : 'border-white/50'} bg-[#2d3748] shadow-lg`} style={{
                left: pos.x,
                top: pos.y,
                width: wPx,
                height: hPx,
                cursor: !activeDrawTool ? 'move' : undefined,
              }}
              onMouseDown={(e) => {
                // Only start sheet drag on left-click with no active tool
                if (e.button !== 0 || activeDrawTool) return;
                e.stopPropagation();
                // Select this sheet
                setSelectedSheets(new Set([sheet.id]));
                // Clear entity selection when selecting a sheet
                setSelectedEntities(new Set());
                if (!containerRef.current) return;
                const rect = containerRef.current.getBoundingClientRect();
                const sx = e.clientX - rect.left;
                const sy = e.clientY - rect.top;
                const mouseWorld = screenToWorld(sx, sy);
                setDraggingSheet({
                  id: sheet.id,
                  startMouseWorld: mouseWorld,
                  origSheetX: sheetWorldX,
                  origSheetY: sheetWorldY,
                });
              }}
           >
             <div className="absolute -top-5 left-0 text-xs font-mono text-yellow-500 bg-black/50 px-1">
                {sheet.material} - Sheet #{index + 1} ({sw}x{sh})
             </div>
             {partsOnSheet.map((p, i) => {
               if (p.x === undefined || p.y === undefined) return null;
               
               const [pw, ph] = p.dimensions.split('x').map(Number);
               const isRotated = p.rotationAngle === 90;
               const finalW = isRotated ? ph : pw;
               const finalH = isRotated ? pw : ph;
               
               const partLeft = p.x * pixelsPerUnit;
               const partTop = hPx - ((p.y + finalH) * pixelsPerUnit);
               
               return (
                 <div 
                    key={`${p.id}-${i}`} 
                    className={`absolute border border-black ${draggingPart?.id === p.id ? 'bg-blue-400 ring-2 ring-yellow-400' : 'bg-blue-600 hover:bg-blue-9000'} cursor-move flex items-center justify-center group`}
                    style={{
                        left: partLeft,
                        top: partTop,
                        width: finalW * pixelsPerUnit,
                        height: finalH * pixelsPerUnit,
                        transition: draggingPart?.id === p.id ? 'none' : 'background-color 0.1s',
                        zIndex: draggingPart?.id === p.id ? 10 : 1,
                    }}
                    title={p.name}
                    onMouseDown={(ev) => {
                      if (ev.button !== 0 || activeDrawTool) return;
                      ev.stopPropagation();
                      if (!containerRef.current) return;
                      const rect2 = containerRef.current.getBoundingClientRect();
                      const sx2 = ev.clientX - rect2.left;
                      const sy2 = ev.clientY - rect2.top;
                      const mouseW = screenToWorld(sx2, sy2);
                      setDraggingPart({
                        id: p.id,
                        sheetId: sheet.id,
                        startMouseWorld: mouseW,
                        origPartX: p.x ?? 0,
                        origPartY: p.y ?? 0,
                      });
                    }}
                 >
                    {isRotated && <div className="absolute w-1 h-1 bg-yellow-400 rounded-full top-0.5 right-0.5"></div>}
                    <span className="text-[8px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap overflow-hidden px-0.5">{p.name}</span>
                 </div>
               );
             })}
           </div>
        );
        return sheetNode;
     });
  };

  // --- Render Drawing Preview ---
  const renderDrawingPreview = () => {
     // === EDIT TOOL PREVIEW: Highlight selected entity ===
     if (activeDrawTool && EDIT_TOOLS.includes(activeDrawTool) && editToolState.sourceEntityId) {
       const entity = cadEntities.find(e => e.id === editToolState.sourceEntityId);
       if (entity) {
         if (entity.type === 'line' && entity.points.length >= 2) {
           const s = worldToScreen(entity.points[0].x, entity.points[0].y);
           const e2 = worldToScreen(entity.points[1].x, entity.points[1].y);
           return (
             <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <line x1={s.x} y1={s.y} x2={e2.x} y2={e2.y} stroke="#ff6600" strokeWidth="3" strokeDasharray="6 3" />
               <circle cx={s.x} cy={s.y} r="4" fill="#ff6600" />
               <circle cx={e2.x} cy={e2.y} r="4" fill="#ff6600" />
             </svg>
           );
         } else if (entity.type === 'circle' && entity.points.length >= 1) {
           const c = worldToScreen(entity.points[0].x, entity.points[0].y);
           const r = (entity.properties?.radius || 50) * pixelsPerUnit;
           return (
             <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <circle cx={c.x} cy={c.y} r={r} fill="none" stroke="#ff6600" strokeWidth="3" strokeDasharray="6 3" />
             </svg>
           );
         } else if (entity.type === 'rect' && entity.points.length >= 2) {
           const s = worldToScreen(entity.points[0].x, entity.points[0].y);
           const e2 = worldToScreen(entity.points[1].x, entity.points[1].y);
           const x = Math.min(s.x, e2.x), y = Math.min(s.y, e2.y);
           const w = Math.abs(e2.x - s.x), h = Math.abs(e2.y - s.y);
           return (
             <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <rect x={x} y={y} width={w} height={h} fill="none" stroke="#ff6600" strokeWidth="3" strokeDasharray="6 3" />
             </svg>
           );
         }
       }
     }

     if (!activeDrawTool || !drawState.currentPos) return null;
     
      // Current mouse pos in screen coords for line end
      const screenCurrent = worldToScreen(drawState.currentPos.x, drawState.currentPos.y);

      // ── Measure tool (independent of drawState.points) ──
      if (activeDrawTool === 'measure') {
            if (measurePoints.length === 1) {
              // First point placed — show rubber-band line to cursor
              const p1 = measurePoints[0];
              const sp1 = worldToScreen(p1.x, p1.y);
              const dx = screenCurrent.x - sp1.x;
              const dy = screenCurrent.y - sp1.y;
              const distance = Math.sqrt(dx * dx + dy * dy) / pixelsPerUnit;
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <line x1={sp1.x} y1={sp1.y} x2={screenCurrent.x} y2={screenCurrent.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                  <circle cx={sp1.x} cy={sp1.y} r="4" fill="cyan" opacity="0.6" />
                  <circle cx={screenCurrent.x} cy={screenCurrent.y} r="4" fill="cyan" opacity="0.4" />
                  <rect x={screenCurrent.x - 40} y={screenCurrent.y - 22} width="80" height="18" rx="3" fill="rgba(0,0,0,0.7)" />
                  <text x={screenCurrent.x} y={screenCurrent.y - 10} textAnchor="middle" fill="cyan" fontSize="11">{distance.toFixed(2)}</text>
                </svg>
              );
            } else {
              // No points placed yet — show cursor hint
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <circle cx={screenCurrent.x} cy={screenCurrent.y} r="5" fill="none" stroke="cyan" strokeWidth="1" opacity="0.6" />
                  <text x={screenCurrent.x + 12} y={screenCurrent.y - 6} fill="cyan" fontSize="10" opacity="0.5">Click first point</text>
                </svg>
              );
            }
      }

      // ── Quick Measure tool (independent of drawState.points) ──
      if (activeDrawTool === 'measure_quick') {
            const worldCurrent = drawState.currentPos;
            if (worldCurrent) {
              const threshold = 10 / pixelsPerUnit;
              let hitEnt: CadEntity | null = null;
              for (const ent of cadEntities) {
                if (isPointNearEntity(worldCurrent, ent, threshold)) {
                  hitEnt = ent;
                  break;
                }
              }
              if (hitEnt) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                hitEnt.points?.forEach((p: { x: number; y: number }) => {
                  if (isFinite(p.x) && isFinite(p.y)) {
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                  }
                });
                if (hitEnt.type === 'circle' || hitEnt.type === 'arc') {
                  const cx = hitEnt.properties?.centerX ?? hitEnt.points?.[0]?.x ?? 0;
                  const cy = hitEnt.properties?.centerY ?? hitEnt.points?.[0]?.y ?? 0;
                  const r = hitEnt.properties?.radius ?? 0;
                  if (isFinite(cx) && isFinite(cy) && r > 0) {
                    minX = Math.min(minX, cx - r); maxX = Math.max(maxX, cx + r);
                    minY = Math.min(minY, cy - r); maxY = Math.max(maxY, cy + r);
                  }
                }
                if (hitEnt.type === 'ellipse') {
                  const cx = hitEnt.points?.[0]?.x ?? 0;
                  const cy = hitEnt.points?.[0]?.y ?? 0;
                  const rx = hitEnt.properties?.rx ?? 0;
                  const ry = hitEnt.properties?.ry ?? 0;
                  minX = Math.min(minX, cx - rx); maxX = Math.max(maxX, cx + rx);
                  minY = Math.min(minY, cy - ry); maxY = Math.max(maxY, cy + ry);
                }
                if (isFinite(minX) && isFinite(maxX)) {
                  const tlScreen = worldToScreen(minX, maxY);
                  const brScreen = worldToScreen(maxX, minY);
                  const bx = tlScreen.x;
                  const by = tlScreen.y;
                  const bw = brScreen.x - tlScreen.x;
                  const bh = brScreen.y - tlScreen.y;
                  const wVal = Math.abs(maxX - minX);
                  const hVal = Math.abs(maxY - minY);
                  const labelX = bx + bw / 2;
                  const labelY = by - 8;
                  return (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                      <rect x={bx} y={by} width={bw} height={bh} fill="rgba(0,230,118,0.06)" stroke="#00E676" strokeWidth="2" strokeDasharray="8 4" rx="2" />
                      {/* Width dimension line (top) */}
                      <line x1={bx} y1={by - 3} x2={bx + bw} y2={by - 3} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      <line x1={bx} y1={by - 6} x2={bx} y2={by} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      <line x1={bx + bw} y1={by - 6} x2={bx + bw} y2={by} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      {/* Height dimension line (right) */}
                      <line x1={bx + bw + 3} y1={by} x2={bx + bw + 3} y2={by + bh} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      <line x1={bx + bw} y1={by} x2={bx + bw + 6} y2={by} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      <line x1={bx + bw} y1={by + bh} x2={bx + bw + 6} y2={by + bh} stroke="#00E676" strokeWidth="1" opacity="0.6" />
                      {/* Size label */}
                      <rect x={labelX - 55} y={labelY - 14} width="110" height="18" rx="3" fill="rgba(0,0,0,0.8)" stroke="#00E676" strokeWidth="1" />
                      <text x={labelX} y={labelY - 2} textAnchor="middle" fill="#00E676" fontSize="11" fontFamily="monospace" fontWeight="bold">
                        {wVal.toFixed(1)} × {hVal.toFixed(1)} mm
                      </text>
                      {/* Height label on right side */}
                      <rect x={bx + bw + 8} y={by + bh / 2 - 9} width="50" height="16" rx="2" fill="rgba(0,0,0,0.7)" />
                      <text x={bx + bw + 33} y={by + bh / 2 + 3} textAnchor="middle" fill="#00E676" fontSize="9" fontFamily="monospace">
                        H:{hVal.toFixed(1)}
                      </text>
                    </svg>
                  );
                }
              }
              // No entity under cursor — show hint
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <circle cx={screenCurrent.x} cy={screenCurrent.y} r="6" fill="none" stroke="#00E676" strokeWidth="1.5" opacity="0.5" strokeDasharray="3 3" />
                  <text x={screenCurrent.x + 14} y={screenCurrent.y - 6} fill="#00E676" fontSize="10" opacity="0.5">Click đối tượng để đo nhanh</text>
                </svg>
              );
            }
      }

      // If we have a start point
      if (drawState.points.length > 0) {
        const startWorld = drawState.points[0];
        const screenStart = worldToScreen(startWorld.x, startWorld.y);

        if (activeDrawTool === 'line' || activeDrawTool === 'polyline' || activeDrawTool === 'spline') {
            // Draw path from start to current
            return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    {activeDrawTool === 'polyline' && drawState.points.map((pt, i) => {
                        if (i === 0) return null;
                        const prev = worldToScreen(drawState.points[i-1].x, drawState.points[i-1].y);
                        const curr = worldToScreen(pt.x, pt.y);
                        return <line key={i} x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y} stroke="cyan" strokeWidth="2" />;
                    })}
                    <line 
                        x1={activeDrawTool === 'polyline' ? worldToScreen(drawState.points[drawState.points.length-1].x, drawState.points[drawState.points.length-1].y).x : screenStart.x} 
                        y1={activeDrawTool === 'polyline' ? worldToScreen(drawState.points[drawState.points.length-1].x, drawState.points[drawState.points.length-1].y).y : screenStart.y} 
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
                ></div>
            );
        } else if (activeDrawTool === 'circle') {
             const dx = drawState.currentPos.x - startWorld.x;
             const dy = drawState.currentPos.y - startWorld.y;
             const radiusWorld = Math.sqrt(dx*dx + dy*dy);
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
                 ></div>
             );
        } else if (activeDrawTool === 'arc') {
             // Arc preview: step 1 = line from start to current, step 2 = arc path
             if (drawState.step === 1) {
               // Line from start to mouse (choosing through-point)
               return (
                 <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                   <line x1={screenStart.x} y1={screenStart.y} x2={screenCurrent.x} y2={screenCurrent.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                   <circle cx={screenStart.x} cy={screenStart.y} r="4" fill="cyan" opacity="0.6" />
                 </svg>
               );
             } else if (drawState.step === 2 && drawState.points.length >= 2) {
               // Preview arc from start through second point to current mouse
               const s = screenStart;
               const m = worldToScreen(drawState.points[1].x, drawState.points[1].y);
               const e = screenCurrent;
               // Compute center from 3 points for preview
               const ax = drawState.points[0].x, ay = drawState.points[0].y;
               const bx = drawState.points[1].x, by = drawState.points[1].y;
               const cx2 = drawState.currentPos.x, cy2 = drawState.currentPos.y;
               const D = 2 * (ax * (by - cy2) + bx * (cy2 - ay) + cx2 * (ay - by));
               if (Math.abs(D) > 1e-10) {
                 const ux = ((ax*ax+ay*ay)*(by-cy2)+(bx*bx+by*by)*(cy2-ay)+(cx2*cx2+cy2*cy2)*(ay-by))/D;
                 const uy = ((ax*ax+ay*ay)*(cx2-bx)+(bx*bx+by*by)*(ax-cx2)+(cx2*cx2+cy2*cy2)*(bx-ax))/D;
                 const rPx = Math.sqrt((ax-ux)*(ax-ux)+(ay-uy)*(ay-uy)) * pixelsPerUnit;
                 const cScreen = worldToScreen(ux, uy);
                 const v1x = m.x - s.x, v1y = m.y - s.y;
                 const v2x = e.x - s.x, v2y = e.y - s.y;
                 const cross = v1x * v2y - v1y * v2x;
                 const sweepFlag = cross > 0 ? 1 : 0;
                 const startAngle = Math.atan2(s.y - cScreen.y, s.x - cScreen.x);
                 const endAngle = Math.atan2(e.y - cScreen.y, e.x - cScreen.x);
                 let angleDiff = endAngle - startAngle;
                 if (sweepFlag === 1 && angleDiff < 0) angleDiff += 2 * Math.PI;
                 if (sweepFlag === 0 && angleDiff > 0) angleDiff -= 2 * Math.PI;
                 const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
                 const d = `M ${s.x} ${s.y} A ${rPx} ${rPx} 0 ${largeArcFlag} ${sweepFlag} ${e.x} ${e.y}`;
                 return (
                   <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                     <path d={d} fill="none" stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                     <circle cx={s.x} cy={s.y} r="4" fill="cyan" opacity="0.6" />
                     <circle cx={m.x} cy={m.y} r="4" fill="cyan" opacity="0.6" />
                   </svg>
                 );
               }
               // Fallback: just show lines
               return (
                 <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                   <line x1={s.x} y1={s.y} x2={m.x} y2={m.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                   <line x1={m.x} y1={m.y} x2={e.x} y2={e.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                 </svg>
               );
             }
        } else if (activeDrawTool === 'ellipse') {
             const rx = Math.abs(drawState.currentPos.x - startWorld.x) * pixelsPerUnit;
             const ry = Math.abs(drawState.currentPos.y - startWorld.y) * pixelsPerUnit;
             return (
               <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                 <ellipse cx={screenStart.x} cy={screenStart.y} rx={rx} ry={ry} fill="none" stroke="cyan" strokeWidth="2" strokeDasharray="4" />
               </svg>
             );
        } else if (activeDrawTool === 'polygon') {
             const dx = drawState.currentPos.x - startWorld.x;
             const dy = drawState.currentPos.y - startWorld.y;
             const radiusPx = Math.sqrt(dx*dx + dy*dy) * pixelsPerUnit;
             const sides = 6;
             const angleOffset = Math.atan2(screenCurrent.y - screenStart.y, screenCurrent.x - screenStart.x);
             const pts: string[] = [];
             for (let i = 0; i < sides; i++) {
               const angle = angleOffset + (2 * Math.PI * i) / sides;
               pts.push(`${screenStart.x + radiusPx * Math.cos(angle)},${screenStart.y + radiusPx * Math.sin(angle)}`);
             }
             return (
               <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                 <polygon points={pts.join(' ')} fill="none" stroke="cyan" strokeWidth="2" strokeDasharray="4" />
               </svg>
             );
        } else if (activeDrawTool === 'slot') {
             const c1 = screenStart;
             const c2 = screenCurrent;
             const dist = Math.sqrt(Math.pow(drawState.currentPos.x - startWorld.x, 2) + Math.pow(drawState.currentPos.y - startWorld.y, 2));
             const wPx = dist * 0.3 * pixelsPerUnit;
             const halfW = wPx / 2;
             const sdx = c2.x - c1.x;
             const sdy = c2.y - c1.y;
             const slen = Math.sqrt(sdx*sdx + sdy*sdy);
             if (slen > 0.001) {
               const nx = (-sdy / slen) * halfW;
               const ny = (sdx / slen) * halfW;
               const d = `M ${c1.x+nx} ${c1.y+ny} L ${c2.x+nx} ${c2.y+ny} A ${halfW} ${halfW} 0 1 1 ${c2.x-nx} ${c2.y-ny} L ${c1.x-nx} ${c1.y-ny} A ${halfW} ${halfW} 0 1 1 ${c1.x+nx} ${c1.y+ny} Z`;
               return (
                 <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                   <path d={d} fill="none" stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                 </svg>
               );
             }
        } else if (activeDrawTool === 'obround') {
             const w = Math.abs(screenCurrent.x - screenStart.x);
             const h = Math.abs(screenCurrent.y - screenStart.y);
             const left = Math.min(screenCurrent.x, screenStart.x);
             const top = Math.min(screenCurrent.y, screenStart.y);
             const wWorld = Math.abs(drawState.currentPos.x - startWorld.x);
             const hWorld = Math.abs(drawState.currentPos.y - startWorld.y);
             const crPx = Math.min(wWorld, hWorld) / 2 * pixelsPerUnit;
             return (
               <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                 <rect x={left} y={top} width={w} height={h} rx={crPx} ry={crPx} fill="none" stroke="cyan" strokeWidth="2" strokeDasharray="4" />
               </svg>
             );
        } else if (activeDrawTool === 'dimension') {
              // Dimension preview
              if (drawState.step === 1) {
                const dx = drawState.currentPos.x - startWorld.x;
                const dy = drawState.currentPos.y - startWorld.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const midX = (screenStart.x + screenCurrent.x) / 2;
                const midY = (screenStart.y + screenCurrent.y) / 2;
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <line x1={screenStart.x} y1={screenStart.y} x2={screenCurrent.x} y2={screenCurrent.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                    <circle cx={screenStart.x} cy={screenStart.y} r="4" fill="cyan" opacity="0.6" />
                    <circle cx={screenCurrent.x} cy={screenCurrent.y} r="4" fill="cyan" opacity="0.4" />
                    <rect x={midX - 30} y={midY - 22} width="60" height="18" rx="3" fill="rgba(0,0,0,0.7)" />
                    <text x={midX} y={midY - 10} textAnchor="middle" fill="cyan" fontSize="11">{dist.toFixed(2)}</text>
                  </svg>
                );
              } else if (drawState.step === 2 && drawState.points.length >= 2) {
                const p1 = drawState.points[0];
                const p2 = drawState.points[1];
                const sp1 = worldToScreen(p1.x, p1.y);
                const sp2 = worldToScreen(p2.x, p2.y);
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const midX = (sp1.x + sp2.x) / 2;
                const midY = (sp1.y + sp2.y) / 2;
                const offX = screenCurrent.x - midX;
                const offY = screenCurrent.y - midY;
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <line x1={sp1.x} y1={sp1.y} x2={sp2.x} y2={sp2.y} stroke="cyan" strokeWidth="1.5" />
                    <line x1={sp1.x} y1={sp1.y} x2={sp1.x + offX * 0.1} y2={sp1.y + offY * 0.1} stroke="cyan" strokeWidth="1" strokeDasharray="3" />
                    <line x1={sp2.x} y1={sp2.y} x2={sp2.x + offX * 0.1} y2={sp2.y + offY * 0.1} stroke="cyan" strokeWidth="1" strokeDasharray="3" />
                    <line x1={sp1.x + offX * 0.08} y1={sp1.y + offY * 0.08} x2={sp2.x + offX * 0.08} y2={sp2.y + offY * 0.08} stroke="cyan" strokeWidth="1.5" strokeDasharray="4" />
                    <rect x={screenCurrent.x - 30} y={screenCurrent.y - 22} width="60" height="18" rx="3" fill="rgba(0,0,0,0.7)" />
                    <text x={screenCurrent.x} y={screenCurrent.y - 10} textAnchor="middle" fill="cyan" fontSize="11">{dist.toFixed(2)}</text>
                    <circle cx={sp1.x} cy={sp1.y} r="4" fill="cyan" opacity="0.6" />
                    <circle cx={sp2.x} cy={sp2.y} r="4" fill="cyan" opacity="0.6" />
                  </svg>
                );
               }
          } else if (activeDrawTool === 'text') {
              if (drawState.step === 0) {
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <rect x={screenCurrent.x - 2} y={screenCurrent.y - 16} width="4" height="18" fill="cyan" opacity="0.7">
                      <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1s" repeatCount="indefinite" />
                    </rect>
                    <text x={screenCurrent.x + 8} y={screenCurrent.y} fill="cyan" fontSize="11" opacity="0.6">Click to place text</text>
                  </svg>
                );
              } else if (drawState.step === 1) {
                const sp = worldToScreen(drawState.points[0].x, drawState.points[0].y);
                return (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                    <rect x={sp.x - 2} y={sp.y - 16} width="4" height="18" fill="cyan" opacity="0.8">
                      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.8s" repeatCount="indefinite" />
                    </rect>
                    <text x={sp.x + 8} y={sp.y} fill="cyan" fontSize="11" opacity="0.5">Type text in command input...</text>
                    <circle cx={sp.x} cy={sp.y} r="4" fill="cyan" opacity="0.6" />
                  </svg>
                );
              }
         } else if (activeDrawTool === 'leader') {
              const screenPoints = drawState.points.map(p => worldToScreen(p.x, p.y));
              const lastPt = screenPoints[screenPoints.length - 1];
              const segments = [];
              for (let i = 0; i < screenPoints.length; i++) {
                segments.push(screenPoints[i].x + ',' + screenPoints[i].y);
              }
              const arrowPts = [];
              if (screenPoints.length >= 1) {
                const tipX = screenPoints[0].x;
                const tipY = screenPoints[0].y;
                const nextPt = screenPoints.length >= 2 ? screenPoints[1] : screenCurrent;
                const adx = nextPt.x - tipX;
                const ady = nextPt.y - tipY;
                const alen = Math.sqrt(adx * adx + ady * ady);
                if (alen > 0.001) {
                  const ux = adx / alen, uy = ady / alen;
                  const arrowLen = 12, arrowW = 5;
                  arrowPts.push(tipX + ',' + tipY);
                  arrowPts.push((tipX + ux * arrowLen + uy * arrowW) + ',' + (tipY + uy * arrowLen - ux * arrowW));
                  arrowPts.push((tipX + ux * arrowLen - uy * arrowW) + ',' + (tipY + uy * arrowLen + ux * arrowW));
                }
              }
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  {screenPoints.length >= 2 && <polyline points={segments.join(' ')} fill="none" stroke="cyan" strokeWidth="2" />}
                  <line x1={lastPt.x} y1={lastPt.y} x2={screenCurrent.x} y2={screenCurrent.y} stroke="cyan" strokeWidth="2" strokeDasharray="4" />
                  {arrowPts.length === 3 && <polygon points={arrowPts.join(' ')} fill="cyan" opacity="0.7" />}
                  {screenPoints.map((sp, i) => <circle key={i} cx={sp.x} cy={sp.y} r="3" fill="cyan" opacity="0.5" />)}
                  <text x={screenCurrent.x + 12} y={screenCurrent.y - 6} fill="cyan" fontSize="10" opacity="0.5">
                    {screenPoints.length < 2 ? 'Click points, right-click to finish' : 'Right-click to finish'}
                  </text>
                </svg>
              );
         } else if (activeDrawTool === 'hatch') {
              const cx = screenCurrent.x;
              const cy = screenCurrent.y;
              return (
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
                  <rect x={cx - 10} y={cy - 10} width="20" height="20" fill="none" stroke="cyan" strokeWidth="1" strokeDasharray="2" opacity="0.5" />
                  <line x1={cx - 8} y1={cy - 4} x2={cx - 2} y2={cy - 10} stroke="cyan" strokeWidth="0.8" opacity="0.6" />
                  <line x1={cx - 4} y1={cy + 2} x2={cx + 4} y2={cy - 8} stroke="cyan" strokeWidth="0.8" opacity="0.6" />
                  <line x1={cx} y1={cy + 8} x2={cx + 8} y2={cy - 4} stroke="cyan" strokeWidth="0.8" opacity="0.6" />
                  <text x={cx + 14} y={cy + 4} fill="cyan" fontSize="10" opacity="0.5">Click inside a closed entity</text>
                </svg>
              );
         }
      }

     
     // Cursor follower for start point
     return (
         <div 
            className="absolute w-4 h-4 border border-cyan-400 rounded-full pointer-events-none -ml-2 -mt-2 bg-cyan-400/20"
            style={{ left: screenCurrent.x, top: screenCurrent.y }}
         ></div>
     );
  };

  // ============ TRANSFORM EDIT PREVIEW (Ghost entities for Move, Copy, Mirror, Rotate, Scale) ============
  const renderTransformEditPreview = () => {
    if (!activeDrawTool || !TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) return null;
    if (selectedEntities.size === 0 || transformEditState.step === 0 || !transformEditState.currentPos) return null;

    const selEnts = cadEntities.filter(e => selectedEntities.has(e.id));
    const cPos = transformEditState.currentPos;
    const tPts = transformEditState.points;

    // Build transform function
    let tFn: ((ent: CadEntity) => CadEntity) | null = null;
    if ((activeDrawTool === 'move' || activeDrawTool === 'copy') && tPts.length >= 1) {
      const tdx = cPos.x - tPts[0].x, tdy = cPos.y - tPts[0].y;
      tFn = (ent) => translateEntity(ent, tdx, tdy);
    } else if (activeDrawTool === 'mirror' && tPts.length >= 1) {
      tFn = (ent) => mirrorEntity(ent, tPts[0], cPos);
    } else if (activeDrawTool === 'rotate' && transformEditState.step === 2 && tPts.length >= 2) {
      const ctr = tPts[0];
      const rA = Math.atan2(tPts[1].y - ctr.y, tPts[1].x - ctr.x);
      const tA = Math.atan2(cPos.y - ctr.y, cPos.x - ctr.x);
      const aD = (tA - rA) * 180 / Math.PI;
      tFn = (ent) => rotateEntity(ent, ctr, aD);
    } else if (activeDrawTool === 'scale' && transformEditState.step === 2 && tPts.length >= 2) {
      const ctr = tPts[0];
      const rd = Math.sqrt(Math.pow(tPts[1].x - ctr.x, 2) + Math.pow(tPts[1].y - ctr.y, 2));
      const td = Math.sqrt(Math.pow(cPos.x - ctr.x, 2) + Math.pow(cPos.y - ctr.y, 2));
      const sf = rd > 1e-6 ? td / rd : 1;
      tFn = (ent) => scaleEntity(ent, ctr, sf);
    }

    const ghostSvg = (ent: CadEntity, i: number, sc: string) => {
      const w2s = (gx: number, gy: number) => worldToScreen(gx, gy);
      if (ent.type === 'line' && ent.points.length >= 2) {
        const a = w2s(ent.points[0].x, ent.points[0].y), b = w2s(ent.points[1].x, ent.points[1].y);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'rect' && ent.points.length >= 2) {
        const a = w2s(ent.points[0].x, ent.points[0].y), b = w2s(ent.points[1].x, ent.points[1].y);
        return <rect key={i} x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.abs(b.x-a.x)} height={Math.abs(b.y-a.y)} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'circle' && ent.points.length >= 1 && ent.properties?.radius) {
        const c = w2s(ent.points[0].x, ent.points[0].y);
        return <circle key={i} cx={c.x} cy={c.y} r={ent.properties.radius * pixelsPerUnit} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'ellipse' && ent.points.length >= 1 && ent.properties?.rx) {
        const c = w2s(ent.points[0].x, ent.points[0].y);
        return <ellipse key={i} cx={c.x} cy={c.y} rx={ent.properties.rx*pixelsPerUnit} ry={(ent.properties.ry||ent.properties.rx)*pixelsPerUnit} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if ((ent.type === 'polyline' || ent.type === 'spline') && ent.points.length >= 2) {
        const ps = ent.points.map(p => { const s = w2s(p.x, p.y); return `${s.x},${s.y}`; }).join(' ');
        return <polyline key={i} points={ps} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'polygon' && ent.points.length >= 2 && ent.properties?.sides) {
        const ct = w2s(ent.points[0].x, ent.points[0].y), vt = w2s(ent.points[1].x, ent.points[1].y);
        const rr = Math.sqrt(Math.pow(vt.x-ct.x,2)+Math.pow(vt.y-ct.y,2));
        const ao = Math.atan2(vt.y-ct.y, vt.x-ct.x);
        const pp: string[] = [];
        for (let j = 0; j < ent.properties.sides; j++) { const ag = ao+(2*Math.PI*j)/ent.properties.sides; pp.push(`${ct.x+rr*Math.cos(ag)},${ct.y+rr*Math.sin(ag)}`); }
        return <polygon key={i} points={pp.join(' ')} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'arc' && ent.points.length >= 3 && ent.properties?.radius) {
        const as = w2s(ent.points[0].x, ent.points[0].y), ae = w2s(ent.points[2].x, ent.points[2].y);
        const ar = ent.properties.radius*pixelsPerUnit;
        return <path key={i} d={`M ${as.x} ${as.y} A ${ar} ${ar} 0 0 1 ${ae.x} ${ae.y}`} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      if (ent.type === 'slot' && ent.points.length >= 2 && ent.properties?.width) {
        const s1 = w2s(ent.points[0].x, ent.points[0].y), s2 = w2s(ent.points[1].x, ent.points[1].y);
        const hw = ent.properties.width*pixelsPerUnit/2;
        const dx = s2.x-s1.x, dy = s2.y-s1.y, ln = Math.sqrt(dx*dx+dy*dy);
        if (ln > 0.001) { const nx=(-dy/ln)*hw, ny=(dx/ln)*hw; return <path key={i} d={`M ${s1.x+nx} ${s1.y+ny} L ${s2.x+nx} ${s2.y+ny} A ${hw} ${hw} 0 1 1 ${s2.x-nx} ${s2.y-ny} L ${s1.x-nx} ${s1.y-ny} A ${hw} ${hw} 0 1 1 ${s1.x+nx} ${s1.y+ny} Z`} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />; }
      }
      if (ent.type === 'obround' && ent.points.length >= 2 && ent.properties?.cornerRadius) {
        const a = w2s(ent.points[0].x, ent.points[0].y), b = w2s(ent.points[1].x, ent.points[1].y);
        const cr = ent.properties.cornerRadius*pixelsPerUnit;
        return <rect key={i} x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.abs(b.x-a.x)} height={Math.abs(b.y-a.y)} rx={cr} ry={cr} fill="none" stroke={sc} strokeWidth="1.5" strokeDasharray="6 3" />;
      }
      return (<g key={i}>{ent.points.map((p,pi) => { const s = w2s(p.x,p.y); return <circle key={pi} cx={s.x} cy={s.y} r={3} fill={sc} opacity={0.6} />; })}</g>);
    };

    const gColor = activeDrawTool === 'copy' ? '#00ffff' : '#ffff00';
    const gEnts = tFn ? selEnts.map(e => tFn!(e)) : [];

    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 35 }}>
        {gEnts.map((ge, gi) => ghostSvg(ge, gi, gColor))}
        {(activeDrawTool === 'move' || activeDrawTool === 'copy') && tPts.length >= 1 && (() => {
          const bp = worldToScreen(tPts[0].x, tPts[0].y);
          return (<g><circle cx={bp.x} cy={bp.y} r={6} fill="none" stroke="#ff6600" strokeWidth="2" /><line x1={bp.x-8} y1={bp.y} x2={bp.x+8} y2={bp.y} stroke="#ff6600" strokeWidth="1.5" /><line x1={bp.x} y1={bp.y-8} x2={bp.x} y2={bp.y+8} stroke="#ff6600" strokeWidth="1.5" /></g>);
        })()}
        {activeDrawTool === 'mirror' && tPts.length >= 1 && (() => {
          const m1 = worldToScreen(tPts[0].x, tPts[0].y), m2 = worldToScreen(cPos.x, cPos.y);
          return (<g><line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke="#ff00ff" strokeWidth="2" strokeDasharray="8 4" /><circle cx={m1.x} cy={m1.y} r={4} fill="#ff00ff" /><circle cx={m2.x} cy={m2.y} r={4} fill="#ff00ff" opacity={0.6} /></g>);
        })()}
        {activeDrawTool === 'rotate' && tPts.length >= 1 && (() => {
          const rc = worldToScreen(tPts[0].x, tPts[0].y);
          const el: React.ReactNode[] = [<circle key="rc" cx={rc.x} cy={rc.y} r={5} fill="none" stroke="#00ff88" strokeWidth="2" />, <line key="rx" x1={rc.x-8} y1={rc.y} x2={rc.x+8} y2={rc.y} stroke="#00ff88" strokeWidth="1" />, <line key="ry" x1={rc.x} y1={rc.y-8} x2={rc.x} y2={rc.y+8} stroke="#00ff88" strokeWidth="1" />];
          if (tPts.length >= 2) { const rr = worldToScreen(tPts[1].x, tPts[1].y); el.push(<line key="rl" x1={rc.x} y1={rc.y} x2={rr.x} y2={rr.y} stroke="#00ff88" strokeWidth="1" strokeDasharray="4 2" />); const rt = worldToScreen(cPos.x, cPos.y); el.push(<line key="tl" x1={rc.x} y1={rc.y} x2={rt.x} y2={rt.y} stroke="#ffff00" strokeWidth="1" strokeDasharray="4 2" />); }
          return <g>{el}</g>;
        })()}
        {activeDrawTool === 'scale' && tPts.length >= 1 && (() => {
          const sc = worldToScreen(tPts[0].x, tPts[0].y);
          const el: React.ReactNode[] = [<circle key="sc" cx={sc.x} cy={sc.y} r={5} fill="none" stroke="#ff8800" strokeWidth="2" />, <line key="sx" x1={sc.x-8} y1={sc.y} x2={sc.x+8} y2={sc.y} stroke="#ff8800" strokeWidth="1" />, <line key="sy" x1={sc.x} y1={sc.y-8} x2={sc.x} y2={sc.y+8} stroke="#ff8800" strokeWidth="1" />];
          if (tPts.length >= 2) { const sr = worldToScreen(tPts[1].x, tPts[1].y); el.push(<line key="rl" x1={sc.x} y1={sc.y} x2={sr.x} y2={sr.y} stroke="#ff8800" strokeWidth="1" strokeDasharray="4 2" />); const st = worldToScreen(cPos.x, cPos.y); el.push(<line key="tl" x1={sc.x} y1={sc.y} x2={st.x} y2={st.y} stroke="#ffff00" strokeWidth="1" strokeDasharray="4 2" />); }
          return <g>{el}</g>;
        })()}
      </svg>
    );
  };

  return (
    <main

      ref={containerRef}
      onMouseMove={handleMouseMoveInternal}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={() => setIsMouseInWorkspace(true)}
      onMouseLeave={() => setIsMouseInWorkspace(false)}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => {
        if (activeDrawTool) {
             // Cancel transform edit on right-click
             if (TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) {
                console.log('❌ Right-click: Cancelling transform edit:', activeDrawTool);
                setTransformEditState({ step: 0, points: [], currentPos: null });
                if (onCancelDraw) onCancelDraw();
                e.preventDefault();
                return;
             }
             // Finish polyline on right click - Save as CadEntity
              if ((activeDrawTool === 'polyline' || activeDrawTool === 'spline') && drawState.points.length > 1) {
                   setCadEntitiesWithUndo(prev => [...prev, {
                     id: crypto.randomUUID(),
                     type: activeDrawTool,
                     points: drawState.points,
                     layerId: activeLayerId
                   }], `Draw ${activeDrawTool}`, 'draw');
                  setDrawState({ step: 0, points: [], currentPos: null });
              }
             // Finish leader on right click — saves with empty text (user can type text in command input before right-clicking)
              if (activeDrawTool === 'leader' && drawState.points.length >= 2) {
                   setCadEntitiesWithUndo(prev => [...prev, {
                     id: crypto.randomUUID(),
                     type: 'leader',
                     points: drawState.points,
                     properties: { text: '' },
                     layerId: activeLayerId
                   }], 'Draw leader', 'draw');
                  setDrawState({ step: 0, points: [], currentPos: null });
              }
             // Delete on right-click (delete tool or pending delete mode)
             if (activeDrawTool === 'delete' || pendingDeleteMode) {
                if (selectedEntities.size > 0) {
                  console.log('🗑️ Right-click delete: Deleting selected entities:', selectedEntities.size);
                  const ids = Array.from(selectedEntities);
                  setCadEntitiesWithUndo(
                    prev => prev.filter(ent => !selectedEntities.has(ent.id)),
                    `Delete ${ids.length} entit${ids.length === 1 ? 'y' : 'ies'}`,
                    'delete',
                    ids
                  );
                  // Keep selection (user may want to undo/inspect)
                  setPendingDeleteMode(false);
                  onCancelDraw?.();
                  e.preventDefault();
                  return;
                } else if (pendingDeleteMode) {
                  // User right-clicked with no selection while in pending delete mode → cancel
                  setPendingDeleteMode(false);
                  onCancelDraw?.();
                  e.preventDefault();
                  return;
                }
             }
             // Lag reduce on right-click (lag_reduce tool)
             if (activeDrawTool === 'lag_reduce') {
                e.preventDefault();
                if (selectedEntities.size > 0) {
                  console.log('⚡ Lag reduce triggered:', selectedEntities.size, 'entities');
                  console.log('Bắt đầu giảm lag cho', selectedEntities.size, 'đối tượng...');
                  onOptimizeEntities?.(selectedEntities);
                  setSelectedEntities(new Set()); // Clear selection after optimization
                  showToast(`Bắt đầu giảm lag cho ${selectedEntities.size} đối tượng...`);
                } else {
                  showToast('Vui lòng chọn đối tượng cần giảm lag');
                }
                return;
             }
             if (onCancelDraw) onCancelDraw();
             e.preventDefault();
        } else if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e);
        }
      }}
      className={`flex-1 min-h-0 relative bg-gradient-to-b from-canvas-top to-canvas-bottom overflow-x-hidden overflow-y-auto touch-none ${
        showCrosshair ? 'cursor-none' : 
        activeDrawTool === 'move' ? 'cursor-move' :
        activeDrawTool === 'copy' ? 'cursor-copy' :
        activeDrawTool === 'scale' ? 'cursor-nwse-resize' :
        (activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)) ? 'cursor-pointer' :
        (activeDrawTool && EDIT_TOOLS.includes(activeDrawTool)) ? 'cursor-pointer' :
        activeDrawTool ? 'cursor-crosshair' : 
        isDragging ? 'cursor-grabbing' : 
        (isSelecting || isSelectingSheet) ? 'cursor-copy' : 
        isManualNesting ? 'cursor-default' : 'cursor-default'
      }`}
    >
      {/* Layer Panel (Task 18) */}
      {showLayerPanel && (
        <div className="absolute right-4 top-4 z-[100]">
          <LayerPanel 
            layers={layers}
            activeLayerId={activeLayerId}
            onLayerChange={onLayerChange || (() => {})}
            entities={cadEntities}
            onEntitiesUpdate={setCadEntities}
          />
        </div>
      )}
      {/* Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern 
            id="grid" 
            width={gridSizePx} 
            height={gridSizePx} 
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${gridOffsetX}, ${gridOffsetY})`}
          >
            <path d={`M ${gridSizePx} 0 L 0 0 0 ${gridSizePx}`} fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Render Sheets & Parts */}
      <div className="absolute inset-0 pointer-events-none">
        {renderSheetsAndParts()}
      </div>

      {/* Render CAD Entities (Geometry Layer) */}
      {renderCadEntities()}

      {/* Selection Window Box (AutoCAD Style) */}
      {isWindowSelecting && selectionStart && selectionEnd && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-30">
          {(() => {
            const p1 = worldToScreen(selectionStart.x, selectionStart.y);
            const p2 = worldToScreen(selectionEnd.x, selectionEnd.y);
            const x = Math.min(p1.x, p2.x);
            const y = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);
            
            // If in ADD_PART mode, use special color (cyan/green)
            // Otherwise use normal selection colors
            const isCrossing = p2.x < p1.x;
            
            let strokeColor, fillColor, strokeDasharray;
            
            if (isSelecting) {
              // ADD_PART MODE: Cyan color to indicate "creating part"
              strokeColor = "#00ffff";
              fillColor = "rgba(0, 255, 255, 0.15)";
              strokeDasharray = "none";
            } else {
              // Normal selection mode
              strokeColor = isCrossing ? "#00ff00" : "#0099ff";
              fillColor = isCrossing ? "rgba(0, 255, 0, 0.1)" : "rgba(0, 153, 255, 0.1)";
              strokeDasharray = isCrossing ? "5,5" : "none";
            }
            
            return (
              <g>
                <rect 
                  x={x} 
                  y={y} 
                  width={w} 
                  height={h} 
                  fill={fillColor}
                  stroke={strokeColor} 
                  strokeWidth={isSelecting ? "3" : "2"} 
                  strokeDasharray={strokeDasharray}
                  opacity="0.8"
                />
                {/* ADD_PART mode indicator text */}
                {isSelecting && (
                  <text
                    x={x + w / 2}
                    y={y - 10}
                    textAnchor="middle"
                    fill="#00ffff"
                    fontSize="12"
                    fontWeight="bold"
                    className="select-none"
                  >
                    ADD PART MODE
                  </text>
                )}
              </g>
            );
          })()}
        </svg>
      )}

      {/* Drawing Preview Overlay */}
      {activeDrawTool && (
        <div className="absolute inset-0 pointer-events-none z-30">
            {renderDrawingPreview()}
        </div>
      )}

      {/* Transform Edit Preview Overlay (Move/Copy/Mirror/Rotate/Scale ghost) */}
      {activeDrawTool && TRANSFORM_EDIT_TOOLS.includes(activeDrawTool) && renderTransformEditPreview()}

      {/* Axes */}
      <div className="absolute top-0 left-0 p-1 text-white opacity-80 font-mono text-xs z-10 pointer-events-none">Y</div>
      <div className="absolute top-0 left-1 h-full w-12 pointer-events-none overflow-hidden">
        {yTicks.map(val => {
          const screenPos = worldToScreen(0, val);
          if (screenPos.y < -20 || screenPos.y > height + 20) return null;
          return (
            <div key={val} className="absolute right-0 flex items-center justify-end text-white/70 font-mono text-[10px]" style={{ top: screenPos.y, transform: 'translateY(-50%)' }}>
              <span className="mr-1">{val}</span>
              <div className="w-1.5 h-px bg-slate-700/70"></div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-1 left-0 w-full h-8 pointer-events-none overflow-hidden">
        {xTicks.map(val => {
           const screenPos = worldToScreen(val, 0);
           if (screenPos.x < -50 || screenPos.x > width + 50) return null;
           return (
             <div key={val} className="absolute bottom-0 flex flex-col items-center text-white/70 font-mono text-[10px]" style={{ left: screenPos.x, transform: 'translateX(-50%)' }}>
                <div className="h-1.5 w-px bg-slate-700/70 mb-0.5"></div>
                <span>{val}</span>
             </div>
           );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CROSSHAIR + COORDINATE DISPLAY + COMMAND INPUT (AutoCAD 2022 Style)
          ═══════════════════════════════════════════════════════════════════ */}
      {showCrosshair && isMouseInWorkspace && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none z-20"
          style={{ overflow: 'visible' }}
        >
          {/* Horizontal Crosshair Line */}
          <line
            x1={crosshairSize === 100 ? 0 : mouseScreenPos.x - (width * crosshairSize / 200)}
            y1={mouseScreenPos.y}
            x2={crosshairSize === 100 ? width : mouseScreenPos.x + (width * crosshairSize / 200)}
            y2={mouseScreenPos.y}
            stroke="#00ff00"
            strokeWidth="1"
            opacity="0.8"
          />
          {/* Vertical Crosshair Line */}
          <line
            x1={mouseScreenPos.x}
            y1={crosshairSize === 100 ? 0 : mouseScreenPos.y - (height * crosshairSize / 200)}
            x2={mouseScreenPos.x}
            y2={crosshairSize === 100 ? height : mouseScreenPos.y + (height * crosshairSize / 200)}
            stroke="#00ff00"
            strokeWidth="1"
            opacity="0.8"
          />
          {/* Center Pickbox (Small square at cursor) */}
          <rect
            x={mouseScreenPos.x - 5}
            y={mouseScreenPos.y - 5}
            width={10}
            height={10}
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
          />
        </svg>
      )}

      {/* ═══ SNAP INDICATOR ═══ */}
      {currentSnap && isMouseInWorkspace && (() => {
        const screenSnap = worldToScreen(currentSnap.x, currentSnap.y);
        const color = SNAP_INDICATOR_COLORS[currentSnap.type] || '#ffff00';
        const label = SNAP_INDICATOR_LABELS[currentSnap.type] || currentSnap.type;
        const sz = 8; // half-size of indicator
        return (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-25"
            style={{ overflow: 'visible' }}
          >
            {/* Indicator shape per snap mode */}
            {currentSnap.type === 'point' && (
              <rect x={screenSnap.x - sz} y={screenSnap.y - sz} width={sz * 2} height={sz * 2}
                fill="none" stroke={color} strokeWidth="2" />
            )}
            {currentSnap.type === 'midpoint' && (
              <polygon
                points={`${screenSnap.x},${screenSnap.y - sz} ${screenSnap.x - sz},${screenSnap.y + sz} ${screenSnap.x + sz},${screenSnap.y + sz}`}
                fill="none" stroke={color} strokeWidth="2" />
            )}
            {currentSnap.type === 'center' && (
              <circle cx={screenSnap.x} cy={screenSnap.y} r={sz}
                fill="none" stroke={color} strokeWidth="2" />
            )}
            {currentSnap.type === 'tangent' && (<>
              <line x1={screenSnap.x - sz} y1={screenSnap.y - sz} x2={screenSnap.x + sz} y2={screenSnap.y + sz}
                stroke={color} strokeWidth="2" />
              <line x1={screenSnap.x + sz} y1={screenSnap.y - sz} x2={screenSnap.x - sz} y2={screenSnap.y + sz}
                stroke={color} strokeWidth="2" />
              <circle cx={screenSnap.x} cy={screenSnap.y} r={sz}
                fill="none" stroke={color} strokeWidth="1.5" />
            </>)}
            {currentSnap.type === 'perpendicular' && (<>
              <line x1={screenSnap.x} y1={screenSnap.y - sz} x2={screenSnap.x} y2={screenSnap.y + sz}
                stroke={color} strokeWidth="2" />
              <line x1={screenSnap.x - sz} y1={screenSnap.y} x2={screenSnap.x + sz} y2={screenSnap.y}
                stroke={color} strokeWidth="2" />
              <rect x={screenSnap.x} y={screenSnap.y - sz} width={sz * 0.6} height={sz * 0.6}
                fill="none" stroke={color} strokeWidth="1.5" />
            </>)}
            {/* Snap label */}
            <text x={screenSnap.x + sz + 4} y={screenSnap.y - sz - 2}
              fill={color} fontSize="10" fontFamily="monospace" fontWeight="bold">
              {label}
            </text>
          </svg>
        );
      })()}

      {/* Coordinate Display Tooltip (follows cursor) */}
      {isMouseInWorkspace && (
        <div 
          className="absolute pointer-events-none z-30 font-mono text-[11px] bg-slate-900/90 border border-cyan-500/50 px-2 py-1 rounded shadow-lg"
          style={{ 
            left: mouseScreenPos.x + 20, 
            top: mouseScreenPos.y + 20,
            transform: mouseScreenPos.x > width - 150 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="text-white/60">X:</span>
            <span className="text-green-400 font-bold">{mouseWorldPos.x.toFixed(2)}</span>
            <span className="text-white/60">Y:</span>
            <span className="text-green-400 font-bold">{mouseWorldPos.y.toFixed(2)}</span>
          </div>
          {/* Show relative distance and angle when drawing */}
          {activeDrawTool && drawState.points.length > 0 && drawState.currentPos && (() => {
            const lastPt = drawState.points[drawState.points.length - 1];
            const dx = drawState.currentPos.x - lastPt.x;
            const dy = drawState.currentPos.y - lastPt.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const angleRad = Math.atan2(dy, dx);
            const angleDeg = (angleRad * 180 / Math.PI + 360) % 360;
            
            return (
              <div className="flex flex-col gap-0.5 mt-0.5 border-t border-slate-600 pt-0.5">
                <div className="flex items-center gap-2 text-yellow-400">
                  <span className="text-white/60">Δ:</span>
                  <span>{dx.toFixed(2)}</span>
                  <span>,</span>
                  <span>{dy.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/60">L:</span>
                  <span className="text-orange-400 font-bold">{distance.toFixed(2)}</span>
                  <span className="text-white/60 ml-1">∠:</span>
                  <span className="text-purple-400 font-bold">{angleDeg.toFixed(1)}°</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Command Input Box (Dynamic Input - AutoCAD Style) */}
      {showCommandInput && activeDrawTool && isMouseInWorkspace && (
        <div 
          className="absolute z-40 pointer-events-auto"
          style={{ 
            left: mouseScreenPos.x + 20, 
            top: mouseScreenPos.y + 60,
            transform: mouseScreenPos.x > width - 200 ? 'translateX(-100%)' : 'none'
          }}
        >
          <div className="bg-slate-800/95 border border-cyan-500 rounded shadow-lg overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1 bg-cyan-600/20 border-b border-cyan-500/50">
              <span className="text-cyan-400 text-[10px] font-bold">
                {activeDrawTool.toUpperCase()}
              </span>
              <span className="text-white/60 text-[10px]">
                {EDIT_TOOLS.includes(activeDrawTool)
                  ? (activeDrawTool === 'offset' 
                      ? (editToolState.step === 0 ? '- Type offset distance:' : editToolState.step === 1 ? '- Select entity:' : '- Click side to offset:')
                      : activeDrawTool === 'trim'
                      ? (editToolState.step === 0 ? '- Select cutting edge:' : '- Click line to trim:')
                      : activeDrawTool === 'extend'
                      ? (editToolState.step === 0 ? '- Select boundary edge:' : '- Click line to extend:')
                      : activeDrawTool === 'fillet'
                      ? (editToolState.step === 0 ? '- Type fillet radius:' : '- Click corner (2 lines):')
                      : activeDrawTool === 'chamfer'
                      ? (editToolState.step === 0 ? '- Type chamfer distance:' : '- Click corner (2 lines):')
                      : '')
                  : drawState.step === 0 
                    ? '- Specify first point:' 
                    : activeDrawTool === 'rect' 
                      ? '- Width,Height or point:'
                      : '- Specify next point:'}
              </span>
            </div>
            <div className="flex items-center gap-1 p-1">
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleCommandInputKeyDown}
                placeholder={
                  EDIT_TOOLS.includes(activeDrawTool) && editToolState.step === 0
                    ? (activeDrawTool === 'offset' ? "10 (distance)" : activeDrawTool === 'fillet' ? "5 (radius)" : "10 (distance)")
                    : EDIT_TOOLS.includes(activeDrawTool)
                    ? "Click on entity"
                    : activeDrawTool === 'rect' && drawState.step > 0
                    ? "1220,2440 (W,H)"
                    : "x,y | @dx,dy | L<A"
                }
                className="w-36 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
                autoComplete="off"
              />
              <button
                onClick={() => {
                  if (commandInputRef.current) {
                    commandInputRef.current.focus();
                  }
                }}
                className="p-0.5 hover:bg-slate-700 rounded text-cyan-400 text-[10px]"
                title="Press Enter to confirm"
              >
                ↵
              </button>
            </div>
            <div className="px-2 py-0.5 text-[9px] text-slate-500 border-t border-slate-700">
              {activeDrawTool === 'rect' && drawState.step > 0 
                ? 'Enter Width,Height (e.g., 1220,2440)'
                : 'x,y | @dx,dy | length | length<angle'}
            </div>
          </div>
        </div>
      )}


      {/* Selection Mode Overlay Hint (Part) */}
      {isSelecting && (
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-1 rounded shadow-lg z-40 text-xs font-bold pointer-events-none">
          Select Objects to Add as Part. Right-Click when finished.
        </div>
      )}

      {/* Drawing Mode Hint */}
      {activeDrawTool && (
        <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 ${
          TRANSFORM_EDIT_TOOLS.includes(activeDrawTool)
            ? 'bg-yellow-100 border-yellow-400 text-yellow-900'
            : 'bg-cyan-100 border-cyan-400 text-cyan-900'
        } border px-4 py-1 rounded shadow-lg z-40 text-xs font-bold pointer-events-none flex flex-col items-center`}>
            <span>TOOL: {activeDrawTool.toUpperCase()}{TRANSFORM_EDIT_TOOLS.includes(activeDrawTool) ? ` [${selectedEntities.size} selected]` : ''}</span>
            <span className="text-[10px] font-normal">
              {TRANSFORM_EDIT_TOOLS.includes(activeDrawTool) ? (
                activeDrawTool === 'move' ? (transformEditState.step === 0 ? 'Click base point' : 'Click destination or type @dx,dy (e.g. @100,0)') :
                activeDrawTool === 'copy' ? (transformEditState.step === 0 ? 'Click base point' : 'Click destination or type @dx,dy. Right-Click to finish.') :
                activeDrawTool === 'mirror' ? (transformEditState.step === 0 ? 'Click first point of mirror line' : 'Click second point of mirror line') :
                activeDrawTool === 'rotate' ? (transformEditState.step === 0 ? 'Click rotation center' : transformEditState.step === 1 ? 'Click reference angle point or type angle (e.g. 45)' : 'Click target angle point or type angle') :
                activeDrawTool === 'scale' ? (transformEditState.step === 0 ? 'Click scale center' : transformEditState.step === 1 ? 'Click reference distance point or type factor (e.g. 2)' : 'Click target distance point or type factor') :
                'Left Click to place points. Right Click to Cancel/Finish.'
              ) : 'Left Click to place points. Right Click to Cancel/Finish.'}
            </span>
        </div>
      )}

      {/* Toast / Error Message (AutoCAD-style notification) */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-red-900/90 border border-red-500 text-red-100 px-4 py-2 rounded shadow-lg z-50 text-xs font-bold pointer-events-auto flex items-center gap-2 animate-pulse">
          <span className="material-icons text-sm">warning</span>
          {toastMessage}
          <button onClick={() => setToastMessage(null)} className="ml-2 text-red-300 hover:text-white">
            <span className="material-icons text-sm">close</span>
          </button>
        </div>
      )}

      {isDragOver && (
        <div className="absolute inset-0 z-[60] bg-blue-500/20 border-2 border-dashed border-blue-400 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 border border-blue-400 rounded-lg px-6 py-4 text-blue-200 text-sm font-bold flex items-center gap-3 shadow-xl">
            <span className="material-icons text-2xl">upload_file</span>
            Drop .dxf, .svg or .dwg files to import
          </div>
        </div>
      )}

      {/* Import Loading Overlay (Task 5) */}
      <AnimatePresence>
        {isImporting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-slate-900/80 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-slate-800/95 border border-blue-500/50 rounded-xl px-8 py-5 shadow-2xl min-w-[300px]">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-blue-400 mb-2">
                <span>{importStatusText}</span>
                <span>{importProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${importProgress}%` }}
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-500"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Measure Tool Result Display */}
      {measureResult && (
        <div className="absolute top-8 right-8 bg-slate-800 border-2 border-cyan-500 shadow-lg rounded-md p-4 z-40 pointer-events-auto">
          <div className="text-cyan-300 text-sm font-bold mb-2 flex items-center gap-2">
            <span className="material-icons-outlined text-[16px]">straighten</span>
            Measurement Result
          </div>
          <div className="bg-slate-900/50 rounded p-3 space-y-2 border border-cyan-400/30">
            <div className="text-xs text-cyan-200">
              <span className="font-mono font-bold text-lg text-cyan-300">{measureResult.distance.toFixed(2)}</span> <span className="text-cyan-400">mm</span>
            </div>
            <div className="text-[10px] text-slate-400">
              <div>P1: ({measureResult.p1.x.toFixed(1)}, {measureResult.p1.y.toFixed(1)})</div>
              <div>P2: ({measureResult.p2.x.toFixed(1)}, {measureResult.p2.y.toFixed(1)})</div>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 border-t border-slate-600 pt-2">
            Auto-clears in 4 seconds
          </div>
        </div>
      )}

      {/* Manual Nesting Toolbar (Absolute Positioned) */}

      {/* Manual Nesting Toolbar (Absolute Positioned) */}
      {isManualNesting && (
        <div className="absolute top-2 right-2 w-[240px] bg-slate-800 shadow-modal border border-blue-400 flex flex-col z-50 rounded-sm pointer-events-auto select-none">
           {/* Header */}
           <div className="h-6 bg-gradient-to-r from-blue-600 to-blue-500 flex justify-between items-center px-2 cursor-move">
             <span className="font-bold text-white text-[11px] flex items-center gap-1">
               <span className="material-icons-outlined text-[12px]">pan_tool</span>
               Manual Nesting Controls
             </span>
             <button onClick={onCloseManualNest} className="text-white hover:text-red-200">
               <span className="material-icons-outlined text-[12px]">close</span>
             </button>
           </div>
           
           {/* Content */}
           <div className="p-2 grid grid-cols-4 gap-1 bg-slate-900">
              <ManualNestBtn icon="open_with" label="Move" />
              <ManualNestBtn icon="rotate_90_degrees_ccw" label="Rotate" />
              <ManualNestBtn icon="flip" label="Mirror" />
              <ManualNestBtn icon="grid_on" label="Grid" />
              <div className="col-span-4 h-px bg-slate-700 my-1"></div>
              <div className="col-span-4 grid grid-cols-3 gap-1">
                 <div className="col-start-2"><ManualNestBtn icon="keyboard_arrow_up" label="" small /></div>
                 <div className="col-start-1"><ManualNestBtn icon="keyboard_arrow_left" label="" small /></div>
                 <div className="col-start-2"><ManualNestBtn icon="keyboard_arrow_down" label="" small /></div>
                 <div className="col-start-3 row-start-2"><ManualNestBtn icon="keyboard_arrow_right" label="" small /></div>
              </div>
              <div className="col-span-4 mt-2 space-y-1">
                 <label className="flex items-center space-x-2 text-[10px] text-white">
                   <input type="checkbox" defaultChecked className="w-3 h-3 text-blue-600 rounded-sm border-slate-500" />
                   <span>Collision Check</span>
                 </label>
                 <label className="flex items-center space-x-2 text-[10px] text-white">
                   <input type="checkbox" className="w-3 h-3 text-blue-600 rounded-sm border-slate-500" />
                   <span>Snap to Grid</span>
                 </label>
              </div>
              <div className="col-span-4 mt-2 p-1 bg-yellow-900/20 border border-yellow-800 rounded text-[9px] text-white">
                 Select a part from the sidebar or click a nested part to manipulate.
              </div>
           </div>
        </div>
      )}

      {/* Nesting Info Modal (Centered) */}
      {showNestingInfo && (
        <div className="absolute inset-0 flex items-center justify-center z-[80] pointer-events-auto bg-black/20 backdrop-blur-[1px]">
          <div className="w-[400px] bg-slate-900 shadow-modal border-2 border-slate-600 flex flex-col font-sans text-xs">
             <div className="h-7 bg-gradient-to-r from-slate-700 to-slate-600 flex justify-between items-center px-2 select-none border-b border-slate-500">
                <span className="font-bold text-white flex items-center gap-2">
                   <span className="material-icons-outlined text-white">info</span>
                   Nesting Information
                </span>
                <button onClick={onCloseNestingInfo} className="hover:text-red-500 text-white">
                  <span className="material-icons-outlined text-sm">close</span>
                </button>
             </div>
             <div className="p-4 bg-slate-900 space-y-4">
                <div className="border border-slate-600 bg-slate-800">
                   <table className="w-full text-left">
                     <tbody className="divide-y divide-slate-700">
                       <InfoRow label="Nest List" value={activeNestList || '-'} />
                       <InfoRow label="Total Parts" value={parts.length.toString()} />
                       <InfoRow label="Total Sheets" value={sheets.length.toString()} />
                       <InfoRow label="Nested Parts" value={`${parts.filter(p=>p.isNested).length} / ${parts.length}`} />
                       <InfoRow label="Utilization" value={parts.filter(p=>p.isNested).length > 0 ? "82.4 %" : "0%"} highlight />
                       <InfoRow label="Cut Length" value="124.5 m" />
                       <InfoRow label="Est. Machining Time" value="00:45:20" />
                     </tbody>
                   </table>
                </div>
                <div className="flex justify-end">
                   <button onClick={onCloseNestingInfo} className="px-6 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm hover:bg-slate-600 text-white">
                     Close
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Close Button Overlay */}
      <button className="absolute bottom-0 right-0 bg-slate-700 text-black p-0.5 hover:bg-red-500 hover:text-white transition-colors z-20 rounded-sm">
        <span className="material-symbols-outlined text-xs block">close</span>
      </button>

      {/* Nesting Modal (Main Modal) */}
      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="w-[840px] h-[550px] bg-slate-800 shadow-modal border-2 border-blue-700 flex flex-col pointer-events-auto text-xs text-white font-sans cursor-default">
            
            {/* Modal Header */}
            <div className="h-7 bg-gradient-to-r from-slate-700 to-slate-600 flex justify-between items-center px-2 select-none border-b border-slate-500">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-[#7ab708] text-white flex items-center justify-center text-[9px] font-bold border border-white">AX</div>
                <span className="font-normal text-white">{activeNestList || 'New Nest List'}</span>
              </div>
              <div className="flex space-x-1">
                <button className="w-6 h-4 flex items-center justify-center text-white hover:bg-slate-500 rounded-sm">
                  <span className="material-symbols-outlined text-[10px]">minimize</span>
                </button>
                <button className="w-6 h-4 flex items-center justify-center text-white hover:bg-slate-500 rounded-sm">
                  <span className="material-symbols-outlined text-[10px]">crop_square</span>
                </button>
                <button onClick={onCloseModal} className="w-6 h-4 flex items-center justify-center text-white hover:bg-red-600 rounded-sm">
                  <span className="material-symbols-outlined text-[12px]">close</span>
                </button>
              </div>
            </div>

            {/* Modal Toolbar */}
            <div className="bg-slate-800 p-1 flex space-x-0.5 border-b border-slate-600">
              <ModalToolBtn icon="folder_open" label="Add Part<br/>From File" iconColor="text-yellow-600" />
              <ModalToolBtn 
                icon="post_add" 
                label="Add Part<br/>From Drawing" 
                iconColor="text-red-600" 
                onClick={onAddPartFromDrawing}
              />
              <button className="flex flex-col items-center p-1 bg-[#ffde7d] border border-[#e5cd7a] rounded-[2px] min-w-[50px] shadow-sm">
                <span className="material-symbols-outlined text-red-600 text-2xl drop-shadow-sm">help_outline</span>
                <span className="text-[9px] text-center leading-tight mt-0.5" dangerouslySetInnerHTML={{ __html: 'Show / Hide<br/>Part Parameters' }}></span>
              </button>
              <div className="w-px bg-slate-600 mx-1 h-10 self-center"></div>
              <ModalToolBtn 
                  icon="storage" 
                  label="Add Sheet<br/>From Database" 
                  iconColor="text-yellow-500"
                  onClick={handleOpenStockModal}
              />
              <ModalToolBtn 
                icon="note_add" 
                label="Add Sheet<br/>From Drawing" 
                iconColor="text-yellow-600" 
                onClick={onAddSheetFromDrawing}
              />
              <div className="w-px bg-slate-600 mx-1 h-10 self-center"></div>
              <ModalToolBtn icon="build" label="Settings" iconColor="text-white" onClick={onOpenSettings} />
              <ModalToolBtn icon="snippet_folder" label="Load<br/>Settings" iconColor="text-yellow-600" />
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-2 flex flex-col space-y-2 overflow-hidden bg-slate-800 border-t border-slate-600">
              {/* Parts Table */}
              <div className="flex-1 border border-slate-600 bg-slate-800 overflow-auto relative">
                <table className="w-full text-left border-collapse retro-table">
                  <thead>
                    <tr>
                      <th className="w-24">Name</th>
                      <th className="w-24">Dimensions</th>
                      <th className="w-16">Required</th>
                      <th className="w-16">Priority</th>
                      <th className="w-16">Mirror</th>
                      <th className="w-16">Rotation</th>
                      <th className="w-16">Small Part</th>
                      <th className="w-20">Kit Number</th>
                      <th>Nested</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {parts.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-700 group">
                        <td className="p-0">
                          <input 
                            type="text" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={part.name}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { name: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input 
                            type="text" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={part.dimensions}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { dimensions: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input 
                            type="number" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={part.required}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { required: parseInt(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-0">
                          <select 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none cursor-pointer appearance-none" 
                            style={{ backgroundImage: 'none' }}
                            value={part.priority}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { priority: parseInt(e.target.value) })}
                          >
                            <option value={1} className="bg-slate-800 text-white">1</option>
                            <option value={2} className="bg-slate-800 text-white">2</option>
                            <option value={3} className="bg-slate-800 text-white">3</option>
                            <option value={4} className="bg-slate-800 text-white">4</option>
                            <option value={5} className="bg-slate-800 text-white">5</option>
                          </select>
                        </td>
                        <td className="p-0 text-center">
                          <input 
                            type="checkbox" 
                            className="cursor-pointer" 
                            checked={part.mirrored}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { mirrored: e.target.checked })}
                          />
                        </td>
                        <td className="p-0">
                          <select 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none cursor-pointer appearance-none"
                            style={{ backgroundImage: 'none' }}
                            value={part.rotation}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { rotation: e.target.value })}
                          >
                            <option value="None" className="bg-slate-800 text-white">None</option>
                            <option value="90" className="bg-slate-800 text-white">90°</option>
                            <option value="180" className="bg-slate-800 text-white">180°</option>
                            <option value="Any Angle" className="bg-slate-800 text-white">Any</option>
                          </select>
                        </td>
                        <td className="p-0 text-center">
                          <input 
                            type="checkbox" 
                            className="cursor-pointer" 
                            checked={part.smallPart}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { smallPart: e.target.checked })}
                          />
                        </td>
                        <td className="p-0">
                           <input 
                            type="text" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={part.kitNumber || ''}
                            onChange={(e) => onUpdatePart && onUpdatePart(part.id, { kitNumber: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input 
                            type="number" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={part.isNested ? 1 : 0}
                            readOnly
                          />
                        </td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 9 - parts.length) }).map((_, i) => (
                      <tr key={`empty-${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="absolute bottom-4 left-4 right-4 h-px bg-slate-600"></div>
              </div>

              {/* Middle Controls */}
              <div className="flex space-x-2 py-0.5 items-center">
                <ControlButton icon="arrow_upward" />
                <ControlButton icon="arrow_downward" />
                <div className="w-px h-6 bg-gray-300 mx-2"></div>
                <ControlButton icon="rotate_left" />
                <ControlButton icon="rotate_right" />
              </div>

              {/* Sheets Table */}
              <div className="h-32 border border-slate-600 bg-slate-800 overflow-auto relative">
                <table className="w-full text-left border-collapse retro-table">
                  <thead>
                    <tr>
                      <th className="w-48">Material Name</th>
                      <th className="w-32">Dimensions</th>
                      <th className="w-24">Thickness</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    {sheets.map((sheet) => (
                      <tr key={sheet.id} className="hover:bg-slate-700">
                        <td className="p-0">
                          <input 
                            type="text" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={sheet.material}
                            onChange={(e) => onUpdateSheet && onUpdateSheet(sheet.id, { material: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                          <input 
                            type="text" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={sheet.dimensions}
                            onChange={(e) => onUpdateSheet && onUpdateSheet(sheet.id, { dimensions: e.target.value })}
                          />
                        </td>
                        <td className="p-0">
                           <input 
                            type="number" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={sheet.thickness}
                            onChange={(e) => onUpdateSheet && onUpdateSheet(sheet.id, { thickness: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="p-0">
                           <input 
                            type="number" 
                            className="w-full bg-transparent text-white px-1 py-1 focus:bg-slate-600 outline-none" 
                            value={sheet.quantity}
                            onChange={(e) => onUpdateSheet && onUpdateSheet(sheet.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 4 - sheets.length) }).map((_, i) => (
                      <tr key={i}><td>&nbsp;</td><td></td><td></td><td></td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="absolute bottom-4 left-4 right-4 h-px bg-slate-600"></div>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end pt-2 space-x-3">
                <button 
                  onClick={() => {
                    console.log('🔴 Nest button clicked');
                    console.log('onStartNesting function:', typeof onStartNesting, onStartNesting ? 'defined' : 'UNDEFINED');
                    if (onStartNesting) {
                      console.log('Calling onStartNesting...');
                      onStartNesting();
                    } else {
                      console.error('ERROR: onStartNesting is undefined!');
                    }
                  }}
                  className="px-6 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm hover:bg-green-800 active:translate-y-px text-sm text-black font-bold"

                >
                  Nest
                </button>
                <button onClick={onCloseModal} className="px-6 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm hover:bg-slate-600 active:translate-y-px text-sm text-black">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Database Selection Modal */}
      {showStockModal && (
        <div className="absolute inset-0 flex items-center justify-center z-[80] bg-black/40 backdrop-blur-[1px]">
           <div className="bg-slate-800 w-[600px] shadow-modal border-2 border-yellow-600 flex flex-col font-sans text-xs">
                <div className="h-7 bg-gradient-to-r from-slate-700 to-slate-600 flex justify-between items-center px-2 select-none border-b border-slate-500">
                   <span className="font-bold text-white flex items-center gap-2">Stock Sheet Database</span>
                   <button onClick={() => setShowStockModal(false)}><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
                <div className="p-2 h-64 overflow-auto bg-slate-900 border-b border-slate-500">
                  <table className="w-full text-left border-collapse retro-table">
                    <thead><tr><th>Material</th><th>Width</th><th>Height</th><th>Thick</th><th>Avail</th></tr></thead>
                    <tbody className="text-white bg-slate-800">
                      {stockSheets.map(stock => (
                        <tr key={stock.id} className={`cursor-pointer hover:bg-slate-700 ${selectedStockId === stock.id ? 'bg-blue-900' : ''}`} onClick={() => setSelectedStockId(stock.id)}>
                          <td>{stock.material}</td><td>{stock.width}</td><td>{stock.height}</td><td>{stock.thickness}</td><td>{stock.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end space-x-2 px-3 py-2 bg-slate-800">
                   <button onClick={handleAddFromStock} className="px-4 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm">Add to List</button>
                   <button onClick={() => setShowStockModal(false)} className="px-4 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm">Cancel</button>
                </div>
           </div>
        </div>
      )}
      
      {/* Define Sheet Parameters Modal */}
      {showSheetParamsModal && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <style>
            {`
              @keyframes textFlash {
                0%, 100% { color: #ffffff; }
                50% { color: #3b82f6; }
              }
              .animate-text-flash {
                animation: textFlash 0.5s infinite;
              }
            `}
          </style>
          <div className="w-[520px] bg-black shadow-modal rounded-lg flex flex-col pointer-events-auto text-xs font-sans border border-gray-700 animate-text-flash">
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-800 select-none">
              <span className="font-medium text-[13px] animate-text-flash">Define Sheet Parameters</span>
              <button onClick={onCloseSheetParams} className="text-white hover:text-white rounded-sm">
                <span className="material-symbols-outlined text-[16px] animate-text-flash">close</span>
              </button>
            </div>
            
            <div className="p-4 flex gap-4">
              {/* Left: Preview */}
              <div className="w-[180px] flex flex-col">
                <div className="text-center mb-1 text-white text-[11px] font-semibold animate-text-flash">Sheet Preview</div>
                <div className="flex-1 border-2 border-gray-600 bg-gray-900 p-1 rounded" style={{ minHeight: '180px' }}>
                  {selectedSheetGeometry && selectedSheetGeometry.length > 0 ? (
                    <VectorPreview 
                      geometry={cadEntitiesToGeometry(selectedSheetGeometry)}
                      width={176}
                      height={176}
                      className="w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      No Geometry
                    </div>
                  )}
                </div>
                {/* Dimensions Display */}
                <div className="mt-2 text-center">
                  <div className="text-[10px] text-white">Dimensions (mm)</div>
                  <div className="text-blue-400 font-bold text-sm animate-text-flash">
                    {formSheetWidth} × {formSheetHeight}
                  </div>
                  <div className="text-[10px] text-white">
                    Area: {((formSheetWidth * formSheetHeight) / 1000000).toFixed(2)} m²
                  </div>
                </div>
              </div>
              
              {/* Right: Parameters */}
              <div className="flex-1 space-y-4">
              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] animate-text-flash">How Many of these Sheets (0 = No Limit)</label>
                  <div className="flex items-center border border-gray-600 rounded overflow-hidden w-16 h-6">
                    <input 
                        className="w-full h-full border-none p-1 text-right text-[11px] focus:ring-0 bg-black text-blue-500 selection:bg-blue-900 animate-text-flash" 
                        type="text" 
                        value={formSheetQty}
                        onChange={(e) => setFormSheetQty(Number(e.target.value) || 0)}
                    />
                    <div className="flex flex-col border-l border-gray-600 bg-gray-900">
                      <button 
                        onClick={() => setFormSheetQty(prev => prev + 1)}
                        className="h-3 w-4 flex items-center justify-center hover:bg-gray-800 border-b border-gray-600 text-white"
                      >
                        <span className="material-symbols-outlined text-[8px] leading-none animate-text-flash">arrow_drop_up</span>
                      </button>
                      <button 
                        onClick={() => setFormSheetQty(prev => Math.max(0, prev - 1))}
                        className="h-3 w-4 flex items-center justify-center hover:bg-gray-800 text-white"
                      >
                        <span className="material-symbols-outlined text-[8px] leading-none animate-text-flash">arrow_drop_down</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] animate-text-flash">Sheet Thickness</label>
                  <input 
                    className="w-16 h-6 border border-gray-600 rounded p-1 text-right text-[11px] focus:ring-1 focus:ring-blue-500 outline-none bg-black animate-text-flash" 
                    type="number" 
                    value={formSheetThickness}
                    onChange={(e) => setFormSheetThickness(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-1">
                <label className="text-[11px] animate-text-flash">Sheet Material</label>
                <div className="relative">
                  <select 
                    className="w-full h-7 border border-gray-600 rounded py-0 pl-2 pr-6 text-[11px] focus:ring-1 focus:ring-blue-500 outline-none bg-black animate-text-flash appearance-none"
                    value={formSheetMaterial}
                    onChange={(e) => setFormSheetMaterial(e.target.value)}
                  >
                    <option value="MDF">MDF</option>
                    <option value="Mild Steel">Mild Steel</option>
                    <option value="Stainless Steel">Stainless Steel</option>
                    <option value="Aluminum">Aluminum</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-1 pointer-events-none">
                    <span className="material-symbols-outlined text-[14px] text-white animate-text-flash">expand_more</span>
                  </div>
                </div>
              </div>
              </div>
              {/* End Right Parameters */}
            </div>
            {/* End flex container */}

            <div className="flex justify-center space-x-3 pb-4 pt-2 px-4">
              <button 
                onClick={handleSheetParamsOK}
                className="px-6 py-1 bg-black border border-blue-500 animate-text-flash rounded-[2px] hover:bg-gray-900 active:bg-gray-800 text-[11px] min-w-[70px]"
              >
                OK
              </button>
              <button 
                onClick={onCloseSheetParams}
                className="px-6 py-1 bg-black border border-gray-600 animate-text-flash rounded-[2px] hover:bg-gray-900 active:bg-gray-800 text-[11px] min-w-[70px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Part Parameters Modal - REDONE based on user request */}
      {showPartParamsModal && (
        <div className="absolute inset-0 flex items-center justify-center z-[70] bg-black/20 backdrop-blur-[1px]">
             <div className="bg-panel-light rounded shadow-2xl w-[600px] border border-gray-500 flex flex-col font-sans text-xs pointer-events-auto select-none">
                <div className="flex justify-between items-center px-3 py-2">
                    <h3 className="font-normal text-white">Define Part Parameters</h3>
                    <button onClick={onClosePartParams} className="text-white hover:text-red-500">
                        <span className="material-icons-outlined text-sm">close</span>
                    </button>
                </div>
                <div className="flex p-4 gap-6">
                    <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                            <label className="text-right text-white font-semibold">Name of Part</label>
                            <input 
                                className="w-full h-7 px-2 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded text-xs font-medium text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500" 
                                type="text" 
                                value={formPartName} 
                                onChange={(e)=>setFormPartName(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-[110px_1fr] items-start gap-2 pt-1">
                            <label className="text-right text-white mt-1 font-semibold">Number Required</label>
                            <div className="space-y-1">
                                <div className="flex items-center">
                                    <input 
                                        className="w-3 h-3 text-blue-600 border-slate-500 focus:ring-blue-500" 
                                        id="maxPoss" 
                                        name="numReq" 
                                        type="radio"
                                        checked={formReqType === 'max'}
                                        onChange={() => setFormReqType('max')}
                                    />
                                    <label className="ml-2 text-white font-medium" htmlFor="maxPoss">Maximum possible</label>
                                </div>
                                <div className="flex items-center">
                                    <input 
                                        className="w-3 h-3 text-blue-600 border-slate-500 focus:ring-blue-500" 
                                        id="fixedNum" 
                                        name="numReq" 
                                        type="radio"
                                        checked={formReqType === 'fixed'}
                                        onChange={() => setFormReqType('fixed')}
                                    />
                                    <input 
                                        className="ml-2 w-24 h-6 px-2 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded text-xs font-medium text-white" 
                                        type="text" 
                                        value={formNumReq} 
                                        onChange={(e)=>setFormNumReq(Number(e.target.value))}
                                        disabled={formReqType !== 'fixed'}
                                    />
                                </div>
                            </div>
                        </div>
                        <fieldset className="border border-slate-600 rounded p-2 mt-2">
                            <legend className="px-1 text-white text-[10px] font-semibold">Rotations to try</legend>
                            <div className="grid grid-cols-[90px_1fr] items-center gap-2">
                                <label className="text-right text-white font-medium">Rotation Angle</label>
                                <select 
                                    className="w-full h-7 px-2 py-0 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded text-xs bg-slate-700 font-medium text-white"
                                    value={formRotation}
                                    onChange={(e)=>setFormRotation(e.target.value)}
                                >
                                    <option>Any Angle</option>
                                    <option>90 Degrees</option>
                                    <option>180 Degrees</option>
                                </select>
                            </div>
                        </fieldset>
                        <div className="pl-[118px] space-y-1">
                            <div className="flex items-center">
                                <input 
                                    className="w-3 h-3 text-blue-600 border-slate-500 rounded focus:ring-blue-500" 
                                    id="mirrored" 
                                    type="checkbox"
                                    checked={formMirrored}
                                    onChange={(e)=>setFormMirrored(e.target.checked)}
                                />
                                <label className="ml-2 text-white font-medium" htmlFor="mirrored">Try Mirrored Shape</label>
                            </div>
                            <div className="flex items-center">
                                <input 
                                    className="w-3 h-3 text-blue-600 border-slate-500 rounded focus:ring-blue-500" 
                                    id="smallPart" 
                                    type="checkbox"
                                    checked={formSmallPart}
                                    onChange={(e)=>setFormSmallPart(e.target.checked)}
                                />
                                <label className="ml-2 text-white font-medium" htmlFor="smallPart">Define as Small Part</label>
                            </div>
                        </div>
                        <div className="grid grid-cols-[110px_1fr] items-center gap-2 pt-2">
                            <label className="text-right text-white font-semibold">Priority (1=Highest)</label>
                            <input 
                                className="w-24 h-7 px-2 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded text-xs font-medium text-white" 
                                type="text" 
                                value={formPriority} 
                                onChange={(e)=>setFormPriority(Number(e.target.value))}
                            />
                        </div>
                        <div className="grid grid-cols-[110px_1fr] items-center gap-2">
                            <label className="text-right text-white font-semibold">Kit Number</label>
                            <input 
                                className="w-24 h-7 px-2 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded text-xs font-medium text-white" 
                                type="text"
                                value={formKitNum}
                                onChange={(e)=>setFormKitNum(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Preview Panel */}
                    <div className="w-[220px] flex flex-col gap-2">
                        <div className="text-center text-sm text-white font-semibold">
                            Preview 
                            <span className="text-[10px] text-yellow-400 ml-2">
                                ({selectedPartGeometry?.length || 0} entities)
                            </span>
                        </div>
                        
                        {/* Canvas Preview */}
                        <div className="relative w-full h-[220px] border-2 border-gray-700 bg-gray-900 rounded overflow-hidden">
                            {selectedPartGeometry && selectedPartGeometry.length > 0 ? (
                                <VectorPreview 
                                    geometry={cadEntitiesToGeometry(selectedPartGeometry)}
                                    width={216}
                                    height={216}
                                    className="w-full h-full"
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-xs gap-2">
                                    <div>No Preview</div>
                                    <div className="text-[10px] text-red-400">
                                        Debug: {selectedPartGeometry === null ? 'NULL' : `Empty (${selectedPartGeometry?.length})`}
                                    </div>
                                    <div className="text-[10px] text-white">
                                        Check console for details
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Dimensions Info */}
                        <div className="bg-gray-800 rounded p-2 space-y-1">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-white">Width:</span>
                                <span className="text-sm text-blue-400 font-bold">{formPartWidth || 0} mm</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-white">Height:</span>
                                <span className="text-sm text-blue-400 font-bold">{formPartHeight || 0} mm</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-gray-700">
                                <span className="text-[10px] text-white">Area:</span>
                                <span className="text-xs text-green-400 font-semibold">
                                    {(((formPartWidth || 0) * (formPartHeight || 0)) / 1000000).toFixed(4)} m²
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end space-x-2 px-4 py-3 pb-4">
                    <button onClick={handleParamsOK} className="px-6 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded shadow-sm hover:bg-slate-600 text-white font-medium">OK</button>
                    <button onClick={onClosePartParams} className="px-6 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded shadow-sm hover:bg-slate-600 text-white font-medium">Cancel</button>
                </div>
             </div>
        </div>
      )}
      
      {/* Settings Modal (Corrected UI) */}
      {showSettingsModal && (
         <div className="absolute inset-0 flex items-center justify-center z-[60] pointer-events-none">
             <div className="w-[600px] h-auto shadow-modal border flex flex-col pointer-events-auto text-[11px] font-sans rounded-sm select-none cursor-default bg-slate-800 border-slate-500 text-white">
                {/* Header */}
                <div className="h-8 flex justify-between items-center px-2 select-none border-b bg-slate-700 border-slate-600">
                   <div className="flex items-center space-x-2">
                      <span className="material-symbols-outlined text-white text-sm">build</span>
                      <span className="font-normal text-white text-xs">Settings</span>
                   </div>
                   <button onClick={onCloseSettings} className="w-6 h-5 flex items-center justify-center hover:bg-red-500 hover:text-white rounded-sm transition-colors">
                     <span className="material-symbols-outlined text-sm">close</span>
                   </button>
                </div>

                 {/* Tabs */}
                 <div className="px-2 pt-2 border-b flex space-x-0.5 bg-slate-700 border-slate-500">
                    <div onClick={() => setSettingsTab('general')} className={`px-4 py-1 cursor-pointer border-t border-l border-r ${settingsTab === 'general' ? 'bg-slate-800 border-slate-500 text-white font-semibold relative top-px z-10' : 'bg-slate-700 border-transparent text-white hover:bg-slate-600'}`}>General</div>
                    <div onClick={() => setSettingsTab('engine')} className={`px-4 py-1 cursor-pointer border-t border-l border-r ${settingsTab === 'engine' ? 'bg-slate-800 border-slate-500 text-white font-semibold relative top-px z-10' : 'bg-slate-700 border-transparent text-white hover:bg-slate-600'}`}>Options</div>
                    
                    <div onClick={() => setSettingsTab('extensions')} className={`px-4 py-1 cursor-pointer border-t border-l border-r ${settingsTab === 'extensions' ? 'bg-slate-800 border-slate-500 text-white font-semibold relative top-px z-10' : 'bg-slate-700 border-transparent text-white hover:bg-slate-600'}`}>Extensions</div>
                 </div>

                {/* Content Area */}
                <div className="p-3 min-h-[300px] bg-slate-800">
                  {settingsTab === 'general' && (
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-3">
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Settings</legend>
                            <div className="flex space-x-1 mb-2 mt-0.5">
                              <button className="p-1 hover:bg-slate-600 border border-transparent hover:border-slate-500 rounded-sm">
                                <span className="material-symbols-outlined text-yellow-600 text-base">note_add</span>
                              </button>
                              <button className="p-1 hover:bg-slate-600 border border-transparent hover:border-slate-500 rounded-sm">
                                <span className="material-symbols-outlined text-yellow-600 text-base">folder_open</span>
                              </button>
                              <button className="p-1 hover:bg-slate-600 border border-transparent hover:border-slate-500 rounded-sm">
                                <span className="material-symbols-outlined text-white text-base">save</span>
                              </button>
                              <button className="p-1 hover:bg-slate-600 border border-transparent hover:border-slate-500 rounded-sm">
                                <span className="material-symbols-outlined text-red-600 text-base">delete</span>
                              </button>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-white">Default NestList Settings File:</label>
                              <input className="w-full h-6 border border-slate-500 bg-slate-300 text-black text-right px-1 text-xs focus:ring-0 focus:border-blue-400" disabled type="text"/>
                            </div>
                          </fieldset>
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Export / Import</legend>
                            <div className="flex space-x-1 mt-2">
                              <button onClick={handleExportSettings} className="flex-1 p-2 border shadow-sm rounded-[2px] text-xs font-medium flex items-center justify-center space-x-1 bg-slate-700 border-slate-500 text-white hover:bg-slate-600">
                                <span className="material-symbols-outlined text-sm">file_download</span>
                                <span>Export Settings</span>
                              </button>
                              <button onClick={handleImportSettings} className="flex-1 p-2 border shadow-sm rounded-[2px] text-xs font-medium flex items-center justify-center space-x-1 bg-slate-700 border-slate-500 text-white hover:bg-slate-600">
                                <span className="material-symbols-outlined text-sm">file_upload</span>
                                <span>Import Settings</span>
                              </button>
                            </div>
                          </fieldset>
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Nesting Method</legend>
                            <select 
                               className="w-full h-7 border border-slate-500 text-xs py-0 pl-1 pr-6 focus:ring-0 focus:border-blue-400 mt-1"
                               value={appSettings.nestingMethod}
                               onChange={(e) => handleSettingChange('nestingMethod', e.target.value)}
                            >
                              <option value="Rectangular">Rectangular</option>
                              <option value="TrueShape">TrueShape</option>
                              <option value="Original">Original</option>
                              <option value="VeroNester">Vero Nester</option>
                            </select>
                          </fieldset>
                         <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                           <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Items to be Nested</legend>
                           <div className="flex flex-col space-y-1.5 mt-1">
                             <label className="flex items-center space-x-2 cursor-pointer">
                               <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" name="nested_items" type="radio" checked={appSettings.itemType === 'Toolpaths'} onChange={() => handleSettingChange('itemType', 'Toolpaths')} />
                               <span>Toolpaths</span>
                             </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                               <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" name="nested_items" type="radio" checked={appSettings.itemType === 'Geometries'} onChange={() => handleSettingChange('itemType', 'Geometries')} />
                               <span className="font-medium">Geometries</span>
                             </label>
                             <label className="flex items-center space-x-2 cursor-pointer">
                               <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" name="nested_items" type="radio" checked={appSettings.itemType === 'Both'} onChange={() => handleSettingChange('itemType', 'Both')} />
                               <span>Toolpaths and Enclosed Geometries</span>
                             </label>
                           </div>
                         </fieldset>
                       </div>
                       <div className="space-y-4">
                         <div className="w-full aspect-[4/3] bg-slate-700 border border-gray-200 relative p-2">
                           {/* SVG Preview for General Tab */}
                           {renderGeneralSVG(appSettings.nestingMethod)}
                         </div>
                         <fieldset className="border border-slate-500 p-2 rounded-sm bg-slate-700/50 relative pt-3">
                           <legend className="absolute -top-2 left-2 px-1 text-white font-semibold bg-slate-800 text-[10px]">Nest List Name</legend>
                           <input className="w-full h-7 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white px-2 text-xs focus:ring-0 focus:border-blue-400" type="text" defaultValue={activeNestList || "New Nest List 1"} />
                         </fieldset>
                       </div>
                       

                     </div>
                  )}

                   {settingsTab === 'engine' && (
                     <div className="flex space-x-4">
                       <div className="w-1/2 h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                          {/* Pack Direction 3x3 Grid */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Pack Direction</legend>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {[
                                { value: 'TL', label: 'TL' },
                                { value: 'T', label: 'T' },
                                { value: 'TR', label: 'TR' },
                                { value: 'L', label: 'L' },
                                { value: 'Custom', label: 'Custom' },
                                { value: 'R', label: 'R' },
                                { value: 'BL', label: 'BL' },
                                { value: 'B', label: 'B' },
                                { value: 'BR', label: 'BR' }
                              ].map(btn => (
                                <button
                                  key={btn.value}
                                  onClick={() => handleSettingChange('packTo', btn.value)}
                                  className={`py-1 px-2 text-xs font-semibold border rounded transition-all ${
                                    appSettings.packTo === btn.value
                                      ? 'bg-blue-600 border-blue-700 text-white'
                                      : 'bg-slate-700 border-slate-500 text-white hover:bg-gray-50'
                                  }`}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </fieldset>

                          {/* Custom Angle (visible when Custom is selected) */}
                          {appSettings.packTo === 'Custom' && (
                            <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                              <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Custom Angle (°)</legend>
                              <div className="flex items-center gap-2 mt-1">
                                <input 
                                  type="number" 
                                  value={appSettings.customAngle}
                                  onChange={(e) => handleSettingChange('customAngle', Number(e.target.value))}
                                  className="flex-1 h-7 border border-slate-500 text-right px-2 text-xs focus:ring-0 focus:border-blue-400 bg-slate-200 text-black font-bold focus:bg-white"
                                />
                                
                              </div>
                            </fieldset>
                          )}

                          {/* Gap Fields */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Gap Settings</legend>
                            <div className="space-y-2 mt-1">
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Min Gap Between Paths</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.gaps.minGapPath} onChange={(e) => handleGapChange('minGapPath', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Sheet Edge Gap</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.gaps.sheetEdgeGap} onChange={(e) => handleGapChange('sheetEdgeGap', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Lead In Gap</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.gaps.leadInGap} onChange={(e) => handleGapChange('leadInGap', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Time Per Sheet</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.gaps.timePerSheet} onChange={(e) => handleGapChange('timePerSheet', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Total Comp Time</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.gaps.totalCompTime} onChange={(e) => handleGapChange('totalCompTime', Number(e.target.value))} />
                              </div>
                            </div>
                          </fieldset>
                          {/* Second half moved under first half */}
                          {/* Search Resolution */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Search Resolution</legend>
                            <div className="flex items-center justify-between mt-2">
                              <label className="text-gray-200">Search Resolution (1-100)</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="100" 
                                value={appSettings.searchResolution}
                                onChange={(e) => handleSettingChange('searchResolution', Number(e.target.value))}
                                className="w-12 h-6 text-right px-1 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white text-xs focus:ring-0 focus:border-blue-400"
                              />
                            </div>
                          </fieldset>

                          {/* Evenly Spaced Parts */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Options</legend>
                            <label className="flex items-center space-x-2 cursor-pointer mt-1">
                              <input 
                                type="checkbox" 
                                checked={appSettings.evenlySpacedParts}
                                onChange={(e) => handleSettingChange('evenlySpacedParts', e.target.checked)}
                                className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span className="text-white text-xs">Evenly Spaced Parts</span>
                            </label>
                          </fieldset>
                       </div>
                       
                       {/* SVG Preview Right Column */}
                       <div className="w-1/2 flex flex-col justify-center items-center gap-4">
                          <div className="w-full flex flex-col items-center">
                            <div className="w-full aspect-[4/3] max-h-[160px] relative p-2 shadow-inner mb-2 flex items-center justify-center bg-slate-700 border-slate-500 border">
                              {renderEngineSVG(appSettings.packTo, appSettings.customAngle)}
                            </div>
                            <div className="text-xs text-slate-400 text-center px-2">
                              Mô phỏng hướng xếp (Pack Direction)
                            </div>
                          </div>
                          <div className="w-full flex flex-col items-center border-t border-slate-600 pt-4">
                            <div className="w-full aspect-[4/3] max-h-[160px] relative p-2 shadow-inner mb-2 flex items-center justify-center bg-slate-700 border-slate-500 border">
                              {renderRectEngineSVG(appSettings.rectEngine.cutDirection, appSettings.rectEngine.optimizeFor)}
                            </div>
                            <div className="text-xs text-slate-400 text-center px-2">
                              Mô phỏng hướng cắt (Guillotine)
                            </div>
                          </div>
                       </div>
                     </div>
                  )}

                   {settingsTab === 'rectengine' && (
                     <div className="flex space-x-4">
                       <div className="w-1/2 h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                          {/* Optimize For */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Optimize For</legend>
                            <div className="flex flex-col space-y-1 mt-1">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.optimizeFor === 'Cuts'} onChange={() => handleRectEngineChange('optimizeFor', 'Cuts')} />
                                <span className="text-xs text-white">Cuts</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.optimizeFor === 'Space'} onChange={() => handleRectEngineChange('optimizeFor', 'Space')} />
                                <span className="text-xs text-white">Space</span>
                              </label>
                            </div>
                          </fieldset>

                          {/* Cut Direction */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Cut Direction</legend>
                            <div className="flex flex-col space-y-1 mt-1">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.cutDirection === 'X'} onChange={() => handleRectEngineChange('cutDirection', 'X')} />
                                <span className="text-xs text-white">X</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.cutDirection === 'Y'} onChange={() => handleRectEngineChange('cutDirection', 'Y')} />
                                <span className="text-xs text-white">Y</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.cutDirection === 'Auto'} onChange={() => handleRectEngineChange('cutDirection', 'Auto')} />
                                <span className="text-xs text-white">Auto</span>
                              </label>
                            </div>
                          </fieldset>

                          {/* Number Inputs */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Dimensions</legend>
                            <div className="space-y-2 mt-1">
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Cut Width</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.rectEngine.cutWidth} onChange={(e) => handleRectEngineChange('cutWidth', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Min Part Gap</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.rectEngine.minPartGap} onChange={(e) => handleRectEngineChange('minPartGap', Number(e.target.value))} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-gray-200">Gap at Sheet Edge</label>
                                <input className="w-12 h-6 text-right px-1 border border-slate-500 text-xs text-black font-bold bg-slate-200 focus:bg-white focus:ring-0 focus:border-blue-400" type="number" value={appSettings.rectEngine.gapAtSheetEdge} onChange={(e) => handleRectEngineChange('gapAtSheetEdge', Number(e.target.value))} />
                              </div>
                            </div>
                          </fieldset>
                          {/* Second half moved under first half */}
                          {/* NC Code */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">NC Code</legend>
                            <div className="flex flex-col space-y-1 mt-1">
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.ncCode === 'Subroutines'} onChange={() => handleRectEngineChange('ncCode', 'Subroutines')} />
                                <span className="text-xs text-white">Subroutines</span>
                              </label>
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5" type="radio" checked={appSettings.rectEngine.ncCode === 'Linear'} onChange={() => handleRectEngineChange('ncCode', 'Linear')} />
                                <span className="text-xs text-white">Linear</span>
                              </label>
                            </div>
                          </fieldset>

                          {/* Optimise Level */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Optimise Level (1-10)</legend>
                            <div className="flex items-center justify-between mt-2">
                              <label className="text-gray-200">Level</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={appSettings.rectEngine.optimiseLevel}
                                onChange={(e) => handleRectEngineChange('optimiseLevel', Number(e.target.value))}
                                className="w-12 h-6 text-right px-1 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white text-xs focus:ring-0 focus:border-blue-400"
                              />
                            </div>
                          </fieldset>

                          {/* Sheet/Nest Balance */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Sheet/Nest Balance (1-10)</legend>
                            <div className="flex items-center justify-between mt-2">
                              <label className="text-gray-200">Balance</label>
                              <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={appSettings.rectEngine.sheetNestBalance}
                                onChange={(e) => handleRectEngineChange('sheetNestBalance', Number(e.target.value))}
                                className="w-12 h-6 text-right px-1 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white text-xs focus:ring-0 focus:border-blue-400"
                              />
                            </div>
                          </fieldset>

                          {/* Select Best Sheet */}
                          <fieldset className="border p-2 rounded-sm border-slate-500 bg-slate-700/50">
                            <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Options</legend>
                            <label className="flex items-center space-x-2 cursor-pointer mt-1">
                              <input 
                                type="checkbox" 
                                checked={appSettings.rectEngine.selectBestSheet}
                                onChange={(e) => handleRectEngineChange('selectBestSheet', e.target.checked)}
                                className="text-blue-600 border-slate-500 focus:ring-0 w-3.5 h-3.5"
                              />
                              <span className="text-white text-xs">Select Best Sheet</span>
                            </label>
                          </fieldset>
                        </div>
                      </div>
                   )}

                  {settingsTab === 'extensions' && (
                     <div className="flex space-x-4 h-[300px]">
                       <div className="w-1/2 flex flex-col h-full">
                         <fieldset className="border p-2 rounded-sm flex flex-col h-full border-slate-500 bg-slate-700/50">
                           <legend className="px-1 ml-1 font-semibold rounded text-white bg-slate-800">Special Functions</legend>
                           <div className="bg-slate-700 border border-slate-500 text-white overflow-y-scroll flex-1 p-1">
                             <div className="flex flex-col space-y-0.5">
                              {['Assisted Nest', 'Bridged Nesting', 'Cut Small Parts First', 'Cut Whole Part Together', 'Drill then Cut Inner Paths First', 'Group Each Part Separately', 'Leave Edge Gap Uncut', 'Merge Like Part Quantities', 'Minimise Sheet Patterns', 'Minimise Tool Changes', 'Nest Small Parts First', 'Onion Skin Small Parts', 'Order By Part', 'Part Quantity Multiplier'].map((label, idx) => {
                                const isEnabled = appSettings.extensions.enabledExtensions.includes(label);
                                return (
                                  <label key={idx} className={`flex items-center space-x-2 cursor-pointer hover:bg-blue-900 px-1 py-0.5 ${isEnabled ? 'bg-blue-800' : ''}`}>
                                    <input 
                                      className="text-blue-600 border-slate-500 rounded-sm focus:ring-0 w-3.5 h-3.5" 
                                      type="checkbox" 
                                      checked={isEnabled}
                                      onChange={() => {
                                        const current = appSettings.extensions.enabledExtensions;
                                        const updated = isEnabled
                                          ? current.filter(e => e !== label)
                                          : [...current, label];
                                        handleExtensionsChange('enabledExtensions', updated);
                                      }}
                                    />
                                    <span>{label}</span>
                                  </label>
                                );
                              })}
                             </div>
                           </div>
                         </fieldset>
                         <div className="mt-2 flex justify-center">
                           <button className="px-8 py-1 bg-slate-700 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white shadow-sm hover:bg-slate-600 active:translate-y-px rounded-[2px]">Configure</button>
                         </div>
                       </div>
                       <div className="w-1/2 flex items-start justify-center pt-2">
                         <div className="bg-slate-700 p-4 shadow-sm border border-slate-600">
                           <svg height="180" viewBox="0 0 250 180" width="250" xmlns="http://www.w3.org/2000/svg">
                             <rect fill="none" height="179" stroke="#FFFF00" strokeWidth="2" width="249" x="0.5" y="0.5"></rect>
                             <path d="M10,10 L70,10 L70,30 L130,30 L130,130 L70,130 L70,170 L10,170 Z" fill="none" stroke="#00FF00" strokeWidth="2"></path>
                             <circle cx="20" cy="20" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <path d="M75,10 L170,10 L170,125 L135,125 L135,35 L75,35 Z" fill="none" stroke="#00FF00" strokeWidth="2"></path>
                             <circle cx="85" cy="20" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="158" cy="20" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="80" cy="45" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="158" cy="115" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <path d="M55,135 L65,135 L65,175 L130,175 L130,135 L170,135 L170,175 L180,175 L180,178 L55,178 Z" fill="none" stroke="#00FF00" strokeWidth="2"></path>
                             <circle cx="125" cy="165" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <path d="M175,10 L245,10 L245,50 L210,50 L210,135 L245,135 L245,175 L175,175 L175,10 Z" fill="none" stroke="#00FF00" strokeWidth="2"></path>
                             <circle cx="185" cy="25" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="230" cy="25" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="230" cy="65" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="185" cy="130" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="230" cy="160" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                             <circle cx="158" cy="160" fill="none" r="3" stroke="#00FF00" strokeWidth="2"></circle>
                           </svg>
                         </div>
                       </div>
                     </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="px-3 py-2 bg-slate-800 flex justify-end space-x-2">
                   <button onClick={handleSaveSettings} className="px-6 py-1 border shadow-sm active:translate-y-px rounded-[2px] min-w-[70px] bg-slate-700 border-slate-500 text-white hover:bg-slate-600">OK</button>
                   <button onClick={onCloseSettings} className="px-6 py-1 border shadow-sm active:translate-y-px rounded-[2px] min-w-[70px] bg-slate-700 border-slate-500 text-white hover:bg-slate-600">Cancel</button>
                </div>
             </div>
         </div>
       )}

      {/* Hidden file input for settings import */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept=".json" 
        onChange={handleFileSelected} 
        hidden 
      />

      {/* Hidden file input for DXF/DWG/SVG import */}
      <input 
        ref={dxfImportRef} 
        type="file" 
        accept=".dxf,.dwg,.svg" 
        onChange={handleDXFFileSelected} 
        hidden 
      />

      {/* Hidden file input for DXF→Part direct import */}
      <input
        ref={dxfAsPartImportRef}
        type="file"
        accept=".dxf,.dwg,.svg"
        onChange={handleDXFAsPartFileSelected}
        hidden
      />

      {/* Fireworks Overlay */}
      <AnimatePresence>
        {showFireworksOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999]"
          >
            <FireworksOverlay onClose={() => setShowFireworksOverlay(false)} />
          </motion.div>
        )}
      </AnimatePresence>

     </main>
   );
 };

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <div onClick={onClick} className={`px-4 py-1 cursor-pointer border-t border-l border-r border-b ${active ? 'bg-slate-800 border-slate-500 border-b-transparent text-white relative top-px z-10 font-semibold' : 'bg-slate-700 border-transparent text-white hover:bg-slate-600'}`}>{label}</div>
);

const ModalToolBtn: React.FC<{ icon: string; label: string; iconColor: string; onClick?: () => void }> = ({ icon, label, iconColor, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center p-1 hover:bg-[#ffe8a6] hover:border-[#e5cd7a] border border-transparent rounded-[2px] min-w-[50px] group ${onClick ? 'cursor-pointer' : 'cursor-default'}`}>
    <span className={`material-symbols-outlined ${iconColor} text-2xl drop-shadow-sm`}>{icon}</span>
    <span className="text-[9px] text-center leading-tight mt-0.5 text-white" dangerouslySetInnerHTML={{ __html: label }}></span>
  </button>
);

const ControlButton: React.FC<{ icon: string }> = ({ icon }) => (
  <button className="p-1 bg-slate-800 border border-slate-500 bg-slate-200 text-black font-bold focus:bg-white rounded hover:bg-slate-600 active:bg-gray-300 shadow-sm"><span className="material-symbols-outlined text-lg text-white">{icon}</span></button>
);

const ManualNestBtn: React.FC<{ icon: string; label: string; small?: boolean }> = ({ icon, label, small }) => (
   <button className={`flex flex-col items-center justify-center p-1 border border-slate-600 bg-slate-700 hover:bg-slate-600 rounded-sm active:translate-y-px shadow-sm ${small ? 'h-8' : 'h-12'}`}>
      <span className={`material-symbols-outlined text-white ${small ? 'text-sm' : 'text-xl'}`}>{icon}</span>
      {!small && <span className="text-[9px] text-white mt-0.5">{label}</span>}
   </button>
);

const InfoRow: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <tr>
    <td className="py-2 px-3 text-white text-xs font-medium border-b border-slate-700">{label}:</td>
    <td className={`py-2 px-3 text-right text-xs border-b border-slate-700 ${highlight ? 'font-bold text-green-600' : 'text-white'}`}>{value}</td>
  </tr>
);

export default Workspace;
