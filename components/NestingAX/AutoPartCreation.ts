// ============================================================
// AUTO PART CREATION - INSTANT ADD TO LIST
// Automatically create part from selection box (mouse up)
// ============================================================

import { cadEntitiesToGeometry, generateThumbnail } from '../nesting/NewNestList/VectorPreview';

interface CadEntity {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  properties?: any;
}

interface PartItem {
  id: string;
  name: string;
  size: { width: number; height: number };
  quantity: number;
  priority: number;
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
  rotation: 'none' | '90' | '180' | 'any';
  isSmallPart: boolean;
  geometry: any;
  cadEntities?: any[]; // The actual CAD geometry for the preview
  thumbnail?: string;
}

/**
 * STEP 1-4: Auto-create Part from selected entities
 * Called immediately on Mouse Up (no confirmation needed)
 * 
 * Flow:
 * 1. Clone selected entities
 * 2. Calculate bounding box (min/max X,Y)
 * 3. Normalize to origin (0,0)
 * 4. Create PartItem object
 * 5. Return ready-to-add part
 */
export function createPartFromSelection(
  selectedEntities: CadEntity[],
  partCount: number
): PartItem | null {
  
  if (selectedEntities.length === 0) {
    console.warn('⚠️ No entities selected');
    return null;
  }

  console.log('🎯 Auto-creating Part from', selectedEntities.length, 'entities');

  // STEP 1: CLONE (Deep copy to avoid affecting original)
  const clonedEntities = selectedEntities.map(entity => ({
    ...entity,
    points: entity.points.map(p => ({ ...p })),
    properties: entity.properties ? { ...entity.properties } : undefined
  }));

  // STEP 2: CALCULATE BOUNDING BOX
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  clonedEntities.forEach(entity => {
    entity.points.forEach(point => {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    });
  });

  if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
    console.error('❌ Invalid bounding box');
    return null;
  }

  const width = maxX - minX;
  const height = maxY - minY;

  console.log('📐 Bounding Box:', { minX, minY, maxX, maxY, width, height });

  // STEP 3: NORMALIZE (Move to origin 0,0)
  const normalizedEntities = clonedEntities.map(entity => ({
    ...entity,
    points: entity.points.map(p => ({
      x: p.x - minX,
      y: p.y - minY
    }))
  }));

  console.log('✅ Normalized to origin (0,0)');

  // Convert to geometry format for preview
  const geometry = cadEntitiesToGeometry(normalizedEntities);
  
  // Generate thumbnail
  const thumbnail = generateThumbnail(geometry, 200, 200);

  // STEP 4: CREATE PART ITEM
  const newPart: PartItem = {
    id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Part_${partCount + 1}`,
    size: { 
      width: parseFloat(width.toFixed(2)), 
      height: parseFloat(height.toFixed(2)) 
    },
    quantity: 1,
    priority: 3,
    symmetry: 'none',
    rotation: 'any',
    isSmallPart: false,
    geometry: normalizedEntities,
    cadEntities: normalizedEntities, // Explicitly map the entities so VectorPreview can see them!
    thumbnail
  };

  console.log('🎉 Part created:', newPart.name, newPart.size);

  return newPart;
}

/**
 * STEP 2: Selection Helper - Check if entity is in selection box
 */
export function isEntityInSelectionBox(
  entity: CadEntity,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  isCrossing: boolean = false
): boolean {
  const isPointInBox = (point: { x: number; y: number }) => (
    point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
  );

  const segmentIntersectsBox = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    if (isPointInBox(a) || isPointInBox(b)) return true;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t0 = 0;
    let t1 = 1;

    const clip = (p: number, q: number) => {
      if (Math.abs(p) < 1e-12) return q >= 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    };

    if (!clip(-dx, a.x - minX)) return false;
    if (!clip(dx, maxX - a.x)) return false;
    if (!clip(-dy, a.y - minY)) return false;
    if (!clip(dy, maxY - a.y)) return false;

    return t1 >= t0;
  };

  if (!isCrossing) {
    for (const point of entity.points) {
      if (!isPointInBox(point)) return false;
    }
    return true;
  }

  for (const point of entity.points) {
    if (isPointInBox(point)) return true;
  }

  const segments: Array<[{ x: number; y: number }, { x: number; y: number }]> = [];

  if (entity.type === 'rect' && entity.points.length >= 2) {
    const p1 = entity.points[0];
    const p2 = entity.points[1];
    const corners = [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y }
    ];
    for (let i = 0; i < 4; i++) {
      segments.push([corners[i], corners[(i + 1) % 4]]);
    }
  } else {
    for (let i = 0; i < entity.points.length - 1; i++) {
      segments.push([entity.points[i], entity.points[i + 1]]);
    }
  }

  for (const [a, b] of segments) {
    if (segmentIntersectsBox(a, b)) return true;
  }

  return false;
}

/**
 * Calculate selection box from mouse drag
 */
export function getSelectionBox(
  startX: number,
  startY: number,
  endX: number,
  endY: number
) {
  return {
    minX: Math.min(startX, endX),
    maxX: Math.max(startX, endX),
    minY: Math.min(startY, endY),
    maxY: Math.max(startY, endY),
    isCrossing: endX < startX // Right-to-left = crossing
  };
}

/**
 * Get entities within selection box
 */
export function getEntitiesInSelection(
  allEntities: CadEntity[],
  selectionBox: ReturnType<typeof getSelectionBox>
): CadEntity[] {
  
  const { minX, maxX, minY, maxY, isCrossing } = selectionBox;
  
  return allEntities.filter(entity =>
    isEntityInSelectionBox(entity, minX, minY, maxX, maxY, isCrossing)
  );
}

export default {
  createPartFromSelection,
  isEntityInSelectionBox,
  getSelectionBox,
  getEntitiesInSelection
};
