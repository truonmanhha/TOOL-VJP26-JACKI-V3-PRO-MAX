import { AXEngineDocument } from '../scene/types';

export interface AXGripPoint {
  entityId: string;
  x: number;
  y: number;
  kind: 'vertex' | 'center' | 'text';
}

export function collectGripPoints(document: AXEngineDocument): AXGripPoint[] {
  const grips: AXGripPoint[] = [];

  for (const entity of document.entities) {
    switch (entity.kind) {
      case 'line':
        grips.push({ entityId: entity.id, x: entity.start.x, y: entity.start.y, kind: 'vertex' });
        grips.push({ entityId: entity.id, x: entity.end.x, y: entity.end.y, kind: 'vertex' });
        break;
      case 'circle':
        grips.push({ entityId: entity.id, x: entity.center.x, y: entity.center.y, kind: 'center' });
        break;
      case 'text':
        grips.push({ entityId: entity.id, x: entity.position.x, y: entity.position.y, kind: 'text' });
        break;
      default:
        break;
    }
  }

  return grips;
}
