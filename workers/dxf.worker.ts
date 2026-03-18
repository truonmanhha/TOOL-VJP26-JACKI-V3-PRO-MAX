// ============================================================
// DXF Worker — Asynchronous DXF Parsing + Geometry Simplification
// Uses Douglas-Peucker algorithm with 0.1mm default tolerance
// ============================================================
import DxfParser from 'dxf-parser';
import { pointsToTypedArray, normalizeGeometry } from '../services/nesting/geometry';


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
  geometry: { x: number; y: number }[] | Float32Array;
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

      // Pre-calculate Linetype and Layer definitions just like in dxfService.ts
      const linetypeDefinitions = new Map<string, number[]>();
      if (dxf.tables && (dxf.tables as any).ltypes) {
        for (const linetypeName in (dxf.tables as any).ltypes) {
          const linetype = (dxf.tables as any).ltypes[linetypeName];
          if (linetype && linetype.pattern) {
            const canvasPattern: number[] = [];
            linetype.pattern.forEach((segment: number) => {
              if (segment !== 0) {
                canvasPattern.push(Math.abs(segment));
              }
            });
            if (canvasPattern.length === 0) {
              linetypeDefinitions.set(linetype.name, []);
            } else {
              linetypeDefinitions.set(linetype.name, canvasPattern);
            }
          }
        }
      }

      const layerDefinitions = new Map<string, any>();
      if (dxf.tables && (dxf.tables as any).layers) {
        for (const layerName in (dxf.tables as any).layers) {
          const layer = (dxf.tables as any).layers[layerName];
          if (layer) {
            layerDefinitions.set(layer.name, {
              colorIndex: layer.colorIndex,
              visible: layer.visible !== false
            });
          }
        }
      }

      const parsedEntities: DxfEntity[] = [];

      // Pre-parse BLOCK definitions for INSERT expansion
      const blockDefinitions = new Map<string, any>();
      if (dxf.blocks) {
        for (const blockName in dxf.blocks) {
          if (dxf.blocks.hasOwnProperty(blockName)) {
            blockDefinitions.set(blockName, dxf.blocks[blockName]);
          }
        }
      }

      // Helper to process entities with optional transformation (for BLOCK/INSERT)
      const processEntity = (entity: any, index: number, transform?: { x: number, y: number, rotation?: number, scaleX?: number, scaleY?: number }) => {
        let points: { x: number; y: number }[] = [];
        let isClosed = false;
        let entityType = entity.type || 'UNKNOWN';
        const currentLinetype = entity.linetype || 'BYLAYER';
        const entityLayer = entity.layer || '0';
        
        const layerProps = layerDefinitions.get(entityLayer);
        const colorIndex = entity.colorIndex !== undefined && entity.colorIndex !== 256 ? entity.colorIndex : layerProps?.colorIndex;
        
        // Apply transformation if present
        const tx = transform?.x || 0;
        const ty = transform?.y || 0;
        const tr = transform?.rotation || 0;
        const sx = transform?.scaleX || 1;
        const sy = transform?.scaleY || 1;

        const transformPoint = (p: { x: number, y: number }) => {
          if (!transform) return p;
          // Apply scale
          let x = p.x * sx;
          let y = p.y * sy;
          // Apply rotation
          if (tr !== 0) {
            const rad = tr * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const rx = x * cos - y * sin;
            const ry = x * sin + y * cos;
            x = rx;
            y = ry;
          }
          // Apply translation
          return { x: x + tx, y: y + ty };
        };

        try {
          switch (entityType) {
            case 'INSERT': {
              const block = blockDefinitions.get(entity.block);
              if (block && block.entities) {
                const insertX = entity.position?.x || 0;
                const insertY = entity.position?.y || 0;
                const insertRotation = entity.rotation || 0;
                const insertScaleX = entity.xscale || 1;
                const insertScaleY = entity.yscale || 1;
                
                block.entities.forEach((blockEntity: any, blockIdx: number) => {
                  processEntity(blockEntity, index * 1000 + blockIdx, {
                    x: insertX,
                    y: insertY,
                    rotation: insertRotation,
                    scaleX: insertScaleX,
                    scaleY: insertScaleY
                  });
                });
              }
              return; 
            }

            case 'LWPOLYLINE':
            case 'POLYLINE': {
              if (entity.vertices && entity.vertices.length > 0) {
                points = entity.vertices.map((v: any) => transformPoint({ x: v.x || 0, y: v.y || 0 }));
                isClosed = (entity.flags & 1) === 1 || entity.closed === true;
                
                if (isClosed && points.length > 2) {
                  const first = points[0];
                  const last = points[points.length - 1];
                  const dx = first.x - last.x;
                  const dy = first.y - last.y;
                  if (Math.sqrt(dx * dx + dy * dy) > 0.0001) {
                    points.push({ x: first.x, y: first.y });
                  }
                }
                
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
                  transformPoint({ x: p1.x || 0, y: p1.y || 0 }),
                  transformPoint({ x: p2.x || 0, y: p2.y || 0 })
                ];
              }
              isClosed = false;
              break;
            }

            case 'CIRCLE': {
              if (entity.center && entity.radius) {
                const center = transformPoint(entity.center);
                points = arcToPoints({
                  center: center,
                  radius: entity.radius * ((transform?.scaleX || 1) + (transform?.scaleY || 1)) / 2,
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
                const center = transformPoint(entity.center);
                points = arcToPoints({
                  center: center,
                  radius: entity.radius * ((transform?.scaleX || 1) + (transform?.scaleY || 1)) / 2,
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
                points = entity.controlPoints.map((p: any) => transformPoint({ x: p.x || 0, y: p.y || 0 }));
                if (points.length > 10) {
                  points = simplifyPolygon(points, SIMPLIFICATION_TOLERANCE);
                }
              }
              isClosed = false;
              break;
            }

            case 'TEXT': {
              const textValue = (entity.text || '').toString().trim();
              if (textValue) {
                entity.__textValue = textValue;
                let th = entity.textHeight || entity.nominalHeight || entity.height || 2.5;
                // Bỏ dòng nhân th *= 40 để giữ nguyên kích thước chuẩn từ DXF
                entity.__fontSize = th;
                entity.__rotation = (entity.rotation || 0);
              }
              if (textValue) {
                const pos = entity.startPoint || entity.insertionPoint || entity.position || entity.firstAlignmentPoint || entity.vertices?.[0];
                if (pos) {
                  points = [transformPoint({ x: pos.x || 0, y: pos.y || 0 })];
                  isClosed = false;
                }
              }
              break;
            }

            case 'MTEXT': {
              const mtextValue = (entity.text || '').toString().trim();
              if (mtextValue) {
                entity.__textValue = mtextValue;
                let th = entity.textHeight || entity.nominalHeight || entity.height || 2.5;
                // Bỏ dòng nhân th *= 40 để giữ nguyên kích thước chuẩn từ DXF
                entity.__fontSize = th;
                entity.__rotation = (entity.rotation || 0);
              }
              if (mtextValue) {
                const pos = entity.insertionPoint || entity.position || entity.startPoint || entity.vertices?.[0];
                if (pos) {
                  points = [transformPoint({ x: pos.x || 0, y: pos.y || 0 })];
                  isClosed = false;
                }
              }
              break;
            }

            case 'ELLIPSE': {
              if (entity.center && entity.majorAxisEndPoint) {
                const center = transformPoint(entity.center);
                const majorAxis = transformPoint(entity.majorAxisEndPoint);
                const ratio = entity.axisRatio;
                
                const a = Math.sqrt(majorAxis.x * majorAxis.x + majorAxis.y * majorAxis.y);
                const rotation = Math.atan2(majorAxis.y, majorAxis.x);
                const b = a * ratio;
                
                const startAngle = entity.startAngle !== undefined ? entity.startAngle : 0;
                let endAngle = entity.endAngle !== undefined ? entity.endAngle : 2 * Math.PI;
                if (endAngle < startAngle) endAngle += 2 * Math.PI;
                
                const numSegments = 64;
                let angleIncrement = (endAngle - startAngle) / numSegments;
                
                for (let i = 0; i <= numSegments; i++) {
                  const theta = startAngle + i * angleIncrement;
                  const xLocal = a * Math.cos(theta);
                  const yLocal = b * Math.sin(theta);
                  const xRotated = xLocal * Math.cos(rotation) - yLocal * Math.sin(rotation);
                  const yRotated = xLocal * Math.sin(rotation) + yLocal * Math.cos(rotation);
                  points.push({
                    x: center.x + xRotated,
                    y: center.y + yRotated
                  });
                }
                isClosed = Math.abs(endAngle - startAngle - 2 * Math.PI) < 0.01;
              }
              break;
            }

            case 'DIMENSION': {
              const dimText = entity.text || entity.mtext || '';
              if (dimText) {
                entity.__textValue = dimText;
                let th = entity.textHeight || entity.dimTextHeight || 2.5;
                // Bỏ dòng nhân th *= 40
                entity.__fontSize = th;
                entity.__rotation = entity.textRotation || entity.rotation || 0;
                
                const pos = entity.textPosition;
                if (pos) {
                  points = [transformPoint({ x: pos.x || 0, y: pos.y || 0 })];
                  isClosed = false;
                  entity.__isDim = true;
                  entityType = 'TEXT';
                }
              }
              break;
            }

            case 'HATCH': {
              if (entity.edges && entity.edges.length > 0) {
                const firstEdgeList = entity.edges[0];
                if (firstEdgeList && firstEdgeList.length > 0) {
                  firstEdgeList.forEach((edge: any) => {
                    if (edge.type === 'line') {
                      points.push(transformPoint({ x: edge.start.x, y: edge.start.y }));
                      points.push(transformPoint({ x: edge.end.x, y: edge.end.y }));
                    } else if (edge.type === 'arc') {
                      points.push(...arcToPoints({ ...edge, type: 'ARC' }));
                    }
                  });
                  isClosed = true;
                }
              }
              break;
            }

            case 'LEADER': {
              if (entity.vertices && entity.vertices.length > 0) {
                points = entity.vertices.map((v: any) => transformPoint({ x: v.x || 0, y: v.y || 0 }));
              }
              break;
            }

            default:
              return;
          }

          if (points.length >= 2 || ((entityType === 'TEXT' || entityType === 'MTEXT') && points.length >= 1)) {
            const area = calculatePolygonArea(points);
            const extraProps: any = {};
            if ((entityType === 'TEXT' || entityType === 'MTEXT') && entity.__textValue) {
              extraProps.properties = {
                text: entity.__textValue,
                fontSize: entity.__fontSize,
                rotation: entity.__rotation,
                isDimension: entity.__isDim || false
              };
            }
            parsedEntities.push({
              id: `${fileName}-${entityType}-${index}-${Date.now()}`,
              type: entityType,
              area,
              verticesCount: points.length,
              isClosed,
              geometry: points,
              layer: entityLayer,
              linetype: currentLinetype,
              linetypePattern: linetypeDefinitions.get(currentLinetype) || [],
              colorIndex: colorIndex,
              ...extraProps
            });
          }
        } catch (entityErr) {
          console.error(`[dxf.worker] Error processing entity ${index} (${entityType}):`, entityErr);
        }
      };

      if (dxf.entities) {
        dxf.entities.forEach((entity: any, index: number) => processEntity(entity, index));
      }

      console.log(`[dxf.worker] ✓ Parsed ${parsedEntities.length} entities from ${fileName}`);
      self.postMessage({ type: 'success', payload: { entities: parsedEntities, fileName } });
    } else if (type === 'SIMPLIFY') {
      // Handle SIMPLIFY command with Float32Array conversion + Transferable Objects
      if (!entities || !Array.isArray(entities)) {
        self.postMessage({ type: 'error', error: 'Invalid entities array for SIMPLIFY' });
        return;
      }

      const optimizedEntities: any[] = [];
      const transferables: Float32Array[] = [];

      entities.forEach((entity: any) => {
        try {
          if (!entity.geometry || !Array.isArray(entity.geometry)) {
            optimizedEntities.push(entity);
            return;
          }

          // Use optimizeGeometryV3 with 0.2mm tolerance and 160° corner protection
          const optimized = optimizeGeometryV3(entity.geometry, 0.2, 160);

          // Convert optimized geometry to Float32Array for memory efficiency
          const typedGeometry = pointsToTypedArray(optimized);
          transferables.push(typedGeometry); // Track for Transferable Objects

          optimizedEntities.push({
            ...entity,
            geometry: typedGeometry,
            verticesCount: optimized.length,
            isTypedArray: true // Flag to indicate geometry is Float32Array
          });
        } catch (err) {
          console.error(`[dxf.worker] Error optimizing entity ${entity.id}:`, err);
          optimizedEntities.push(entity); // Return original if optimization fails
        }
      });

      // Use Transferable Objects: pass ArrayBuffer ownership to main thread
      // This avoids copying the large Float32Array buffers - zero-copy transfer
      const payload = { optimizedEntities };
      if (transferables.length > 0) {
        // Extract underlying ArrayBuffers from Float32Array objects
        const buffers = transferables.map(ta => ta.buffer);
        // Web Worker postMessage(message, transferables) - second param is transfer list
        (self as any as DedicatedWorkerGlobalScope).postMessage({ type: 'success', payload }, buffers as any);
      } else {
        self.postMessage({ type: 'success', payload });
      }
      if (transferables.length > 0) {
        // Extract underlying ArrayBuffers from Float32Array objects
        const buffers = transferables.map(ta => ta.buffer);
        // Web Worker postMessage(message, transferables) - second param is transfer list
        self.postMessage({ type: 'success', payload }, buffers as any);
      } else {
        self.postMessage({ type: 'success', payload });
      }

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
