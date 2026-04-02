import { CadEntity } from '../../services/db';
import { AXEngineDocument, AXEngineEntity } from '../scene/types';

function toLegacyCadEntity(entity: AXEngineEntity): CadEntity | null {
  switch (entity.kind) {
    case 'line':
      return {
        id: entity.id,
        type: 'line',
        points: [entity.start, entity.end],
        properties: { ...(entity.metadata || {}), color: entity.style.color, lineType: entity.style.lineType, lineWeight: entity.style.lineWeight },
        layerId: entity.layerId,
      };
    case 'polyline':
      return {
        id: entity.id,
        type: 'polyline',
        points: entity.points,
        properties: { ...(entity.metadata || {}), closed: entity.closed, bulges: entity.bulges, color: entity.style.color, lineType: entity.style.lineType, lineWeight: entity.style.lineWeight },
        layerId: entity.layerId,
      };
    case 'spline':
      return {
        id: entity.id,
        type: 'spline',
        points: entity.points,
        properties: { ...(entity.metadata || {}), closed: entity.closed, color: entity.style.color, lineType: entity.style.lineType, lineWeight: entity.style.lineWeight },
        layerId: entity.layerId,
      };
    case 'circle':
      return {
        id: entity.id,
        type: 'circle',
        points: [entity.center],
        properties: { ...(entity.metadata || {}), radius: entity.radius, color: entity.style.color, lineType: entity.style.lineType, lineWeight: entity.style.lineWeight },
        layerId: entity.layerId,
      };
    case 'arc': {
      const start = {
        x: entity.center.x + entity.radius * Math.cos(entity.startAngle),
        y: entity.center.y + entity.radius * Math.sin(entity.startAngle),
      };
      const end = {
        x: entity.center.x + entity.radius * Math.cos(entity.endAngle),
        y: entity.center.y + entity.radius * Math.sin(entity.endAngle),
      };
      return {
        id: entity.id,
        type: 'arc',
        points: [start, end],
        properties: {
          ...(entity.metadata || {}),
          centerX: entity.center.x,
          centerY: entity.center.y,
          radius: entity.radius,
          startAngle: entity.startAngle,
          endAngle: entity.endAngle,
          color: entity.style.color,
          lineType: entity.style.lineType,
          lineWeight: entity.style.lineWeight,
        },
        layerId: entity.layerId,
      };
    }
    case 'text':
      return {
        id: entity.id,
        type: 'text',
        points: [entity.position],
        properties: {
          ...(entity.metadata || {}),
          text: entity.text,
          textHeight: entity.height,
          rotation: entity.rotation,
          attachment: entity.attachment,
          isMText: entity.isMText,
          color: entity.style.color,
          textStyle: entity.style.textStyle,
        },
        layerId: entity.layerId,
      };
    case 'dimension':
      return {
        id: entity.id,
        type: 'dimension',
        points: [entity.start, entity.end, entity.textPosition],
        properties: {
          ...(entity.metadata || {}),
          text: entity.text,
          value: entity.value,
          unit: entity.unit,
          textHeight: entity.textHeight,
          rotation: entity.rotation,
          dimensionType: entity.dimensionType,
          dimensionStyle: entity.dimensionStyle,
          textStyle: entity.textStyle,
          textAttachment: entity.textAttachment,
          extLine1: entity.extLine1,
          extLine2: entity.extLine2,
          arrowheadType: entity.arrowType,
          arrowSize: entity.arrowSize,
          textGap: entity.textGap,
          fitMode: entity.fitMode,
          isTextOverride: entity.isTextOverride,
          measurementSource: entity.measurementSource,
          color: entity.style.color,
        },
        layerId: entity.layerId,
      };
    case 'leader':
      return {
        id: entity.id,
        type: 'leader',
        points: entity.points,
        properties: {
          ...(entity.metadata || {}),
          text: entity.text,
          landingLength: entity.landingLength,
          isMLeader: entity.isMLeader,
          color: entity.style.color,
        },
        layerId: entity.layerId,
      };
    case 'hatch':
      return {
        id: entity.id,
        type: 'hatch',
        points: entity.loops[0] || [],
        properties: { ...(entity.metadata || {}), pattern: entity.pattern, color: entity.style.color },
        layerId: entity.layerId,
      };
    case 'insert':
      return {
        id: entity.id,
        type: 'insert',
        points: [entity.insertionPoint],
        properties: {
          ...(entity.metadata || {}),
          blockName: entity.blockName,
          rotation: entity.rotation,
          scaleX: entity.scaleX,
          scaleY: entity.scaleY,
          explodeFallback: entity.explodeFallback,
          color: entity.style.color,
        },
        layerId: entity.layerId,
      };
    default:
      return null;
  }
}

export function axEngineDocumentToLegacyCad(document: AXEngineDocument): CadEntity[] {
  return document.entities.map(toLegacyCadEntity).filter((entity): entity is CadEntity => entity !== null);
}
