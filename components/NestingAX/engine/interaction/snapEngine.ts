import { AXEngineDocument } from '../scene/types';

export interface AXSnapResult {
  x: number;
  y: number;
  entityId?: string;
  reason: 'endpoint' | 'center' | 'nearest';
}

export function findAXSnapPoint(
  document: AXEngineDocument,
  worldPoint: { x: number; y: number },
  tolerance: number
): AXSnapResult | null {
  for (const entity of document.entities) {
    switch (entity.kind) {
      case 'line':
        if (Math.hypot(worldPoint.x - entity.start.x, worldPoint.y - entity.start.y) <= tolerance) {
          return { x: entity.start.x, y: entity.start.y, entityId: entity.id, reason: 'endpoint' };
        }
        if (Math.hypot(worldPoint.x - entity.end.x, worldPoint.y - entity.end.y) <= tolerance) {
          return { x: entity.end.x, y: entity.end.y, entityId: entity.id, reason: 'endpoint' };
        }
        break;
      case 'circle':
        if (Math.hypot(worldPoint.x - entity.center.x, worldPoint.y - entity.center.y) <= tolerance) {
          return { x: entity.center.x, y: entity.center.y, entityId: entity.id, reason: 'center' };
        }
        break;
      default:
        break;
    }
  }

  return null;
}
