// ============================================================
// DXF Worker — Asynchronous DXF Parsing + Geometry Simplification
// Uses Douglas-Peucker algorithm with 0.1mm default tolerance
// ============================================================
import DxfParser from 'dxf-parser';

const parser = new DxfParser();
const SIMPLIFICATION_TOLERANCE = 0.2; // 0.2mm (200 microns) - aggressive V3 optimization

/**
 * Douglas-Peucker algorithm for polygon simplification
 */
function perpendicularDistance(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
  const px = point.x, py = point.y;
  const x1 = lineStart.x, y1 = lineStart.y;
  const x2 = lineEnd.x, y2 = lineEnd.y;

  const numerator = Math.abs((y2 - y1) * px - (x2 - x1) * py + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
  
  return denominator === 0 ? 0 : numerator / denominator;
}

function douglasPeucker(points: { x: number; y: number }[], tolerance: number): { x: number; y: number }[] {
  if (points.length < 3) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

function simplifyPolygon(polygon: { x: number; y: number }[], tolerance: number = SIMPLIFICATION_TOLERANCE): { x: number; y: number }[] {
  if (polygon.length < 3) return [...polygon];

  const simplified = douglasPeucker(polygon, tolerance);

  // Ensure the result is still a valid polygon
  if (simplified.length < 3) return polygon;

  return simplified;
}

/**
 * Remove collinear points from polygon using cross product
 * High precision collinearity check
 */
function removeCollinearPoints(points: { x: number; y: number }[], tolerance: number = 0.001): { x: number; y: number }[] {
  if (points.length < 3) return [...points];

  // Preserve closure: check if first and last points are the same
  const isClosed = points.length > 0 &&
    Math.abs(points[0].x - points[points.length - 1].x) < tolerance &&
    Math.abs(points[0].y - points[points.length - 1].y) < tolerance;

  const result: { x: number; y: number }[] = [];
  const n = isClosed ? points.length - 1 : points.length;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // Calculate cross product to detect collinearity
    const cross = (curr.x - prev.x) * (next.y - prev.y) - (curr.y - prev.y) * (next.x - prev.x);

    // If cross product is not near zero, point is not collinear
    if (Math.abs(cross) > tolerance) {
      result.push(curr);
    }
  }

  // Restore closure if original was closed
  if (isClosed && result.length > 0) {
    result.push({ x: result[0].x, y: result[0].y });
  }

  return result.length >= 3 ? result : [...points];
}

/**
 * Calculate distance between two points
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Calculate angle between three points (in radians)
 * Used to detect sharp corners vs straight segments
 */
function angleBetween(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): number {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cos);
}

/**
 * Step 1: Remove segments shorter than minimum threshold
 */
function filterMicroSegments(points: { x: number; y: number }[], minLength: number): { x: number; y: number }[] {
  if (points.length < 3) return [...points];
  
  const filtered: { x: number; y: number }[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    
    // Calculate segment length
    const segLength = distance(current, next);
    
    // Keep point if next segment is long enough
    if (segLength >= minLength) {
      filtered.push(current);
    }
  }
  
  // Ensure we keep at least the first point if nothing was kept
  return filtered.length >= 3 ? filtered : points;
}

/**
 * Step 2: Merge consecutive collinear segments
 */
function mergeCollinearSegments(points: { x: number; y: number }[], crossProductTolerance: number): { x: number; y: number }[] {
  if (points.length < 3) return [...points];
  
  const merged: { x: number; y: number }[] = [];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    
    // Calculate cross product to detect collinearity
    const cross = (curr.x - prev.x) * (next.y - prev.y) - (curr.y - prev.y) * (next.x - prev.x);
    
    // If cross product is not near zero, point is not collinear - keep it
    if (Math.abs(cross) > crossProductTolerance) {
      merged.push(curr);
    }
  }
  
  return merged.length >= 3 ? merged : points;
}

/**
 * Step 3: Douglas-Peucker algorithm with corner preservation
 * Protects sharp angles (< angleTolerance) from being simplified
 */
function douglasPeuckerWithCornerPreservation(
  points: { x: number; y: number }[],
  tolerance: number,
  angleThreshold: number
): { x: number; y: number }[] {
  if (points.length < 3) return points;
  
  // Mark corners that should be protected
  const isCorner = new Array(points.length).fill(false);
  
  for (let i = 1; i < points.length - 1; i++) {
    const angle = angleBetween(points[i - 1], points[i], points[i + 1]);
    const angleDeg = (angle * 180) / Math.PI;
    
    // Mark as corner if angle is sharp (< threshold)
    if (angleDeg < angleThreshold) {
      isCorner[i] = true;
    }
  }
  
  // Apply Douglas-Peucker with corner preservation
  return douglasPeuckerRecursive(points, tolerance, isCorner);
}

/**
 * Recursive Douglas-Peucker implementation with corner preservation
 */
function douglasPeuckerRecursive(
  points: { x: number; y: number }[],
  tolerance: number,
  isCorner: boolean[]
): { x: number; y: number }[] {
  if (points.length < 3) return points;
  
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  
  for (let i = 1; i < points.length - 1; i++) {
    // Skip points marked as corners
    if (isCorner[i]) continue;
    
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = douglasPeuckerRecursive(points.slice(0, maxIdx + 1), tolerance, isCorner.slice(0, maxIdx + 1));
    const right = douglasPeuckerRecursive(points.slice(maxIdx), tolerance, isCorner.slice(maxIdx));
    return [...left.slice(0, -1), ...right];
  }
  
  // If simplifying, keep endpoints and any corners
  const result: { x: number; y: number }[] = [first, last];
  for (let i = 1; i < points.length - 1; i++) {
    if (isCorner[i]) {
      result.splice(-1, 0, points[i]);
    }
  }
  return result;
}

/**
 * OPTIMIZEGEOMETRYV3 - High Aggression Geometry Optimization
 * 
 * Aggressive multi-stage optimization for maximum point reduction:
 * Step 1: Aggressive Point Filter - Remove points closer than 0.05mm (duplicates)
 * Step 2: Collinear Merger - Merge points on nearly-straight lines (high tolerance)
 * Step 3: Aggressive Douglas-Peucker - Use 0.2mm tolerance for maximum simplification
 * Step 4: Corner Preservation - Protect only sharp angles < 160 degrees
 * 
 * This is the MAXIMUM optimization level - use for performance-critical nesting
 * 
 * @param points Input polygon vertices
 * @param tolerance Simplification tolerance in mm (default: 0.2 = 200 microns)
 * @param angleThreshold Angle threshold for corner preservation in degrees (default: 160)
 */
function optimizeGeometryV3(
  points: { x: number; y: number }[],
  tolerance: number = 0.2,
  angleThreshold: number = 160
): { x: number; y: number }[] {
  if (points.length < 3) return [...points];
  
  // Preserve closure: check if first and last points are the same
  const isClosed = points.length > 0 &&
    Math.abs(points[0].x - points[points.length - 1].x) < 0.001 &&
    Math.abs(points[0].y - points[points.length - 1].y) < 0.001;
  
  // Step 1: Aggressive Point Filter - Remove points closer than 0.05mm
  let filtered = aggressivePointFilter(points, 0.05);
  if (filtered.length < 3) return [...points];
  
  // Step 2: Collinear Merger - Use high tolerance for aggressive merging
  let merged = mergeCollinearSegments(filtered, 0.01);
  if (merged.length < 3) return [...points];
  
  // Handle zero-length segments before Douglas-Peucker
  merged = filterMicroSegments(merged, 0.001);
  if (merged.length < 3) return [...points];
  
  // Step 3: Aggressive Douglas-Peucker with corner preservation
  const angleThresholdRad = (angleThreshold * Math.PI) / 180;
  let optimized = douglasPeuckerWithCornerPreservation(
    merged,
    tolerance,
    angleThresholdRad
  );
  
  if (optimized.length < 3) return [...points];
  
  // Restore closure if original was closed
  if (isClosed && optimized.length > 0) {
    if (distance(optimized[0], optimized[optimized.length - 1]) > 0.001) {
      optimized.push({ x: optimized[0].x, y: optimized[0].y });
    }
  }
  
  return optimized;
}

/**
 * Step 1: Aggressive filter - Remove points closer than minimum threshold
 * This eliminates duplicates and micro-segments in a single pass
 */
function aggressivePointFilter(points: { x: number; y: number }[], minDistance: number): { x: number; y: number }[] {
  if (points.length < 3) return [...points];
  
  const filtered: { x: number; y: number }[] = [];
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    
    // Calculate distance to next point
    const dist = distance(current, next);
    
    // Only keep point if next segment is longer than minDistance
    if (dist >= minDistance) {
      filtered.push(current);
    }
  }
  
  return filtered.length >= 3 ? filtered : points;
}

/**
 * Enhanced geometry optimization with corner preservation
 * Step 1: Micro-filter (remove segments < 0.01mm)
 * Step 2: Collinear Merger (merge straight segments)
 * Step 3: Douglas-Peucker with corner preservation (protect sharp angles)
 * 
 * @param points Input polygon vertices
 * @param tolerance Simplification tolerance in mm (default: 0.05 = 50 microns)
 * @param angleTolerance Angle threshold for corner preservation in degrees (default: 170)
 */
function optimizeGeometryV2(
  points: { x: number; y: number }[],
  tolerance: number = 0.05,
  angleTolerance: number = 170
): { x: number; y: number }[] {
  if (points.length < 3) return [...points];
  
  // Preserve closure: check if first and last points are the same
  const isClosed = points.length > 0 &&
    Math.abs(points[0].x - points[points.length - 1].x) < 0.001 &&
    Math.abs(points[0].y - points[points.length - 1].y) < 0.001;
  
  // Step 1: Micro-filter - remove segments shorter than 0.01mm
  let filtered = filterMicroSegments(points, 0.01);
  if (filtered.length < 3) return [...points];
  
  // Step 2: Collinear Merger - merge consecutive segments forming straight lines
  let merged = mergeCollinearSegments(filtered, 0.001);
  if (merged.length < 3) return [...points];
  
  // Step 3: Douglas-Peucker with corner preservation
  const angleThresholdRad = (angleTolerance * Math.PI) / 180;
  let optimized = douglasPeuckerWithCornerPreservation(
    merged,
    tolerance,
    angleThresholdRad
  );
  
  if (optimized.length < 3) return [...points];
  
  // Restore closure if original was closed
  if (isClosed && optimized.length > 0) {
    if (distance(optimized[0], optimized[optimized.length - 1]) > 0.001) {
      optimized.push({ x: optimized[0].x, y: optimized[0].y });
    }
  }
  
  return optimized;
}

interface DxfEntity {
  id: string;
  type: string;
  area: number;
  verticesCount: number;
  isClosed: boolean;
  geometry: { x: number; y: number }[];
}

self.onmessage = async (e: MessageEvent) => {
  const { fileText, fileName, type, entities } = e.data;
  
  try {
    if (type === 'DXF') {
      const dxf = parser.parseSync(fileText);
      if (!dxf || !dxf.entities) {
        self.postMessage({ type: 'error', error: 'No entities found in DXF' });
        return;
      }

      const parsedEntities: DxfEntity[] = [];

      dxf.entities.forEach((entity: any, index: number) => {
        let points: { x: number; y: number }[] = [];
        let isClosed = false;
        let entityType = entity.type || 'UNKNOWN';

        try {
          switch (entityType) {
            case 'LWPOLYLINE':
            case 'POLYLINE': {
              if (entity.vertices && entity.vertices.length > 0) {
                points = entity.vertices.map((v: any) => ({ x: v.x || 0, y: v.y || 0 }));
                isClosed = (entity.flags & 1) === 1 || entity.closed === true;
                
                // Ensure closed polygons have closing point
                if (isClosed && points.length > 2) {
                  const first = points[0];
                  const last = points[points.length - 1];
                  const dx = first.x - last.x;
                  const dy = first.y - last.y;
                  if (Math.sqrt(dx * dx + dy * dy) > 0.0001) {
                    points.push({ x: first.x, y: first.y });
                  }
                }
                
                // Simplify high-vertex polylines
                if (points.length > 10) {
                  points = simplifyPolygon(points, SIMPLIFICATION_TOLERANCE);
                }
              }
              break;
            }

            case 'LINE': {
              const p1 = entity.start || entity.vertices?.[0];
              const p2 = entity.end || entity.vertices?.[1];
              if (p1 && p2) {
                points = [
                  { x: p1.x || 0, y: p1.y || 0 },
                  { x: p2.x || 0, y: p2.y || 0 }
                ];
              }
              isClosed = false;
              break;
            }

            case 'CIRCLE': {
              if (entity.center && entity.radius) {
                points = arcToPoints({
                  center: entity.center,
                  radius: entity.radius,
                  startAngle: 0,
                  endAngle: 2 * Math.PI,
                  type: 'CIRCLE'
                });
                isClosed = true;
              }
              break;
            }

            case 'ARC': {
              if (entity.center && entity.radius !== undefined) {
                points = arcToPoints({
                  center: entity.center,
                  radius: entity.radius,
                  startAngle: entity.startAngle || 0,
                  endAngle: entity.endAngle || (2 * Math.PI),
                  type: 'ARC'
                });
                isClosed = false;
              }
              break;
            }

            case 'SPLINE': {
              if (entity.controlPoints && entity.controlPoints.length >= 2) {
                // Basic spline approximation: connect control points with simplified curve
                points = entity.controlPoints.map((p: any) => ({ x: p.x || 0, y: p.y || 0 }));
                if (points.length > 10) {
                  points = simplifyPolygon(points, SIMPLIFICATION_TOLERANCE);
                }
              }
              isClosed = false;
              break;
            }

            default:
              // Unsupported entity type
              return;
          }

          if (points.length >= 2) {
            const area = calculatePolygonArea(points);
            parsedEntities.push({
              id: `${fileName}-${entityType}-${index}-${Date.now()}`,
              type: entityType,
              area,
              verticesCount: points.length,
              isClosed,
              geometry: points
            });
          }
        } catch (entityErr) {
          console.error(`[dxf.worker] Error processing entity ${index} (${entityType}):`, entityErr);
        }
      });

      console.log(`[dxf.worker] ✓ Parsed ${parsedEntities.length} entities from ${fileName}`);
      self.postMessage({ type: 'success', payload: { entities: parsedEntities, fileName } });
    } else if (type === 'SIMPLIFY') {
      // Handle SIMPLIFY command
      if (!entities || !Array.isArray(entities)) {
        self.postMessage({ type: 'error', error: 'Invalid entities array for SIMPLIFY' });
        return;
      }

      const optimizedEntities = entities.map((entity: any) => {
        try {
          if (!entity.geometry || !Array.isArray(entity.geometry)) {
            return entity;
          }

          // Use optimizeGeometryV3 with 0.2mm tolerance and 160° corner protection
          const optimized = optimizeGeometryV3(entity.geometry, 0.2, 160);

          return {
            ...entity,
            geometry: optimized,
            verticesCount: optimized.length
          };
        } catch (err) {
          console.error(`[dxf.worker] Error optimizing entity ${entity.id}:`, err);
          return entity; // Return original if optimization fails
        }
      });

      console.log(`[dxf.worker] ✓ Optimized ${optimizedEntities.length} entities`);
      self.postMessage({ type: 'success', payload: { optimizedEntities } });
    } else {
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}` });
    }
  } catch (err) {
    console.error('[dxf.worker] Fatal error:', err);
    self.postMessage({ 
      type: 'error', 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
};

/**
 * Convert ARC/CIRCLE to points with adaptive resolution
 */
function arcToPoints(entity: {
  center: { x: number; y: number };
  radius: number;
  startAngle: number;
  endAngle: number;
  type: string;
}): { x: number; y: number }[] {
  const { center, radius, startAngle, endAngle, type } = entity;
  const points: { x: number; y: number }[] = [];

  let sa = startAngle;
  let ea = endAngle;

  // Convert degrees to radians if needed (CAD convention)
  if (type === 'ARC') {
    sa = (startAngle * Math.PI) / 180;
    ea = (endAngle * Math.PI) / 180;
  }

  if (ea < sa) ea += 2 * Math.PI;
  const sweep = ea - sa;

  // Adaptive resolution: more points for larger arcs
  const segments = Math.max(32, Math.min(512, Math.ceil(radius * sweep * 5)));

  for (let i = 0; i <= segments; i++) {
    const angle = sa + sweep * (i / segments);
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    });
  }

  return points;
}

/**
 * Calculate polygon area using Shoelace formula
 */
function calculatePolygonArea(vertices: { x: number; y: number }[]): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2.0);
}
