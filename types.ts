// ============================================================

// VJP26 NESTING AX - TYPE DEFINITIONS
// Professional Nesting System like AutoCAD + AlphaCAM
// ============================================================

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CNCDetail {
  id: string;
  area: number;
  percentage: number;
  basePrice: number;
  laborFee: number;
  total: number;
}

export interface CalculationSettings {
  platePrice: number;
  laborPercentage: number;
}

export interface Customer {
  id: string;
  name: string;
}

export interface DXFEntityResult {
  id: string;
  type: string;
  area: number;
  verticesCount: number;
  isClosed: boolean;
  geometry?: Point[];
  isSelected?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  layer?: string;
  color?: string;
}

export interface ManualLine {
  id: string;
  start: Point;
  end: Point;
}

export interface GCodeCommand {
  line: number;
  type: 'G0' | 'G1' | 'G2' | 'G3' | 'OTHER';
  x: number;
  y: number;
  z: number;
  f?: number;
  s?: number;
  code: string;
}

export interface GCodeAnalysisReport {
  totalTime: string;
  totalSeconds: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  toolChanges: number;
  totalCutDistance: number;
  totalRapidDistance: number;
  avgFeed: number;
  maxFeed: number;
  maxSpindle: number;
  collisionWarnings: string[];
}

export type NestingStrategy = 'RECTANGULAR' | 'TRUE_SHAPE' | 'MAX_RECTS';
export type SortStrategy = 'AREA_DESC' | 'HEIGHT_DESC' | 'WIDTH_DESC' | 'PERIMETER_DESC' | 'ASPECT_RATIO';
export type PlacementStrategy = 'BOTTOM_LEFT' | 'BEST_FIT' | 'BEST_SHORT_SIDE' | 'BEST_LONG_SIDE' | 'BEST_AREA';
export type FillDirection = 'LEFT_TO_RIGHT' | 'BOTTOM_TO_TOP' | 'ZIGZAG';

export interface NestingPart {
  id: string;
  name: string;
  label: string;
  width: number;
  height: number;
  quantity: number;
  color: string;
  rotationAllowed: boolean;
  priority: number;
  enabled: boolean;
  geometry?: Point[];
  x?: number;
  y?: number;
  rotation?: number;
  mirror?: boolean;
  rotationStep?: '0' | '90' | '180' | '270' | 'Free';
  material?: string;
  thickness?: number;
  layerId?: string;
}

export interface PlacedPart {
  uuid: string;
  partId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
  color: string;
  isInvalid?: boolean;
  isSelected?: boolean;
  flipped?: boolean;
  layerId?: string;
}

export interface NestingSheet {
  id: string;
  name?: string;
  width: number;
  height: number;
  margin: number;
  material: string;
  thickness?: number;
  quantity?: number;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
}

export interface NestingSettings {
  gap: number;
  allowRotation: boolean;
  rotationSteps: number[];
  sortStrategy: SortStrategy;
  placementStrategy: PlacementStrategy;
  sheetMargin: number;
  partMargin: number;
  allowMirror: boolean;
  fillDirection: FillDirection;
  grainDirection: boolean;
}

export interface NestingResult {
  efficiency: number;
  usedArea: number;
  totalArea: number;
  sheets: { sheetId: string; placedParts: PlacedPart[] }[];
  unplacedParts: { partId: string; quantity: number }[];
}

export interface MultiSheetResult {
  sheets: SheetResult[];
  totalEfficiency: number;
  utilization: number; // For UI consistency
  totalUsedArea: number;
  totalSheetArea: number;
  unplacedParts: UnplacedPart[];
  sheetsUsed: number;
  partsPlaced: number;   // Added
  partsRemaining: number; // Added
  wasteArea: number;
  wastePercentage: number;
}

export interface SheetResult {
  sheetId: string;
  sheetIndex: number;
  material: string;
  width: number;
  height: number;
  placedParts: PlacedPart[];
  efficiency: number;
  utilization: number; // Added
  usedArea: number;
}

export interface UnplacedPart {
  partId: string;
  name: string;
  quantity: number;
}

export interface CuttingReport {
  generatedAt: string;
  settings: NestingSettings;
  summary: {
    totalParts: number;
    totalPartInstances: number;
    placedInstances: number;
    unplacedInstances: number;
    sheetsUsed: number;
    totalSheetArea: number;
    totalUsedArea: number;
    wasteArea: number;
    efficiency: number;
  };
  sheets: SheetReport[];
  partsBreakdown: PartBreakdown[];
}

export interface SheetReport {
  index: number;
  sheetId: string;
  material: string;
  dimensions: string;
  partsCount: number;
  efficiency: number;
  parts: PlacedPartReport[];
}

export interface PlacedPartReport {
  name: string;
  dimensions: string;
  position: string;
  rotation: number;
  mirrored: boolean;
}

export interface PartBreakdown {
  name: string;
  dimensions: string;
  requested: number;
  placed: number;
  unplaced: number;
}

export interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export interface GridSettings {
  showGrid: boolean;
  gridSize: number;
  gridColor: string;
  snapToGrid: boolean;
  showOrigin: boolean;
}

export type InteractionMode = 'select' | 'pan' | 'move' | 'rotate' | 'draw_rect';

export const STANDARD_PLATE_AREA = 2976800;

export const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
];

export const DEFAULT_NESTING_SETTINGS: NestingSettings = {
  gap: 5,
  allowRotation: true,
  rotationSteps: [0, 90],
  sortStrategy: 'AREA_DESC',
  placementStrategy: 'BEST_SHORT_SIDE',
  sheetMargin: 10,
  partMargin: 0,
  allowMirror: false,
  fillDirection: 'BOTTOM_TO_TOP',
  grainDirection: false
};
