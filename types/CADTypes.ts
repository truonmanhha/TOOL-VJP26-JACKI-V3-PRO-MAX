// ============================================================
// VJP26 CAD ENGINE - TYPE DEFINITIONS
// AutoCAD 2024-Style Professional CAD System
// ============================================================

// ============= BASIC TYPES =============
export interface Point2D {
    x: number;
    y: number;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

// ============= ENTITY TYPES =============
export type EntityType = 'line' | 'polyline' | 'circle' | 'arc' | 'rectangle' | 'polygon' | 'ellipse' | 'spline' | 'text';

export interface BaseEntity {
    id: string;
    type: EntityType;
    layerId: string;
    color: string;
    lineWidth: number;
    lineType: 'solid' | 'dashed' | 'dotted' | 'dashdot';
    selected: boolean;
    locked: boolean;
    visible: boolean;
}

export interface LineEntity extends BaseEntity {
    type: 'line';
    start: Point2D;
    end: Point2D;
}

export interface PolylineEntity extends BaseEntity {
    type: 'polyline';
    points: Point2D[];
    closed: boolean;
}

export interface CircleEntity extends BaseEntity {
    type: 'circle';
    center: Point2D;
    radius: number;
}

export interface ArcEntity extends BaseEntity {
    type: 'arc';
    center: Point2D;
    radius: number;
    startAngle: number; // in degrees
    endAngle: number;
}

export interface RectangleEntity extends BaseEntity {
    type: 'rectangle';
    corner1: Point2D;
    corner2: Point2D;
    rotation: number;
}

export interface PolygonEntity extends BaseEntity {
    type: 'polygon';
    center: Point2D;
    radius: number;
    sides: number;
    rotation: number;
    inscribed: boolean;
}

export interface EllipseEntity extends BaseEntity {
    type: 'ellipse';
    center: Point2D;
    majorAxis: number;
    minorAxis: number;
    rotation: number;
}

export interface SplineEntity extends BaseEntity {
    type: 'spline';
    controlPoints: Point2D[];
    degree: number;
}

export interface TextEntity extends BaseEntity {
    type: 'text';
    position: Point2D;
    text: string;
    fontSize: number;
    fontFamily: string;
    rotation: number;
    alignment: 'left' | 'center' | 'right';
}

export type CADEntity = LineEntity | PolylineEntity | CircleEntity | ArcEntity |
    RectangleEntity | PolygonEntity | EllipseEntity | SplineEntity | TextEntity;

// ============= SNAP TYPES =============
export type SnapType = 'endpoint' | 'midpoint' | 'center' | 'intersection' |
    'perpendicular' | 'tangent' | 'nearest' | 'quadrant' |
    'node' | 'insertion' | 'grid';

export interface SnapPoint {
    type: SnapType;
    point: Point2D;
    sourceId?: string;
    priority: number;
}

export interface SnapSettings {
    enabled: boolean;
    endpoint: boolean;
    midpoint: boolean;
    center: boolean;
    intersection: boolean;
    perpendicular: boolean;
    tangent: boolean;
    nearest: boolean;
    quadrant: boolean;
    node: boolean;
    aperture: number;
}

// ============= COMMAND TYPES =============
export type CommandName =
    // Draw commands
    'LINE' | 'POLYLINE' | 'CIRCLE' | 'ARC' | 'RECTANGLE' | 'POLYGON' | 'ELLIPSE' | 'SPLINE' |
    // Modify commands
    'MOVE' | 'COPY' | 'ROTATE' | 'SCALE' | 'MIRROR' | 'OFFSET' | 'TRIM' | 'EXTEND' | 'FILLET' | 'CHAMFER' |
    // Edit commands
    'DELETE' | 'UNDO' | 'REDO' |
    // View commands
    'PAN' | 'ZOOM' | 'ZOOMEXTENTS' | 'ZOOMWINDOW' |
    // Selection
    'SELECT' |
    // Misc
    'ESCAPE' | 'NONE';

export type CommandPhase = 'idle' | 'awaiting_point' | 'awaiting_selection' | 'awaiting_value' | 'awaiting_option';

export interface CommandState {
    command: CommandName;
    phase: CommandPhase;
    step: number;
    points: Point2D[];
    selectedIds: Set<string>;
    options: Record<string, any>;
    prompt: string;
    subCommand?: string;
}

export interface CommandDefinition {
    name: CommandName;
    aliases: string[];
    description: string;
    execute: (state: CommandState, input: Point2D | string | null) => CommandResult;
}

export interface CommandResult {
    state: CommandState;
    entities?: CADEntity[];
    deleteIds?: string[];
    done: boolean;
    prompt: string;
    error?: string;
}

// ============= LAYER TYPES =============
export interface CADLayer {
    id: string;
    name: string;
    color: string;
    lineWidth: number;
    lineType: 'solid' | 'dashed' | 'dotted';
    visible: boolean;
    locked: boolean;
    frozen: boolean;
    printable: boolean;
}

// ============= VIEW TYPES =============
export interface ViewState {
    panX: number;
    panY: number;
    zoom: number;
    rotation: number;
}

export interface GridSettings {
    visible: boolean;
    size: number;
    majorLines: number;
    color: string;
    majorColor: string;
    snapToGrid: boolean;
}

export interface DisplaySettings {
    showGrid: boolean;
    showOrigin: boolean;
    showCrosshair: boolean;
    crosshairSize: number;
    backgroundColor: string;
    selectionColor: string;
    highlightColor: string;
    dynamicInput: boolean;
    orthoMode: boolean;
    polarTracking: boolean;
    polarAngle: number;
}

// ============= HISTORY TYPES =============
export interface HistoryAction {
    id: string;
    timestamp: number;
    type: 'add' | 'modify' | 'delete';
    entities: CADEntity[];
    previousState?: CADEntity[];
}

// ============= SELECTION TYPES =============
export type SelectionMode = 'window' | 'crossing' | 'single';

export interface SelectionBox {
    start: Point2D;
    end: Point2D;
    mode: SelectionMode;
}

// ============= UI TYPES =============
export interface ToolbarItem {
    id: string;
    icon: string;
    label: string;
    command: CommandName;
    shortcut?: string;
    group?: string;
}

export interface RibbonTab {
    id: string;
    label: string;
    panels: RibbonPanel[];
}

export interface RibbonPanel {
    id: string;
    label: string;
    items: ToolbarItem[];
}

// ============= CONSTANTS =============
export const SNAP_COLORS: Record<SnapType, string> = {
    endpoint: '#00FF00',
    midpoint: '#00FFFF',
    center: '#FF00FF',
    intersection: '#FFFF00',
    perpendicular: '#FF6600',
    tangent: '#6600FF',
    nearest: '#FFFFFF',
    quadrant: '#FF0066',
    node: '#00FF66',
    insertion: '#FF9900',
    grid: '#666666'
};

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
    enabled: true,
    endpoint: true,
    midpoint: true,
    center: true,
    intersection: true,
    perpendicular: false,
    tangent: false,
    nearest: false,
    quadrant: true,
    node: false,
    aperture: 10
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
    visible: true,
    size: 10,
    majorLines: 5,
    color: '#1a1a2e',
    majorColor: '#2a2a4e',
    snapToGrid: false
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
    showGrid: true,
    showOrigin: true,
    showCrosshair: true,
    crosshairSize: 100,
    backgroundColor: '#0a0a0f',
    selectionColor: '#FFFF00',
    highlightColor: '#00AAFF',
    dynamicInput: true,
    orthoMode: false,
    polarTracking: false,
    polarAngle: 45
};

export const DEFAULT_LAYERS: CADLayer[] = [
    { id: '0', name: '0', color: '#FFFFFF', lineWidth: 1, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true },
    { id: 'parts', name: 'Parts', color: '#00FF00', lineWidth: 1, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true },
    { id: 'sheets', name: 'Sheets', color: '#0088FF', lineWidth: 2, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true },
    { id: 'dimensions', name: 'Dimensions', color: '#FF6600', lineWidth: 0.5, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true },
    { id: 'construction', name: 'Construction', color: '#888888', lineWidth: 0.5, lineType: 'dashed', visible: true, locked: false, frozen: false, printable: false },
];

export const COMMAND_ALIASES: Record<string, CommandName> = {
    'L': 'LINE',
    'PL': 'POLYLINE',
    'C': 'CIRCLE',
    'A': 'ARC',
    'REC': 'RECTANGLE',
    'POL': 'POLYGON',
    'EL': 'ELLIPSE',
    'SPL': 'SPLINE',
    'M': 'MOVE',
    'CO': 'COPY',
    'CP': 'COPY',
    'RO': 'ROTATE',
    'SC': 'SCALE',
    'MI': 'MIRROR',
    'O': 'OFFSET',
    'TR': 'TRIM',
    'EX': 'EXTEND',
    'F': 'FILLET',
    'CHA': 'CHAMFER',
    'E': 'DELETE',
    'DEL': 'DELETE',
    'ERASE': 'DELETE',
    'U': 'UNDO',
    'P': 'PAN',
    'Z': 'ZOOM',
    'ZE': 'ZOOMEXTENTS',
    'ZW': 'ZOOMWINDOW',
    'ESC': 'ESCAPE'
};
