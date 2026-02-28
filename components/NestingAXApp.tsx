import React, { useState, useEffect, useCallback } from 'react';
import Header from './NestingAX/Header';
import Sidebar from './NestingAX/Sidebar';
import Workspace from './NestingAX/Workspace';
import Footer from './NestingAX/Footer';
import ContextMenu from './NestingAX/ContextMenu';
import RadialMenu from './NestingAX/RadialMenu';
import PerformingNest from './NestingAX/PerformingNest';
import LayerPanel from './NestingAX/LayerPanel';
import { db, NestList, Part, Sheet, AppSettings, Layer, CadEntity } from './NestingAX/services/db';
import { nestingService, configFromSettings } from './NestingAX/services/nesting';
import { SnapMode } from './NestingAX/services/snapService';
import { layerManager } from './NestingAX/services/layerManager';
import { undoManager } from './NestingAX/services/undoManager';
import { motion, AnimatePresence } from 'framer-motion';
import FireworksHighTech from './FireworksHighTech';


function NestingAXApp() {
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const dxfImportHandlerRef = React.useRef<(() => void) | null>(null);
  const exportHandlerRef = React.useRef<((format: 'dxf' | 'svg' | 'pdf') => void) | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // FOOTER 1 — Mirror states from Workspace
  const setCrosshairSizeRef = React.useRef<((size: number) => void) | null>(null);
  const [wsZoom, setWsZoom] = useState(0.8);
  const [wsShowCrosshair, setWsShowCrosshair] = useState(true);
  const [wsCrosshairSize, setWsCrosshairSize] = useState(100);
  const [wsShowDynInput, setWsShowDynInput] = useState(true);
  
  // Data State
  const [nestLists, setNestLists] = useState<NestList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [currentParts, setCurrentParts] = useState<Part[]>([]);
  const [currentSheets, setCurrentSheets] = useState<Sheet[]>([]);

  // Real-Time Selection Preview State (for PREVIEW 2)
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [allCadEntities, setAllCadEntities] = useState<CadEntity[]>([]);

  // Compute selected geometry for Preview 2
  const selectedGeometry = React.useMemo(() => {
    if (selectedEntityIds.size === 0) return [];
    return allCadEntities.filter(entity => selectedEntityIds.has(entity.id));
  }, [selectedEntityIds, allCadEntities]);

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; listId?: string } | null>(null);
  const [radialMenu, setRadialMenu] = useState<{ x: number; y: number } | null>(null);

  // Workflow: Nesting Execution
  const [isNesting, setIsNesting] = useState(false);
  const [isNestingHidden, setIsNestingHidden] = useState(false);
  const [nestingProgress, setNestingProgress] = useState(0);
  const [nestingStatus, setNestingStatus] = useState("Initializing...");
  // Rich nesting progress state (for PerformingNest modal)
  const [nestingPartsPlaced, setNestingPartsPlaced] = useState(0);
  const [nestingTotalParts, setNestingTotalParts] = useState(0);
  const [nestingSheetsUsed, setNestingSheetsUsed] = useState(1);
  const [nestingUtilization, setNestingUtilization] = useState(0);
  const [nestingPlacements, setNestingPlacements] = useState<Array<{
    partId: string; x: number; y: number; w: number; h: number; rotation: number;
    polygon?: { x: number; y: number }[];
  }>>([]);
  const [nestingSheetW, setNestingSheetW] = useState(0);
  const [nestingSheetH, setNestingSheetH] = useState(0);

  // Workflow: Add Part From Drawing
  const [isSelecting, setIsSelecting] = useState(false);
  const [showPartParamsModal, setShowPartParamsModal] = useState(false);
  
  // Workflow: Add Sheet From Drawing
  const [isSelectingSheet, setIsSelectingSheet] = useState(false);
  const [showSheetParamsModal, setShowSheetParamsModal] = useState(false);

  // Workflow: Drawing Tools (Active Tool)
  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(null);

  // New Features State
  const [isManualNesting, setIsManualNesting] = useState(false);
  const [showNestingInfo, setShowNestingInfo] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);

  // Snap & Ortho State
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeSnaps, setActiveSnaps] = useState<Set<SnapMode>>(() => new Set(['point', 'midpoint', 'center'] as SnapMode[]));
  const [orthoEnabled, setOrthoEnabled] = useState(false);

  // Layers State (Task 18)
  const [layers, setLayers] = useState<Layer[]>(() => layerManager.getLayers());
  const [activeLayerId, setActiveLayerId] = useState<string>(() => layerManager.getActiveLayerId());
  const [showLayerPanel, setShowLayerPanel] = useState(false);

  const handleToggleSnap = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  const handleToggleSnapMode = useCallback((mode: SnapMode) => {
    setActiveSnaps(prev => {
      const next = new Set(prev);
      if (next.has(mode)) {
        next.delete(mode);
      } else {
        next.add(mode);
      }
      return next;
    });
  }, []);

  const handleToggleOrtho = useCallback(() => {
    setOrthoEnabled(prev => !prev);
  }, []);

  // Handle selection change from Workspace (for Preview 2)
  const handleSelectionChange = useCallback((selectedIds: Set<string>, allEntities: CadEntity[]) => {
    setSelectedEntityIds(selectedIds);
    setAllCadEntities(allEntities);
  }, []);

  const handleLayerChange = useCallback(() => {
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  // FOOTER 1: Close all overlays
  const handleCloseOverlays = useCallback(() => {
    setShowModal(false);
    setShowSettingsModal(false);
    setContextMenu(null);
    setRadialMenu(null);
    setShowPartParamsModal(false);
    setShowSheetParamsModal(false);
    setIsManualNesting(false);
    setShowNestingInfo(false);
    setShowLayerPanel(false);
    setIsSelecting(false);
    setIsSelectingSheet(false);
  }, []);

  const handleToggleLayerPanel = useCallback(() => {
    setShowLayerPanel(prev => !prev);
  }, []);

  const handleMouseWorldPos = useCallback((pos: { x: number; y: number }) => {
    setMouseWorldPos(pos);
  }, []);

  // Settings-derived state (for Sidebar badge)
  const [nestingMethod, setNestingMethod] = useState<AppSettings['nestingMethod']>(() => db.getSettings().nestingMethod);

  // --- Initialization (Load Data from DB) ---
  const loadLists = () => {
    const loadedLists = db.getNestLists();
    setNestLists(loadedLists);
    return loadedLists;
  };

  useEffect(() => {
    const loaded = loadLists();
    if (loaded.length > 0) {
      setActiveListId(loaded[loaded.length - 1].id);
    }
  }, []);

  // --- Reactive Data Loading ---
  const reloadData = () => {
    if (activeListId) {
      setCurrentParts(db.getParts(activeListId));
      setCurrentSheets(db.getSheets(activeListId));
    } else {
      setCurrentParts([]);
      setCurrentSheets([]);
    }
  };

  useEffect(() => {
    reloadData();
  }, [activeListId]);

  const [activePartId, setActivePartId] = useState<string | null>(null);
  const [partContextMenu, setPartContextMenu] = useState<{ x: number; y: number; partId: string } | null>(null);

  const handleMouseMove = (x: number, y: number) => {
    setCoords({ x, y });
  };

  const handleNewNestList = () => {
    const newListName = `Nest List ${nestLists.length + 1}`;
    const newList = db.createNestList(newListName);
    setNestLists([...nestLists, newList]);
    setActiveListId(newList.id);
    setShowModal(true);
  };

  const handleDeleteList = () => {
    if (contextMenu?.listId) {
      db.deleteNestList(contextMenu.listId);
      const updatedLists = loadLists();
      setNestLists(updatedLists);
      if (activeListId === contextMenu.listId) {
        if (updatedLists.length > 0) {
           setActiveListId(updatedLists[0].id);
        } else {
           setActiveListId(null);
        }
      }
      setContextMenu(null);
    }
  };

  const handleDeletePart = () => {
    if (partContextMenu?.partId) {
      db.deletePart(partContextMenu.partId);
      if (activeListId) {
        const updatedParts = db.getParts(activeListId);
        setCurrentParts(updatedParts);
        setNestLists(db.getNestLists());
      }
      setPartContextMenu(null);
      if (activePartId === partContextMenu.partId) setActivePartId(null);
    }
  };

  const handleSelectPart = (id: string | null) => {
    setActivePartId(id);
    if (id) {
      const part = currentParts.find(p => p.id === id);
      if (part && part.cadEntities) {
        // Logic to highlight entities on canvas can be added here if needed
        console.log('✨ Highlighting part:', part.name);
      }
    }
  };

  const handlePartContextMenu = (e: React.MouseEvent, partId: string) => {
    e.preventDefault();
    setPartContextMenu({ x: e.clientX, y: e.clientY, partId });
  };

  const handleContextAction = (action: 'nest' | 'configure') => {
    if (contextMenu?.listId) {
      setActiveListId(contextMenu.listId);
      if (action === 'nest' || action === 'configure') {
        setShowModal(true);
      }
    }
  };

  const handleNestParts = () => {
    if (activeListId) {
      setShowModal(true);
    } else {
      alert("Please create or select a Nest List first.");
    }
  };

  // --- 1.1.1 -> 1.1.5 NESTING WORKFLOW ---
  const handleStartNestingProcess = async () => {
    if (!currentParts.length || !currentSheets.length) {
      alert("Please add at least one part and one sheet before nesting.");
      return;
    }

    setShowModal(false);
    setIsNesting(true);
    setIsNestingHidden(false);
    setNestingProgress(0);
    setNestingStatus("Initializing Vero Algorithm...");
    setNestingPartsPlaced(0);
    setNestingTotalParts(0);
    setNestingSheetsUsed(1);
    setNestingUtilization(0);
    setNestingPlacements([]);
    setNestingSheetW(0);
    setNestingSheetH(0);

    try {
      // Load full AppSettings and extract engine config
      const appSettings: AppSettings = db.getSettings();
      const config = configFromSettings(appSettings);

      const results = await nestingService.start(
        currentParts, 
        currentSheets, 
        config, 
        (data) => {
          setNestingProgress(data.percent);
          if (data.status) setNestingStatus(data.status);
          setNestingPartsPlaced(data.partsPlaced);
          setNestingTotalParts(data.totalParts);
          setNestingSheetsUsed(data.sheetsUsed);
          setNestingUtilization(data.utilization);
          setNestingSheetW(data.currentSheetW);
          setNestingSheetH(data.currentSheetH);
          if (data.lastPlacement) {
            setNestingPlacements(prev => [...prev, data.lastPlacement!]);
          }
        }
      );
      
      const updates: Part[] = [];
      results.forEach(res => {
         const p = currentParts.find(p => p.id === res.partId);
         if (p) {
           updates.push({
             ...p,
             isNested: true,
             sheetId: res.sheetId,
             x: res.x,
             y: res.y,
             rotationAngle: res.rotation
           });
         }
      });
      db.updatePartsBatch(updates);
      reloadData();

    } catch (e) {
      console.error("Nesting failed", e);
      alert("Nesting Failed");
    } finally {
      setTimeout(() => {
        setIsNesting(false);
      }, 500);
    }
  };

  const handleStopNesting = () => {
    nestingService.stop();
    setIsNesting(false);
  };

  const handleAbortNesting = useCallback(() => {
    if (isNesting) {
      nestingService.stop();
    }
    setIsNesting(false);
  }, [isNesting]);

  // --- Manual Nesting Handler ---
  const handleManualNestToggle = () => {
    if (!activeListId) return alert("Please create or select a Nest List first.");
    setIsManualNesting(!isManualNesting);
    if (!isManualNesting) {
      setShowModal(false);
      setShowSettingsModal(false);
    }
  };

  const handleShowNestingInfo = () => {
    if (!activeListId) return alert("Please create or select a Nest List first.");
    setShowNestingInfo(true);
  };

  const handleSelectList = (id: string) => {
    setActiveListId(id);
    setShowModal(true);
    setIsManualNesting(false); 
  };

  // --- Part Workflow ---
  const handleStartSelectPart = () => {
    if (!activeListId) return alert("No active Nest List selected.");
    setShowModal(false);
    setIsSelecting(true);
  };

  const handleFinishSelectPart = () => {
    setIsSelecting(false);
    setShowPartParamsModal(true);
  };

  const handleClosePartParams = () => {
    setShowPartParamsModal(false);
    setIsSelecting(false);
    // ✅ Option: Reopen nest list modal after closing part params
    // Uncomment if you want auto-reopen behavior:
    // setTimeout(() => setShowModal(true), 300);
  };

  const handleAddPart = (partData: Omit<Part, 'id' | 'nestListId'>) => {
    if (!activeListId) return;
    
    console.log('📦 Alphacam Sync: Adding part with geometry snapshot');
    const newPart = db.addPart({ ...partData, nestListId: activeListId });
    
    // Refresh the lists to ensure Sidebar gets the new data immediately
    setNestLists(db.getNestLists());
    setCurrentParts([...currentParts, newPart]);
    
    setShowPartParamsModal(false);
    setIsSelecting(false); // Reset selection mode
    showToast(`✅ Part "${partData.name}" added successfully.`);
  };

  // --- Sheet Workflow ---
  const handleStartSelectSheet = () => {
    if (!activeListId) return alert("No active Nest List selected.");
    setShowModal(false);
    setIsSelectingSheet(true);
  };

  const handleFinishSelectSheet = () => {
    setIsSelectingSheet(false);
    setShowSheetParamsModal(true);
  };

  const handleCloseSheetParams = () => {
    setShowSheetParamsModal(false);
    setIsSelectingSheet(false);
  };

  const handleAddSheet = (sheetData: Omit<Sheet, 'id' | 'nestListId'>) => {
    if (!activeListId) return;
    const newSheet = db.addSheet({ ...sheetData, nestListId: activeListId });
    setCurrentSheets([...currentSheets, newSheet]);
    setShowSheetParamsModal(false);
    // ✅ FIX: Don't auto-open modal, consistent with Part behavior
    // setShowModal(true); // ← REMOVED
  };

  const handleUpdateSheet = (sheetId: string, sheetData: Partial<Sheet>) => {
    if (!activeListId) return;
    db.updateSheet(sheetId, sheetData);
    reloadData();
  };

  const handleUpdatePart = (partId: string, partData: Partial<Part>) => {
    if (!activeListId) return;
    const existingParts = db.getParts(activeListId);
    const part = existingParts.find(p => p.id === partId);
    if (!part) return;
    db.updatePart({ ...part, ...partData });
    reloadData();
  };

  const handleContextMenu = (e: React.MouseEvent, listId: string) => {
    e.preventDefault();
    e.stopPropagation(); 
    setRadialMenu(null); 
    setContextMenu({ x: e.clientX, y: e.clientY, listId });
  };

  const handleWorkspaceContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu(null); 
    
    // If drawing, right click usually cancels or finishes
    if (activeDrawTool) {
      setActiveDrawTool(null);
      return;
    }

    if (isSelecting) {
      handleFinishSelectPart();
    } else if (isSelectingSheet) {
      handleFinishSelectSheet();
    } else {
      setRadialMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSelectDrawTool = (tool: string) => {
    
    // Close radial menu first
    setRadialMenu(null);
    
    // Intercept special actions
    if (tool === 'undo') {
      undoManager.undo();
      return;
    }
    if (tool === 'redo') {
      undoManager.redo();
      return;
    }
    if (tool === 'layer_panel') {
      setShowLayerPanel(prev => !prev);
      return;
    }
    if (tool === 'fireworks') {
      setShowFireworks(true);
      return;
    }
    
    // Regular tool selection
    if (!activeListId) {
      alert("Please create or select a Nest List first.");
      return;
    }
    setActiveDrawTool(tool);
  };

  const [isWorkspaceLocked, setIsWorkspaceLocked] = useState(false);
  const [showBorderFlash, setShowBorderFlash] = useState(false);

  // High-end custom smooth scroll with easing
  const fluidScroll = (targetY: number, duration: number = 1000) => {
    const startY = window.pageYOffset;
    const difference = targetY - startY;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      const easing = progress < 0.5 
        ? 8 * progress * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 4) / 2;

      window.scrollTo(0, startY + difference * easing);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  // --- GLOBAL SCROLL LOCK MANAGER ---
  // Centralizes all scroll-locking logic to prevent conflicts
  useEffect(() => {
    if (isWorkspaceLocked) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isWorkspaceLocked]);

  const handleFullScreen = () => {
    // TRIGGER PREMIUM FLASH ANIMATION (2.5s sequence)
    setShowBorderFlash(true);
    setTimeout(() => setShowBorderFlash(false), 2500); 

    if (!isWorkspaceLocked) {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect();
        const y = rect.top + window.pageYOffset;
        const yOffset = -65;
        
        fluidScroll(y + yOffset, 1200);

        setTimeout(() => {
          document.body.style.overflow = 'hidden';
          setIsWorkspaceLocked(true);
          showToast("🔒 Workspace Locked & Focused");
        }, 1300);
      }
    } else {
      document.body.style.overflow = 'auto';
      fluidScroll(0, 1000);
      setIsWorkspaceLocked(false);
      showToast("🔓 Workspace Unlocked");
    }
  };
  const handleDXFImportFile = () => {
    dxfImportHandlerRef.current?.();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden relative">
      {/* --- CINEMATIC BORDER SCAN ANIMATION --- */}
      <AnimatePresence>
        {showBorderFlash && (
          <>
            {/* Left Laser Beam */}
            <motion.div 
              initial={{ height: 0, top: 0, opacity: 0 }}
              animate={{ 
                height: ['0%', '100%', '100%', '100%'],
                opacity: [0, 1, 1, 0],
                boxShadow: [
                  '0 0 0px #fff',
                  '0 0 20px #22d3ee',
                  '0 0 40px #fff',
                  '0 0 0px transparent'
                ]
              }}
              transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut" }}
              className="fixed left-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen"
            />
            {/* Right Laser Beam */}
            <motion.div 
              initial={{ height: 0, top: 0, opacity: 0 }}
              animate={{ 
                height: ['0%', '100%', '100%', '100%'],
                opacity: [0, 1, 1, 0],
                boxShadow: [
                  '0 0 0px #fff',
                  '0 0 20px #22d3ee',
                  '0 0 40px #fff',
                  '0 0 0px transparent'
                ]
              }}
              transition={{ duration: 2.5, times: [0, 0.3, 0.6, 1], ease: "circOut" }}
              className="fixed right-0 w-[2px] bg-gradient-to-b from-cyan-400 via-white to-transparent z-[10000] mix-blend-screen"
            />
            {/* Full Screen Pulse Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.15, 0] }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="fixed inset-0 bg-cyan-500/10 pointer-events-none z-[9999] mix-blend-overlay"
            />
          </>
        )}
      </AnimatePresence>

      <Header 
        onNewNestList={handleNewNestList}
        onNestParts={handleNestParts}
        onManualNest={handleManualNestToggle}
        onNestingInfo={handleShowNestingInfo}
        onFullScreen={handleFullScreen}
        isManualNesting={isManualNesting}
        onImportDXF={handleDXFImportFile}
        onUndo={() => undoManager.undo()}
        onRedo={() => undoManager.redo()}
        canUndo={undoManager.canUndo()}
        canRedo={undoManager.canRedo()}
        onToggleLayerPanel={handleToggleLayerPanel}
        onExportDXF={() => exportHandlerRef.current?.('dxf')}
        onExportPDF={() => exportHandlerRef.current?.('pdf')}
      />
      <div className="flex flex-1 overflow-hidden relative gap-0 min-h-0" ref={workspaceRef}>
        <Sidebar 
          nestLists={nestLists} 
          activeListId={activeListId}
          onSelectNestList={handleSelectList}
          parts={currentParts} 
          onContextMenu={handleContextMenu}
          onPartContextMenu={handlePartContextMenu}
          onSelectPart={handleSelectPart}
          activePartId={activePartId}
          nestingMethod={nestingMethod}
          selectedGeometry={selectedGeometry}
        />
        {showLayerPanel && (
          <div className="absolute left-16 top-16 z-50">
            <LayerPanel 
              layers={layers}
              activeLayerId={activeLayerId}
              onLayerChange={handleLayerChange}
              entities={[]}
              onEntitiesUpdate={() => {}}
            />
          </div>
        )}
        <Workspace
          onMouseMove={handleMouseMove} 
          showModal={showModal} 
          onCloseModal={() => setShowModal(false)}
          activeNestList={nestLists.find(l => l.id === activeListId)?.name}
          showSettingsModal={showSettingsModal}
          onOpenSettings={() => setShowSettingsModal(true)}
          onCloseSettings={() => { setShowSettingsModal(false); setNestingMethod(db.getSettings().nestingMethod); }}
          onContextMenu={handleWorkspaceContextMenu}
          
          // Nesting Trigger
          onStartNesting={handleStartNestingProcess}

          // Part Workflow
          isSelecting={isSelecting}
          onAddPartFromDrawing={handleStartSelectPart}
          showPartParamsModal={showPartParamsModal}
          onClosePartParams={handleClosePartParams}
          parts={currentParts}
          onAddPart={handleAddPart}

          // Sheet Workflow
          isSelectingSheet={isSelectingSheet}
          onAddSheetFromDrawing={handleStartSelectSheet}
          showSheetParamsModal={showSheetParamsModal}
          onCloseSheetParams={handleCloseSheetParams}
          sheets={currentSheets}
          onAddSheet={handleAddSheet}
          onUpdateSheet={handleUpdateSheet}
          onUpdatePart={handleUpdatePart}


          // Manual Nest
          isManualNesting={isManualNesting}
          onCloseManualNest={() => setIsManualNesting(false)}

          // Nesting Info
          showNestingInfo={showNestingInfo}
          onCloseNestingInfo={() => setShowNestingInfo(false)}

          // Drawing
          activeDrawTool={activeDrawTool}
          onCancelDraw={() => setActiveDrawTool(null)}
          onSelectTool={handleSelectDrawTool}

          // Snap & Ortho
          snapEnabled={snapEnabled}
          activeSnaps={activeSnaps}
          orthoEnabled={orthoEnabled}
          onToggleSnap={handleToggleSnap}
          onToggleOrtho={handleToggleOrtho}
          onSelectionChange={handleSelectionChange}

          // Layer System
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerChange={handleLayerChange}
          onStoreDXFHandler={(handler) => { dxfImportHandlerRef.current = handler; }}
          onStoreExportHandler={(handler) => { exportHandlerRef.current = handler; }}
          onMouseWorldPos={handleMouseWorldPos}

          // FOOTER 1 — Broadcast callbacks
          onZoomChange={setWsZoom}
          onCrosshairChange={setWsShowCrosshair}
          onCrosshairSizeChange={setWsCrosshairSize}
          onDynInputChange={setWsShowDynInput}
          onSetCrosshairSize={(fn) => { setCrosshairSizeRef.current = fn; }}
        />
        
        {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            onClose={() => setContextMenu(null)}
            onNest={() => handleContextAction('nest')}
            onConfigure={() => handleContextAction('configure')}
            onDelete={handleDeleteList}
          />
        )}

        {partContextMenu && (
          <div 
            className="fixed z-[9999] bg-slate-900 border border-slate-600 rounded-md shadow-2xl py-1 min-w-[140px] overflow-hidden"
            style={{ left: partContextMenu.x, top: partContextMenu.y }}
            onMouseLeave={() => setPartContextMenu(null)}
          >
            <div className="px-3 py-1 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800 mb-1">Part Options</div>
            <button 
              onClick={handleDeletePart}
              className="w-full px-3 py-2 text-left text-[11px] text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
              Delete This Part
            </button>
          </div>
        )}

        {radialMenu && (
          <RadialMenu 
            x={radialMenu.x} 
            y={radialMenu.y} 
            onClose={() => setRadialMenu(null)}
            onSelectTool={handleSelectDrawTool}
          />
        )}

        {isNesting && !isNestingHidden && (
          <PerformingNest
            progress={nestingProgress}
            partsPlaced={nestingPartsPlaced}
            totalParts={nestingTotalParts}
            sheetsUsed={nestingSheetsUsed}
            utilization={nestingUtilization}
            placements={nestingPlacements}
            currentSheetW={nestingSheetW}
            currentSheetH={nestingSheetH}
            onStop={handleStopNesting}
            onAbort={handleAbortNesting}
            onHide={() => setIsNestingHidden(true)}
            currentAction={nestingStatus}
          />
        )}
      </div>

      {showFireworks && <FireworksHighTech onComplete={() => setShowFireworks(false)} />}
      
      {/* ════════════════════════════════════════════════════════════════
          FOOTER 1 — Status Bar (AutoCAD 2022 Style)
          ════════════════════════════════════════════════════════════════ */}
      <div className="flex-none w-full h-7 bg-slate-900/95 border-t border-slate-700 flex items-center justify-between px-2 z-10 pointer-events-auto select-none" onWheel={e => e.preventDefault()}>
        {/* Left: Coordinates + Zoom */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">X:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.x.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-white/80">
            <span className="text-cyan-400 font-bold">Y:</span>
            <span className="w-20 text-green-400">{mouseWorldPos.y.toFixed(2)}</span>
          </div>
          <div className="h-4 w-px bg-slate-600"></div>
          <div className="flex items-center gap-1 text-white/60">
            <span>Zoom:</span>
            <span className="text-yellow-400">{Math.round(wsZoom * 100)}%</span>
          </div>
        </div>

        {/* Center: DYN + Crosshair indicators */}
        <div className="flex items-center gap-1 text-[10px]">
          {/* DYN indicator — read only */}
          <div
            className={`px-1.5 py-0.5 rounded-sm border font-bold select-none ${
              wsShowDynInput
                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
            title="Dynamic Input (F12)"
          >
            DYN
          </div>
          {/* Crosshair (+) indicator — read only */}
          <div
            className={`px-1.5 py-0.5 rounded-sm border font-bold select-none ${
              wsShowCrosshair
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300'
                : 'bg-slate-800 border-slate-600 text-slate-500'
            }`}
            title="Crosshair (F6)"
          >
            +
          </div>
        </div>

        {/* Right: Crosshair size slider + Close button */}
        <div className="flex items-center gap-2">
          {/* Crosshair size slider — only visible when crosshair is ON */}
          {wsShowCrosshair && (
            <div className="flex items-center gap-1 text-[10px] text-white/60">
              <span className="material-icons-outlined text-[12px]">straighten</span>
              <input
                type="range"
                min={10}
                max={100}
                value={wsCrosshairSize}
                onChange={e => {
                  const size = Number(e.target.value);
                  setWsCrosshairSize(size);
                  setCrosshairSizeRef.current?.(size);
                }}
                className="w-16 h-1 accent-emerald-400 cursor-pointer"
                title={`Crosshair size: ${wsCrosshairSize}%`}
              />
              <span className="text-emerald-400 w-7">{wsCrosshairSize}%</span>
            </div>
          )}
          {/* Close all overlays */}
          <button
            onClick={handleCloseOverlays}
            className="px-1.5 py-0.5 rounded-sm border border-slate-600 bg-slate-800 hover:bg-red-900/40 hover:border-red-500 text-slate-400 hover:text-red-300 text-[11px] transition-colors"
            title="Close all panels"
          >
            <span className="material-icons-outlined text-[12px]">close</span>
          </button>
        </div>
      </div>
      
      <Footer 
        x={coords.x} 
        y={coords.y} 
        snapEnabled={snapEnabled}
        onToggleSnap={handleToggleSnap}
        activeSnaps={activeSnaps}
        onToggleSnapMode={handleToggleSnapMode}
        orthoEnabled={orthoEnabled}
        onToggleOrtho={handleToggleOrtho}
        activeTool={activeDrawTool}
        onExport={exportHandlerRef.current ?? undefined}
      />
    </div>
  );
}

export default NestingAXApp;
