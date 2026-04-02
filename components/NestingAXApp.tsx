import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, NestList, Part, Sheet, AppSettings, Layer, CadEntity } from './NestingAX/services/db';
import { configFromSettings } from './NestingAX/services/nesting';
import { SnapMode, ALL_SNAP_MODES } from './NestingAX/services/snapService';
import { layerManager } from './NestingAX/services/layerManager';
import { undoManager } from './NestingAX/services/undoManager';
import { DxfService } from './NestingAX/services/dxfService';
import Header from './NestingAX/Header';
import Workspace from './NestingAX/Workspace';
import Footer from './NestingAX/Footer';
import ContextMenu from './NestingAX/ContextMenu';
import RadialMenu from './NestingAX/RadialMenu';
import PerformingNest from './NestingAX/PerformingNest';
import SidebarPanels, { SidebarPanelTab } from './NestingAX/SidebarPanels';
import { DimensionStyleOverrides } from './NestingAX/services/dimensionStyles';
import { AXDrawingDocument, createEmptyAXDocument } from './NestingAX/services/axSceneModel';
import { buildAXDocumentFromCadEntities } from './NestingAX/services/axImportAdapter';
import { AXEngineDocument } from './NestingAX/engine/scene/types';
import { buildAXEngineDocumentFromCadEntities } from './NestingAX/engine/import/buildDocument';
import { axEngineDocumentToLegacyCad } from './NestingAX/engine/render/toLegacyCad';
import { AXDocumentStore, buildAXDocumentStore } from './NestingAX/engine/database/documentStore';
import { AXObjectGraph, buildAXObjectGraph } from './NestingAX/engine/objectGraph/relations';
import { AXMigrationController, createAXMigrationController } from './NestingAX/engine/migration/controller';
import { AXPerformanceRuntime, createAXPerformanceRuntime } from './NestingAX/engine/performance/runtime';
import { getAXValidationSamples, runAXValidationSample } from './NestingAX/engine/validation';
import { AX_KNOWN_DEGRADATIONS } from './NestingAX/engine/validation/knownDegradations';
import { AXValidationRunResult } from './NestingAX/engine/validation/resultStore';
import { AXValidationRunRegistry, createAXValidationRunRegistry } from './NestingAX/engine/validation/runRegistry';
import FireworksHighTech from './FireworksHighTech';
import WorkerManager from '@/services/WorkerManager';


function NestingAXApp() {
  const dxfService = React.useMemo(() => new DxfService(), []);
  const workspaceRef = React.useRef<HTMLDivElement>(null);
  const dxfImportHandlerRef = React.useRef<(() => void) | null>(null);
  const dwgImportHandlerRef = React.useRef<(() => void) | null>(null);
  const exportHandlerRef = React.useRef<((format: 'dxf' | 'svg' | 'pdf') => void) | null>(null);
  const workerManagerRef = React.useRef<WorkerManager | null>(null);
  const currentNestingTaskRef = React.useRef<Promise<any> | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // FOOTER 1 — Mirror states from Workspace
  const setCrosshairSizeRef = React.useRef<((size: number) => void) | null>(null);
  const [wsZoom, setWsZoom] = useState(0.8);
  const [wsShowCrosshair, setWsShowCrosshair] = useState(true);
  const [wsCrosshairSize, setWsCrosshairSize] = useState(100);
  const [wsShowDynInput, setWsShowDynInput] = useState(true);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarPanelTab>('properties');
  const [dimensionStyleOverrides, setDimensionStyleOverrides] = useState<DimensionStyleOverrides>({});
  
  // Command Input export states
  const [commandInput, setCommandInput] = useState('');
  const setCommandInputRef = React.useRef<((val: string | ((prev: string) => string)) => void) | null>(null);
  const commandInputKeyDownRef = React.useRef<((e: React.KeyboardEvent<HTMLInputElement>) => void) | null>(null);
  const commandInputDOMRef = React.useRef<HTMLInputElement>(null);

  // Focus command input on key down if not focused
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if already typing in an input/textarea
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
      // Focus on standard letter keys
      if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.altKey && !e.metaKey) {
        commandInputDOMRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Workspace integration with global input
  const handleCommandInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = commandInput.trim().toUpperCase();
      if (input === 'OP' || input === 'OPTIONS' || input === 'OPTION') {
        setShowOptionsModal(true);
        setCommandInput('');
        return;
      }
    }
    if (commandInputKeyDownRef.current) {
      commandInputKeyDownRef.current(e);
    }
  };

  // Data State
  const [nestLists, setNestLists] = useState<NestList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [currentParts, setCurrentParts] = useState<Part[]>([]);
  const [currentSheets, setCurrentSheets] = useState<Sheet[]>([]);

  // Real-Time Selection Preview State (for PREVIEW 2)
  const [allCadEntities, setAllCadEntities] = useState<CadEntity[]>([]);
  const [axDocument, setAxDocument] = useState<AXDrawingDocument>(() => createEmptyAXDocument('untitled'));
  const [axEngineDocument, setAxEngineDocument] = useState<AXEngineDocument | null>(null);
  const [axDocumentStore, setAxDocumentStore] = useState<AXDocumentStore | null>(null);
  const [axObjectGraph, setAxObjectGraph] = useState<AXObjectGraph | null>(null);
  const [axMigrationController] = useState<AXMigrationController>(() => createAXMigrationController());
  const [axPerformanceRuntime] = useState<AXPerformanceRuntime>(() => createAXPerformanceRuntime());
  const [validationRunRegistry, setValidationRunRegistry] = useState<AXValidationRunRegistry>(() => createAXValidationRunRegistry());
  const [lastValidationRunAt, setLastValidationRunAt] = useState<string | null>(null);

  // UI State
  const [showModal, setShowModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
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
  const [isOptimizing, setIsOptimizing] = useState(false);

  // Snap & Ortho State
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [activeSnaps, setActiveSnaps] = useState<Set<SnapMode>>(() => new Set(['point', 'intersection', 'center', 'midpoint'] as SnapMode[]));
  const [orthoEnabled, setOrthoEnabled] = useState(false);

  // Layers State (Task 18)
  const [layers, setLayers] = useState<Layer[]>(() => layerManager.getLayers());
  const [activeLayerId, setActiveLayerId] = useState<string>(() => layerManager.getActiveLayerId());
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedNestLists, setCollapsedNestLists] = useState<Record<string, boolean>>({});
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
  const [blockDefinitions, setBlockDefinitions] = useState<Array<{ id: string; name: string; entities: unknown[] }>>([]);
  const [blockInstances] = useState<Array<{ id: string; blockId: string }>>([]);
  const validationSamples = React.useMemo(() => getAXValidationSamples(), []);
  const knownDegradations = React.useMemo(() => AX_KNOWN_DEGRADATIONS, []);
  const xrefs = React.useMemo<Array<{ id: string; name?: string; path?: string }>>(() => {
    const unsupportedDomainCount = axDocument?.diagnostics.unsupportedByDomain?.xref ?? 0;
    const xrefDegradation = knownDegradations.find(item => item.domain === 'xref');
    const sourceName = axDocument?.sourceFileName || axEngineDocument?.sourceFileName || 'current-drawing';

    if (!xrefDegradation && unsupportedDomainCount === 0) {
      return [];
    }

    return [
      {
        id: 'ax-xref-runtime',
        name: `${sourceName} runtime xref state`,
        path: unsupportedDomainCount > 0 ? `unsupported-domain:xref:${unsupportedDomainCount}` : xrefDegradation?.issue,
      },
    ];
  }, [axDocument, axEngineDocument, knownDegradations]);

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
  const handleSelectionChange = useCallback((_selectedIds: Set<string>, allEntities: CadEntity[]) => {
    setSelectedEntityIds(new Set(_selectedIds));
    setAllCadEntities(allEntities);
  }, []);

  const selectedCadEntities = allCadEntities.filter(entity => selectedEntityIds.has(entity.id));

  useEffect(() => {
    if (!axEngineDocument) {
      setAxDocument(buildAXDocumentFromCadEntities(allCadEntities, 'nesting-ax-live-scene'));
      setAxEngineDocument(buildAXEngineDocumentFromCadEntities(allCadEntities, 'nesting-ax-live-scene'));
      return;
    }

    setAxDocumentStore(buildAXDocumentStore(axEngineDocument));
    setAxObjectGraph(buildAXObjectGraph(axEngineDocument));

    const legacyEntities = axEngineDocumentToLegacyCad(axEngineDocument);
    setAllCadEntities(legacyEntities);
    setAxDocument(buildAXDocumentFromCadEntities(legacyEntities, axEngineDocument.sourceFileName || 'nesting-ax-live-scene'));
  }, [axEngineDocument]);

  const handleLayerAdd = useCallback((name: string, color: string) => {
    layerManager.addLayer(name || `Layer ${layers.length + 1}`, color);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, [layers.length]);

  const handleLayerRename = useCallback((id: string, name: string) => {
    layerManager.renameLayer(id, name);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  const handleLayerColor = useCallback((id: string, color: string) => {
    layerManager.setColor(id, color);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  const handleLayerVisibility = useCallback((id: string) => {
    layerManager.toggleVisible(id);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  const handleLayerLock = useCallback((id: string) => {
    layerManager.toggleLocked(id);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  const handleLayerActive = useCallback((id: string) => {
    layerManager.setActiveLayer(id);
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  const handleEntityLayerAssign = useCallback((entityIds: string[], layerId: string) => {
    setAllCadEntities(prev => prev.map(entity => entityIds.includes(entity.id) ? { ...entity, layerId } : entity));
  }, []);

  const handleUpdateSelectedProperties = useCallback((updates: Record<string, unknown>) => {
    setAllCadEntities(prev => prev.map(entity => selectedEntityIds.has(entity.id)
      ? { ...entity, properties: { ...(entity.properties || {}), ...updates } }
      : entity));
  }, [selectedEntityIds]);

  const handleUpdateDimensionStyle = useCallback((styleName: string, updates: Record<string, unknown>) => {
    setDimensionStyleOverrides(prev => ({
      ...prev,
      [styleName]: {
        ...(prev[styleName] || {}),
        ...updates,
      },
    }));
  }, []);

  const handleAddBlock = useCallback((name: string) => {
    if (!name.trim()) return;
    setBlockDefinitions(prev => [...prev, { id: crypto.randomUUID(), name: name.trim(), entities: [] }]);
  }, []);

  const runValidationSnapshot = useCallback(() => {
    const documentDiagnostics = axDocument?.diagnostics;
    const unsupportedByDomain = documentDiagnostics?.unsupportedByDomain || {};
    const degradedBySubtype = documentDiagnostics?.degradedBySubtype || {};
    const warnings = documentDiagnostics?.warnings || [];
    const blockCount = axDocumentStore?.blocks.allNames.length ?? 0;
    const insertRelations = axObjectGraph?.insertRelations ?? [];
    const annotationRelations = axObjectGraph?.annotationRelations ?? [];
    const entityKinds = new Set(axEngineDocument?.entities.map(entity => entity.kind) || []);

    const hasTextDegradation = Boolean(unsupportedByDomain.text) || Object.keys(degradedBySubtype).some(key => key.startsWith('MTEXT') || key.startsWith('ATTRIB') || key.includes('TEXTSTYLE'));
    const hasBlockDegradation = Boolean(unsupportedByDomain.block) || Object.keys(degradedBySubtype).some(key => key.includes('INSERT'));
    const hasHatchDegradation = Boolean(unsupportedByDomain.hatch) || Object.keys(degradedBySubtype).some(key => key.includes('HATCH'));
    const hasCurveDegradation = Object.keys(degradedBySubtype).some(key => key.includes('SPLINE') || key.includes('ELLIPSE') || key.includes('BULGE') || key.includes('ARC'));
    const hasStyleDegradation = warnings.some(warning => warning.toLowerCase().includes('style') || warning.toLowerCase().includes('lineweight') || warning.toLowerCase().includes('linetype'));

    const runs: AXValidationRunResult[] = validationSamples.map(sample => {
      const answers: Partial<Record<string, boolean>> = {};
      const notes: Partial<Record<string, string>> = {};

      for (const check of sample.requiredChecks) {
        const lower = check.toLowerCase();
        let passed = false;
        let note = '';

        if (sample.domain === 'dim') {
          if (lower.includes('entity imported')) passed = entityKinds.has('dimension');
          else if (lower.includes('text shown')) passed = annotationRelations.some(relation => relation.styleName !== undefined);
          else if (lower.includes('dimstyle applied')) passed = annotationRelations.some(relation => Boolean(relation.styleName));
          else if (lower.includes('diagnostics clear')) passed = !warnings.some(warning => warning.toLowerCase().includes('dim'));
        } else if (sample.domain === 'text') {
          if (lower.includes('text imported')) passed = entityKinds.has('text');
          else if (lower.includes('mtext flagged')) passed = Object.keys(degradedBySubtype).some(key => key.includes('MTEXT')) || (axEngineDocument?.entities.some(entity => entity.kind === 'text' && Boolean(entity.metadata?.isMText)) ?? false);
          else if (lower.includes('attachment preserved')) passed = axEngineDocument?.entities.some(entity => entity.kind === 'text' && typeof entity.attachment === 'number') ?? false;
          else if (lower.includes('style visible')) passed = annotationRelations.some(relation => Boolean(relation.textStyle));
        } else if (sample.domain === 'block') {
          if (lower.includes('insert imported')) passed = entityKinds.has('insert');
          else if (lower.includes('block registry populated')) passed = blockCount > 0;
          else if (lower.includes('nested insert counted')) passed = insertRelations.some(relation => (relation.nestedInsertCount ?? 0) > 0);
          else if (lower.includes('canvas shows inserts')) passed = insertRelations.length > 0;
        } else if (sample.domain === 'hatch') {
          if (lower.includes('hatch imported')) passed = entityKinds.has('hatch');
          else if (lower.includes('loops preserved')) passed = axEngineDocument?.entities.some(entity => entity.kind === 'hatch' && entity.loops.length > 0) ?? false;
          else if (lower.includes('pattern rendered')) passed = axEngineDocument?.entities.some(entity => entity.kind === 'hatch' && Boolean(entity.pattern)) ?? false;
          else if (lower.includes('diagnostics clear')) passed = !hasHatchDegradation;
        } else if (sample.domain === 'style') {
          if (lower.includes('layer color respected')) passed = axDocument?.layers.some(layer => Boolean(layer.color)) ?? false;
          else if (lower.includes('by-block fallback respected')) passed = axEngineDocument?.entities.some(entity => Boolean(entity.style.byBlockColor)) ?? false;
          else if (lower.includes('linetype visible')) passed = axEngineDocument?.entities.some(entity => Boolean(entity.style.lineType)) ?? false;
          else if (lower.includes('lineweight visible')) passed = axEngineDocument?.entities.some(entity => typeof entity.style.lineWeight === 'number') ?? false;
        } else if (sample.domain === 'curves') {
          if (lower.includes('arc shown')) passed = entityKinds.has('arc');
          else if (lower.includes('bulge shown as curve')) passed = axEngineDocument?.entities.some(entity => entity.kind === 'polyline' && Array.isArray(entity.bulges) && entity.bulges.some(value => value !== 0)) ?? false;
          else if (lower.includes('ellipse shown')) passed = entityKinds.has('ellipse');
          else if (lower.includes('spline imported')) passed = entityKinds.has('spline');
        } else if (sample.domain === 'leader') {
          if (lower.includes('leader imported')) passed = entityKinds.has('leader');
          else if (lower.includes('leader text preserved')) passed = axEngineDocument?.entities.some(entity => entity.kind === 'leader' && Boolean(entity.text)) ?? false;
          else if (lower.includes('leader displayed')) passed = entityKinds.has('leader');
        } else if (sample.domain === 'unsupportedVisual') {
          if (lower.includes('unsupported visual placeholder created')) passed = entityKinds.has('unsupportedVisual');
          else if (lower.includes('diagnostics report subtype')) passed = Object.keys(degradedBySubtype).length > 0 || Object.keys(axDocumentStore?.diagnostics.unsupportedTypes || {}).length > 0;
        }

        if (lower.includes('diagnostics emitted if degraded')) {
          if (sample.domain === 'text') passed = hasTextDegradation ? Object.keys(degradedBySubtype).length > 0 || warnings.length > 0 : true;
          else if (sample.domain === 'block') passed = hasBlockDegradation ? Object.keys(degradedBySubtype).length > 0 || warnings.length > 0 : true;
          else if (sample.domain === 'hatch') passed = hasHatchDegradation ? Object.keys(degradedBySubtype).length > 0 || warnings.length > 0 : true;
          else if (sample.domain === 'style') passed = hasStyleDegradation ? warnings.length > 0 : true;
          else if (sample.domain === 'curves') passed = hasCurveDegradation ? Object.keys(degradedBySubtype).length > 0 || warnings.length > 0 : true;
        }

        answers[check] = passed;
        if (!passed) {
          note = `No runtime evidence for: ${check}`;
          notes[check] = note;
        }
      }

      return runAXValidationSample(sample, answers, notes);
    });

    setValidationRunRegistry(createAXValidationRunRegistry(runs));
    setLastValidationRunAt(new Date().toISOString());
  }, [axDocument, axDocumentStore, axEngineDocument, axObjectGraph, validationSamples]);

  const handleLayerChange = useCallback(() => {
    setLayers([...layerManager.getLayers()]);
    setActiveLayerId(layerManager.getActiveLayerId());
  }, []);

  // FOOTER 1: Close all overlays
  const handleCloseOverlays = useCallback(() => {
    setShowModal(false);
    setShowSettingsModal(false);
    setShowOptionsModal(false);
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
    // Initialize WorkerManager
    if (!workerManagerRef.current) {
      workerManagerRef.current = new WorkerManager({
        dxfPoolSize: 2,
        nestingPoolSize: 2,
        defaultTimeout: 30000,
        debug: true
      });
      console.log('✓ WorkerManager initialized');
    }
  }, []);

  // --- Reactive Data Loading ---
  const reloadData = useCallback(() => {
    if (activeListId) {
      setCurrentParts(db.getParts(activeListId));
      setCurrentSheets(db.getSheets(activeListId));
    } else {
      setCurrentParts([]);
      setCurrentSheets([]);
    }
  }, [activeListId]);
  useEffect(() => {
    reloadData();
  }, [reloadData]);

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

  const handleDWGImportFile = useCallback(() => {
    dwgImportHandlerRef.current?.();
  }, []);

  // --- 1.1.1 -> 1.1.5 NESTING WORKFLOW ---
  // --- 1.1.1 -> 1.1.5 NESTING WORKFLOW ---
  const handleStartNestingProcess = async () => {
    console.log('🔴 DEBUG: handleStartNestingProcess called');
    console.log('  currentParts:', currentParts.length, currentParts);
    console.log('  currentSheets:', currentSheets.length, currentSheets);
    if (!currentParts.length || !currentSheets.length) {
      alert("Please add at least one part and one sheet before nesting.");
      return;
    }

    setShowModal(false);
    setIsNesting(true);
    setIsNestingHidden(false);
    setNestingProgress(0);
    setNestingStatus("Initializing Nesting Algorithm...");
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

      // Execute nesting using WorkerManager with progress callback
      console.log('🔴 DEBUG: About to call executeNesting');
      if (!workerManagerRef.current) {
        throw new Error('WorkerManager not initialized');
      }

      const onProgressCallback = (progressData: any) => {
        setNestingProgress(progressData.percent || 0);
        if (progressData.status) setNestingStatus(progressData.status);
        setNestingPartsPlaced(progressData.partsPlaced || 0);
        setNestingTotalParts(progressData.totalParts || 0);
        setNestingSheetsUsed(progressData.sheetsUsed || 1);
        setNestingUtilization(progressData.utilization || 0);
        setNestingSheetW(progressData.currentSheetW || 0);
        setNestingSheetH(progressData.currentSheetH || 0);
        if (progressData.lastPlacement) {
          setNestingPlacements(prev => [...prev, progressData.lastPlacement]);
        }
      };
      console.log('🔴 DEBUG: Calling workerManager.executeNesting');
      const nestingTask = workerManagerRef.current.executeNesting(
        { parts: currentParts, sheets: currentSheets, config } as any,
        onProgressCallback
      );
      
      if (!nestingTask) {
        throw new Error('Failed to execute nesting - WorkerManager not available');
      }

      currentNestingTaskRef.current = nestingTask;
      const results = await nestingTask;
      
      const updates: Part[] = [];
      results.forEach((res: any) => {
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
      console.log('✓ Nesting completed successfully');

    } catch (e) {
      console.error("Nesting failed", e);
      alert("Nesting Failed: " + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setTimeout(() => {
        setIsNesting(false);
      }, 500);
      currentNestingTaskRef.current = null;
    }
  };

  const handleStopNesting = () => {
    // Stop via WorkerManager - cancel the pending task
    if (workerManagerRef.current) {
      currentNestingTaskRef.current = null;
      console.log('⚠ Nesting stopped by user');
    }
    setIsNesting(false);
  };

  const handleAbortNesting = useCallback(() => {
    if (isNesting) {
      handleStopNesting();
    }
  }, [isNesting]);

  // --- Geometry Optimization Handler ---
  const handleOptimizeEntities = useCallback(async (entityIds: Set<string>) => {
    if (entityIds.size === 0) {
      showToast('⚠ No entities selected');
      return;
    }

    if (!workerManagerRef.current) {
      showToast('❌ WorkerManager not initialized');
      return;
    }

    if (!activeListId) {
      showToast('❌ No active nest list selected');
      return;
    }

    setIsOptimizing(true);


    try {
      // Get selected entities from state
      const selectedEntities = allCadEntities.filter(e => entityIds.has(e.id));

      if (selectedEntities.length === 0) {
        showToast('⚠ No valid entities to optimize');
        return;
      }

      console.log(`🔧 Optimizing ${selectedEntities.length} entities...`);
      showToast(`⏳ Optimizing ${selectedEntities.length} entities...`);

      // Format entities for worker: { id, geometry: points }
      const entitiesToOptimize = selectedEntities.map(e => ({
        id: e.id,
        geometry: e.points || [],
        type: e.type
      }));

      // Call worker
      const optimizedEntities = await workerManagerRef.current.simplifyGeometries(entitiesToOptimize);

      if (!optimizedEntities || optimizedEntities.length === 0) {
        showToast('❌ Optimization failed');
        return;
      }

      // Create a map of optimized entities by id
      const optimizedMap = new Map(optimizedEntities.map((e: any) => [e.id, e]));

      // Update allCadEntities with optimized versions
      const updatedEntities = allCadEntities.map(entity => {
        const optimized = optimizedMap.get(entity.id);
        if (optimized) {
          return {
            ...entity,
            points: optimized.geometry
          };
        }
        return entity;
      });

      setAllCadEntities(updatedEntities);

      // Update database: save changes to active nest list's parts
      if (activeListId) {
        const parts = db.getParts(activeListId);
        const updatedParts = parts.map(part => {
          if (part.cadEntities && part.cadEntities.some(e => optimizedMap.has(e.id))) {
            const updatedCadEntities = part.cadEntities.map(e => {
              const optimized = optimizedMap.get(e.id);
              if (optimized) {
                return {
                  ...e,
                  points: optimized.geometry
                };
              }
              return e;
            });
            return { ...part, cadEntities: updatedCadEntities };
          }
          return part;
        });
        db.updatePartsBatch(updatedParts);
      }

      showToast(`✅ Đã tối ưu ${selectedEntities.length} đối tượng thành công!`);
      console.log(`✓ Optimization complete: ${selectedEntities.length} entities simplified`);
    } catch (err) {
      console.error('[NestingAXApp] Optimization failed:', err);
      showToast(`❌ Optimization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsOptimizing(false);
    }
  }, [activeListId, allCadEntities, workerManagerRef]);



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
    setCollapsedNestLists(prev => ({ ...prev, [id]: false }));
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
    if (tool === 'osnap_toggle') {
      handleToggleSnap();
      return;
    }
    if (tool === 'layers' || tool === 'layer_panel') {
      setShowLayerPanel(prev => !prev);
      return;
    }
    if (tool === 'trim' || tool === 'extend' || tool === 'offset') {
      // Enable command mode in Workspace
      setActiveDrawTool(tool);
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
        onImportDWG={handleDWGImportFile}
        onUndo={() => undoManager.undo()}
        onRedo={() => undoManager.redo()}
        canUndo={undoManager.canUndo()}
        canRedo={undoManager.canRedo()}
        onToggleLayerPanel={handleToggleLayerPanel}
        onExportDXF={() => exportHandlerRef.current?.('dxf')}
        onExportPDF={() => exportHandlerRef.current?.('pdf')}
        onOptimizeEntities={() => setActiveDrawTool('lag_reduce')}
      />
      <div className="flex flex-1 overflow-hidden relative gap-0 min-h-0" ref={workspaceRef}>
        <SidebarPanels
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen(prev => !prev)}
          activeTab={activeSidebarTab}
          onTabChange={setActiveSidebarTab}
          allEntities={allCadEntities}
          selectedEntities={selectedCadEntities}
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerAdd={handleLayerAdd}
          onLayerRename={handleLayerRename}
          onLayerColor={handleLayerColor}
          onLayerVisibility={handleLayerVisibility}
          onLayerLock={handleLayerLock}
          onLayerActive={handleLayerActive}
          onEntityLayerAssign={handleEntityLayerAssign}
          onUpdateSelectedProperties={handleUpdateSelectedProperties}
          dimensionStyleOverrides={dimensionStyleOverrides}
          onUpdateDimensionStyle={handleUpdateDimensionStyle}
          blockDefinitions={blockDefinitions}
          blockInstances={blockInstances}
          xrefs={xrefs}
          onAddBlock={handleAddBlock}
          axDocumentStore={axDocumentStore}
          axObjectGraph={axObjectGraph}
          axMigrationController={axMigrationController}
          axPerformanceRuntime={axPerformanceRuntime}
          validationSamples={validationSamples}
          knownDegradations={knownDegradations}
          validationRunRegistry={validationRunRegistry}
          lastValidationRunAt={lastValidationRunAt}
          onRunValidationSnapshot={runValidationSnapshot}
        />
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
          onOptimizeEntities={handleOptimizeEntities}
          axDocument={axDocument}
          axEngineDocument={axEngineDocument}
          onAxDocumentImported={setAxDocument}
          axMigrationController={axMigrationController}
          axPerformanceRuntime={axPerformanceRuntime}

          // Layer System
          layers={layers}
          activeLayerId={activeLayerId}
          onLayerChange={handleLayerChange}
          onStoreDXFHandler={(handler) => { dxfImportHandlerRef.current = handler; }}
          onStoreDWGHandler={(handler) => { dwgImportHandlerRef.current = handler; }}
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
      
      {/* --- OPTIMIZATION PROGRESS OVERLAY --- */}
      <AnimatePresence>
        {isOptimizing && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="glass-panel border border-cyan-500/30 rounded-2xl p-8 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden min-w-[320px]"
            >
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-emerald-500/10 pointer-events-none" />
              
              {/* Spinning Zap Icon */}
              <div className="relative mb-6 w-20 h-20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-t-2 border-cyan-400 opacity-50"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-8px] rounded-full border-b-2 border-emerald-400 opacity-30"
                />
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-cyan-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] z-10">
                  <motion.span 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="material-icons-outlined text-3xl text-cyan-400"
                  >
                    bolt
                  </motion.span>
                </div>
              </div>

              {/* Text */}
              <h3 className="text-lg font-bold text-white mb-2 tracking-wide z-10">
                Đang tối ưu hóa hình học...
              </h3>
              
              {/* Scanning Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative mt-2 z-10">
                <motion.div
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                />
              </div>
              
              <p className="text-xs text-cyan-400/70 mt-4 font-mono uppercase tracking-widest z-10">
                Processing Vectors
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Footer 
        x={mouseWorldPos.x} 
        y={mouseWorldPos.y} 
        zoom={wsZoom}
        snapEnabled={snapEnabled}
        onToggleSnap={handleToggleSnap}
        activeSnaps={activeSnaps}
        onToggleSnapMode={handleToggleSnapMode}
        orthoEnabled={orthoEnabled}
        onToggleOrtho={handleToggleOrtho}
        activeTool={activeDrawTool}
        onExport={exportHandlerRef.current ?? undefined}
        commandInput={commandInput}
        onCommandInputChange={(val) => {
          setCommandInput(val);
          setCommandInputRef.current?.(val);
        }}
        onCommandInputKeyDown={handleCommandInputKeyDown}
        showDynInput={wsShowDynInput}
        showCrosshair={wsShowCrosshair}
        crosshairSize={wsCrosshairSize}
        onCrosshairSizeChange={(size) => {
          setWsCrosshairSize(size);
          setCrosshairSizeRef.current?.(size);
        }}
        onCloseAllOverlays={handleCloseOverlays}
        selectionCount={selectedEntityIds.size}
      />
    </div>
  );
}

// Helper function for toast notifications
function showToast(message: string) {
  // Toast implementation - can be expanded to show UI toast
  console.log(message);
}

export default NestingAXApp;
