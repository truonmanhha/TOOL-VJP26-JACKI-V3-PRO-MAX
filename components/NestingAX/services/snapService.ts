// ============================================================
// VJP26 SNAP SERVICE — Rearchitected Snap System
// Priority-based, aperture-driven, VinaCAD-style logic.
// ============================================================

export type SnapMode = 'point' | 'midpoint' | 'center' | 'intersection' | 'tangent' | 'perpendicular';

export interface SnapResult {
  x: number;
  y: number;
  type: SnapMode;
  entityId: string;
  priority: number; // For sorting
  distance: number; // For sorting
}

interface CadEntity {
  id: string;
  type: string;
  points: { x: number; y: number }[];
  properties?: any;
}

// The core of the new system. Defines which snap types "win" in conflicts.
// Lower number = higher priority. Based on standard CAD behavior.
const SNAP_PRIORITY: Record<SnapMode, number> = {
  intersection: 1,
  point: 2,        // Endpoints are very high priority
  center: 3,
  midpoint: 4,
  perpendicular: 5,
  tangent: 6,       // Tangent is usually a "last resort" snap
};

// ============= DISTANCE HELPERS =============

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function isNearlyEqual(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

export function pointsEqualWithinTolerance(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tolerance = 0.01
): boolean {
  return isNearlyEqual(a.x, b.x, tolerance) && isNearlyEqual(a.y, b.y, tolerance);
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

interface LineSegment {
  a: { x: number; y: number };
  b: { x: number; y: number };
}

function getLineSegments(entity: CadEntity): LineSegment[] {
  const segments: LineSegment[] = [];

  if (entity.type === 'line' && entity.points.length >= 2) {
    segments.push({ a: entity.points[0], b: entity.points[1] });
    return segments;
  }

  if (entity.type === 'rect' && entity.points.length >= 2) {
    const [p1, p2] = entity.points;
    const corners = [
      { x: p1.x, y: p1.y },
      { x: p2.x, y: p1.y },
      { x: p2.x, y: p2.y },
      { x: p1.x, y: p2.y }
    ];
    for (let i = 0; i < 4; i++) {
      segments.push({ a: corners[i], b: corners[(i + 1) % 4] });
    }
    return segments;
  }

  if ((entity.type === 'polyline' || entity.type === 'spline') && entity.points.length >= 2) {
    for (let i = 0; i < entity.points.length - 1; i++) {
      segments.push({ a: entity.points[i], b: entity.points[i + 1] });
    }
    if (entity.properties?.closed && entity.points.length > 2) {
      segments.push({ a: entity.points[entity.points.length - 1], b: entity.points[0] });
    }
    return segments;
  }

  return segments;
}

function getSegmentIntersection(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
): { x: number; y: number } | null {
  const den = (a1.x - a2.x) * (b1.y - b2.y) - (a1.y - a2.y) * (b1.x - b2.x);
  if (Math.abs(den) < 1e-10) return null;

  const t = ((a1.x - b1.x) * (b1.y - b2.y) - (a1.y - b1.y) * (b1.x - b2.x)) / den;
  const u = ((a1.x - b1.x) * (a1.y - a2.y) - (a1.y - b1.y) * (a1.x - a2.x)) / den;

  if (t < 0 || t > 1 || u < 0 || u > 1) return null;

  return {
    x: a1.x + t * (a2.x - a1.x),
    y: a1.y + t * (a2.y - a1.y)
  };
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
    if (entity.points.length >= 2) {
      pts.push(entity.points[0], entity.points[1]);
    }
  } else if (entity.type === 'rect') {
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
    entity.points.forEach(p => pts.push(p));
  } else if (entity.type === 'polygon') {
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
    if (entity.points.length >= 2) {
      pts.push(entity.points[0]); // start
      pts.push(entity.points[entity.points.length - 1]); // end
    }
  }
  return pts;
}

function getMidpointSnaps(entity: CadEntity): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  if (entity.type === 'line' && entity.points.length >= 2) {
    pts.push(midpoint(entity.points[0], entity.points[1]));
  } else if (entity.type === 'rect' && entity.points.length >= 2) {
    const [p1, p2] = entity.points;
    pts.push(midpoint(p1, { x: p2.x, y: p1.y }));
    pts.push(midpoint({ x: p2.x, y: p1.y }, p2));
    pts.push(midpoint(p2, { x: p1.x, y: p2.y }));
    pts.push(midpoint({ x: p1.x, y: p2.y }, p1));
  } else if ((entity.type === 'polyline' || entity.type === 'spline') && entity.points.length >= 2) {
    for (let i = 0; i < entity.points.length - 1; i++) {
      pts.push(midpoint(entity.points[i], entity.points[i + 1]));
    }
  } else if (entity.type === 'arc' && entity.points.length >= 3) {
    pts.push(entity.points[1]);
  }
  return pts;
}

function getCenterSnaps(entity: CadEntity): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  if (entity.type === 'circle' || entity.type === 'ellipse' || entity.type === 'polygon') {
    if (entity.points[0]) pts.push(entity.points[0]);
  } else if (entity.type === 'arc') {
    if (entity.properties?.centerX !== undefined && entity.properties?.centerY !== undefined) {
      pts.push({ x: entity.properties.centerX, y: entity.properties.centerY });
    } else if (entity.points.length >= 3) {
      const [p1, p2, p3] = entity.points;
      const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
      if (Math.abs(D) > 1e-10) {
        const ux = ((p1.x * p1.x + p1.y * p1.y) * (p2.y - p3.y) + (p2.x * p2.x + p2.y * p2.y) * (p3.y - p1.y) + (p3.x * p3.x + p3.y * p3.y) * (p1.y - p2.y)) / D;
        const uy = ((p1.x * p1.x + p1.y * p1.y) * (p3.x - p2.x) + (p2.x * p2.x + p2.y * p2.y) * (p1.x - p3.x) + (p3.x * p3.x + p3.y * p3.y) * (p2.x - p1.x)) / D;
        pts.push({ x: ux, y: uy });
      }
    }
  } else if (entity.type === 'rect' && entity.points.length >= 2) {
    pts.push(midpoint(entity.points[0], entity.points[1]));
  }
  return pts;
}

function getTangentSnap(cursor: { x: number; y: number }, entity: CadEntity): { x: number; y: number } | null {
  if (entity.type === 'circle') {
    const center = entity.points[0];
    const radius = entity.properties?.radius || (entity.points.length >= 2 ? dist(center, entity.points[1]) : 0);
    if (!center || radius <= 0) return null;
    const d = dist(cursor, center);
    if (d < 1e-10) return null;
    return { x: center.x + ((cursor.x - center.x) / d) * radius, y: center.y + ((cursor.y - center.y) / d) * radius };
  }
  return null;
}

function getPerpendicularSnap(cursor: { x: number; y: number }, entity: CadEntity): { x: number; y: number } | null {
  if (entity.type === 'line' && entity.points.length >= 2) {
    return closestPointOnSegment(cursor, entity.points[0], entity.points[1]);
  }
  return null;
}

// ============= MAIN SNAP FUNCTION =============

export function findBestSnap(
  worldPos: { x: number; y: number },
  entities: CadEntity[],
  activeSnaps: Set<SnapMode>,
  aperture: number
): SnapResult | null {
  if (activeSnaps.size === 0) return null;
  const candidates: SnapResult[] = [];

  for (const entity of entities) {
    if (activeSnaps.has('point')) {
      for (const pt of getPointSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d <= aperture) candidates.push({ ...pt, type: 'point', entityId: entity.id, priority: SNAP_PRIORITY.point, distance: d });
      }
    }
    if (activeSnaps.has('midpoint')) {
      for (const pt of getMidpointSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d <= aperture) candidates.push({ ...pt, type: 'midpoint', entityId: entity.id, priority: SNAP_PRIORITY.midpoint, distance: d });
      }
    }
    if (activeSnaps.has('center')) {
      for (const pt of getCenterSnaps(entity)) {
        const d = dist(worldPos, pt);
        if (d <= aperture) candidates.push({ ...pt, type: 'center', entityId: entity.id, priority: SNAP_PRIORITY.center, distance: d });
      }
    }
    if (activeSnaps.has('tangent')) {
      const pt = getTangentSnap(worldPos, entity);
      if (pt) {
        const d = dist(worldPos, pt);
        if (d <= aperture) candidates.push({ ...pt, type: 'tangent', entityId: entity.id, priority: SNAP_PRIORITY.tangent, distance: d });
      }
    }
    if (activeSnaps.has('perpendicular')) {
      const pt = getPerpendicularSnap(worldPos, entity);
      if (pt) {
        const d = dist(worldPos, pt);
        if (d <= aperture) candidates.push({ ...pt, type: 'perpendicular', entityId: entity.id, priority: SNAP_PRIORITY.perpendicular, distance: d });
      }
    }
  }

  // Intersections (between all visible entities)
  if (activeSnaps.has('intersection')) {
    const allSegments: { seg: LineSegment; id: string }[] = [];
    entities.forEach(ent => {
      getLineSegments(ent).forEach(seg => allSegments.push({ seg, id: ent.id }));
    });

    for (let i = 0; i < allSegments.length; i++) {
      for (let j = i + 1; j < allSegments.length; j++) {
        const s1 = allSegments[i];
        const s2 = allSegments[j];
        if (s1.id === s2.id) continue; // Skip same entity segments unless they share endpoints

        const pt = getSegmentIntersection(s1.seg.a, s1.seg.b, s2.seg.a, s2.seg.b);
        if (pt) {
          const d = dist(worldPos, pt);
          if (d <= aperture) {
            candidates.push({ ...pt, type: 'intersection', entityId: s1.id, priority: SNAP_PRIORITY.intersection, distance: d });
          }
        }
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : a.distance - b.distance);
  return candidates[0];
}

/**
 * Apply Orthogonal constraint (Ortho Mode)
 */
export function applyOrthoConstraint(
  worldPos: { x: number; y: number },
  lastPoint: { x: number; y: number }
): { x: number; y: number } {
  const dx = Math.abs(worldPos.x - lastPoint.x);
  const dy = Math.abs(worldPos.y - lastPoint.y);
  return dx >= dy ? { x: worldPos.x, y: lastPoint.y } : { x: lastPoint.x, y: worldPos.y };
}

// ============= SNAP INDICATOR CONFIG =============

export const SNAP_INDICATOR_COLORS: Record<SnapMode, string> = {
  point: '#00FF00',
  intersection: '#FFD700',
  midpoint: '#00FFFF',
  center: '#FF00FF',
  tangent: '#6600FF',
  perpendicular: '#FF6600'
};

export const SNAP_INDICATOR_LABELS: Record<SnapMode, string> = {
  point: 'Endpoint',
  intersection: 'Intersection',
  midpoint: 'Midpoint',
  center: 'Center',
  tangent: 'Tangent',
  perpendicular: 'Perpendicular'
};

export const ALL_SNAP_MODES: SnapMode[] = ['point', 'intersection', 'center', 'midpoint', 'perpendicular', 'tangent'];
