import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsPanel } from './nesting/StatsPanel';
import { NewNestListModal } from './nesting/NewNestList';
import PartParametersDialog from './nesting/NewNestList/PartParametersDialog';
import { NestingSheet } from './nesting/NewNestList/types';
import {
    MousePointer, Move, RotateCw, ZoomIn, ZoomOut, Maximize2, Grid3X3,
    Layers, Eye, EyeOff, Lock, Unlock, Trash2, Circle, Square, Minus,
    Undo2, Redo2, Copy, Scissors, X, Target, Hexagon, PenTool,
    Spline, FlipHorizontal, ArrowUpRight, CornerUpRight, Settings, BarChart3, FileBox
} from 'lucide-react';
import {
    Point2D, CADEntity, CADLayer, SnapSettings, GridSettings, DisplaySettings,
    CommandName, CommandState, SNAP_COLORS, DEFAULT_SNAP_SETTINGS,
    DEFAULT_GRID_SETTINGS, DEFAULT_DISPLAY_SETTINGS, DEFAULT_LAYERS, COMMAND_ALIASES
} from '../types/CADTypes';
import {
    GeometryUtils, EntityFactory, SnapEngine, TransformEngine, RenderEngine
} from '../services/CADEngine';
import { Language } from '../constants';

interface NestingToolProps { 
    lang?: Language;
    onSelectionModeChange?: (isSelecting: boolean) => void; // NEW: Callback to inform App about selection mode
}

const NestingTool: React.FC<NestingToolProps> = ({ lang = 'vi', onSelectionModeChange }) => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLCanvasElement>(null);
    const cmdInputRef = useRef<HTMLInputElement>(null);

    // Canvas size
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

    // View state
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);

    // Mouse state
    const [mouseScreen, setMouseScreen] = useState<Point2D>({ x: 0, y: 0 });
    const [mouseWorld, setMouseWorld] = useState<Point2D>({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState<Point2D>({ x: 0, y: 0 });

    // Entities
    const [entities, setEntities] = useState<CADEntity[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Layers
    const [layers, setLayers] = useState<CADLayer[]>(DEFAULT_LAYERS);
    const [activeLayerId, setActiveLayerId] = useState('0');

    // Settings
    const [snapSettings, setSnapSettings] = useState<SnapSettings>(DEFAULT_SNAP_SETTINGS);
    const [gridSettings, setGridSettings] = useState<GridSettings>(DEFAULT_GRID_SETTINGS);
    const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY_SETTINGS);

    // Command state
    const [currentCommand, setCurrentCommand] = useState<CommandName>('SELECT');
    const [commandPoints, setCommandPoints] = useState<Point2D[]>([]);
    const [commandPrompt, setCommandPrompt] = useState('Command:');
    const [commandInput, setCommandInput] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);

    // Snap
    const [currentSnap, setCurrentSnap] = useState<{ type: string; point: Point2D } | null>(null);

    // History
    const [history, setHistory] = useState<CADEntity[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // UI panels - default open
    const [showLayers, setShowLayers] = useState(true);
    const [showSnap, setShowSnap] = useState(true);
    const [showStats, setShowStats] = useState(true);

    // NEW NEST LIST MODULE - Enhanced State
    const [isNewNestListOpen, setIsNewNestListOpen] = useState(false);
    const [isSelectingParts, setIsSelectingParts] = useState(false);
    const [isSelectingSheet, setIsSelectingSheet] = useState(false);
    const [pendingPartData, setPendingPartData] = useState<any>(null);
    const [newNestListParts, setNewNestListParts] = useState<any[]>([]);
    const [newNestListSheets, setNewNestListSheets] = useState<any[]>([]);
    const [isPartParamsDialogOpen, setIsPartParamsDialogOpen] = useState(false);
    const [tempSelectedPart, setTempSelectedPart] = useState<any>(null);

    // Notify parent component when selection mode changes (for Radial Menu suppression)
    // ✅ FIX BUG 3: Also suppress during active drawing commands
    useEffect(() => {
        const isInSelectionMode = isSelectingParts || isSelectingSheet;
        const isDrawing = ['LINE', 'CIRCLE', 'RECTANGLE', 'POLYLINE', 'POLYGON'].includes(currentCommand);
        const shouldSuppressRadialMenu = isInSelectionMode || isDrawing;
        
        if (onSelectionModeChange) {
            onSelectionModeChange(shouldSuppressRadialMenu);
        }
    }, [isSelectingParts, isSelectingSheet, currentCommand, onSelectionModeChange]);

    // Dimension input for drawing
    const [dimInput, setDimInput] = useState('');
    const [showDimInput, setShowDimInput] = useState(false);

    // Selection box
    const [selBox, setSelBox] = useState<{ start: Point2D; end: Point2D } | null>(null);

    // Coordinate transforms
    const screenToWorld = useCallback((sx: number, sy: number): Point2D => {
        return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
    }, [pan, zoom]);

    const worldToScreen = useCallback((wx: number, wy: number): Point2D => {
        return { x: wx * zoom + pan.x, y: wy * zoom + pan.y };
    }, [pan, zoom]);

    // Get active layer color
    const getActiveColor = useCallback(() => {
        return layers.find(l => l.id === activeLayerId)?.color || '#FFFFFF';
    }, [layers, activeLayerId]);

    // Save history
    const saveHistory = useCallback(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(entities)));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [entities, history, historyIndex]);

    // Undo
    const undo = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            setEntities(JSON.parse(JSON.stringify(history[historyIndex - 1])));
            addLog('UNDO');
        }
    }, [history, historyIndex]);

    // Redo
    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            setEntities(JSON.parse(JSON.stringify(history[historyIndex + 1])));
            addLog('REDO');
        }
    }, [history, historyIndex]);

    // Command log
    const addLog = (msg: string) => {
        setCommandHistory(prev => [...prev.slice(-19), msg]);
    };

    // Process command
    const processCommand = useCallback((input: string) => {
        const cmd = input.trim();
        if (!cmd) return;

        // Parse coordinate input like "100,50" or "@50,30" (relative) or just number
        const parseCoord = (s: string): { x: number; y: number; relative: boolean } | number | null => {
            const rel = s.startsWith('@');
            const clean = rel ? s.slice(1) : s;
            if (clean.includes(',')) {
                const [xs, ys] = clean.split(',').map(v => parseFloat(v.trim()));
                if (!isNaN(xs) && !isNaN(ys)) return { x: xs, y: ys, relative: rel };
            }
            const num = parseFloat(clean);
            if (!isNaN(num)) return num;
            return null;
        };

        // Check if this is a dimension/coordinate input during an active command
        const parsed = parseCoord(cmd);
        
        // ✅ FIX BUG 1: Handle RECTANGLE dimension input (e.g., "1220,2440") when NO points yet
        if (currentCommand === 'RECTANGLE' && commandPoints.length === 0 && parsed !== null && typeof parsed !== 'number') {
            // User typed "width,height" without clicking first corner
            // Create rectangle from origin (0,0) or last snap point
            const origin = currentSnap?.point || { x: 0, y: 0 };
            const corner2 = { x: origin.x + parsed.x, y: origin.y + parsed.y };
            
            saveHistory();
            const rect = EntityFactory.createRectangle(origin, corner2, activeLayerId, getActiveColor());
            setEntities(prev => [...prev, rect]);
            setCommandPoints([]);
            setCurrentCommand('SELECT');
            setCommandPrompt('Command:');
            addLog(`✅ Rectangle created: ${parsed.x} × ${parsed.y}`);
            setCommandInput('');
            return;
        }
        
        if (parsed !== null && commandPoints.length > 0) {
            const lastPt = commandPoints[commandPoints.length - 1];

            if (currentCommand === 'LINE' || currentCommand === 'POLYLINE') {
                let newPt: Point2D;
                if (typeof parsed === 'number') {
                    // Just a length - use current direction or horizontal
                    const angle = displaySettings.orthoMode ? 0 : (GeometryUtils.angle(lastPt, mouseWorld) * Math.PI / 180);
                    newPt = { x: lastPt.x + parsed * Math.cos(angle), y: lastPt.y + parsed * Math.sin(angle) };
                } else {
                    newPt = parsed.relative ? { x: lastPt.x + parsed.x, y: lastPt.y + parsed.y } : { x: parsed.x, y: parsed.y };
                }
                saveHistory();
                if (currentCommand === 'LINE') {
                    const line = EntityFactory.createLine(lastPt, newPt, activeLayerId, getActiveColor());
                    setEntities(prev => [...prev, line]);
                    setCommandPoints([newPt]);
                    addLog(`Line to ${newPt.x.toFixed(1)},${newPt.y.toFixed(1)}`);
                } else {
                    setCommandPoints(prev => [...prev, newPt]);
                    setCommandPrompt(`POLYLINE: ${commandPoints.length + 1} points [Enter to finish]`);
                }
                setCommandInput('');
                return;
            }
            if (currentCommand === 'CIRCLE' && typeof parsed === 'number') {
                saveHistory();
                const circle = EntityFactory.createCircle(lastPt, parsed, activeLayerId, getActiveColor());
                setEntities(prev => [...prev, circle]);
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog(`Circle r=${parsed}`);
                setCommandInput('');
                return;
            }
            if (currentCommand === 'RECTANGLE' && typeof parsed !== 'number') {
                // For RECTANGLE, input is always treated as WIDTH,HEIGHT (kích thước)
                // Both "1220,2440" and "@1220,2440" mean width=1220, height=2440
                const corner2 = { x: lastPt.x + parsed.x, y: lastPt.y + parsed.y };
                saveHistory();
                const rect = EntityFactory.createRectangle(lastPt, corner2, activeLayerId, getActiveColor());
                setEntities(prev => [...prev, rect]);
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog(`✅ Rectangle created: ${parsed.x} × ${parsed.y}`);
                setCommandInput('');
                return;
            }
            if (currentCommand === 'MOVE' && selectedIds.size > 0) {
                let dx: number, dy: number;
                if (typeof parsed === 'number') { dx = parsed; dy = 0; }
                else if (parsed.relative) { dx = parsed.x; dy = parsed.y; }
                else { dx = parsed.x - lastPt.x; dy = parsed.y - lastPt.y; }
                saveHistory();
                setEntities(prev => prev.map(e =>
                    selectedIds.has(e.id) ? TransformEngine.moveEntity(e, dx, dy) : e
                ));
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog(`Moved by ${dx.toFixed(1)},${dy.toFixed(1)}`);
                setCommandInput('');
                return;
            }
            if (currentCommand === 'ROTATE' && selectedIds.size > 0 && typeof parsed === 'number') {
                saveHistory();
                setEntities(prev => prev.map(e =>
                    selectedIds.has(e.id) ? TransformEngine.rotateEntity(e, lastPt, parsed) : e
                ));
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog(`Rotated ${parsed}°`);
                setCommandInput('');
                return;
            }
            if (currentCommand === 'SCALE' && selectedIds.size > 0 && typeof parsed === 'number') {
                saveHistory();
                setEntities(prev => prev.map(e =>
                    selectedIds.has(e.id) ? TransformEngine.scaleEntity(e, lastPt, parsed) : e
                ));
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog(`Scaled ${parsed}x`);
                setCommandInput('');
                return;
            }
        }

        // Parse absolute coordinate for first point
        if (parsed !== null && commandPoints.length === 0 && ['LINE', 'POLYLINE', 'CIRCLE', 'RECTANGLE'].includes(currentCommand)) {
            if (typeof parsed !== 'number') {
                const pt = parsed.relative ? { x: parsed.x, y: parsed.y } : { x: parsed.x, y: parsed.y };
                setCommandPoints([pt]);
                if (currentCommand === 'LINE') setCommandPrompt('LINE: Specify next point or length');
                else if (currentCommand === 'POLYLINE') setCommandPrompt('POLYLINE: Specify next point');
                else if (currentCommand === 'CIRCLE') setCommandPrompt('CIRCLE: Specify radius');
                else if (currentCommand === 'RECTANGLE') setCommandPrompt('RECTANGLE: Specify other corner or @width,height');
                setCommandInput('');
                return;
            }
        }

        // Standard command processing
        const resolved = COMMAND_ALIASES[cmd.toUpperCase()] || cmd.toUpperCase() as CommandName;
        addLog(`> ${cmd}`);

        switch (resolved) {
            case 'LINE':
                setCurrentCommand('LINE');
                setCommandPoints([]);
                setCommandPrompt('LINE: Specify first point or x,y');
                break;
            case 'POLYLINE':
                setCurrentCommand('POLYLINE');
                setCommandPoints([]);
                setCommandPrompt('POLYLINE: Specify start point or x,y');
                break;
            case 'CIRCLE':
                setCurrentCommand('CIRCLE');
                setCommandPoints([]);
                setCommandPrompt('CIRCLE: Specify center or x,y');
                break;
            case 'ARC':
                setCurrentCommand('ARC');
                setCommandPoints([]);
                setCommandPrompt('ARC: Specify start point');
                break;
            case 'RECTANGLE':
                setCurrentCommand('RECTANGLE');
                setCommandPoints([]);
                setCommandPrompt('RECTANGLE: Specify first corner or x,y');
                break;
            case 'POLYGON':
                setCurrentCommand('POLYGON');
                setCommandPoints([]);
                setCommandPrompt('POLYGON: Enter number of sides');
                break;
            case 'ELLIPSE':
                setCurrentCommand('ELLIPSE');
                setCommandPoints([]);
                setCommandPrompt('ELLIPSE: Specify axis endpoint');
                break;
            case 'SPLINE':
                setCurrentCommand('SPLINE');
                setCommandPoints([]);
                setCommandPrompt('SPLINE: Specify first point');
                break;
            case 'MOVE':
                setCurrentCommand('MOVE');
                setCommandPoints([]);
                if (selectedIds.size === 0) {
                    setCommandPrompt('MOVE: Select objects to move, then press Enter');
                } else {
                    setCommandPrompt('MOVE: Specify base point or enter @dx,dy');
                }
                break;
            case 'COPY':
                setCurrentCommand('COPY');
                setCommandPoints([]);
                if (selectedIds.size === 0) {
                    setCommandPrompt('COPY: Select objects to copy, then press Enter');
                } else {
                    setCommandPrompt('COPY: Specify base point');
                }
                break;
            case 'ROTATE':
                setCurrentCommand('ROTATE');
                setCommandPoints([]);
                if (selectedIds.size === 0) {
                    setCommandPrompt('ROTATE: Select objects, then press Enter');
                } else {
                    setCommandPrompt('ROTATE: Specify base point or enter angle');
                }
                break;
            case 'SCALE':
                setCurrentCommand('SCALE');
                setCommandPoints([]);
                if (selectedIds.size === 0) {
                    setCommandPrompt('SCALE: Select objects, then press Enter');
                } else {
                    setCommandPrompt('SCALE: Specify base point or enter scale factor');
                }
                break;
            case 'MIRROR':
                setCurrentCommand('MIRROR');
                setCommandPoints([]);
                if (selectedIds.size === 0) {
                    setCommandPrompt('MIRROR: Select objects, then press Enter');
                } else {
                    setCommandPrompt('MIRROR: Specify first point of mirror line');
                }
                break;
            case 'DELETE':
                if (selectedIds.size > 0) {
                    saveHistory();
                    setEntities(prev => prev.filter(e => !selectedIds.has(e.id)));
                    setSelectedIds(new Set());
                    addLog(`Deleted ${selectedIds.size} objects`);
                }
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                break;
            case 'UNDO':
                undo();
                break;
            case 'REDO':
                redo();
                break;
            case 'ZOOMEXTENTS':
                zoomExtents();
                break;
            case 'ESCAPE':
                cancelCommand();
                break;
            default:
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
        }
        setCommandInput('');
    }, [selectedIds, saveHistory, undo, redo, commandPoints, currentCommand, activeLayerId, getActiveColor, mouseWorld, displaySettings.orthoMode]);

    // Cancel command
    const cancelCommand = useCallback(() => {
        setCurrentCommand('SELECT');
        setCommandPoints([]);
        setCommandPrompt('Command:');
        setSelBox(null);
    }, []);

    // Zoom extents
    const zoomExtents = useCallback(() => {
        if (entities.length === 0) {
            setPan({ x: canvasSize.width / 2, y: canvasSize.height / 2 });
            setZoom(1);
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const e of entities) {
            if (e.type === 'line') {
                minX = Math.min(minX, e.start.x, e.end.x);
                maxX = Math.max(maxX, e.start.x, e.end.x);
                minY = Math.min(minY, e.start.y, e.end.y);
                maxY = Math.max(maxY, e.start.y, e.end.y);
            } else if (e.type === 'circle') {
                minX = Math.min(minX, e.center.x - e.radius);
                maxX = Math.max(maxX, e.center.x + e.radius);
                minY = Math.min(minY, e.center.y - e.radius);
                maxY = Math.max(maxY, e.center.y + e.radius);
            } else if (e.type === 'rectangle') {
                minX = Math.min(minX, e.corner1.x, e.corner2.x);
                maxX = Math.max(maxX, e.corner1.x, e.corner2.x);
                minY = Math.min(minY, e.corner1.y, e.corner2.y);
                maxY = Math.max(maxY, e.corner1.y, e.corner2.y);
            }
        }
        const padding = 50;
        const w = maxX - minX || 100;
        const h = maxY - minY || 100;
        const scaleX = (canvasSize.width - padding * 2) / w;
        const scaleY = (canvasSize.height - padding * 2) / h;
        const newZoom = Math.min(scaleX, scaleY, 5);
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        setZoom(newZoom);
        setPan({ x: canvasSize.width / 2 - cx * newZoom, y: canvasSize.height / 2 - cy * newZoom });
    }, [entities, canvasSize]);

    // Handle click for drawing
    const handleCanvasClick = useCallback((world: Point2D) => {
        const pt = currentSnap?.point || world;

        switch (currentCommand) {
            case 'LINE':
                if (commandPoints.length === 0) {
                    setCommandPoints([pt]);
                    setCommandPrompt('LINE: Specify next point');
                } else {
                    saveHistory();
                    const line = EntityFactory.createLine(commandPoints[0], pt, activeLayerId, getActiveColor());
                    setEntities(prev => [...prev, line]);
                    setCommandPoints([pt]);
                    addLog(`Line created`);
                }
                break;

            case 'POLYLINE':
                setCommandPoints(prev => [...prev, pt]);
                setCommandPrompt(`POLYLINE: Specify next point (${commandPoints.length + 1} points) [Enter to finish, C to close]`);
                break;

            case 'CIRCLE':
                if (commandPoints.length === 0) {
                    setCommandPoints([pt]);
                    setCommandPrompt('CIRCLE: Specify radius');
                } else {
                    saveHistory();
                    const radius = GeometryUtils.distance(commandPoints[0], pt);
                    const circle = EntityFactory.createCircle(commandPoints[0], radius, activeLayerId, getActiveColor());
                    setEntities(prev => [...prev, circle]);
                    setCommandPoints([]);
                    setCurrentCommand('SELECT');
                    setCommandPrompt('Command:');
                    addLog(`Circle created (r=${radius.toFixed(2)})`);
                }
                break;

            case 'RECTANGLE':
                if (commandPoints.length === 0) {
                    setCommandPoints([pt]);
                    setCommandPrompt('RECTANGLE: Specify other corner');
                } else {
                    saveHistory();
                    const rect = EntityFactory.createRectangle(commandPoints[0], pt, activeLayerId, getActiveColor());
                    setEntities(prev => [...prev, rect]);
                    setCommandPoints([]);
                    setCurrentCommand('SELECT');
                    setCommandPrompt('Command:');
                    addLog(`Rectangle created`);
                }
                break;

            case 'MOVE':
            case 'COPY':
            case 'ROTATE':
            case 'SCALE':
            case 'MIRROR':
                // If no objects selected, allow selection
                if (selectedIds.size === 0) {
                    let hit = false;
                    for (const e of entities) {
                        if (hitTest(e, pt, 5 / zoom)) {
                            setSelectedIds(new Set([e.id]));
                            hit = true;
                            if (currentCommand === 'MOVE') setCommandPrompt('MOVE: Specify base point or enter displacement <dx,dy>');
                            else if (currentCommand === 'COPY') setCommandPrompt('COPY: Specify base point');
                            else if (currentCommand === 'ROTATE') setCommandPrompt('ROTATE: Specify base point or enter angle');
                            else if (currentCommand === 'SCALE') setCommandPrompt('SCALE: Specify base point or enter scale factor');
                            else if (currentCommand === 'MIRROR') setCommandPrompt('MIRROR: Specify first point of mirror line');
                            break;
                        }
                    }
                    if (!hit) {
                        setSelBox({ start: pt, end: pt });
                    }
                    break;
                }
                // MOVE logic
                if (currentCommand === 'MOVE') {
                    if (commandPoints.length === 0) {
                        setCommandPoints([pt]);
                        setCommandPrompt('MOVE: Specify destination or enter displacement');
                    } else {
                        saveHistory();
                        const dx = pt.x - commandPoints[0].x;
                        const dy = pt.y - commandPoints[0].y;
                        setEntities(prev => prev.map(e =>
                            selectedIds.has(e.id) ? TransformEngine.moveEntity(e, dx, dy) : e
                        ));
                        setCommandPoints([]);
                        setCurrentCommand('SELECT');
                        setCommandPrompt('Command:');
                        addLog(`Moved ${selectedIds.size} objects`);
                    }
                }
                // COPY logic
                else if (currentCommand === 'COPY') {
                    if (commandPoints.length === 0) {
                        setCommandPoints([pt]);
                        setCommandPrompt('COPY: Specify destination');
                    } else {
                        saveHistory();
                        const dx = pt.x - commandPoints[0].x;
                        const dy = pt.y - commandPoints[0].y;
                        const copies: CADEntity[] = [];
                        for (const e of entities) {
                            if (selectedIds.has(e.id)) {
                                const copy = TransformEngine.copyEntity(e);
                                copies.push(TransformEngine.moveEntity(copy, dx, dy));
                            }
                        }
                        setEntities(prev => [...prev, ...copies]);
                        setCommandPrompt('COPY: Specify next destination [Enter to exit]');
                    }
                }
                // ROTATE logic
                else if (currentCommand === 'ROTATE') {
                    if (commandPoints.length === 0) {
                        setCommandPoints([pt]);
                        setCommandPrompt('ROTATE: Specify rotation angle (move mouse or type value)');
                    } else {
                        saveHistory();
                        const angle = GeometryUtils.angle(commandPoints[0], pt);
                        setEntities(prev => prev.map(e =>
                            selectedIds.has(e.id) ? TransformEngine.rotateEntity(e, commandPoints[0], angle) : e
                        ));
                        setCommandPoints([]);
                        setCurrentCommand('SELECT');
                        setCommandPrompt('Command:');
                        addLog(`Rotated ${selectedIds.size} objects by ${angle.toFixed(1)}°`);
                    }
                }
                // SCALE logic  
                else if (currentCommand === 'SCALE') {
                    if (commandPoints.length === 0) {
                        setCommandPoints([pt]);
                        setCommandPrompt('SCALE: Specify scale factor (move or type value like 2)');
                    } else {
                        saveHistory();
                        const dist = GeometryUtils.distance(commandPoints[0], pt);
                        const factor = dist / 50; // More intuitive scale
                        setEntities(prev => prev.map(e =>
                            selectedIds.has(e.id) ? TransformEngine.scaleEntity(e, commandPoints[0], factor) : e
                        ));
                        setCommandPoints([]);
                        setCurrentCommand('SELECT');
                        setCommandPrompt('Command:');
                        addLog(`Scaled by ${factor.toFixed(2)}`);
                    }
                }
                // MIRROR logic
                else if (currentCommand === 'MIRROR') {
                    if (commandPoints.length === 0) {
                        setCommandPoints([pt]);
                        setCommandPrompt('MIRROR: Specify second point of mirror line');
                    } else {
                        saveHistory();
                        const mirrored: CADEntity[] = [];
                        for (const e of entities) {
                            if (selectedIds.has(e.id)) {
                                mirrored.push(TransformEngine.mirrorEntity(e, commandPoints[0], pt));
                            }
                        }
                        setEntities(prev => [...prev, ...mirrored]);
                        setCommandPoints([]);
                        setCurrentCommand('SELECT');
                        setCommandPrompt('Command:');
                        addLog(`Mirrored ${selectedIds.size} objects`);
                    }
                }
                break;

            case 'SELECT':
            default:
                // Hit test for selection
                let hit = false;
                for (const e of entities) {
                    if (hitTest(e, pt, 5 / zoom)) {
                        setSelectedIds(new Set([e.id]));
                        hit = true;
                        break;
                    }
                }
                if (!hit) {
                    setSelectedIds(new Set());
                    setSelBox({ start: pt, end: pt });
                }
                break;
        }
    }, [currentCommand, commandPoints, currentSnap, activeLayerId, getActiveColor, selectedIds, entities, zoom, saveHistory]);

    // ============================================================
    // NEW NEST LIST - Selection & Integration Handlers
    // ============================================================
    
    /**
     * Handler: Start selecting parts from canvas
     * Called when user clicks "Add Part" button in NewNestListModal
     */
    const handleStartPartSelection = useCallback(() => {
        setIsNewNestListOpen(false); // Hide modal
        setIsSelectingParts(true); // Enter selection mode
        setCurrentCommand('SELECT'); // Set to selection mode
        setCommandPrompt('🎯 Select parts → Press ENTER to set params → Right-Click when done');
        addLog('🎯 Part Selection: Click objects → ENTER for params → Right-Click to finish');
    }, []);

    /**
     * Handler: Start selecting sheet from canvas
     * Called when user clicks "Add Sheet" button in NewNestListModal
     */
    const handleStartSheetSelection = useCallback(() => {
        setIsNewNestListOpen(false); // Hide modal
        setIsSelectingSheet(true); // Enter sheet selection mode
        setCurrentCommand('SELECT'); // Set to selection mode
        setCommandPrompt('Select sheet boundary (Click rectangle, then Right-Click to finish)');
        addLog('📐 Sheet Selection Mode: Select rectangle boundary, Right-Click when done');
    }, []);

    /**
     * Handler: Confirm part selection (ENTER key pressed)
     * Calculate dimensions and show Part Parameters Dialog
     */
    const handleConfirmPartSelection = useCallback(() => {
        // Get selected entities
        const selectedEntities = entities.filter(e => selectedIds.has(e.id));
        
        if (selectedEntities.length === 0) {
            addLog('❌ No objects selected. Please select objects first.');
            return;
        }

        // Calculate bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        for (const entity of selectedEntities) {
            if (entity.type === 'line') {
                minX = Math.min(minX, entity.start.x, entity.end.x);
                maxX = Math.max(maxX, entity.start.x, entity.end.x);
                minY = Math.min(minY, entity.start.y, entity.end.y);
                maxY = Math.max(maxY, entity.start.y, entity.end.y);
            } else if (entity.type === 'circle') {
                minX = Math.min(minX, entity.center.x - entity.radius);
                maxX = Math.max(maxX, entity.center.x + entity.radius);
                minY = Math.min(minY, entity.center.y - entity.radius);
                maxY = Math.max(maxY, entity.center.y + entity.radius);
            } else if (entity.type === 'rectangle') {
                minX = Math.min(minX, entity.corner1.x, entity.corner2.x);
                maxX = Math.max(maxX, entity.corner1.x, entity.corner2.x);
                minY = Math.min(minY, entity.corner1.y, entity.corner2.y);
                maxY = Math.max(maxY, entity.corner1.y, entity.corner2.y);
            } else if (entity.type === 'polyline') {
                for (const pt of entity.points) {
                    minX = Math.min(minX, pt.x);
                    maxX = Math.max(maxX, pt.x);
                    minY = Math.min(minY, pt.y);
                    maxY = Math.max(maxY, pt.y);
                }
            }
        }

        const width = maxX - minX;
        const height = maxY - minY;
        const area = width * height;

        // Store temp part data
        const tempPart = {
            width: parseFloat(width.toFixed(2)),
            height: parseFloat(height.toFixed(2)),
            area: parseFloat(area.toFixed(2)),
            geometry: selectedEntities
        };

        setTempSelectedPart(tempPart);
        setIsPartParamsDialogOpen(true); // Show parameters dialog
        addLog(`📝 Part selected (${width.toFixed(2)}×${height.toFixed(2)}) - Enter params in dialog`);
        setCommandPrompt('📝 Enter part parameters in dialog...');
        
    }, [entities, selectedIds]);

    /**
     * Handler: Finish selection
     * Called when user Right-Clicks to finish selection
     * 
     * For PARTS: Opens Part Parameters Dialog
     * For SHEETS: Auto-adds sheet with default parameters (Instant Add)
     */
    const handleFinishSelection = useCallback(() => {
        if (isSelectingParts) {
            // ✅ FIX: If objects selected, open Part Parameters Dialog
            if (selectedIds.size > 0) {
                handleConfirmPartSelection(); // This opens Part Params Dialog
                addLog('🎯 Right-Click detected - Opening Part Parameters Dialog...');
            } else {
                // No selection, exit mode and reopen modal
                setIsSelectingParts(false);
                setIsNewNestListOpen(true);
                setCommandPrompt('Command:');
                addLog('⚠️ No objects selected. Returning to modal...');
            }
            
        } else if (isSelectingSheet) {
            // Get selected sheet boundary
            const selectedEntities = entities.filter(e => selectedIds.has(e.id));
            
            if (selectedEntities.length === 0) {
                addLog('❌ No sheet boundary selected.');
                setIsSelectingSheet(false);
                setIsNewNestListOpen(true);
                return;
            }

            // Find rectangle entity
            const rect = selectedEntities.find(e => e.type === 'rectangle');
            if (!rect || rect.type !== 'rectangle') {
                addLog('❌ Please select a rectangle as sheet boundary.');
                setIsSelectingSheet(false);
                setIsNewNestListOpen(true);
                return;
            }

            const width = Math.abs(rect.corner2.x - rect.corner1.x);
            const height = Math.abs(rect.corner2.y - rect.corner1.y);

            // ✅ NEW: Instant Add with default parameters
            // Auto-generate sheet name: "Tấm ván [Rộng]x[Cao]"
            const sheetData: NestingSheet = {
                id: `sheet_${Date.now()}`,
                materialName: `Tấm ván ${Math.round(width)}x${Math.round(height)}`,
                size: {
                    width: parseFloat(width.toFixed(2)),
                    height: parseFloat(height.toFixed(2))
                },
                thickness: 17,  // Default thickness = 17 mm
                quantity: 1       // Default quantity = 1
            };

            setNewNestListSheets(prev => [...prev, sheetData]);
            setIsSelectingSheet(false);
            setIsNewNestListOpen(true);  // Reopen modal immediately
            
            addLog(`✅ Sheet added: ${sheetData.materialName} (${width.toFixed(2)} × ${height.toFixed(2)}) - Thickness: 17mm, Qty: 1`);
        }
        
        setSelectedIds(new Set()); // Clear selection
        setCommandPrompt('Command:');
    }, [isSelectingParts, isSelectingSheet, entities, selectedIds, newNestListParts, newNestListSheets]);

    /**
     * Handler: Add part to list
     * This is the CRITICAL function that updates the parts list
     */
    const handleAddPartToList = useCallback((partData: any) => {
        setNewNestListParts(prev => {
            const updated = [...prev, partData];
            console.log('📋 Parts list updated:', updated); // Debug log
            return updated;
        });
        
        // Reopen modal after state update
        setTimeout(() => {
            setIsNewNestListOpen(true);
        }, 100);
    }, []);

    /**
     * Handler: Update part in list
     */
    const handleUpdatePartInList = useCallback((id: string, updates: any) => {
        setNewNestListParts(prev => 
            prev.map(p => p.id === id ? { ...p, ...updates } : p)
        );
    }, []);

    /**
     * Handler: Delete part from list
     */
    const handleDeletePartFromList = useCallback((id: string) => {
        setNewNestListParts(prev => prev.filter(p => p.id !== id));
    }, []);

    /**
     * Handler: Update sheet in list
     */
    const handleUpdateSheetInList = useCallback((id: string, updates: any) => {
        setNewNestListSheets(prev => 
            prev.map(s => s.id === id ? { ...s, ...updates } : s)
        );
    }, []);

    /**
     * Handler: Delete sheet from list
     */
    const handleDeleteSheetFromList = useCallback((id: string) => {
        setNewNestListSheets(prev => prev.filter(s => s.id !== id));
    }, []);

    /**
     * Handler: Confirm part parameters from dialog
     * Add part to list with user-entered data
     */
    const handleConfirmPartParameters = useCallback((params: { name: string; quantityMode: 'max' | 'custom'; customQuantity: number }) => {
        if (!tempSelectedPart) return;

        // Create final part data
        const partData = {
            id: `part_${Date.now()}`,
            name: params.name,
            width: tempSelectedPart.width,
            height: tempSelectedPart.height,
            area: tempSelectedPart.area,
            quantity: params.quantityMode === 'max' ? 999 : params.customQuantity,
            quantityMode: params.quantityMode,
            priority: 'medium' as const,
            allowSymmetry: true,
            allowRotation: true,
            geometry: tempSelectedPart.geometry,
            thumbnail: null
        };

        // Add to list
        setNewNestListParts(prev => [...prev, partData]);
        addLog(`✅ Added: ${partData.name} (${partData.width}×${partData.height}) × ${partData.quantity}`);
        addLog('🎯 Select more + ENTER, or Right-Click to finish');

        // Close dialog and clear temp
        setIsPartParamsDialogOpen(false);
        setTempSelectedPart(null);
        setSelectedIds(new Set()); // Clear selection

        // Update prompt
        setCommandPrompt('🎯 Select more parts + ENTER, or Right-Click to finish');

        // Stay in selection mode for adding more parts
        // User can press Enter again to add another part or Right-click to finish
        setCommandPrompt('Select more parts (ENTER to confirm) or Right-Click to finish');
        
    }, [tempSelectedPart]);

    // ============================================================
    // End of NEW NEST LIST Handlers
    // ============================================================

    // Hit test
    const hitTest = (entity: CADEntity, pt: Point2D, tol: number): boolean => {
        switch (entity.type) {
            case 'line':
                return GeometryUtils.pointOnLine(pt, entity.start, entity.end, tol);
            case 'circle':
                const d = GeometryUtils.distance(pt, entity.center);
                return Math.abs(d - entity.radius) < tol;
            case 'rectangle':
                const minX = Math.min(entity.corner1.x, entity.corner2.x);
                const maxX = Math.max(entity.corner1.x, entity.corner2.x);
                const minY = Math.min(entity.corner1.y, entity.corner2.y);
                const maxY = Math.max(entity.corner1.y, entity.corner2.y);
                // Check if on edges
                if (pt.x >= minX - tol && pt.x <= maxX + tol && pt.y >= minY - tol && pt.y <= maxY + tol) {
                    if (Math.abs(pt.x - minX) < tol || Math.abs(pt.x - maxX) < tol ||
                        Math.abs(pt.y - minY) < tol || Math.abs(pt.y - maxY) < tol) {
                        return true;
                    }
                }
                return false;
            default:
                return false;
        }
    };

    // Mouse handlers
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = screenToWorld(sx, sy);

        // ✅ RIGHT-CLICK HANDLER (按照用户要求的exact logic)
        if (e.button === 2) { // Right button
            // Determine app state FIRST
            const isDrawing = ['LINE', 'CIRCLE', 'RECTANGLE', 'POLYLINE', 'POLYGON'].includes(currentCommand);
            const appState = isSelectingParts ? 'SELECTING_PART' : 
                           isSelectingSheet ? 'SELECTING_SHEET' :
                           isDrawing ? 'DRAWING' : 'IDLE';
            
            // Only preventDefault if NOT in IDLE state
            // (IDLE needs event to bubble up for Radial Menu)
            if (appState !== 'IDLE') {
                e.preventDefault(); // CHẶN MENU RADIAL VÀ BROWSER MENU
            }
            
            // Logic sửa lỗi 2 & 3:
            if (appState === 'SELECTING_PART' || appState === 'DRAWING') {
                // KHÔNG mở NewNestListModal
                // MỞ PartParametersModal (Bảng Tham Chiếu)
                if (appState === 'SELECTING_PART' && selectedIds.size > 0) {
                    // Open Part Parameters Dialog
                    handleConfirmPartSelection();
                    addLog('🎯 Right-Click: Opening Part Parameters Dialog...');
                } else if (appState === 'DRAWING') {
                    // Cancel drawing command, return to SELECT
                    cancelCommand();
                    addLog('🚫 Right-Click: Cancelled drawing command');
                }
                return;
            }
            
            if (appState === 'SELECTING_SHEET') {
                handleFinishSelection();
                return;
            }
            
            // Chỉ hiện Menu Radial khi đang ở trạng thái Rảnh (IDLE)
            if (appState === 'IDLE') {
                // Let event bubble up to App.tsx handleContextMenu for Radial Menu
                return;
            }
        }

        if (e.button === 1) { // Middle button
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else if (e.button === 0) { // Left button
            handleCanvasClick(world);
        }
    }, [screenToWorld, pan, handleCanvasClick, isSelectingParts, isSelectingSheet, currentCommand, selectedIds, handleConfirmPartSelection, cancelCommand, handleFinishSelection]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        setMouseScreen({ x: sx, y: sy });

        let world = screenToWorld(sx, sy);

        // Ortho constraint
        if (displaySettings.orthoMode && commandPoints.length > 0) {
            const last = commandPoints[commandPoints.length - 1];
            const dx = Math.abs(world.x - last.x);
            const dy = Math.abs(world.y - last.y);
            if (dx > dy) world = { x: world.x, y: last.y };
            else world = { x: last.x, y: world.y };
        }

        setMouseWorld(world);

        // Snap detection
        const snaps = SnapEngine.findSnapPoints(world, entities, layers, snapSettings, zoom);
        if (snaps.length > 0) {
            setCurrentSnap({ type: snaps[0].type, point: snaps[0].point });
        } else if (gridSettings.snapToGrid) {
            const gx = Math.round(world.x / gridSettings.size) * gridSettings.size;
            const gy = Math.round(world.y / gridSettings.size) * gridSettings.size;
            setCurrentSnap({ type: 'grid', point: { x: gx, y: gy } });
        } else {
            setCurrentSnap(null);
        }

        // Panning
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }

        // Selection box
        if (selBox) {
            setSelBox(prev => prev ? { ...prev, end: world } : null);
        }
    }, [screenToWorld, isPanning, panStart, displaySettings.orthoMode, commandPoints, entities, layers, snapSettings, gridSettings, zoom, selBox]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        setIsPanning(false);

        if (selBox) {
            const minX = Math.min(selBox.start.x, selBox.end.x);
            const maxX = Math.max(selBox.start.x, selBox.end.x);
            const minY = Math.min(selBox.start.y, selBox.end.y);
            const maxY = Math.max(selBox.start.y, selBox.end.y);

            const selected = new Set<string>();
            for (const e of entities) {
                let inside = false;
                if (e.type === 'line') {
                    inside = e.start.x >= minX && e.start.x <= maxX && e.start.y >= minY && e.start.y <= maxY &&
                        e.end.x >= minX && e.end.x <= maxX && e.end.y >= minY && e.end.y <= maxY;
                } else if (e.type === 'circle') {
                    inside = e.center.x - e.radius >= minX && e.center.x + e.radius <= maxX &&
                        e.center.y - e.radius >= minY && e.center.y + e.radius <= maxY;
                } else if (e.type === 'rectangle') {
                    const ex1 = Math.min(e.corner1.x, e.corner2.x);
                    const ex2 = Math.max(e.corner1.x, e.corner2.x);
                    const ey1 = Math.min(e.corner1.y, e.corner2.y);
                    const ey2 = Math.max(e.corner1.y, e.corner2.y);
                    inside = ex1 >= minX && ex2 <= maxX && ey1 >= minY && ey2 <= maxY;
                }
                if (inside) selected.add(e.id);
            }
            setSelectedIds(selected);
            setSelBox(null);
        }
    }, [selBox, entities]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(20, zoom * factor));
        setPan({
            x: mx - (mx - pan.x) * (newZoom / zoom),
            y: my - (my - pan.y) * (newZoom / zoom)
        });
        setZoom(newZoom);
    }, [zoom, pan]);

    // Prevent page scroll when hovering canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const wheelHandler = (e: WheelEvent) => { e.preventDefault(); };
        canvas.addEventListener('wheel', wheelHandler, { passive: false });
        return () => canvas.removeEventListener('wheel', wheelHandler);
    }, []);

    // Keyboard handler
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { cancelCommand(); }
            if (e.key === 'F3') { e.preventDefault(); setSnapSettings(s => ({ ...s, enabled: !s.enabled })); }
            if (e.key === 'F7') { e.preventDefault(); setGridSettings(s => ({ ...s, visible: !s.visible })); }
            if (e.key === 'F8') { e.preventDefault(); setDisplaySettings(s => ({ ...s, orthoMode: !s.orthoMode })); }
            if (e.key === 'F9') { e.preventDefault(); setGridSettings(s => ({ ...s, snapToGrid: !s.snapToGrid })); }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
            if (e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
            if (e.key === 'Delete') { processCommand('DELETE'); }
            
            if (e.key === 'Enter' && currentCommand === 'POLYLINE' && commandPoints.length >= 2) {
                saveHistory();
                const pl = EntityFactory.createPolyline(commandPoints, false, activeLayerId, getActiveColor());
                setEntities(prev => [...prev, pl]);
                setCommandPoints([]);
                setCurrentCommand('SELECT');
                setCommandPrompt('Command:');
                addLog('Polyline created');
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [cancelCommand, undo, redo, processCommand, currentCommand, commandPoints, saveHistory, activeLayerId, getActiveColor, isSelectingParts, selectedIds]);

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height - 80 });
            }
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    // Initial zoom
    useEffect(() => {
        setPan({ x: canvasSize.width / 2, y: canvasSize.height / 2 });
    }, [canvasSize]);

    // Main canvas render
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = displaySettings.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid
        if (gridSettings.visible) {
            const gridScreen = gridSettings.size * zoom;
            if (gridScreen > 3) {
                ctx.strokeStyle = gridSettings.color;
                ctx.lineWidth = 0.5;
                const startX = pan.x % gridScreen;
                const startY = pan.y % gridScreen;
                ctx.beginPath();
                for (let x = startX; x < canvas.width; x += gridScreen) {
                    ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
                }
                for (let y = startY; y < canvas.height; y += gridScreen) {
                    ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
                }
                ctx.stroke();
            }
        }

        // Origin
        if (displaySettings.showOrigin) {
            const o = worldToScreen(0, 0);
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(o.x - 30, o.y); ctx.lineTo(o.x + 30, o.y); ctx.stroke();
            ctx.strokeStyle = '#00ff00';
            ctx.beginPath(); ctx.moveTo(o.x, o.y - 30); ctx.lineTo(o.x, o.y + 30); ctx.stroke();
        }

        // Entities
        for (const e of entities) {
            const layer = layers.find(l => l.id === e.layerId);
            if (!layer?.visible) continue;
            RenderEngine.renderEntity(ctx, e, worldToScreen, zoom, selectedIds.has(e.id), false);
        }

        // Drawing preview
        if (commandPoints.length > 0) {
            const previewPt = currentSnap?.point || mouseWorld;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);

            if (currentCommand === 'LINE') {
                const p1 = worldToScreen(commandPoints[0].x, commandPoints[0].y);
                const p2 = worldToScreen(previewPt.x, previewPt.y);
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            } else if (currentCommand === 'POLYLINE') {
                ctx.beginPath();
                const first = worldToScreen(commandPoints[0].x, commandPoints[0].y);
                ctx.moveTo(first.x, first.y);
                for (let i = 1; i < commandPoints.length; i++) {
                    const p = worldToScreen(commandPoints[i].x, commandPoints[i].y);
                    ctx.lineTo(p.x, p.y);
                }
                const last = worldToScreen(previewPt.x, previewPt.y);
                ctx.lineTo(last.x, last.y);
                ctx.stroke();
            } else if (currentCommand === 'CIRCLE') {
                const c = worldToScreen(commandPoints[0].x, commandPoints[0].y);
                const r = GeometryUtils.distance(commandPoints[0], previewPt) * zoom;
                ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();
            } else if (currentCommand === 'RECTANGLE') {
                const p1 = worldToScreen(commandPoints[0].x, commandPoints[0].y);
                const p2 = worldToScreen(previewPt.x, previewPt.y);
                ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
            }
            ctx.setLineDash([]);
        }

        // Selection box
        if (selBox) {
            const p1 = worldToScreen(selBox.start.x, selBox.start.y);
            const p2 = worldToScreen(selBox.end.x, selBox.end.y);
            ctx.strokeStyle = '#0088ff';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
            ctx.fillStyle = 'rgba(0,136,255,0.1)';
            ctx.fillRect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
            ctx.setLineDash([]);
        }
    }, [entities, layers, pan, zoom, gridSettings, displaySettings, worldToScreen, selectedIds, commandPoints, currentCommand, currentSnap, mouseWorld, selBox]);

    // Overlay render (crosshair, snap)
    useEffect(() => {
        const overlay = overlayRef.current;
        const ctx = overlay?.getContext('2d');
        if (!overlay || !ctx) return;

        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // Crosshair
        // Crosshair (Full Screen - AutoCAD Style)
        if (displaySettings.showCrosshair) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; // Màu trắng mờ
            ctx.lineWidth = 1;
            ctx.setLineDash([15, 10]); // Nét đứt thưa

            ctx.beginPath();
            // Horizontal line (toàn màn hình)
            ctx.moveTo(0, mouseScreen.y);
            ctx.lineTo(overlay.width, mouseScreen.y);
            // Vertical line (toàn màn hình)
            ctx.moveTo(mouseScreen.x, 0);
            ctx.lineTo(mouseScreen.x, overlay.height);
            ctx.stroke();
            
            ctx.setLineDash([]); // Reset dash
        }

        // Snap marker
        if (currentSnap) {
            const sp = worldToScreen(currentSnap.point.x, currentSnap.point.y);
            ctx.strokeStyle = SNAP_COLORS[currentSnap.type as keyof typeof SNAP_COLORS] || '#ffff00';
            ctx.fillStyle = ctx.strokeStyle;
            ctx.lineWidth = 2;
            const s = 6;

            switch (currentSnap.type) {
                case 'endpoint':
                    ctx.fillRect(sp.x - s, sp.y - s, s * 2, s * 2);
                    break;
                case 'midpoint':
                    ctx.beginPath();
                    ctx.moveTo(sp.x, sp.y - s);
                    ctx.lineTo(sp.x + s, sp.y + s);
                    ctx.lineTo(sp.x - s, sp.y + s);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case 'center':
                    ctx.beginPath();
                    ctx.arc(sp.x, sp.y, s, 0, Math.PI * 2);
                    ctx.stroke();
                    break;
                case 'intersection':
                    ctx.beginPath();
                    ctx.moveTo(sp.x - s, sp.y - s); ctx.lineTo(sp.x + s, sp.y + s);
                    ctx.moveTo(sp.x + s, sp.y - s); ctx.lineTo(sp.x - s, sp.y + s);
                    ctx.stroke();
                    break;
                case 'quadrant':
                    ctx.beginPath();
                    ctx.moveTo(sp.x, sp.y - s);
                    ctx.lineTo(sp.x + s, sp.y);
                    ctx.lineTo(sp.x, sp.y + s);
                    ctx.lineTo(sp.x - s, sp.y);
                    ctx.closePath();
                    ctx.fill();
                    break;
                default:
                    ctx.strokeRect(sp.x - s, sp.y - s, s * 2, s * 2);
            }
        }
    }, [mouseScreen, currentSnap, displaySettings, worldToScreen]);

    // Toolbar button
    const ToolBtn: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> =
        ({ icon, label, active, onClick }) => (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
                className={`p-2 rounded transition-all ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                title={label}>{icon}</motion.button>
        );

    const StatusBtn: React.FC<{ label: string; active: boolean; onClick: () => void; shortcut?: string }> =
        ({ label, active, onClick, shortcut }) => (
            <button onClick={onClick} title={shortcut}
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${active ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                {label}
            </button>
        );

    return (
        <div ref={containerRef} className="w-full h-[800px] bg-slate-900 rounded-xl overflow-hidden flex flex-col border border-slate-700">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-800 border-b border-slate-700 flex-wrap">
                <div className="flex items-center gap-1 px-1 border-r border-slate-700">
                    <ToolBtn icon={<MousePointer size={16} />} label="Select (ESC)" active={currentCommand === 'SELECT'} onClick={() => processCommand('ESC')} />
                    <ToolBtn icon={<Minus size={16} />} label="Line (L)" active={currentCommand === 'LINE'} onClick={() => processCommand('L')} />
                    <ToolBtn icon={<PenTool size={16} />} label="Polyline (PL)" active={currentCommand === 'POLYLINE'} onClick={() => processCommand('PL')} />
                    <ToolBtn icon={<Circle size={16} />} label="Circle (C)" active={currentCommand === 'CIRCLE'} onClick={() => processCommand('C')} />
                    <ToolBtn icon={<Square size={16} />} label="Rectangle (REC)" active={currentCommand === 'RECTANGLE'} onClick={() => processCommand('REC')} />
                    <ToolBtn icon={<Hexagon size={16} />} label="Polygon (POL)" active={currentCommand === 'POLYGON'} onClick={() => processCommand('POL')} />
                </div>
                <div className="flex items-center gap-1 px-1 border-r border-slate-700">
                    <ToolBtn icon={<Move size={16} />} label="Move (M)" active={currentCommand === 'MOVE'} onClick={() => processCommand('M')} />
                    <ToolBtn icon={<Copy size={16} />} label="Copy (CO)" active={currentCommand === 'COPY'} onClick={() => processCommand('CO')} />
                    <ToolBtn icon={<RotateCw size={16} />} label="Rotate (RO)" active={currentCommand === 'ROTATE'} onClick={() => processCommand('RO')} />
                    <ToolBtn icon={<Maximize2 size={16} />} label="Scale (SC)" active={currentCommand === 'SCALE'} onClick={() => processCommand('SC')} />
                    <ToolBtn icon={<FlipHorizontal size={16} />} label="Mirror (MI)" active={currentCommand === 'MIRROR'} onClick={() => processCommand('MI')} />
                    <ToolBtn icon={<Trash2 size={16} />} label="Delete (DEL)" onClick={() => processCommand('DEL')} />
                </div>
                <div className="flex items-center gap-1 px-1 border-r border-slate-700">
                    <ToolBtn icon={<Undo2 size={16} />} label="Undo (Ctrl+Z)" onClick={undo} />
                    <ToolBtn icon={<Redo2 size={16} />} label="Redo (Ctrl+Y)" onClick={redo} />
                </div>
                <div className="flex items-center gap-1 px-1 border-r border-slate-700">
                    <ToolBtn icon={<ZoomIn size={16} />} label="Zoom In" onClick={() => setZoom(z => Math.min(20, z * 1.2))} />
                    <ToolBtn icon={<ZoomOut size={16} />} label="Zoom Out" onClick={() => setZoom(z => Math.max(0.1, z / 1.2))} />
                    <ToolBtn icon={<Maximize2 size={16} />} label="Zoom Extents (ZE)" onClick={zoomExtents} />
                </div>
                <div className="flex items-center gap-1 px-1">
                    <ToolBtn icon={<Layers size={16} />} label="Layers" active={showLayers} onClick={() => setShowLayers(!showLayers)} />
                    <ToolBtn icon={<Target size={16} />} label="OSNAP" active={showSnap} onClick={() => setShowSnap(!showSnap)} />
                    <ToolBtn icon={<BarChart3 size={16} />} label="Thống kê" active={showStats} onClick={() => setShowStats(!showStats)} />
                    <ToolBtn icon={<Grid3X3 size={16} />} label="Grid (F7)" active={gridSettings.visible} onClick={() => setGridSettings(s => ({ ...s, visible: !s.visible }))} />
                </div>
                {/* NEW NEST LIST BUTTON */}
                <div className="flex items-center gap-1 px-1 border-l border-slate-700">
                    <button
                        onClick={() => setIsNewNestListOpen(true)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-medium rounded transition-all duration-200 shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
                        title="Open New Nest List (Ctrl+N)"
                    >
                        <FileBox size={16} />
                        <span>NEW NEST LIST</span>
                    </button>
                </div>
                <div className="flex-1" />
                <div className="text-xs text-slate-400 font-mono">{(zoom * 100).toFixed(0)}%</div>
            </div>

            {/* Main */}
            <div className="flex-1 flex relative">
                {/* DANH SÁCH CHI TIẾT Panel - Left Side */}
                <motion.div
                    initial={{ x: -320, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-[320px] flex-shrink-0 bg-slate-800/95 border-r border-slate-700 flex flex-col backdrop-blur-sm"
                >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-700 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
                            📋 Danh Sách Chi Tiết
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {entities.length} đối tượng | {selectedIds.size} đã chọn
                        </p>
                    </div>

                    {/* Content - Scrollable List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {entities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 px-4">
                                <div className="text-4xl mb-3">📦</div>
                                <p className="text-sm text-center">Chưa có đối tượng nào</p>
                                <p className="text-xs text-center mt-1 opacity-60">Vẽ hoặc import để bắt đầu</p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-1">
                                {entities.map((entity, index) => {
                                    const isSelected = selectedIds.has(entity.id);
                                    const layer = layers.find(l => l.id === entity.layerId);
                                    
                                    // Get entity info
                                    let info = '';
                                    let icon = '📐';
                                    if (entity.type === 'line') {
                                        const length = GeometryUtils.distance(entity.start, entity.end);
                                        info = `Dài: ${length.toFixed(2)}`;
                                        icon = '📏';
                                    } else if (entity.type === 'circle') {
                                        const area = Math.PI * entity.radius * entity.radius;
                                        info = `R: ${entity.radius.toFixed(2)} | A: ${area.toFixed(2)}`;
                                        icon = '⭕';
                                    } else if (entity.type === 'rectangle') {
                                        const w = Math.abs(entity.corner2.x - entity.corner1.x);
                                        const h = Math.abs(entity.corner2.y - entity.corner1.y);
                                        info = `${w.toFixed(2)} × ${h.toFixed(2)}`;
                                        icon = '▭';
                                    } else if (entity.type === 'polyline') {
                                        info = `${entity.points.length} điểm`;
                                        icon = '📈';
                                    }

                                    return (
                                        <motion.div
                                            key={entity.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            onClick={() => {
                                                if (isSelected) {
                                                    setSelectedIds(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(entity.id);
                                                        return next;
                                                    });
                                                } else {
                                                    setSelectedIds(prev => new Set([...prev, entity.id]));
                                                }
                                            }}
                                            className={`
                                                p-3 rounded-lg cursor-pointer transition-all duration-200
                                                ${isSelected 
                                                    ? 'bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/50 shadow-lg' 
                                                    : 'bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xl">{icon}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-300 uppercase">
                                                            {entity.type}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">#{index + 1}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                                                        {info}
                                                    </div>
                                                    {layer && (
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <div 
                                                                className="w-3 h-3 rounded-sm border border-slate-500" 
                                                                style={{ backgroundColor: layer.color }}
                                                            />
                                                            <span className="text-[10px] text-slate-500">{layer.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        className="text-blue-400"
                                                    >
                                                        ✓
                                                    </motion.div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer - Push to Nest List Button */}
                    <div className="p-3 border-t border-slate-700 bg-slate-800/80">
                        <button
                            onClick={() => {
                                // Get selected entities
                                const selectedEntities = entities.filter(e => selectedIds.has(e.id));
                                
                                if (selectedEntities.length === 0) {
                                    addLog('⚠️ Chưa chọn đối tượng nào!');
                                    return;
                                }

                                // Calculate bounding box
                                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                
                                for (const entity of selectedEntities) {
                                    if (entity.type === 'line') {
                                        minX = Math.min(minX, entity.start.x, entity.end.x);
                                        maxX = Math.max(maxX, entity.start.x, entity.end.x);
                                        minY = Math.min(minY, entity.start.y, entity.end.y);
                                        maxY = Math.max(maxY, entity.start.y, entity.end.y);
                                    } else if (entity.type === 'circle') {
                                        minX = Math.min(minX, entity.center.x - entity.radius);
                                        maxX = Math.max(maxX, entity.center.x + entity.radius);
                                        minY = Math.min(minY, entity.center.y - entity.radius);
                                        maxY = Math.max(maxY, entity.center.y + entity.radius);
                                    } else if (entity.type === 'rectangle') {
                                        minX = Math.min(minX, entity.corner1.x, entity.corner2.x);
                                        maxX = Math.max(maxX, entity.corner1.x, entity.corner2.x);
                                        minY = Math.min(minY, entity.corner1.y, entity.corner2.y);
                                        maxY = Math.max(maxY, entity.corner1.y, entity.corner2.y);
                                    } else if (entity.type === 'polyline') {
                                        for (const pt of entity.points) {
                                            minX = Math.min(minX, pt.x);
                                            maxX = Math.max(maxX, pt.x);
                                            minY = Math.min(minY, pt.y);
                                            maxY = Math.max(maxY, pt.y);
                                        }
                                    }
                                }

                                const width = maxX - minX;
                                const height = maxY - minY;
                                const area = width * height;

                                // Create part data
                                const partData = {
                                    id: `part_${Date.now()}`,
                                    name: `Part ${newNestListParts.length + 1}`,
                                    width: parseFloat(width.toFixed(2)),
                                    height: parseFloat(height.toFixed(2)),
                                    area: parseFloat(area.toFixed(2)),
                                    quantity: 1,
                                    priority: 'medium' as const,
                                    allowSymmetry: true,
                                    allowRotation: true,
                                    geometry: selectedEntities,
                                    thumbnail: null
                                };

                                // Add to list
                                setNewNestListParts(prev => [...prev, partData]);
                                addLog(`✅ Đã thêm: ${partData.name} (${width.toFixed(2)} × ${height.toFixed(2)})`);
                                
                                // Open modal
                                setIsNewNestListOpen(true);
                            }}
                            disabled={selectedIds.size === 0}
                            className={`
                                w-full py-3 px-4 rounded-lg font-semibold text-sm
                                transition-all duration-300 flex items-center justify-center gap-2
                                ${selectedIds.size === 0 
                                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                                }
                            `}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                            <span>Đẩy Sang Danh Sách Chi Tiết Cần Nest</span>
                            {selectedIds.size > 0 && (
                                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-bold">
                                    {selectedIds.size}
                                </span>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Panel */}
                {/* Stats Panel - Disabled for debugging
                {showStats && (
                    <div className="w-[300px] flex-shrink-0 animate-in slide-in-from-left-4 fade-in duration-300">
                        <StatsPanel />
                    </div>
                )}
                */}

                {/* Canvas */}
                <div className="flex-1 relative overflow-hidden" style={{ cursor: isPanning ? 'grabbing' : 'none' }}>
                    <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="absolute inset-0"
                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                        onMouseLeave={() => setIsPanning(false)} onWheel={handleWheel} onContextMenu={e => e.preventDefault()} />
                    <canvas ref={overlayRef} width={canvasSize.width} height={canvasSize.height} className="absolute inset-0 pointer-events-none" />

                    {/* Part Parameters Modal - Now nested inside Canvas */}
                    {isPartParamsDialogOpen && tempSelectedPart && (
                        <PartParametersDialog
                            isOpen={true}
                            onClose={() => setIsPartParamsDialogOpen(false)}
                            onConfirm={(part: any) => {
                                setNewNestListParts(prev => [...prev, part]);
                                setIsPartParamsDialogOpen(false);
                                setTempSelectedPart(null); // Clear temp data
                                addLog(`✅ Thêm chi tiết: ${part.name}`);
                            }}
                            selectedGeometry={tempSelectedPart.geometry}
                            geometrySize={{ 
                                width: tempSelectedPart.width, 
                                height: tempSelectedPart.height 
                            }}
                        />
                    )}

                    {/* Integrated Command Line - AutoCAD Style Overlay */}
                    {/* Integrated Command Line - Disabled for debugging */
                        /* <div className="absolute bottom-4 left-4 right-4... */
                    }

                    {/* Dynamic Input (Existing) - Only show if not empty and enabled */}
                    {/* Dynamic Input & Coordinate Tooltip */}
                    {displaySettings.dynamicInput && (
                        <div
                            className="absolute pointer-events-none group"
                            style={{ 
                                left: mouseScreen.x + 15, 
                                top: mouseScreen.y - 15,
                                zIndex: 50 
                            }}
                        >
                            {/* Coordinate Display */}
                            <div className="flex flex-col items-start bg-slate-900/90 border border-slate-600 rounded shadow-xl backdrop-blur-sm p-1.5 gap-1 min-w-[120px]">
                                {/* Coordinates Row */}
                                <div className="flex items-center gap-2 text-xs font-mono whitespace-nowrap px-1">
                                    <span className="text-blue-400 font-bold">{mouseWorld.x.toFixed(2)}</span>
                                    <span className="text-slate-500">,</span>
                                    <span className="text-green-400 font-bold">{mouseWorld.y.toFixed(2)}</span>
                                    {currentSnap && (
                                        <span className="text-yellow-400 text-[10px] ml-1 bg-yellow-400/10 px-1 rounded uppercase">
                                            {currentSnap.type}
                                        </span>
                                    )}
                                </div>

                                {/* Dimension Input Box - Always Visible when Typing or Command Active */}
                                <div className="pointer-events-auto">
                                   <div className="flex items-center gap-2 bg-slate-800 rounded border border-slate-600 px-2 py-1 mt-0.5">
                                        <span className="text-[10px] text-slate-400">Nhập:</span>
                                        <input
                                            ref={cmdInputRef}
                                            type="text"
                                            value={commandPoints.length > 0 ? dimInput : commandInput} // Use dimInput for dims, commandInput for commands
                                            onChange={e => {
                                                if (commandPoints.length > 0) setDimInput(e.target.value);
                                                else setCommandInput(e.target.value);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    const val = commandPoints.length > 0 ? dimInput : commandInput;
                                                    if (val.trim()) {
                                                        processCommand(val);
                                                        if (commandPoints.length > 0) setDimInput('');
                                                        else setCommandInput('');
                                                    }
                                                }
                                                if (e.key === 'Escape') {
                                                    setDimInput('');
                                                    setCommandInput('');
                                                    cancelCommand();
                                                }
                                            }}
                                            placeholder={
                                                currentCommand === 'LINE' ? 'độ dài hoặc x,y' :
                                                currentCommand === 'RECTANGLE' ? 'rộng,cao' :
                                                currentCommand === 'CIRCLE' ? 'bán kính' :
                                                'lệnh hoặc giá trị'
                                            }
                                            className="w-32 bg-transparent text-white text-xs font-mono focus:outline-none placeholder:text-slate-600"
                                            autoFocus
                                        />
                                   </div>
                                   {/* Helper Text */}
                                   <div className="text-[10px] text-slate-500 px-1 mt-0.5 italic max-w-[180px] truncate">
                                        {commandPrompt}
                                   </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Layers Panel - Simple conditional */}
                {showLayers && (
                    <div className="w-[200px] bg-slate-800 border-l border-slate-700 flex-shrink-0">
                        <div className="p-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">Layers</span>
                                <button onClick={() => setShowLayers(false)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                            </div>
                            {layers.map(l => (
                                <div key={l.id} onClick={() => setActiveLayerId(l.id)}
                                    className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs ${activeLayerId === l.id ? 'bg-blue-600/30' : 'hover:bg-slate-700'}`}>
                                    <div className="w-3 h-3 rounded" style={{ backgroundColor: l.color }} />
                                    <span className="flex-1 text-white">{l.name}</span>
                                    <button onClick={e => { e.stopPropagation(); setLayers(ls => ls.map(x => x.id === l.id ? { ...x, visible: !x.visible } : x)) }}
                                        className="text-slate-400 hover:text-white">{l.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
                                    <button onClick={e => { e.stopPropagation(); setLayers(ls => ls.map(x => x.id === l.id ? { ...x, locked: !x.locked } : x)) }}
                                        className="text-slate-400 hover:text-white">{l.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* OSNAP Panel - Simple conditional */}
                {showSnap && (
                    <div className="w-[180px] bg-slate-800 border-l border-slate-700 flex-shrink-0">
                        <div className="p-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-white">Object Snap</span>
                                <button onClick={() => setShowSnap(false)} className="text-slate-400 hover:text-white"><X size={12} /></button>
                            </div>
                            <label className="flex items-center gap-2 mb-2 cursor-pointer text-xs text-white">
                                <input type="checkbox" checked={snapSettings.enabled} onChange={e => setSnapSettings(s => ({ ...s, enabled: e.target.checked }))} className="accent-blue-500" />
                                <span className="font-medium">OSNAP (F3)</span>
                            </label>
                            <hr className="border-slate-700 my-1" />
                            {(['endpoint', 'midpoint', 'center', 'intersection', 'quadrant', 'perpendicular', 'tangent', 'nearest'] as const).map(t => (
                                <label key={t} className="flex items-center gap-2 cursor-pointer text-[11px] py-0.5 text-white">
                                    <input type="checkbox" checked={snapSettings[t]} disabled={!snapSettings.enabled}
                                        onChange={e => setSnapSettings(s => ({ ...s, [t]: e.target.checked }))} className="accent-blue-500" />
                                    <div className="w-2 h-2 rounded" style={{ backgroundColor: SNAP_COLORS[t] }} />
                                    <span className="capitalize">{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* NEW NEST LIST MODAL */}
            <NewNestListModal
                isOpen={isNewNestListOpen}
                onClose={() => {
                    setIsNewNestListOpen(false);
                    setIsSelectingParts(false);
                    setIsSelectingSheet(false);
                }}
                onSelectParts={handleStartPartSelection}
                onSelectSheet={handleStartSheetSelection}
                onOpenSettings={() => {
                    console.log('Opening settings...');
                }}
                lang={lang}
                parts={newNestListParts}
                sheets={newNestListSheets}
                onUpdatePart={handleUpdatePartInList}
                onDeletePart={handleDeletePartFromList}
                onUpdateSheet={handleUpdateSheetInList}
                onDeleteSheet={handleDeleteSheetFromList}
            />

        </div>
    );
};

export default NestingTool;
