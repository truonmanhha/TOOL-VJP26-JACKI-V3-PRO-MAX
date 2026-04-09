import { AXEngineDocument, AXEngineEntity } from '../scene/types';

export interface AXHitTestResult {
  entityId: string;
  kind: AXEngineEntity['kind'];
}

export function hitTestAXEngineDocument(
  document: AXEngineDocument,
  worldPoint: { x: number; y: number },
  tolerance: number
): AXHitTestResult | null {
  for (const entity of document.entities) {
    if (!entity.bounds) continue;

    const withinX = worldPoint.x >= entity.bounds.minX - tolerance && worldPoint.x <= entity.bounds.maxX + tolerance;
    const withinY = worldPoint.y >= entity.bounds.minY - tolerance && worldPoint.y <= entity.bounds.maxY + tolerance;

    if (withinX && withinY) {
      return { entityId: entity.id, kind: entity.kind };
    }
  }

  return null;
}
