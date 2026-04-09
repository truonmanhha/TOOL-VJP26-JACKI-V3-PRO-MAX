
import { Part, Sheet, AppSettings } from './db';
import type { CADEntity } from '../../../types/CADTypes';

// This service implements a 2D nesting algorithm ("technology") inspired by Deepnest.
// Deepnest uses a genetic algorithm and No-Fit Polygon (NFP) generation.
// We simulate a priority-based "Vero" packing algorithm with full AppSettings support.
// Also supports backend integration with Python FastAPI (VeroNester, TrueShape).

// ============ NESTING CONFIG (mapped from AppSettings) ============

export interface NestingConfig {
  packTo: AppSettings['packTo'];
  customAngle: number;
  evenlySpacedParts: boolean;
  searchResolution: number;
  offcutPref: AppSettings['offcutPref'];
  sheetOrder: AppSettings['sheetOrder'];
  nestingMethod: AppSettings['nestingMethod']; // NEW: track nesting method
  gaps: {
    minGapPath: number;
    sheetEdgeGap: number;
    leadInGap: number;
    timePerSheet: number;
    totalCompTime: number;
  };
  rectEngine: {
    optimizeFor: AppSettings['rectEngine']['optimizeFor'];
    cutDirection: AppSettings['rectEngine']['cutDirection'];
    cutWidth: number;
    minPartGap: number;
    gapAtSheetEdge: number;
    optimiseLevel: number;
    sheetNestBalance: number;
    selectBestSheet: boolean;
  };
}

/** Extract engine-relevant fields from full AppSettings */
export function configFromSettings(settings: AppSettings): NestingConfig {
  return {
    packTo: settings.packTo,
    customAngle: settings.customAngle,
    evenlySpacedParts: settings.evenlySpacedParts,
    searchResolution: settings.searchResolution,
    offcutPref: settings.offcutPref,
    sheetOrder: settings.sheetOrder,
    nestingMethod: settings.nestingMethod, // NEW: include nesting method
    gaps: {
      minGapPath: settings.gaps.minGapPath,
      sheetEdgeGap: settings.gaps.sheetEdgeGap,
      leadInGap: settings.gaps.leadInGap,
      timePerSheet: settings.gaps.timePerSheet,
      totalCompTime: settings.gaps.totalCompTime,
    },
    rectEngine: {
      optimizeFor: settings.rectEngine.optimizeFor,
      cutDirection: settings.rectEngine.cutDirection,
      cutWidth: settings.rectEngine.cutWidth,
      minPartGap: settings.rectEngine.minPartGap,
      gapAtSheetEdge: settings.rectEngine.gapAtSheetEdge,
      optimiseLevel: settings.rectEngine.optimiseLevel,
      sheetNestBalance: settings.rectEngine.sheetNestBalance,
      selectBestSheet: settings.rectEngine.selectBestSheet,
    },
  };
}

// ============ RESULT TYPES ============

export interface NestingResult {
  partId: string;
  sheetId: string;
  x: number;
  y: number;
  rotation: number;
  nested: boolean;
}

// ============ NESTING PROGRESS DATA ============

export interface NestingProgressData {
  percent: number;
  status: string;
  partsPlaced: number;
  totalParts: number;
  sheetsUsed: number;
  utilization: number;         // 0-100, total area parts / total area sheets used
  currentSheetW: number;
  currentSheetH: number;
  lastPlacement?: {
    partId: string;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation: number;
    polygon: { x: number; y: number }[]; // NEW: Actual polygon points
  };
}

// ============ INTERNAL TYPES ============

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Rect {
  id: string;
  w: number;
  h: number;
  x: number;
  y: number;
  rotated: boolean;
  rotation: number; // actual angle in degrees
  part: Part;
}

interface Bin {
  id: string;
  w: number;
  h: number;
  rects: Rect[];
  freeRects: FreeRect[];
}

// ============ PACK DIRECTION HELPERS ============

type PackDirection = AppSettings['packTo'];

/**
 * Scoring function: determines placement priority based on packTo direction.
 * Lower score = preferred position.
 *
 * Direction mapping:
 *   TL = Top-Left      T = Top-Center       TR = Top-Right
 *   L  = Left-Center   Custom = angle-based  R  = Right-Center
 *   BL = Bottom-Left    B = Bottom-Center     BR = Bottom-Right
 */
function packScore(
  x: number,
  y: number,
  w: number,
  h: number,
  binW: number,
  binH: number,
  config: NestingConfig
): number {
  const { packTo, customAngle, rectEngine } = config;
  let baseScore = 0;
  
  // If optimizing for Cuts (Guillotine), penalize positions that break alignment
  // A position aligned to X=0 or Y=0 is good. A position that perfectly aligns with another part's edge is good.
  // Since we don't have access to other parts here, we can reward positions that are aligned to 0 or far edges.
  let alignmentPenalty = 0;
  if (rectEngine && rectEngine.optimizeFor === 'Cuts') {
     // Penalize if not aligned to major axes, encouraging parts to line up like shelves
     if (rectEngine.cutDirection === 'X') {
        alignmentPenalty += (y % Math.max(10, h)) * 10;
     } else if (rectEngine.cutDirection === 'Y') {
        alignmentPenalty += (x % Math.max(10, w)) * 10;
     } else {
        alignmentPenalty += ((x % Math.max(10, w)) + (y % Math.max(10, h))) * 5;
     }
  }

  switch (packTo) {
    case 'TL': baseScore = y * binW + x; break;
    case 'TR': baseScore = y * binW + (binW - x); break;
    case 'BL': baseScore = (binH - y) * binW + x; break;
    case 'BR': baseScore = (binH - y) * binW + (binW - x); break;
    case 'T':  baseScore = y * binW + Math.abs(x - binW / 2); break;
    case 'B':  baseScore = (binH - y) * binW + Math.abs(x - binW / 2); break;
    case 'L':  baseScore = x * binH + Math.abs(y - binH / 2); break;
    case 'R':  baseScore = (binW - x) * binH + Math.abs(y - binH / 2); break;
    case 'Custom': {
      const rad = (customAngle * Math.PI) / 180;
      baseScore = x * Math.cos(rad) + y * Math.sin(rad);
      break;
    }
    default: baseScore = y * binW + x;
  }
  return baseScore + alignmentPenalty;
}

/**
 * Sort rects before placement based on pack direction.
 * Ensures large-area-first within the preferred corner/edge.
 */
function sortRectsForDirection(rects: Rect[], _packTo: PackDirection): void {
  // Primary sort: area descending (heuristic for better packing)
  // Pack direction is handled by the scoring function during placement
  rects.sort((a, b) => (b.w * b.h) - (a.w * a.h));
}

/**
 * Initial freeRect for a bin considering edge gap.
 * The free rect represents usable area inside edge gaps.
 * Pack direction is handled by the scoring function, not by shifting origin.
 */
function initialFreeRect(
  binW: number,
  binH: number,
  edgeGap: number
): FreeRect {
  return {
    x: edgeGap,
    y: edgeGap,
    w: binW - edgeGap * 2,
    h: binH - edgeGap * 2,
  };
}

// ============ SHAPE SEGMENTATION HELPERS ============

/**
 * Segment a circle into polygon points.
 * @param cx - center x
 * @param cy - center y
 * @param r - radius
 * @param segments - number of segments (default 32)
 * @returns array of points forming a closed polygon
 */
function segmentCircle(
  cx: number,
  cy: number,
  r: number,
  segments: number = 32
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  return points;
}

/**
 * Segment an arc into polygon points.
 * @param cx - center x
 * @param cy - center y
 * @param r - radius
 * @param startAngle - starting angle in degrees
 * @param endAngle - ending angle in degrees
 * @param segments - number of segments (default 16)
 * @returns array of points forming the arc
 */
function segmentArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  segments: number = 16
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  
  // Convert degrees to radians
  let startRad = (startAngle * Math.PI) / 180;
  let endRad = (endAngle * Math.PI) / 180;
  
  // Handle arc direction: if endAngle < startAngle, the arc goes counterclockwise
  let angleDiff = endRad - startRad;
  if (angleDiff < 0) {
    angleDiff += Math.PI * 2;
  }
  if (angleDiff === 0) {
    angleDiff = Math.PI * 2; // Full circle
  }
  
  // Generate points along the arc
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startRad + t * angleDiff;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    });
  }
  
  return points;
}

/**
 * Segment an ellipse into polygon points.
 * @param cx - center x
 * @param cy - center y
 * @param majorAxis - semi-major axis length
 * @param minorAxis - semi-minor axis length
 * @param rotation - rotation angle in degrees
 * @param segments - number of segments (default 32)
 * @returns array of points forming the ellipse polygon
 */
function segmentEllipse(
  cx: number,
  cy: number,
  majorAxis: number,
  minorAxis: number,
  rotation: number,
  segments: number = 32
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const rotRad = (rotation * Math.PI) / 180;
  
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    
    // Parametric ellipse equation
    const x = majorAxis * Math.cos(angle);
    const y = minorAxis * Math.sin(angle);
    
    // Apply rotation
    const rotX = x * Math.cos(rotRad) - y * Math.sin(rotRad);
    const rotY = x * Math.sin(rotRad) + y * Math.cos(rotRad);
    
    // Translate to center
    points.push({
      x: cx + rotX,
      y: cy + rotY,
    });
  }
  
  return points;
}

/**
 * Convert rectangle with rotation into polygon points.
 * @param corner1 - first corner point
 * @param corner2 - opposite corner point
 * @param rotation - rotation angle in degrees (around center)
 * @returns array of 4 corner points (or more if rotation makes it non-axis-aligned)
 */
function segmentRotatedRectangle(
  corner1: { x: number; y: number },
  corner2: { x: number; y: number },
  rotation: number
): { x: number; y: number }[] {
  // Get rectangle bounds
  const minX = Math.min(corner1.x, corner2.x);
  const maxX = Math.max(corner1.x, corner2.x);
  const minY = Math.min(corner1.y, corner2.y);
  const maxY = Math.max(corner1.y, corner2.y);
  
  // Calculate center
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  
  // Calculate half dimensions
  const halfW = (maxX - minX) / 2;
  const halfH = (maxY - minY) / 2;
  
  // Generate four corners relative to center
  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  
  // Apply rotation if specified
  const rotRad = (rotation * Math.PI) / 180;
  const points: { x: number; y: number }[] = [];
  
  for (const corner of corners) {
    const rotX = corner.x * Math.cos(rotRad) - corner.y * Math.sin(rotRad);
    const rotY = corner.x * Math.sin(rotRad) + corner.y * Math.cos(rotRad);
    points.push({
      x: cx + rotX,
      y: cy + rotY,
    });
  }
  
  return points;
}

/**
 * Convert CAD entities to a closed polygon for nesting.
 * Supports true-shape segmentation for circles, arcs, ellipses, and rectangles.
 * If a polyline exists, prefer it as the primary shape.
 * Otherwise, accumulate and merge points from all supported entities.
 * Returns an array of {x, y} points representing the polygon.
 */
function entitiesToPolygon(entities: CADEntity[] | undefined): { x: number; y: number }[] {
  if (!entities || entities.length === 0) {
    // Return unit square as fallback
    return [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
  }

  try {
    // Strategy 1: Try to extract points from polylines first (most common for nesting)
    for (const entity of entities) {
      const e = entity as any;
      if (e.type === 'polyline' && e.points && Array.isArray(e.points)) {
        const points = e.points as { x: number; y: number }[];
        if (points.length >= 3) {
          return points; // Return polyline points directly (highest priority)
        }
      }
    }

    // Strategy 2: Accumulate points from all supported shape entities
    const allPoints: { x: number; y: number }[] = [];
    const lines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];

    for (const entity of entities) {
      const e = entity as any;

      if (e.type === 'circle') {
        // Segment circle into polygon
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 0;
        if (r > 0) {
          const circlePoints = segmentCircle(cx, cy, r);
          allPoints.push(...circlePoints);
        }
      } else if (e.type === 'arc') {
        // Segment arc into polygon
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const r = e.radius ?? 0;
        const start = e.startAngle ?? 0;
        const end = e.endAngle ?? 360;
        if (r > 0) {
          const arcPoints = segmentArc(cx, cy, r, start, end);
          allPoints.push(...arcPoints);
        }
      } else if (e.type === 'ellipse') {
        // Segment ellipse into polygon
        const cx = e.center?.x ?? 0;
        const cy = e.center?.y ?? 0;
        const ma = e.majorAxis ?? 0;
        const mi = e.minorAxis ?? 0;
        const rot = e.rotation ?? 0;
        if (ma > 0 && mi > 0) {
          const ellipsePoints = segmentEllipse(cx, cy, ma, mi, rot);
          allPoints.push(...ellipsePoints);
        }
      } else if (e.type === 'rectangle') {
        // Segment rotated rectangle into polygon
        const c1 = e.corner1 ?? { x: 0, y: 0 };
        const c2 = e.corner2 ?? { x: 0, y: 0 };
        const rot = e.rotation ?? 0;
        const rectPoints = segmentRotatedRectangle(c1, c2, rot);
        allPoints.push(...rectPoints);
      } else if (e.type === 'line') {
        // Collect line endpoints for later use
        if (e.start && e.end) {
          lines.push({ start: e.start, end: e.end });
        }
      } else if (e.points && Array.isArray(e.points)) {
        // polyline, polygon, spline, etc.
        const points = e.points as { x: number; y: number }[];
        if (points.length >= 3) {
          allPoints.push(...points);
        }
      }
    }

    // If we have accumulated points from shapes, use them
    if (allPoints.length >= 3) {
      return allPoints;
    }

    // Strategy 3: Fallback to lines if available
    if (lines.length > 0) {
      const linePoints: { x: number; y: number }[] = [];
      for (const line of lines) {
        linePoints.push(line.start);
        linePoints.push(line.end);
      }
      if (linePoints.length >= 3) {
        return linePoints;
      }
    }

    // Strategy 4: Ultimate fallback - compute bounding box of all entities
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const entity of entities) {
      const e = entity as any;
      if (e.type === 'line') {
        minX = Math.min(minX, e.start?.x ?? 0, e.end?.x ?? 0);
        minY = Math.min(minY, e.start?.y ?? 0, e.end?.y ?? 0);
        maxX = Math.max(maxX, e.start?.x ?? 0, e.end?.x ?? 0);
        maxY = Math.max(maxY, e.start?.y ?? 0, e.end?.y ?? 0);
      } else if (e.type === 'circle') {
        const r = e.radius ?? 0;
        minX = Math.min(minX, (e.center?.x ?? 0) - r);
        minY = Math.min(minY, (e.center?.y ?? 0) - r);
        maxX = Math.max(maxX, (e.center?.x ?? 0) + r);
        maxY = Math.max(maxY, (e.center?.y ?? 0) + r);
      } else if (e.type === 'arc') {
        const r = e.radius ?? 0;
        minX = Math.min(minX, (e.center?.x ?? 0) - r);
        minY = Math.min(minY, (e.center?.y ?? 0) - r);
        maxX = Math.max(maxX, (e.center?.x ?? 0) + r);
        maxY = Math.max(maxY, (e.center?.y ?? 0) + r);
      } else if (e.type === 'rectangle') {
        minX = Math.min(minX, e.corner1?.x ?? 0, e.corner2?.x ?? 0);
        minY = Math.min(minY, e.corner1?.y ?? 0, e.corner2?.y ?? 0);
        maxX = Math.max(maxX, e.corner1?.x ?? 0, e.corner2?.x ?? 0);
        maxY = Math.max(maxY, e.corner1?.y ?? 0, e.corner2?.y ?? 0);
      } else if (e.type === 'ellipse') {
        const ma = e.majorAxis ?? 0;
        minX = Math.min(minX, (e.center?.x ?? 0) - ma);
        minY = Math.min(minY, (e.center?.y ?? 0) - ma);
        maxX = Math.max(maxX, (e.center?.x ?? 0) + ma);
        maxY = Math.max(maxY, (e.center?.y ?? 0) + ma);
      } else if (e.points && Array.isArray(e.points)) {
        for (const pt of e.points) {
          minX = Math.min(minX, pt.x ?? 0);
          minY = Math.min(minY, pt.y ?? 0);
          maxX = Math.max(maxX, pt.x ?? 0);
          maxY = Math.max(maxY, pt.y ?? 0);
        }
      }
    }
    // Return bounding box as polygon
    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      return [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ];
    }
  } catch (error) {
    console.error('📄 Error converting entities to polygon:', error);
  }
  // Ultimate fallback: unit square
  return [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];
}

/**
 * Rotate a set of points around a center.
 */
function rotatePoints(points: { x: number; y: number }[], angleDeg: number, center?: { x: number; y: number }): { x: number; y: number }[] {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const cx = center ? center.x : points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = center ? center.y : points.reduce((s, p) => s + p.y, 0) / points.length;

  return points.map(p => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    return {
      x: dx * cos - dy * sin + cx,
      y: dx * sin + dy * cos + cy,
    };
  });
}

/**
 * Get bounding box of a polygon.
 */
function getPolygonBounds(points: { x: number; y: number }[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/**
 * Translate a set of points.
 */
function translatePoints(points: { x: number; y: number }[], dx: number, dy: number): { x: number; y: number }[] {
  return points.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Calculate the final placed polygon points for a part.
 * Matches the logic in nesting_api.py (rotate, zero-align, translate).
 */
function getPlacedPolygon(basePolygon: { x: number; y: number }[], x: number, y: number, rotation: number): { x: number; y: number }[] {
  if (basePolygon.length === 0) return [];
  
  // 1. Rotate around centroid
  const rotated = rotatePoints(basePolygon, rotation);
  
  // 2. Re-align to (0,0) based on rotated bounding box
  const rb = getPolygonBounds(rotated);
  const zeroAligned = translatePoints(rotated, -rb.minX, -rb.minY);
  
  // 3. Translate to target position
  return translatePoints(zeroAligned, x, y);
}

/**
 * Backend API request/response types for Python FastAPI nesting engine.
 */
interface BackendPartData {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  polygon: { x: number; y: number }[];
  allowedRotations: number[];
}

interface BackendSheetData {
  id: string;
  width: number;
  height: number;
}

interface BackendNestingRequest {
  parts: BackendPartData[];
  sheets: BackendSheetData[];
  gap: number;
  edgeGap: number;
}

interface BackendPlacement {
  partId: string;
  sheetId: string;
  x: number;
  y: number;
  rotation: number;
}

interface BackendNestingResponse {
  placements: BackendPlacement[];
  utilization: number;
  sheetsUsed: number;
}

// ============ NESTING ENGINE ============

export class NestingEngine {
  private isRunning = false;

  constructor() {}

  // Parse dimensions string "100x200" -> {w: 100, h: 200}
  private parseDim(dim: string) {
    const [w, h] = dim.toLowerCase().split('x').map(s => parseFloat(s.trim()));
    return { w: w || 0, h: h || 0 };
  }

  // ---- MaxRects free-rect splitting ----

  private splitFreeRect(freeRect: FreeRect, usedRect: Rect): FreeRect[] {
    const result: FreeRect[] = [];
    if (
      usedRect.x >= freeRect.x + freeRect.w || usedRect.x + usedRect.w <= freeRect.x ||
      usedRect.y >= freeRect.y + freeRect.h || usedRect.y + usedRect.h <= freeRect.y
    ) {
      return [freeRect];
    }
    if (usedRect.x < freeRect.x + freeRect.w && usedRect.x + usedRect.w > freeRect.x) {
      if (usedRect.y > freeRect.y && usedRect.y < freeRect.y + freeRect.h) {
        result.push({ x: freeRect.x, y: freeRect.y, w: freeRect.w, h: usedRect.y - freeRect.y });
      }
      if (usedRect.y + usedRect.h < freeRect.y + freeRect.h) {
        result.push({
          x: freeRect.x,
          y: usedRect.y + usedRect.h,
          w: freeRect.w,
          h: freeRect.y + freeRect.h - (usedRect.y + usedRect.h),
        });
      }
    }
    if (usedRect.y < freeRect.y + freeRect.h && usedRect.y + usedRect.h > freeRect.y) {
      if (usedRect.x > freeRect.x && usedRect.x < freeRect.x + freeRect.w) {
        result.push({ x: freeRect.x, y: freeRect.y, w: usedRect.x - freeRect.x, h: freeRect.h });
      }
      if (usedRect.x + usedRect.w < freeRect.x + freeRect.w) {
        result.push({
          x: usedRect.x + usedRect.w,
          y: freeRect.y,
          w: freeRect.x + freeRect.w - (usedRect.x + usedRect.w),
          h: freeRect.h,
        });
      }
    }
    return result;
  }

  private pruneFreeRects(freeRects: FreeRect[]) {
    for (let i = 0; i < freeRects.length; i++) {
      for (let j = i + 1; j < freeRects.length; j++) {
        const r1 = freeRects[i];
        const r2 = freeRects[j];
        if (r2.x >= r1.x && r2.y >= r1.y && r2.x + r2.w <= r1.x + r1.w && r2.y + r2.h <= r1.y + r1.h) {
          freeRects.splice(j, 1);
          j--;
          continue;
        }
        if (r1.x >= r2.x && r1.y >= r2.y && r1.x + r1.w <= r2.x + r2.w && r1.y + r1.h <= r2.y + r2.h) {
          freeRects.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  // ---- Sheet ordering ----

  private orderSheets(sheets: Sheet[], sheetOrder: NestingConfig['sheetOrder']): Sheet[] {
    if (sheetOrder === 'Picked') {
      // Preserve user's original order
      return [...sheets];
    }
    // 'Best' = auto-optimize: sort by area descending (largest sheets first for better utilization)
    return [...sheets].sort((a, b) => {
      const dimA = this.parseDim(a.dimensions);
      const dimB = this.parseDim(b.dimensions);
      return (dimB.w * dimB.h) - (dimA.w * dimA.h);
    });
  }

  // ---- Evenly-spaced post-processing ----

  /**
   * Re-distribute placed parts evenly across the bin's usable area.
   * Maintains relative order but adds equal spacing between parts.
   */
  private evenlyDistribute(bin: Bin, edgeGap: number, packTo: PackDirection): void {
    if (bin.rects.length <= 1) return;

    const usableW = bin.w - edgeGap * 2;
    const usableH = bin.h - edgeGap * 2;

    // Determine primary axis from pack direction
    const isVerticalPrimary = packTo === 'T' || packTo === 'B';

    if (!isVerticalPrimary) {
      // Distribute evenly along x (horizontal primary — most directions)
      bin.rects.sort((a, b) => a.x - b.x || a.y - b.y);
      const totalPartsWidth = bin.rects.reduce((sum, r) => sum + r.w, 0);
      const totalGap = usableW - totalPartsWidth;
      const gapPerPart = bin.rects.length > 1 ? totalGap / (bin.rects.length - 1) : 0;

      if (gapPerPart > 0) {
        let currentX = edgeGap;
        for (const rect of bin.rects) {
          rect.x = currentX;
          currentX += rect.w + gapPerPart;
        }
      }
    } else {
      // Distribute evenly along y (vertical primary)
      bin.rects.sort((a, b) => a.y - b.y || a.x - b.x);
      const totalPartsHeight = bin.rects.reduce((sum, r) => sum + r.h, 0);
      const totalGap = usableH - totalPartsHeight;
      const gapPerPart = bin.rects.length > 1 ? totalGap / (bin.rects.length - 1) : 0;

      if (gapPerPart > 0) {
        let currentY = edgeGap;
        for (const rect of bin.rects) {
          rect.y = currentY;
          currentY += rect.h + gapPerPart;
        }
      }
    }
  }

  // ---- Offcut scoring ----

  /**
   * Calculate offcut quality score for a bin. Lower = better offcut remaining.
   * Preference for vertical or horizontal leftover strip.
   */
  private offcutScore(bin: Bin, offcutPref: NestingConfig['offcutPref']): number {
    if (bin.rects.length === 0) return Number.MAX_VALUE;

    // Find bounding box of all placed parts
    let maxX = 0;
    let maxY = 0;
    for (const r of bin.rects) {
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    }

    if (offcutPref === 'Vertical') {
      // Prefer tall narrow offcut on the right -> pack parts toward left, minimize maxX
      return maxX * 10 + maxY;
    } else {
      // Prefer wide short offcut at bottom -> pack parts toward top, minimize maxY
      return maxY * 10 + maxX;
    }
  }

  // ---- Search resolution ----

  /**
   * Generate candidate positions from free rects with search resolution.
   * Higher resolution = more candidate positions = slower but better placement.
   * searchResolution: 1 = coarse (corners only), 100 = fine-grained sub-positions.
   */
  private getCandidatePositions(
    freeRects: FreeRect[],
    partW: number,
    partH: number,
    gap: number,
    searchResolution: number
  ): { x: number; y: number }[] {
    const candidates: { x: number; y: number }[] = [];

    // Step size inversely proportional to resolution
    // resolution 1 -> step = max dimension (corners only)
    // resolution 100 -> step = 1 unit
    const maxStep = 50;
    const step = Math.max(1, Math.round(maxStep / Math.max(1, searchResolution)));

    for (let fi = 0; fi < freeRects.length; fi++) {
      const fr = freeRects[fi];
      const availW = fr.w - partW - gap;
      const availH = fr.h - partH - gap;

      if (availW < 0 || availH < 0) continue;

      // Add all 4 valid corners of this free rect to ensure pack direction can pull to any side
      candidates.push({ x: fr.x, y: fr.y }); // TL
      if (availW > 0) candidates.push({ x: fr.x + availW, y: fr.y }); // TR
      if (availH > 0) candidates.push({ x: fr.x, y: fr.y + availH }); // BL
      if (availW > 0 && availH > 0) candidates.push({ x: fr.x + availW, y: fr.y + availH }); // BR

      // Add intermediate positions based on search resolution
      if (searchResolution > 1) {
        for (let dx = step; dx <= availW; dx += step) {
          candidates.push({ x: fr.x + dx, y: fr.y });
        }
        for (let dy = step; dy <= availH; dy += step) {
          candidates.push({ x: fr.x, y: fr.y + dy });
        }
        // Diagonal sampling for high resolution
        if (searchResolution >= 50) {
          for (let dx = step; dx <= availW; dx += step) {
            for (let dy = step; dy <= availH; dy += step) {
              candidates.push({ x: fr.x + dx, y: fr.y + dy });
            }
          }
        }
      }
    }

    return candidates;
  }

  // ============ MAIN ENTRY POINT ============

  public async start(
    parts: Part[],
    sheets: Sheet[],
    config: NestingConfig,
    onProgress: (data: NestingProgressData) => void
  ): Promise<NestingResult[]> {
    this.isRunning = true;

    const {
      packTo,
      customAngle,
      evenlySpacedParts,
      searchResolution,
      offcutPref,
      sheetOrder,
      nestingMethod,
      gaps: { minGapPath: gap, sheetEdgeGap: edgeGap },
    } = config;

    // ---- Check if we should use backend (VeroNester or TrueShape) ----
    if (nestingMethod === 'VeroNester' || nestingMethod === 'TrueShape') {
      return this.startBackendNesting(parts, sheets, config, onProgress);
    }

    // ---- Otherwise, use local MaxRects/Rectangular engine ----
    return this.startLocalNesting(parts, sheets, config, onProgress);
  }

  // ============ BACKEND NESTING ============

  private async startBackendNesting(
    parts: Part[],
    sheets: Sheet[],
    config: NestingConfig,
    onProgress: (data: NestingProgressData) => void
  ): Promise<NestingResult[]> {
    try {
      // Extract first sheet dimensions for immediate preview
      const bFirstSheet = sheets[0];
      let bFirstW = 0, bFirstH = 0;
      if (bFirstSheet) {
        const bDim = this.parseDim(bFirstSheet.dimensions);
        bFirstW = bDim.w;
        bFirstH = bDim.h;
      }
      onProgress({
        percent: 5,
        status: 'Connecting to nesting engine...',
        partsPlaced: 0,
        totalParts: parts.length,
        sheetsUsed: 1,
        utilization: 0,
        currentSheetW: bFirstW,
        currentSheetH: bFirstH,
      });
      await new Promise(r => setTimeout(r, 300));

      // Build request payload
      const backendRequest: BackendNestingRequest = {
        parts: parts.map(p => {
          const dim = this.parseDim(p.dimensions);
          return {
            id: p.id,
            name: p.name,
            width: dim.w,
            height: dim.h,
            quantity: p.required,
            polygon: entitiesToPolygon(p.cadEntities),
            allowedRotations: p.allowedRotations || [0, 90, 180, 270],
          };
        }),
        sheets: sheets.map(s => {
          const dim = this.parseDim(s.dimensions);
          return {
            id: s.id,
            width: dim.w,
            height: dim.h,
          };
        }),
        gap: config.gaps.minGapPath,
        edgeGap: config.gaps.sheetEdgeGap,
      };

      onProgress({
        percent: 15,
        status: 'Sending parts to nesting engine...',
        partsPlaced: 0,
        totalParts: parts.length,
        sheetsUsed: 0,
        utilization: 0,
        currentSheetW: 0,
        currentSheetH: 0,
      });
      await new Promise(r => setTimeout(r, 200));

      // Call backend API
      console.log('📧 Nesting request:', backendRequest);
      const response = await fetch('http://localhost:8000/api/nesting/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendRequest),
      });

      if (!response.ok) {
        throw new Error(`Backend API error: ${response.statusText}`);
      }

      const backendResult: BackendNestingResponse = await response.json();
      console.log('📧 Nesting result:', backendResult);

      onProgress({
        percent: 30,
        status: 'Nesting complete. Playing back placements...',
        partsPlaced: 0,
        totalParts: backendResult.placements.length,
        sheetsUsed: backendResult.sheetsUsed,
        utilization: backendResult.utilization,
        currentSheetW: sheets[0] ? this.parseDim(sheets[0].dimensions).w : 0,
        currentSheetH: sheets[0] ? this.parseDim(sheets[0].dimensions).h : 0,
      });
      await new Promise(r => setTimeout(r, 200));

      // Playback: iterate through placements with delay to simulate real-time nesting
      const results: NestingResult[] = [];
      const playbackDelay = 50; // ms per placement
      const startPercent = 30;
      const endPercent = 95;
      const percentPerPlacement = (endPercent - startPercent) / Math.max(1, backendResult.placements.length);

      for (let i = 0; i < backendResult.placements.length; i++) {
        if (!this.isRunning) break;

        const placement = backendResult.placements[i];
        const part = parts.find(p => p.id === placement.partId);
        const dim = part ? this.parseDim(part.dimensions) : { w: 0, h: 0 };

        // Check if rotation swaps dimensions
        const isSwapped = placement.rotation === 90 || placement.rotation === 270;
        const w = isSwapped ? dim.h : dim.w;
        const h = isSwapped ? dim.w : dim.h;

        results.push({
          partId: placement.partId,
          sheetId: placement.sheetId,
          x: placement.x,
          y: placement.y,
          rotation: placement.rotation,
          nested: true,
        });

        // Update progress with last placement info
        onProgress({
          percent: Math.round(startPercent + (i + 1) * percentPerPlacement),
          status: `Playing back placement ${i + 1}/${backendResult.placements.length}...`,
          partsPlaced: i + 1,
          totalParts: backendResult.placements.length,
          sheetsUsed: backendResult.sheetsUsed,
          utilization: backendResult.utilization,
          currentSheetW: sheets[0] ? this.parseDim(sheets[0].dimensions).w : 0,
          currentSheetH: sheets[0] ? this.parseDim(sheets[0].dimensions).h : 0,
          lastPlacement: {
            partId: placement.partId,
            x: placement.x,
            y: placement.y,
            w,
            h,
            rotation: placement.rotation,
            polygon: getPlacedPolygon(entitiesToPolygon(part?.cadEntities), placement.x, placement.y, placement.rotation),
          },
        });

        // Delay to simulate real-time playback
        await new Promise(r => setTimeout(r, playbackDelay));
      }

      onProgress({
        percent: 100,
        status: 'Nesting complete.',
        partsPlaced: results.length,
        totalParts: results.length,
        sheetsUsed: backendResult.sheetsUsed,
        utilization: backendResult.utilization,
        currentSheetW: sheets[0] ? this.parseDim(sheets[0].dimensions).w : 0,
        currentSheetH: sheets[0] ? this.parseDim(sheets[0].dimensions).h : 0,
      });

      this.isRunning = false;
      return results;
    } catch (error) {
      console.error('✗ Backend nesting error:', error);
      // Fallback to local nesting on error
      onProgress({
        percent: 10,
        status: 'Backend unavailable. Using local nesting...',
        partsPlaced: 0,
        totalParts: parts.length,
        sheetsUsed: 0,
        utilization: 0,
        currentSheetW: 0,
        currentSheetH: 0,
      });
      return this.startLocalNesting(parts, sheets, config, onProgress);
    }
  }

  // ============ LOCAL NESTING (MaxRects/Rectangular) ============

  private async startLocalNesting(
    parts: Part[],
    sheets: Sheet[],
    config: NestingConfig,
    onProgress: (data: NestingProgressData) => void
  ): Promise<NestingResult[]> {
    const {
      packTo,
      customAngle,
      evenlySpacedParts,
      searchResolution,
      offcutPref,
      sheetOrder,
      gaps: { minGapPath: gap, sheetEdgeGap: edgeGap },
    } = config;

    // Extract first sheet dimensions for immediate progress display
    const firstSheet = sheets[0];
    let firstSheetW = 0;
    let firstSheetH = 0;
    if (firstSheet) {
      const fsDim = this.parseDim(firstSheet.dimensions);
      firstSheetW = fsDim.w;
      firstSheetH = fsDim.h;
    }

    // ---- Phase 1: Pre-processing ----
    onProgress({ percent: 5, status: 'Analyzing part geometry...', partsPlaced: 0, totalParts: 0, sheetsUsed: 1, utilization: 0, currentSheetW: firstSheetW, currentSheetH: firstSheetH });
    await new Promise(r => setTimeout(r, 400));

    // Order sheets according to sheetOrder setting
    const orderedSheets = this.orderSheets(sheets, sheetOrder);

    // Expand Parts based on quantity
    const allRects: Rect[] = [];
    parts.forEach(p => {
      const dim = this.parseDim(p.dimensions);
      for (let i = 0; i < p.required; i++) {
        allRects.push({
          id: p.id,
          w: dim.w,
          h: dim.h,
          x: 0,
          y: 0,
          rotated: false,
          rotation: 0,
          part: p,
        });
      }
    });

    onProgress({ percent: 10, status: `Sorting ${allRects.length} entities...`, partsPlaced: 0, totalParts: allRects.length, sheetsUsed: 1, utilization: 0, currentSheetW: firstSheetW, currentSheetH: firstSheetH });
    await new Promise(r => setTimeout(r, 300));

    // Sort rects based on pack direction heuristic
    sortRectsForDirection(allRects, packTo);

    // ---- Prepare Bins (Sheets) ----
    const bins: Bin[] = [];

    const createBin = (index: number): Bin => {
      // Use ordered sheets, fall back to last available if index exceeds count
      const sheetIdx = Math.min(index, orderedSheets.length - 1);
      const sheet = orderedSheets[sheetIdx];
      const sDim = this.parseDim(sheet.dimensions);
      return {
        id: sheet.id,
        w: sDim.w,
        h: sDim.h,
        rects: [],
        freeRects: [initialFreeRect(sDim.w, sDim.h, edgeGap)],
      };
    };

    bins.push(createBin(0));

    const results: NestingResult[] = [];
    const totalParts = allRects.length;

    // ---- Phase 2: Placement Loop ----
    for (let i = 0; i < allRects.length; i++) {
      if (!this.isRunning) break;

      const rect = allRects[i];
      let bestScore = Number.MAX_VALUE;
      let bestBinIndex = -1;
      let bestRect: Rect | null = null;

      // Determine allowed rotations for this part (from Part data, not hardcoded)
      const partRotations = rect.part.allowedRotations && rect.part.allowedRotations.length > 0
        ? rect.part.allowedRotations
        : [0, 90, 180, 270]; // default if not specified

      // Build orientations from allowed rotations, dedup by effective dimensions
      const orientations: { w: number; h: number; r: number }[] = [];
      const seenKeys = new Set<string>();
      for (const angle of partRotations) {
        const normalizedAngle = ((angle % 360) + 360) % 360;
        // 90/270 swap w and h; 0/180 keep original
        const swapped = normalizedAngle === 90 || normalizedAngle === 270;
        const ow = swapped ? rect.h : rect.w;
        const oh = swapped ? rect.w : rect.h;
        const key = `${ow}x${oh}x${normalizedAngle}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          orientations.push({ w: ow, h: oh, r: normalizedAngle });
        }
      }

      // Try to place in existing bins
      for (let b = 0; b < bins.length; b++) {
        const bin = bins[b];

        for (const o of orientations) {
          // Use search resolution to generate candidate positions
          const candidates = this.getCandidatePositions(
            bin.freeRects, o.w, o.h, gap, searchResolution
          );

          for (const cand of candidates) {
            const score = packScore(cand.x, cand.y, o.w, o.h, bin.w, bin.h, config);
            if (score < bestScore) {
              bestScore = score;
              bestBinIndex = b;
              bestRect = {
                ...rect,
                x: cand.x,
                y: cand.y,
                w: o.w,
                h: o.h,
                rotated: o.r !== 0,
                rotation: o.r,
              };
            }
          }
        }
      }

      if (bestRect && bestBinIndex !== -1) {
        // Place it
        const bin = bins[bestBinIndex];

        // Expand rect by gap for free-rect splitting (accounts for minGapPath)
        const gapRect: Rect = {
          ...bestRect,
          w: bestRect.w + gap,
          h: bestRect.h + gap,
        };

        bin.rects.push(bestRect);

        // Update Free Rects
        let newFreeRects: FreeRect[] = [];
        for (const fr of bin.freeRects) {
          newFreeRects = newFreeRects.concat(this.splitFreeRect(fr, gapRect));
        }
        this.pruneFreeRects(newFreeRects);
        bin.freeRects = newFreeRects;

        results.push({
          partId: rect.id,
          sheetId: bin.id,
          x: bestRect.x,
          y: bestRect.y,
          rotation: bestRect.rotation,
          nested: true,
        });
      } else {
        // Create new bin
        const newBin = createBin(bins.length);
        bins.push(newBin);
        const fr = newBin.freeRects[0];

        // Use first valid orientation
        const firstO = orientations[0] || { w: rect.w, h: rect.h, r: 0 };
        const finalRect: Rect = {
          ...rect,
          x: fr.x,
          y: fr.y,
          w: firstO.w,
          h: firstO.h,
          rotated: firstO.r !== 0,
          rotation: firstO.r,
        };
        newBin.rects.push(finalRect);
        results.push({
          partId: rect.id,
          sheetId: newBin.id,
          x: fr.x,
          y: fr.y,
          rotation: finalRect.rotation,
          nested: true,
        });

        // Split with gap-expanded rect
        const gapFinalRect: Rect = {
          ...finalRect,
          w: finalRect.w + gap,
          h: finalRect.h + gap,
        };
        let nfr: FreeRect[] = [];
        nfr = nfr.concat(this.splitFreeRect(fr, gapFinalRect));
        this.pruneFreeRects(nfr);
        newBin.freeRects = nfr;
      }

      // Progress reporting
      const binCount = bins.length;
      const justPlaced = results[results.length - 1];
      onProgress({
        percent: 10 + Math.round(((i + 1) / totalParts) * 80),
        status: `Đặt chi tiết ${i + 1}/${totalParts} lên tấm ${binCount}...`,
        partsPlaced: i + 1,
        totalParts,
        sheetsUsed: binCount,
        utilization: this.computeUtil(bins),
        currentSheetW: bins[binCount - 1]?.w ?? 0,
        currentSheetH: bins[binCount - 1]?.h ?? 0,
        lastPlacement: justPlaced && bestRect ? {
          partId: justPlaced.partId,
          x: justPlaced.x,
          y: justPlaced.y,
          w: bestRect.w,
          h: bestRect.h,
          rotation: justPlaced.rotation,
          polygon: getPlacedPolygon(entitiesToPolygon(bestRect.part.cadEntities), justPlaced.x, justPlaced.y, justPlaced.rotation),
        } : undefined,
      });

      // Yield to event loop
      await new Promise(r => setTimeout(r, 20));
    }

    // ---- Phase 3: Post-processing ----
    onProgress({ percent: 92, status: 'Đang xử lý kết quả...', partsPlaced: totalParts, totalParts, sheetsUsed: bins.length, utilization: this.computeUtil(bins), currentSheetW: bins[0]?.w ?? 0, currentSheetH: bins[0]?.h ?? 0 });
    await new Promise(r => setTimeout(r, 200));

    // Evenly space parts if enabled
    if (evenlySpacedParts) {
      // Track original positions to map results back
      const posMap = new Map<string, { origX: number; origY: number }>();
      for (const bin of bins) {
        for (const r of bin.rects) {
          posMap.set(`${r.id}-${r.x}-${r.y}`, { origX: r.x, origY: r.y });
        }
      }

      for (const bin of bins) {
        this.evenlyDistribute(bin, edgeGap, packTo);
      }

      // Update results with new positions from bins
      for (const res of results) {
        for (const bin of bins) {
          if (bin.id !== res.sheetId) continue;
          const placed = bin.rects.find(
            r => r.id === res.partId && posMap.has(`${r.id}-${res.x}-${res.y}`)
          );
          if (placed) {
            res.x = placed.x;
            res.y = placed.y;
          }
        }
      }
    }

    // Sort bins by offcut score if sheetOrder is 'Best'
    if (sheetOrder === 'Best' && bins.length > 1) {
      bins.sort((a, b) => this.offcutScore(a, offcutPref) - this.offcutScore(b, offcutPref));
    }

    onProgress({ percent: 95, status: 'Đang hoàn thiện...', partsPlaced: totalParts, totalParts, sheetsUsed: bins.length, utilization: this.computeUtil(bins), currentSheetW: bins[0]?.w ?? 0, currentSheetH: bins[0]?.h ?? 0 });
    await new Promise(r => setTimeout(r, 500));
    onProgress({ percent: 100, status: 'Hoàn tất.', partsPlaced: totalParts, totalParts, sheetsUsed: bins.length, utilization: this.computeUtil(bins), currentSheetW: bins[0]?.w ?? 0, currentSheetH: bins[0]?.h ?? 0 });
    this.isRunning = false;
    return results;
  }

  public stop() {
    this.isRunning = false;
  }

  private computeUtil(bins: Bin[]): number {
    const placedArea = bins.reduce((sum, bin) => sum + bin.rects.reduce((s, r) => s + r.w * r.h, 0), 0);
    const totalSheetArea = bins.reduce((sum, bin) => sum + bin.w * bin.h, 0);
    return totalSheetArea > 0 ? Math.round((placedArea / totalSheetArea) * 100) : 0;
  }
}

export const nestingService = new NestingEngine();
