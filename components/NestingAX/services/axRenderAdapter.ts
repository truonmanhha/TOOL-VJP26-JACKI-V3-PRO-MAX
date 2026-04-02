import { CadEntity } from './db';
import { AXDrawingDocument, AXEntity } from './axSceneModel';

function toCadEntity(entity: AXEntity): CadEntity | null {
  switch (entity.type) {
    case 'line':
      return {
        id: entity.id,
        type: 'line',
        points: [entity.start, entity.end],
        properties: { ...(entity.metadata || {}), color: entity.style.color },
        layerId: entity.layerId,
      };
    case 'polyline':
      return {
        id: entity.id,
        type: 'polyline',
        points: entity.points,
        properties: { ...(entity.metadata || {}), closed: entity.closed, bulges: entity.bulges, color: entity.style.color },
        layerId: entity.layerId,
      };
    case 'circle':
      return {
        id: entity.id,
        type: 'circle',
        points: [entity.center],
        properties: { ...(entity.metadata || {}), radius: entity.radius, color: entity.style.color },
        layerId: entity.layerId,
      };
    case 'arc':
      const startPoint = {
        x: entity.center.x + entity.radius * Math.cos(entity.startAngle),
        y: entity.center.y + entity.radius * Math.sin(entity.startAngle),
      };
      const endPoint = {
        x: entity.center.x + entity.radius * Math.cos(entity.endAngle),
        y: entity.center.y + entity.radius * Math.sin(entity.endAngle),
      };
      return {
        id: entity.id,
        type: 'arc',
        points: [startPoint, endPoint],
        properties: {
          ...(entity.metadata || {}),
          radius: entity.radius,
          centerX: entity.center.x,
          centerY: entity.center.y,
          startAngle: entity.startAngle,
          endAngle: entity.endAngle,
          color: entity.style.color,
        },
        layerId: entity.layerId,
      };
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
          textStyle: entity.textStyle,
          attachment: entity.attachment,
          color: entity.style.color,
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
          value: entity.value,
          text: entity.text,
          dimensionType: entity.dimensionType,
          textHeight: entity.textHeight,
          rotation: entity.rotation,
          dimensionStyle: entity.dimensionStyle,
          textStyle: entity.textStyle,
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
    default:
      return null;
  }
}

export function axDocumentToCadEntities(document: AXDrawingDocument): CadEntity[] {
  return document.entities.map(toCadEntity).filter((entity): entity is CadEntity => entity !== null);
}
