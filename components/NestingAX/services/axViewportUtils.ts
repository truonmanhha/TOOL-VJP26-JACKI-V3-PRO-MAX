import { CadEntity } from './db';

export interface AXViewportWindow {
  left: number;
  right: number;
  top: number;
  bottom: number;
  margin: number;
}

export function getCadEntityBounds(entity: CadEntity) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const point of entity.points || []) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  if (entity.type === 'circle' && entity.properties?.radius) {
    const radius = entity.properties.radius;
    minX -= radius;
    maxX += radius;
    minY -= radius;
    maxY += radius;
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  return { minX, maxX, minY, maxY };
}

export function isCadEntityVisibleInViewport(entity: CadEntity, viewport: AXViewportWindow) {
  const bounds = getCadEntityBounds(entity);
  if (!bounds) return false;

  return bounds.maxX >= (viewport.left - viewport.margin)
    && bounds.minX <= (viewport.right + viewport.margin)
    && bounds.maxY >= (viewport.bottom - viewport.margin)
    && bounds.minY <= (viewport.top + viewport.margin);
}

export function filterCadEntitiesForViewport(entities: CadEntity[], viewport: AXViewportWindow) {
  return entities.filter(entity => isCadEntityVisibleInViewport(entity, viewport));
}
