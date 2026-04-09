export interface AXPoint {
  x: number;
  y: number;
}

export interface AXBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type AXEntityType =
  | 'line'
  | 'polyline'
  | 'spline'
  | 'circle'
  | 'arc'
  | 'ellipse'
  | 'text'
  | 'dimension'
  | 'leader'
  | 'hatch'
  | 'insert'
  | 'unsupportedVisual'
  | 'unknown';

export interface AXEntityStyle {
  color?: string;
  byBlockColor?: string;
  lineType?: string;
  lineWeight?: number;
  visible?: boolean;
}

export interface AXBaseEntity {
  id: string;
  type: AXEntityType;
  layerId: string;
  sourceType?: string;
  style: AXEntityStyle;
  bounds?: AXBounds;
  metadata?: Record<string, unknown>;
}

export interface AXLineEntity extends AXBaseEntity {
  type: 'line';
  start: AXPoint;
  end: AXPoint;
}

export interface AXPolylineEntity extends AXBaseEntity {
  type: 'polyline';
  points: AXPoint[];
  closed: boolean;
  bulges?: number[];
}

export interface AXSplineEntity extends AXBaseEntity {
  type: 'spline';
  points: AXPoint[];
  closed?: boolean;
}

export interface AXCircleEntity extends AXBaseEntity {
  type: 'circle';
  center: AXPoint;
  radius: number;
}

export interface AXArcEntity extends AXBaseEntity {
  type: 'arc';
  center: AXPoint;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface AXEllipseEntity extends AXBaseEntity {
  type: 'ellipse';
  center: AXPoint;
  radiusX: number;
  radiusY: number;
  rotation?: number;
  majorAxis?: AXPoint;
  axisRatio?: number;
}

export interface AXTextEntity extends AXBaseEntity {
  type: 'text';
  position: AXPoint;
  text: string;
  height?: number;
  rotation?: number;
  textStyle?: string;
  attachment?: number;
  isMText?: boolean;
  rawText?: string;
  lineSpacingFactor?: number;
}

export interface AXDimensionEntity extends AXBaseEntity {
    type: 'dimension';
    start: AXPoint;
    end: AXPoint;
    textPosition: AXPoint;
    value?: number;
    unit?: string;
    text?: string;
    dimensionType?: string;
    textHeight?: number;
    rotation?: number;
    dimensionStyle?: string;
    textStyle?: string;
    textAttachment?: number;
    extLine1?: AXPoint;
    extLine2?: AXPoint;
    arrowType?: string;
    arrowSize?: number;
    textGap?: number;
    fitMode?: string;
    isTextOverride?: boolean;
    measurementSource?: 'actualMeasurement' | 'measurement' | 'derived';
}

export interface AXLeaderEntity extends AXBaseEntity {
    type: 'leader';
    points: AXPoint[];
    text?: string;
    landingLength?: number;
    isMLeader?: boolean;
}

export interface AXHatchEntity extends AXBaseEntity {
  type: 'hatch';
  loops: AXPoint[][];
  pattern?: string;
  angle?: number;
  spacing?: number;
}

export interface AXInsertEntity extends AXBaseEntity {
    type: 'insert';
    blockName: string;
    insertionPoint: AXPoint;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    explodeFallback?: boolean;
}

export interface AXUnsupportedVisualEntity extends AXBaseEntity {
  type: 'unsupportedVisual';
  originalType: string;
}

export interface AXUnknownEntity extends AXBaseEntity {
  type: 'unknown';
}

export type AXEntity =
  | AXLineEntity
  | AXPolylineEntity
  | AXSplineEntity
  | AXCircleEntity
  | AXArcEntity
  | AXEllipseEntity
  | AXTextEntity
  | AXDimensionEntity
  | AXLeaderEntity
  | AXHatchEntity
  | AXInsertEntity
  | AXUnsupportedVisualEntity
  | AXUnknownEntity;

export interface AXLayerRecord {
  id: string;
  name: string;
  color?: string;
  visible: boolean;
  locked: boolean;
}

export interface AXBlockDefinition {
  name: string;
  entities: AXEntity[];
}

export interface AXImportDiagnostics {
  sourceFileName: string;
  sourceKind: 'dxf' | 'dwg' | 'svg' | 'unknown';
  unitScaleApplied: number;
  importedCount: number;
  skippedCount: number;
  unsupportedTypes: Record<string, number>;
  unsupportedByDomain?: Record<string, number>;
  degradedBySubtype?: Record<string, number>;
  warnings: string[];
}

export interface AXDrawingDocument {
  version: 1;
  sourceFileName: string;
  sourceKind: 'dxf' | 'dwg' | 'svg' | 'unknown';
  layers: AXLayerRecord[];
  blocks: AXBlockDefinition[];
  entities: AXEntity[];
  diagnostics: AXImportDiagnostics;
}

export function createEmptyAXDocument(sourceFileName = 'untitled'): AXDrawingDocument {
  return {
    version: 1,
    sourceFileName,
    sourceKind: 'unknown',
    layers: [],
    blocks: [],
    entities: [],
    diagnostics: {
      sourceFileName,
      sourceKind: 'unknown',
      unitScaleApplied: 1,
      importedCount: 0,
      skippedCount: 0,
      unsupportedTypes: {},
      unsupportedByDomain: {},
      degradedBySubtype: {},
      warnings: [],
    },
  };
}
