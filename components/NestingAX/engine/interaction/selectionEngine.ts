import { AXEngineDocument } from '../scene/types';

export function selectEntitiesInWindow(
  document: AXEngineDocument,
  window: { minX: number; minY: number; maxX: number; maxY: number }
) {
  const selectedIds = new Set<string>();

  for (const entity of document.entities) {
    if (!entity.bounds) continue;
    const intersects = entity.bounds.maxX >= window.minX
      && entity.bounds.minX <= window.maxX
      && entity.bounds.maxY >= window.minY
      && entity.bounds.minY <= window.maxY;

    if (intersects) {
      selectedIds.add(entity.id);
    }
  }

  return selectedIds;
}
