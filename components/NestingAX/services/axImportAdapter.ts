import { CadEntity } from './db';
import {
  AXArcEntity,
  AXBaseEntity,
  AXCircleEntity,
  AXDimensionEntity,
  AXDrawingDocument,
  AXEntity,
  AXEntityStyle,
  AXHatchEntity,
  AXLineEntity,
  AXPoint,
  AXPolylineEntity,
  AXTextEntity,
  createEmptyAXDocument,
} from './axSceneModel';

function inferSourceKind(fileName: string): 'dxf' | 'dwg' | 'svg' | 'unknown' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.dxf')) return 'dxf';
  if (lower.endsWith('.dwg')) return 'dwg';
  if (lower.endsWith('.svg')) return 'svg';
  return 'unknown';
}

function makeBounds(points: AXPoint[]) {
  if (points.length === 0) return undefined;
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

function makeStyle(entity: CadEntity): AXEntityStyle {
  return {
    color: entity.properties?.color,
    byBlockColor: entity.properties?.byBlockColor,
    lineType: entity.properties?.lineType || entity.properties?.linetype,
    lineWeight: typeof entity.properties?.lineWeight === 'number' ? entity.properties.lineWeight : undefined,
    visible: entity.properties?.visible,
  };
}

function base(entity: CadEntity): AXBaseEntity {
  return {
    id: entity.id,
    type: 'unknown',
    layerId: entity.layerId || 'default',
    sourceType: entity.type,
    style: makeStyle(entity),
    metadata: entity.properties || {},
  };
}

function toPoint(value: { x: number; y: number } | undefined): AXPoint {
  return { x: value?.x || 0, y: value?.y || 0 };
}

function normalizeEntity(entity: CadEntity): AXEntity {
  const common = base(entity);

  switch (entity.type) {
    case 'line': {
      const start = toPoint(entity.points[0]);
      const end = toPoint(entity.points[1]);
      const result: AXLineEntity = {
        ...common,
        type: 'line',
        start,
        end,
        bounds: makeBounds([start, end]),
      };
      return result;
    }
    case 'polyline':
    case 'rect': {
      const points = entity.points.map(point => toPoint(point));
      const result: AXPolylineEntity = {
        ...common,
        type: 'polyline',
        points,
        closed: Boolean(entity.properties?.closed) || entity.type === 'rect',
        bulges: Array.isArray(entity.properties?.bulges)
          ? entity.properties.bulges.map((value: unknown) => Number(value || 0))
          : undefined,
        bounds: makeBounds(points),
      };
      return result;
    }
    case 'spline': {
      const points = entity.points.map(point => toPoint(point));
      return {
        ...common,
        type: 'spline',
        points,
        closed: Boolean(entity.properties?.closed),
        bounds: makeBounds(points),
      };
    }
    case 'circle': {
      const center = toPoint(entity.points[0]);
      const radius = Number(entity.properties?.radius || 0);
      const result: AXCircleEntity = {
        ...common,
        type: 'circle',
        center,
        radius,
        bounds: makeBounds([
          { x: center.x - radius, y: center.y - radius },
          { x: center.x + radius, y: center.y + radius },
        ]),
      };
      return result;
    }
    case 'ellipse': {
      const center = toPoint(entity.points[0]);
      const radiusX = Number(entity.properties?.rx || 0);
      const radiusY = Number(entity.properties?.ry || 0);
      return {
        ...common,
        type: 'ellipse',
        center,
        radiusX,
        radiusY,
        rotation: typeof entity.properties?.rotation === 'number' ? entity.properties.rotation : 0,
        majorAxis: entity.properties?.majorAxis ? toPoint(entity.properties.majorAxis) : undefined,
        axisRatio: typeof entity.properties?.axisRatio === 'number' ? entity.properties.axisRatio : undefined,
        bounds: makeBounds([
          { x: center.x - radiusX, y: center.y - radiusY },
          { x: center.x + radiusX, y: center.y + radiusY },
        ]),
      };
    }
    case 'arc': {
      const center = {
        x: Number(entity.properties?.centerX ?? entity.points[1]?.x ?? 0),
        y: Number(entity.properties?.centerY ?? entity.points[1]?.y ?? 0),
      };
      const radius = Number(entity.properties?.radius || 0);
      const start = toPoint(entity.points[0]);
      const end = toPoint(entity.points[2] || entity.points[1]);
      const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
      const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
      const result: AXArcEntity = {
        ...common,
        type: 'arc',
        center,
        radius,
        startAngle,
        endAngle,
        bounds: makeBounds([
          { x: center.x - radius, y: center.y - radius },
          { x: center.x + radius, y: center.y + radius },
        ]),
      };
      return result;
    }
    case 'text': {
      const position = toPoint(entity.points[0]);
      const result: AXTextEntity = {
        ...common,
        type: 'text',
        position,
        text: String(entity.properties?.text || ''),
        rawText: entity.properties?.rawText,
        height: typeof entity.properties?.textHeight === 'number' ? entity.properties.textHeight : entity.properties?.fontSize,
        rotation: typeof entity.properties?.rotation === 'number' ? entity.properties.rotation : 0,
        textStyle: entity.properties?.textStyle,
        attachment: entity.properties?.attachment,
        isMText: Boolean(entity.properties?.isMText),
        lineSpacingFactor: typeof entity.properties?.lineSpacingFactor === 'number' ? entity.properties.lineSpacingFactor : undefined,
        bounds: makeBounds([position]),
      };
      return result;
    }
    case 'dimension': {
      const start = toPoint(entity.points[0]);
      const end = toPoint(entity.points[1]);
      const textPosition = toPoint(entity.points[2]);
      const result: AXDimensionEntity = {
        ...common,
        type: 'dimension',
        start,
        end,
        textPosition,
        value: typeof entity.properties?.value === 'number' ? entity.properties.value : undefined,
        unit: entity.properties?.unit,
        text: entity.properties?.text,
        dimensionType: entity.properties?.dimensionType,
        textHeight: entity.properties?.textHeight,
        rotation: entity.properties?.rotation,
        dimensionStyle: entity.properties?.dimensionStyle,
        textStyle: entity.properties?.textStyle,
        textAttachment: entity.properties?.textAttachment,
        extLine1: start,
        extLine2: end,
        arrowType: entity.properties?.arrowheadType,
        arrowSize: entity.properties?.arrowSize,
        textGap: entity.properties?.textGap,
        fitMode: entity.properties?.fitMode,
        isTextOverride: Boolean(entity.properties?.isTextOverride),
        measurementSource: entity.properties?.measurementSource,
        bounds: makeBounds([start, end, textPosition]),
      };
      return result;
    }
    case 'hatch': {
      const loop = entity.points.map(point => toPoint(point));
      const result: AXHatchEntity = {
        ...common,
        type: 'hatch',
        loops: loop.length > 0 ? [loop] : [],
        pattern: entity.properties?.pattern,
        angle: entity.properties?.angle,
        spacing: entity.properties?.spacing,
        bounds: makeBounds(loop),
      };
      return result;
    }
    case 'insert': {
      const insertionPoint = toPoint(entity.points[0]);
      return {
        ...common,
        type: 'insert',
        blockName: String(entity.properties?.blockName || entity.properties?.name || 'UNKNOWN_BLOCK'),
        insertionPoint,
        rotation: typeof entity.properties?.rotation === 'number' ? entity.properties.rotation : 0,
        scaleX: typeof entity.properties?.scaleX === 'number' ? entity.properties.scaleX : 1,
        scaleY: typeof entity.properties?.scaleY === 'number' ? entity.properties.scaleY : 1,
        explodeFallback: Boolean(entity.properties?.explodeFallback),
        bounds: makeBounds([insertionPoint]),
      };
    }
    case 'leader': {
      const points = entity.points.map(point => toPoint(point));
      return {
        ...common,
        type: 'leader',
        points,
        text: entity.properties?.text,
        landingLength: entity.properties?.landingLength,
        isMLeader: Boolean(entity.properties?.isMLeader),
        bounds: makeBounds(points),
      };
    }
    case 'unsupportedVisual': {
      const anchor = toPoint(entity.points[0]);
      return {
        ...common,
        type: 'unsupportedVisual',
        originalType: String(entity.properties?.originalType || entity.type || 'UNKNOWN'),
        bounds: makeBounds([anchor]),
      };
    }
    default:
      return {
        ...common,
        type: 'unknown',
      };
  }
}

export function buildAXDocumentFromCadEntities(
  entities: CadEntity[],
  sourceFileName: string,
  unitScaleApplied = 1,
  warnings: string[] = []
): AXDrawingDocument {
  const document = createEmptyAXDocument(sourceFileName);
  const sourceKind = inferSourceKind(sourceFileName);
  const layerMap = new Map<string, { id: string; name: string; color?: string; visible: boolean; locked: boolean }>();
  const unsupportedTypes: Record<string, number> = {};
  const unsupportedByDomain: Record<string, number> = {};
  const degradedBySubtype: Record<string, number> = {};

  const bump = (bucket: Record<string, number>, key: string) => {
    bucket[key] = (bucket[key] || 0) + 1;
  };

  const normalizedEntities = entities.map(entity => {
    const normalized = normalizeEntity(entity);
    if (normalized.type === 'unknown') {
      unsupportedTypes[entity.type] = (unsupportedTypes[entity.type] || 0) + 1;
      bump(unsupportedByDomain, 'unknown');
    }

    if (normalized.type === 'unsupportedVisual') {
      bump(unsupportedByDomain, 'unsupportedVisual');
      bump(degradedBySubtype, String(normalized.originalType || 'UNKNOWN_VISUAL'));
    }

    if (normalized.type === 'text' && normalized.isMText) {
      bump(degradedBySubtype, 'MTEXT_AS_TEXT');
      bump(unsupportedByDomain, 'text');
    }

    if (normalized.type === 'text' && normalized.metadata?.isAttributeText) {
      bump(degradedBySubtype, 'ATTRIB_AS_TEXT');
      bump(unsupportedByDomain, 'text');
    }

    if (normalized.type === 'text' && !normalized.textStyle) {
      bump(degradedBySubtype, 'TEXTSTYLE_MISSING');
    }

    if (normalized.type === 'insert' && normalized.explodeFallback) {
      bump(degradedBySubtype, 'INSERT_EXPLODE_FALLBACK');
      bump(unsupportedByDomain, 'block');
    }

    if (normalized.type === 'dimension') {
      if (normalized.isTextOverride) bump(degradedBySubtype, 'DIM_TEXT_OVERRIDE');
      if (!normalized.dimensionStyle) bump(degradedBySubtype, 'DIMSTYLE_MISSING');
      if (!normalized.extLine1 || !normalized.extLine2) bump(degradedBySubtype, 'DIM_EXTENSION_INCOMPLETE');
      if (!normalized.arrowType) bump(degradedBySubtype, 'DIM_ARROW_FALLBACK');
    }

    if (normalized.type === 'hatch') {
      if (!normalized.loops.length) {
        bump(degradedBySubtype, 'HATCH_NO_LOOPS');
        bump(unsupportedByDomain, 'hatch');
      }
      if (!normalized.pattern) {
        bump(degradedBySubtype, 'HATCH_PATTERN_MISSING');
      }
    }

    const layerId = normalized.layerId || 'default';
    if (!layerMap.has(layerId)) {
      layerMap.set(layerId, {
        id: layerId,
        name: layerId,
        color: normalized.style.color,
        visible: true,
        locked: false,
      });
    }

    return normalized;
  });

  document.sourceKind = sourceKind;
  document.layers = Array.from(layerMap.values());
  document.entities = normalizedEntities;
  document.diagnostics = {
    sourceFileName,
    sourceKind,
    unitScaleApplied,
    importedCount: normalizedEntities.length,
    skippedCount: Object.values(unsupportedTypes).reduce((sum, count) => sum + count, 0),
    unsupportedTypes,
    unsupportedByDomain,
    degradedBySubtype,
    warnings,
  };

  return document;
}
