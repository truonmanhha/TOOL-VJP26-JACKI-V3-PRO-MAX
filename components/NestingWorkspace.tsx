
'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, FileUp, Upload, Settings, Download, X, Play, ChevronUp, ChevronDown,
    Trash2, RotateCcw, Copy, ChevronLeft, ChevronRight, Grid3X3, Eye, EyeOff,
    FileText, Layers, Save, FolderOpen, Maximize2, ZoomIn, ZoomOut, Palette, Loader2
} from 'lucide-react';
import {
    AdvancedNestingEngine,
    NestingOutput,
    PartInput,
    SheetInput,
    NestingStrategy,
    fileParser
} from '@/services/nesting';
import { SpatialIndexService, SpatialItem } from '@/services/SpatialIndexService';
import { getBounds } from '@/services/nesting/geometry';
import CADCrosshair from '@/components/CADCrosshair';

import DrawingWorkspace from '@/components/nesting/DrawingWorkspace';
import GPURenderer from '@/components/GPURenderer';
import FireworksHighTech from '@/components/FireworksHighTech';

// ============ TYPES ============

interface Part extends PartInput {
    mirror: boolean;
    rotation: number;
    smallPart: boolean;
    kitNumber: number;
    ignore3D: boolean;
    enabled: boolean;
    color: string;
    mathematicalEntities?: any[]; // Store pure math entities
}

interface Sheet {
    id: string;
    materialName: string;
    width: number;
    height: number;
    thickness: number;
    quantity: number;
}

interface NestingSettings {
    // General
    nestingMethod: 'vero' | 'basic' | 'manual';
    itemsToNest: 'toolpaths' | 'geometries' | 'both';
    nestListName: string;

    // Options
    ncCode: 'subroutines' | 'linear';
    sheetOrder: 'best' | 'picked';
    packTo: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    offcutPreference: 'vertical' | 'horizontal';
    minGapBetweenPaths: number;
    gapAtSheetEdge: number;
    extraGapLeadIn: number;
    totalComputationTime: number;
    evenlySpacedParts: boolean;

    // Extensions
    assistedNest: boolean;
    bridgedNesting: boolean;
    cutSmallPartsFirst: boolean;
    cutWholePartTogether: boolean;
    drillThenCutInner: boolean;
    groupEachPartSeparately: boolean;
    leaveEdgeGapUncut: boolean;
    mergeLikePartQuantities: boolean;
    minimiseSheetPatterns: boolean;
    minimiseToolChanges: boolean;
    nestSmallPartsFirst: boolean;
    onionSkinSmallParts: boolean;
    orderByPart: boolean;
    partQuantityMultiplier: number;
    preventNestingInApertures: boolean;
    removeGroups: boolean;
    repeatFirstRowColumn: boolean;
    rollSplit: boolean;
    suppressFinalSort: boolean;
}

const DEFAULT_SETTINGS: NestingSettings = {
    nestingMethod: 'vero',
    itemsToNest: 'geometries',
    nestListName: 'New Nest List 1',
    ncCode: 'linear',
    sheetOrder: 'best',
    packTo: 'top-left',
    offcutPreference: 'horizontal',
    minGapBetweenPaths: 8.1,
    gapAtSheetEdge: 1,
    extraGapLeadIn: 0,
    totalComputationTime: 60,
    evenlySpacedParts: false,
    assistedNest: false,
    bridgedNesting: false,
    cutSmallPartsFirst: true,
    cutWholePartTogether: false,
    drillThenCutInner: false,
    groupEachPartSeparately: false,
    leaveEdgeGapUncut: false,
    mergeLikePartQuantities: false,
    minimiseSheetPatterns: false,
    minimiseToolChanges: false,
    nestSmallPartsFirst: false,
    onionSkinSmallParts: true,
    orderByPart: false,
    partQuantityMultiplier: 1,
    preventNestingInApertures: false,
    removeGroups: false,
    repeatFirstRowColumn: false,
    rollSplit: false,
    suppressFinalSort: false
};

const PART_COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

interface NestingWorkspaceProps {
    onClose?: () => void;
}

// ============ MAIN COMPONENT ============

const NestingWorkspace: React.FC<NestingWorkspaceProps> = ({ onClose }) => {
    // State
    const [parts, setParts] = useState<Part[]>([]);
    const [sheets, setSheets] = useState<Sheet[]>([
        { id: 'sheet-1', materialName: 'MDF 18mm', width: 2440, height: 1220, thickness: 18, quantity: 10 }
    ]);
    const [settings, setSettings] = useState<NestingSettings>(DEFAULT_SETTINGS);
    const [nestingResult, setNestingResult] = useState<NestingOutput | null>(null);
    const [currentSheetIndex, setCurrentSheetIndex] = useState(0);
    const [isNesting, setIsNesting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'general' | 'options' | 'extensions'>('general');
    const [showAddPart, setShowAddPart] = useState(false);
    const [showAddSheet, setShowAddSheet] = useState(false);
    const [showPartParams, setShowPartParams] = useState(true);
    const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
    const [selectedSheetIds, setSelectedSheetIds] = useState<Set<string>>(new Set());
    const [showDrawingMode, setShowDrawingMode] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [renderMode, setRenderMode] = useState<'standard' | 'gpu'>('gpu');
    const [showFireworks, setShowFireworks] = useState(false);

    // Refs
    const workspaceContainerRef = useRef<HTMLDivElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const engine = useRef(new AdvancedNestingEngine());

    const [newPart, setNewPart] = useState({ width: 0, height: 0 });

    const handleDeleteParts = useCallback(() => {
        setParts(prev => prev.filter(p => !selectedPartIds.has(p.id)));
        setSelectedPartIds(new Set());
    }, [selectedPartIds]);

    const handleAddPart = useCallback(() => {
        const id = `manual-${Date.now()}`;
        const p: Part = {
            id,
            name: `Rect ${newPart.width}x${newPart.height}`,
            width: newPart.width,
            height: newPart.height,
            quantity: 1,
            priority: 5,
            allowRotation: true,
            mirror: false,
            rotation: 0,
            smallPart: false,
            kitNumber: 0,
            ignore3D: false,
            enabled: true,
            color: PART_COLORS[parts.length % PART_COLORS.length],
            polygon: [
                { x: 0, y: 0 },
                { x: newPart.width, y: 0 },
                { x: newPart.width, y: newPart.height },
                { x: 0, y: newPart.height }
            ]
        };
        setParts(prev => [...prev, p]);
        setShowAddPart(false);
        setNewPart({ width: 0, height: 0 });
    }, [newPart, parts.length]);

    const spatialIndex = useRef(new SpatialIndexService());

    // Update Spatial Index whenever parts change position or are added/removed
    useEffect(() => {
        const items: SpatialItem[] = parts.map(p => {
            const bounds = getBounds(p.polygon || []);
            return {
                id: p.id,
                minX: (p.x || 0) + bounds.minX,
                minY: (p.y || 0) + bounds.minY,
                maxX: (p.x || 0) + bounds.maxX,
                maxY: (p.y || 0) + bounds.maxY
            };
        });
        spatialIndex.current.clear();
        spatialIndex.current.load(items);
        console.log(`🚀 Spatial Index Updated: ${items.length} items`);
    }, [parts]);

    // ============ HANDLERS ============

    const handleFileImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        setImportLoading(true);
        const newParts: Part[] = [];
        let completed = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const text = await file.text();

            // 🚀 USE WEB WORKER FOR PARSING (OFF-MAIN-THREAD)
            const worker = new Worker(new URL('@/workers/dxf.worker.ts', import.meta.url), { type: 'module' });
            
            worker.onmessage = (event) => {
                const { entities, error } = event.data;
                if (error) {
                    console.error("Worker Error:", error);
                } else {
                    const partId = `import-${Date.now()}-${i}`;
                    const p: Part = {
                        id: partId,
                        name: file.name,
                        width: 0,
                        height: 0,
                        quantity: 1,
                        priority: 5,
                        allowRotation: true,
                        mirror: false,
                        rotation: 0,
                        smallPart: false,
                        kitNumber: 0,
                        ignore3D: false,
                        enabled: true,
                        color: PART_COLORS[(parts.length + newParts.length) % PART_COLORS.length],
                        mathematicalEntities: entities
                    };
                    newParts.push(p);
                }

                completed++;
                if (completed === files.length) {
                    setParts(prev => [...prev, ...newParts]);
                    setImportLoading(false);
                }
                worker.terminate();
            };

            worker.postMessage({ fileText: text, fileName: file.name });
        }
        
        e.target.value = '';
    }, [parts.length]);


        setImportLoading(true);
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);

            try {
                // Gửi lên Backend mới để lấy thực thể toán học thuần túy
                const response = await fetch('http://localhost:8000/api/dxf/parse-binary', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Parsing failed');

                const result = await response.json();
                const entities = result.entities || [];
                
                const newPart: Part = {
                    id: `import-${Date.now()}-${i}`,
                    name: file.name,
                    width: 0,
                    height: 0,
                    quantity: 1,
                    priority: 5,
                    allowRotation: true,
                    mirror: false,
                    rotation: 0,
                    smallPart: false,
                    kitNumber: 0,
                    ignore3D: false,
                    enabled: true,
                    color: PART_COLORS[parts.length % PART_COLORS.length],
                    mathematicalEntities: entities
                };
                setParts(prev => [...prev, newPart]);
                
            } catch (error) {
                console.error("CAD Engine Import Error:", error);
            }
        }
        
        setImportLoading(false);
        e.target.value = '';

    // Chuyển đổi sang đối tượng cho GPU Renderer
    const gpuObjects = useMemo(() => {
        if (nestingResult) {
            return nestingResult.placements.map((p, idx) => {
                const part = parts.find(pt => pt.id === p.partId);
                return {
                    id: `placed-${idx}`,
                    entities: part?.mathematicalEntities || [],
                    x: p.x,
                    y: p.y,
                    rotation: p.rotation,
                    color: part?.color || '#00ff00',
                    name: part?.name
                };
            }).filter(obj => obj.entities.length > 0);
        } else {
            let currentX = 100;
            return parts.filter(p => p.mathematicalEntities).map((p) => {
                const obj = {
                    id: p.id,
                    entities: p.mathematicalEntities!,
                    x: currentX,
                    y: 100,
                    rotation: 0,
                    color: p.color,
                    name: p.name
                };
                currentX += 500;
                return obj;
            });
        }
    }, [nestingResult, parts]);

    const handleObjectSelect = useCallback((id: string, multi: boolean) => {
        setSelectedPartIds(prev => {
            const next = new Set(multi ? prev : []);
            if (id) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    }, []);

    const handleObjectMove = useCallback((id: string, x: number, y: number) => {
        setParts(prev => prev.map(p => p.id === id ? { ...p, x, y } : p));
        if (nestingResult) {
            setNestingResult(prev => {
                if (!prev) return null;
                return { ...prev };
            });
        }
    }, [nestingResult]);

    const handleRunNesting = useCallback(async () => {
        if (parts.length === 0 || sheets.length === 0) return;

        setIsNesting(true);
        setProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        try {
            const enabledParts = parts.filter(p => p.enabled);
            const partInputs: PartInput[] = enabledParts.map(p => ({
                id: p.id,
                name: p.name,
                width: p.width,
                height: p.height,
                quantity: p.quantity * settings.partQuantityMultiplier,
                priority: p.priority,
                allowRotation: p.allowRotation,
                polygon: p.polygon
            }));

            const sheetInputs: SheetInput[] = sheets.map(s => ({
                id: s.id,
                name: s.materialName,
                width: s.width,
                height: s.height,
                material: s.materialName,
                quantity: s.quantity
            }));

            // Map settings to strategy
            let strategy: NestingStrategy = 'BALANCED';
            if (settings.nestingMethod === 'basic') strategy = 'FAST';
            else if (settings.totalComputationTime > 30) strategy = 'MAXIMUM_EFFICIENCY';

            engine.current.setConfig({
                strategy,
                partGap: settings.minGapBetweenPaths,
                edgeMargin: settings.gapAtSheetEdge
            });

            const result = engine.current.nest({
                parts: partInputs,
                sheets: sheetInputs,
                config: { strategy }
            });

            setNestingResult(result);
            setCurrentSheetIndex(0);
            setProgress(100);
            setShowFireworks(true);
        } catch (error) {
            console.error('Nesting error:', error);
        } finally {
            clearInterval(progressInterval);
            setTimeout(() => {
                setIsNesting(false);
                setProgress(0);
            }, 500);
        }
    }, [parts, sheets, settings]);

    // ============ RENDER ============

    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col z-50">
            {/* Header / Toolbar */}
            <div className="h-14 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 flex items-center px-4 gap-2">
                {/* Logo */}
                <div className="flex items-center gap-2 mr-4">
                    <Grid3X3 className="w-6 h-6 text-cyan-400" />
                    <span className="text-lg font-bold text-white">NESTING PRO MAX</span>
                </div>

                {/* Parts Group */}
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importLoading}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-cyan-600/30 rounded transition-colors disabled:opacity-50"
                        title="Add Part From File"
                    >
                        {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                        <span className="hidden xl:inline">GPU Import</span>
                    </button>
                    <button
                        onClick={() => setShowAddPart(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-cyan-600/30 rounded transition-colors"
                        title="Add Part Manually"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden xl:inline">Add Part</span>
                    </button>
                    <button
                        onClick={() => setShowDrawingMode(true)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${showDrawingMode ? 'bg-cyan-600 text-white' : 'text-white hover:bg-cyan-600/30'}`}
                        title="Draw Parts"
                    >
                        <Palette className="w-4 h-4" />
                        <span className="hidden xl:inline">Draw</span>
                    </button>
                </div>

                <div className="w-px h-8 bg-slate-600" />

                {/* Sheets Group */}
                <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setShowAddSheet(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-white hover:bg-cyan-600/30 rounded transition-colors"
                        title="Add Sheet From Database"
                    >
                        <Layers className="w-4 h-4" />
                        <span className="hidden xl:inline">Add Sheet</span>
                    </button>
                </div>

                <div className="flex-1" />

                {/* Nest Button */}
                <button
                    onClick={handleRunNesting}
                    disabled={isNesting || parts.length === 0}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${isNesting
                            ? 'bg-yellow-600 text-white cursor-wait'
                            : parts.length === 0
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400'
                        }`}
                >
                    {isNesting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>{progress}%</span>
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4" />
                            <span>Run Nesting</span>
                        </>
                    )}
                </button>

                {/* Close */}
                <button
                    onClick={onClose}
                    className="ml-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Tables */}
                <div className="w-[450px] border-r border-slate-700 flex flex-col bg-slate-800/50">
                    {/* Parts Table */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Parts ({parts.length})</span>
                            <div className="flex items-center gap-1">
                                <button onClick={handleDeleteParts} className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded" disabled={selectedPartIds.size === 0}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/50 sticky top-0 text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 font-medium">Name</th>
                                        <th className="px-3 py-2 font-medium">Qty</th>
                                        <th className="px-3 py-2 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts.map(part => (
                                        <tr 
                                            key={part.id}
                                            onClick={() => setSelectedPartIds(prev => {
                                                const next = new Set(prev);
                                                if (next.has(part.id)) next.delete(part.id);
                                                else next.add(part.id);
                                                return next;
                                            })}
                                            className={`border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 ${selectedPartIds.has(part.id) ? 'bg-cyan-500/10' : ''}`}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: part.color }} />
                                                    <span className="text-slate-200 truncate max-w-[150px]">{part.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-slate-400">{part.quantity}</td>
                                            <td className="px-3 py-2 text-slate-500">{part.gpuData ? 'GPU Loaded' : 'Basic'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sheets Table */}
                    <div className="h-[150px] border-t border-slate-700 bg-slate-900/20">
                        <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase">Sheets</span>
                        </div>
                        <div className="p-3">
                            {sheets.map(s => (
                                <div key={s.id} className="flex items-center justify-between text-xs text-slate-300 bg-slate-800 p-2 rounded border border-slate-700">
                                    <span>{s.materialName}</span>
                                    <span className="text-cyan-400 font-mono">{s.width}x{s.height}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Canvas Area */}
                <div ref={workspaceContainerRef} className="flex-1 flex flex-col bg-black relative overflow-hidden">
                    <CADCrosshair containerRef={workspaceContainerRef} color="#00ffff" />
                    
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <button 
                            onClick={() => setRenderMode('standard')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${renderMode === 'standard' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            Standard Canvas
                        </button>
                        <button 
                            onClick={() => setRenderMode('gpu')}
                            className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${renderMode === 'gpu' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                            GPU Accelerated
                        </button>
                    </div>

                    {renderMode === 'gpu' ? (
                        <GPURenderer 
                            objects={gpuObjects}
                            sheetWidth={sheets[0].width}
                            sheetHeight={sheets[0].height}
                            onObjectSelect={handleObjectSelect}
                            onObjectMove={handleObjectMove}
                            onObjectSelect={handleObjectSelect}
                        />
                    ) : (
                        <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                            <span className="text-slate-500 font-mono">Standard 2D View (Placeholder)</span>
                            {/* Ở đây có thể tích hợp DrawingWorkspace nếu cần */}
                        </div>
                    )}
                    
                    {/* View Controls Overlay */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <div className="bg-slate-800/80 backdrop-blur border border-slate-600 p-1 rounded-lg flex flex-col gap-1">
                           <button className="p-2 hover:bg-slate-700 text-slate-300 rounded" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
                           <button className="p-2 hover:bg-slate-700 text-slate-300 rounded" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
                           <button className="p-2 hover:bg-slate-700 text-slate-300 rounded" title="Reset View"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </div>

            <input ref={fileInputRef} type="file" accept=".dxf" multiple onChange={handleFileImport} className="hidden" />

            {/* Modals - Simplified for brevity in this response */}
            {showAddPart && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={() => setShowAddPart(false)}>
                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-600 w-96" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4">Quick Add Rect Part</h3>
                        <div className="space-y-4">
                            <input type="number" placeholder="Width" className="w-full p-2 bg-slate-700 rounded text-white" value={newPart.width} onChange={e => setNewPart({...newPart, width: Number(e.target.value)})}/>
                            <input type="number" placeholder="Height" className="w-full p-2 bg-slate-700 rounded text-white" value={newPart.height} onChange={e => setNewPart({...newPart, height: Number(e.target.value)})}/>
                            <button onClick={handleAddPart} className="w-full py-2 bg-cyan-600 text-white rounded font-bold">Add</button>
                        </div>
                    </div>
                </div>
            )}

            {showFireworks && <FireworksHighTech onComplete={() => setShowFireworks(false)} />}
        </div>
    );
};

export default NestingWorkspace;
