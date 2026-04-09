export interface AXEnginePoint {
  x: number;
  y: number;
}

export interface AXEngineBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface AXEngineStyle {
  color?: string;
  byBlockColor?: string;
  lineType?: string;
  lineWeight?: number;
  visible?: boolean;
  textStyle?: string;
}

export type AXEngineEntityKind =
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

export interface AXEngineEntityBase {
  id: string;
  kind: AXEngineEntityKind;
  layerId: string;
  style: AXEngineStyle;
  bounds?: AXEngineBounds;
  metadata?: Record<string, unknown>;
}

export interface AXEngineLineEntity extends AXEngineEntityBase {
  kind: 'line';
  start: AXEnginePoint;
  end: AXEnginePoint;
}

export interface AXEnginePolylineEntity extends AXEngineEntityBase {
  kind: 'polyline';
  points: AXEnginePoint[];
  closed: boolean;
  bulges?: number[];
}

export interface AXEngineSplineEntity extends AXEngineEntityBase {
  kind: 'spline';
  points: AXEnginePoint[];
  closed?: boolean;
}

export interface AXEngineCircleEntity extends AXEngineEntityBase {
  kind: 'circle';
  center: AXEnginePoint;
  radius: number;
}

export interface AXEngineArcEntity extends AXEngineEntityBase {
  kind: 'arc';
  center: AXEnginePoint;
  radius: number;
  startAngle: number;
  endAngle: number;
}

export interface AXEngineEllipseEntity extends AXEngineEntityBase {
  kind: 'ellipse';
  center: AXEnginePoint;
  radiusX: number;
  radiusY: number;
  rotation?: number;
  majorAxis?: AXEnginePoint;
  axisRatio?: number;
}

export interface AXEngineTextEntity extends AXEngineEntityBase {
  kind: 'text';
  position: AXEnginePoint;
  text: string;
  height?: number;
  rotation?: number;
  attachment?: number;
  isMText?: boolean;
  rawText?: string;
  lineSpacingFactor?: number;
}

export interface AXEngineDimensionEntity extends AXEngineEntityBase {
  kind: 'dimension';
  start: AXEnginePoint;
  end: AXEnginePoint;
  textPosition: AXEnginePoint;
  text?: string;
  value?: number;
  unit?: string;
  dimensionType?: string;
  textHeight?: number;
  rotation?: number;
  dimensionStyle?: string;
  textStyle?: string;
  textAttachment?: number;
  extLine1?: AXEnginePoint;
  extLine2?: AXEnginePoint;
  arrowType?: string;
  arrowSize?: number;
  textGap?: number;
  fitMode?: string;
  isTextOverride?: boolean;
  measurementSource?: 'actualMeasurement' | 'measurement' | 'derived';
}

export interface AXEngineLeaderEntity extends AXEngineEntityBase {
  kind: 'leader';
  points: AXEnginePoint[];
  text?: string;
  landingLength?: number;
  isMLeader?: boolean;
}

export interface AXEngineHatchEntity extends AXEngineEntityBase {
  kind: 'hatch';
  loops: AXEnginePoint[][];
  pattern?: string;
  angle?: number;
  spacing?: number;
}

export interface AXEngineInsertEntity extends AXEngineEntityBase {
  kind: 'insert';
  blockName: string;
  insertionPoint: AXEnginePoint;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  explodeFallback?: boolean;
}

export interface AXEngineUnsupportedVisualEntity extends AXEngineEntityBase {
  kind: 'unsupportedVisual';
  originalType: string;
}

export interface AXEngineUnknownEntity extends AXEngineEntityBase {
  kind: 'unknown';
}

export type AXEngineEntity =
  | AXEngineLineEntity
  | AXEnginePolylineEntity
  | AXEngineSplineEntity
  | AXEngineCircleEntity
  | AXEngineArcEntity
  | AXEngineEllipseEntity
  | AXEngineTextEntity
  | AXEngineDimensionEntity
  | AXEngineLeaderEntity
  | AXEngineHatchEntity
  | AXEngineInsertEntity
  | AXEngineUnsupportedVisualEntity
  | AXEngineUnknownEntity;

export interface AXEngineLayer {
  id: string;
  name: string;
  color?: string;
  visible: boolean;
  locked: boolean;
}

export interface AXEngineBlock {
  name: string;
  entities: AXEngineEntity[];
}

export interface AXEngineDiagnostics {
  sourceFileName: string;
  sourceKind: 'dxf' | 'dwg' | 'svg' | 'unknown';
  importedCount: number;
  skippedCount: number;
  unsupportedTypes: Record<string, number>;
  warnings: string[];
}

export interface AXEngineDocument {
  version: 1;
  sourceFileName: string;
  sourceKind: 'dxf' | 'dwg' | 'svg' | 'unknown';
  layers: AXEngineLayer[];
  blocks: AXEngineBlock[];
  entities: AXEngineEntity[];
  diagnostics: AXEngineDiagnostics;
}
