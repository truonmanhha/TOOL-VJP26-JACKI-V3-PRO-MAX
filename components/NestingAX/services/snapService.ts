// ============================================================
// VJP26 SNAP SERVICE — 5-Mode Magnetic Snap System
// Point · Midpoint · Center · Tangent · Perpendicular
// ============================================================

export type SnapMode = 'point' | 'midpoint' | 'center' | 'tangent' | 'perpendicular';

export interface SnapResult {
  x: number;
  y: number;
  type: SnapMode;
  entityId: string;
}

interface CadEntity {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  properties?: any;
}

// ============= DISTANCE HELPERS =============

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Closest point on line segment p1->p2 from point
function closestPointOnSegment(
  point: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): { x: number; y: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return p1;
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: p1.x + t * dx, y: p1.y + t * dy };
}

// ============= SNAP CANDIDATE COLLECTORS =============

function getPointSnaps(entity: CadEntity): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];

  if (entity.type === 'line') {
    // Line endpoints
    if (entity.points.length >= 2) {
      pts.push(entity.points[0], entity.points[1]);
    }
  } else if (entity.type === 'rect') {
    // Rectangle corners
    if (entity.points.length >= 2) {
      const [p1, p2] = entity.points;
      pts.push(
        { x: p1.x, y: p1.y },
        { x: p2.x, y: p1.y },
        { x: p2.x, y: p2.y },
        { x: p1.x, y: p2.y }
      );
    }
  } else if (entity.type === 'polyline' || entity.type === 'spline') {
    // All vertices
    entity.points.forEach(p => pts.push(p));
  } else if (entity.type === 'polygon') {
    // Polygon vertices
    const center = entity.points[0];
    const edgePt = entity.points[1];
    const sides = entity.properties?.sides || 6;
    const radius = entity.properties?.radius || (edgePt ? dist(center, edgePt) : 0);
    const angleOffset = edgePt ? Math.atan2(edgePt.y - center.y, edgePt.x - center.x) : 0;
    for (let i = 0; i < sides; i++) {
      const angle = angleOffset + (2 * Math.PI * i) / sides;
      pts.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }
  } else if (entity.type === 'arc') {
    // Arc start and end points
    if (entity.points.length >= 2) {
      pts.push(entity.points[0]); // start
      pts.push(entity.points[entity.points.length - 1]); // end
    }
  }
  // circle, ellipse — no endpoints (use center snap instead)

  return pts;
}

function getMidpointSnaps(entity: CadEntity): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];

  if (entity.type === 'line' && entity.points.length >= 2) {
    pts.push(midpoint(entity.points[0], entity.points[1]));
  } else if (entity.type === 'rect' && entity.points.length >= 2) {
    const [p1, p2] = entity.points;
    // Midpoints of 4 edges
    pts.push(midpoint(p1, { x: p2.x, y: p1.y })); // bottom
    pts.push(midpoint({ x: p2.x, y: p1.y }, p2)); // right
    pts.push(midpoint(p2, { x: p1.x, y: p2.y })); // top
    pts.push(midpoint({ x: p1.x, y: p2.y }, p1)); // left
  } else if ((entity.type === 'polyline' || entity.type === 'spline') && entity.points.length >= 2) {
    for (let i = 0; i < entity.points.length - 1; i++) {
      pts.push(midpoint(entity.points[i], entity.points[i + 1]));
    }
  } else if (entity.type === 'arc' && entity.points.length >= 3) {
    // Midpoint of arc ≈ the through-point (point[1])
    pts.push(entity.points[1]);
  }

  return pts;
}

function getCenterSnaps(entity: CadEntity): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];

  if (entity.type === 'circle') {
    const center = entity.points[0];
    if (center) pts.push(center);
  } else if (entity.type === 'ellipse') {
    const center = entity.points[0];
    if (center) pts.push(center);
  } else if (entity.type === 'arc') {
    // Arc center from properties or computed
    if (entity.properties?.centerX !== undefined && entity.properties?.centerY !== undefined) {
      pts.push({ x: entity.properties.centerX, y: entity.properties.centerY });
    } else if (entity.points.length >= 3) {
      // Compute center from 3 arc points
      const [p1, p2, p3] = entity.points;
      const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
      if (Math.abs(D) > 1e-10) {
        const ux = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) + (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) + (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / D;
        const uy = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) + (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) + (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) / D;
        pts.push({ x: ux, y: uy });
      }
    }
  } else if (entity.type === 'rect' && entity.points.length >= 2) {
    // Bounding box center
    pts.push(midpoint(entity.points[0], entity.points[1]));
  } else if (entity.type === 'polygon') {
    pts.push(entity.points[0]); // center point
  }

  return pts;
}

function getTangentSnap(
  cursor: { x: number; y: number },
  entity: CadEntity
): { x: number; y: number } | null {
  // Tangent: perpendicular from circle/ellipse center to cursor direction
  // = closest point on circle/ellipse perimeter from cursor
  if (entity.type === 'circle') {
    const center = entity.points[0];
    const radius = entity.properties?.radius || (entity.points.length >= 2 ? dist(center, entity.points[1]) : 0);
    if (!center || radius <= 0) return null;

    const d = dist(cursor, center);
    if (d < 1e-10) return null; // cursor at center, no tangent

    // Tangent point: project cursor direction onto circle perimeter
    const dx = cursor.x - center.x;
    const dy = cursor.y - center.y;
    return {
      x: center.x + (dx / d) * radius,
      y: center.y + (dy / d) * radius
    };
  } else if (entity.type === 'ellipse') {
    const center = entity.points[0];
    const rx = entity.properties?.rx || 0;
    const ry = entity.properties?.ry || 0;
    if (!center || rx <= 0 || ry <= 0) return null;

    // Approximate: project cursor direction scaled by ellipse radii
    const dx = cursor.x - center.x;
    const dy = cursor.y - center.y;
    const d = Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    if (d < 1e-10) return null;
    return {
      x: center.x + dx / d,
      y: center.y + dy / d
    };
  }
  return null;
}

function getPerpendicularSnap(
  cursor: { x: number; y: number },
  entity: CadEntity
): { x: number; y: number } | null {
  // Perpendicular: closest point on entity from cursor
  if (entity.type === 'line' && entity.points.length >= 2) {
    return closestPointOnSegment(cursor, entity.points[0], entity.points[1]);
  } else if (entity.type === 'rect' && entity.points.length >= 2) {
    const [p1, p2] = entity.points;
    const corners = [
      p1,
      { x: p2.x, y: p1.y },
      p2,
      { x: p1.x, y: p2.y }
    ];
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < 4; i++) {
      const cp = closestPointOnSegment(cursor, corners[i], corners[(i + 1) % 4]);
      const d = dist(cursor, cp);
      if (d < bestDist) { bestDist = d; best = cp; }
    }
    return best;
  } else if ((entity.type === 'polyline' || entity.type === 'spline') && entity.points.length >= 2) {
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < entity.points.length - 1; i++) {
      const cp = closestPointOnSegment(cursor, entity.points[i], entity.points[i + 1]);
      const d = dist(cursor, cp);
      if (d < bestDist) { bestDist = d; best = cp; }
    }
    return best;
  } else if (entity.type === 'circle') {
    const center = entity.points[0];
    const radius = entity.properties?.radius || (entity.points.length >= 2 ? dist(center, entity.points[1]) : 0);
    if (!center || radius <= 0) return null;
    const d = dist(cursor, center);
    if (d < 1e-10) return null;
    const dx = cursor.x - center.x;
    const dy = cursor.y - center.y;
    return {
      x: center.x + (dx / d) * radius,
      y: center.y + (dy / d) * radius
    };
  }
  return null;
}

// ============= MAIN SNAP FUNCTION =============

/**
 * Find nearest snap point from cursor position across all entities.
 * 
 * @param worldPos   Current cursor world coordinates
 * @param entities   All CAD entities in workspace
 * @param activeSnaps Set of enabled snap modes
 * @param threshold  Snap distance threshold in world units
 * @returns SnapResult or null if no snap within threshold
 */
export function findNearestSnapPoint(
  worldPos: { x: number; y: number },
  entities: CadEntity[],
  activeSnaps: Set<SnapMode>,
  threshold: number
): SnapResult | null {
  if (activeSnaps.size === 0) return null;

  let bestResult: SnapResult | null = null;
  let bestDist = threshold;

  for (const entity of entities) {
    // Point snap (endpoints)
    if (activeSnaps.has('point')) {
      for (const pt of getPointSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { x: pt.x, y: pt.y, type: 'point', entityId: entity.id };
        }
      }
    }

    // Midpoint snap
    if (activeSnaps.has('midpoint')) {
      for (const pt of getMidpointSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { x: pt.x, y: pt.y, type: 'midpoint', entityId: entity.id };
        }
      }
    }

    // Center snap
    if (activeSnaps.has('center')) {
      for (const pt of getCenterSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { x: pt.x, y: pt.y, type: 'center', entityId: entity.id };
        }
      }
    }

    // Tangent snap
    if (activeSnaps.has('tangent')) {
      const pt = getTangentSnap(worldPos, entity);
      if (pt) {
        const d = dist(worldPos, pt);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { x: pt.x, y: pt.y, type: 'tangent', entityId: entity.id };
        }
      }
    }

    // Perpendicular snap
    if (activeSnaps.has('perpendicular')) {
      const pt = getPerpendicularSnap(worldPos, entity);
      if (pt) {
        const d = dist(worldPos, pt);
        if (d < bestDist) {
          bestDist = d;
          bestResult = { x: pt.x, y: pt.y, type: 'perpendicular', entityId: entity.id };
        }
      }
    }
  }

  return bestResult;
}

/**
 * Apply ORTHO constraint: snap cursor to nearest horizontal/vertical
 * axis from the last drawing point.
 */
export function applyOrthoConstraint(
  worldPos: { x: number; y: number },
  lastPoint: { x: number; y: number }
): { x: number; y: number } {
  const dx = Math.abs(worldPos.x - lastPoint.x);
  const dy = Math.abs(worldPos.y - lastPoint.y);

  if (dx >= dy) {
    // Horizontal constraint
    return { x: worldPos.x, y: lastPoint.y };
  } else {
    // Vertical constraint
    return { x: lastPoint.x, y: worldPos.y };
  }
}

// ============= SNAP INDICATOR CONFIG =============

export const SNAP_INDICATOR_COLORS: Record<SnapMode, string> = {
  point: '#00FF00',       // Green
  midpoint: '#00FFFF',    // Cyan
  center: '#FF00FF',      // Magenta
  tangent: '#6600FF',     // Purple
  perpendicular: '#FF6600' // Orange
};

export const SNAP_INDICATOR_LABELS: Record<SnapMode, string> = {
  point: 'Endpoint',
  midpoint: 'Midpoint',
  center: 'Center',
  tangent: 'Tangent',
  perpendicular: 'Perpendicular'
};

export const ALL_SNAP_MODES: SnapMode[] = ['point', 'midpoint', 'center', 'tangent', 'perpendicular'];
