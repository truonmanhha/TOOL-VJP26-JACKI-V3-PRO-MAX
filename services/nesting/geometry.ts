// ============================================================
// VJP26 NESTING - GEOMETRY UTILITIES
// Foundation for True Shape Nesting
// Based on computational geometry algorithms
// ============================================================

export interface Point2D {
    x: number;
    y: number;
}

export interface BoundingBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export type Polygon = Point2D[];

// ============ TYPED ARRAY OPTIMIZATION (Memory Reduction) ==============

/**
 * Convert array of Point2D objects to a flat Float32Array [x1, y1, x2, y2, ...]
 * Reduces memory usage by ~80% vs object array (32 bytes per object → 8 bytes per point)
 * @param points Array of Point2D objects
 * @returns Float32Array with interleaved x, y coordinates
 */
export function pointsToTypedArray(points: Point2D[]): Float32Array {
    const buffer = new Float32Array(points.length * 2);
    for (let i = 0; i < points.length; i++) {
        buffer[i * 2] = points[i].x;
        buffer[i * 2 + 1] = points[i].y;
    }
    return buffer;
}

/**
 * Convert flat Float32Array [x1, y1, x2, y2, ...] back to Point2D[] objects
 * Used for legacy UI compatibility when drawing or displaying coordinates
 * @param array Float32Array with interleaved coordinates
 * @returns Array of Point2D objects
 */
export function typedArrayToPoints(array: Float32Array): Point2D[] {
    const points: Point2D[] = [];
    for (let i = 0; i < array.length; i += 2) {
        points.push({
            x: array[i],
            y: array[i + 1]
        });
    }
    return points;
}

/**
 * Check if a value is a Float32Array (typed geometry)
 * @param value Value to check
 * @returns true if value is Float32Array
 */
export function isTypedArray(value: unknown): value is Float32Array {
    return value instanceof Float32Array;
}

/**
 * Normalize geometry: accepts either Point2D[] or Float32Array
 * @param geometry Point2D[] or Float32Array
 * @returns Guaranteed Point2D[] for processing
 */
export function normalizeGeometry(geometry: Point2D[] | Float32Array): Point2D[] {
    if (isTypedArray(geometry)) {
        return typedArrayToPoints(geometry);
    }
    return geometry;
}

// ============ BASIC GEOMETRY ==============

/**
 * Calculate distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
    return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

/**
 * Calculate angle between two points (radians)
 */
export function angle(p1: Point2D, p2: Point2D): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Rotate point around center by angle (degrees)
 */
export function rotatePoint(point: Point2D, center: Point2D, angleDeg: number): Point2D {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
        x: center.x + dx * cos - dy * sin,
        y: center.y + dx * sin + dy * cos
    };
}

/**
 * Translate point by delta
 */
export function translatePoint(point: Point2D, dx: number, dy: number): Point2D {
    return { x: point.x + dx, y: point.y + dy };
}

// ============ POLYGON OPERATIONS ==============

/**
 * Calculate bounding box of polygon
 */
export function getBounds(polygon: Polygon): BoundingBox {
    if (polygon.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of polygon) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }

    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Calculate polygon area using Shoelace formula
 * Positive = counter-clockwise, Negative = clockwise
 */
export function polygonArea(polygon: Polygon): number {
    const n = polygon.length;
    if (n < 3) return 0;

    let area = 0;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += polygon[i].x * polygon[j].y;
        area -= polygon[j].x * polygon[i].y;
    }

    return area / 2;
}

/**
 * Get absolute area (always positive)
 */
export function absPolygonArea(polygon: Polygon): number {
    return Math.abs(polygonArea(polygon));
}

/**
 * Calculate centroid of polygon
 */
export function polygonCentroid(polygon: Polygon): Point2D {
    const n = polygon.length;
    if (n === 0) return { x: 0, y: 0 };
    if (n === 1) return { ...polygon[0] };

    let cx = 0, cy = 0;
    let area = 0;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const cross = polygon[i].x * polygon[j].y - polygon[j].x * polygon[i].y;
        area += cross;
        cx += (polygon[i].x + polygon[j].x) * cross;
        cy += (polygon[i].y + polygon[j].y) * cross;
    }

    area *= 3;
    if (Math.abs(area) < 1e-10) {
        // Fallback to simple average
        return {
            x: polygon.reduce((sum, p) => sum + p.x, 0) / n,
            y: polygon.reduce((sum, p) => sum + p.y, 0) / n
        };
    }

    return { x: cx / area, y: cy / area };
}

/**
 * Rotate entire polygon around its centroid
 */
export function rotatePolygon(polygon: Polygon, angleDeg: number): Polygon {
    const center = polygonCentroid(polygon);
    return polygon.map(p => rotatePoint(p, center, angleDeg));
}

/**
 * Translate entire polygon
 */
export function translatePolygon(polygon: Polygon, dx: number, dy: number): Polygon {
    return polygon.map(p => ({ x: p.x + dx, y: p.y + dy }));
}

/**
 * Normalize polygon to origin (0,0)
 */
export function normalizePolygon(polygon: Polygon): Polygon {
    const bounds = getBounds(polygon);
    return translatePolygon(polygon, -bounds.minX, -bounds.minY);
}

// ============ POINT IN POLYGON ==============

/**
 * Ray casting algorithm - check if point is inside polygon
 */
export function pointInPolygon(point: Point2D, polygon: Polygon): boolean {
    const n = polygon.length;
    if (n < 3) return false;

    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        if (((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

/**
 * Check if point is on polygon edge
 */
export function pointOnPolygonEdge(point: Point2D, polygon: Polygon, tolerance: number = 0.001): boolean {
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (pointOnSegment(point, polygon[i], polygon[j], tolerance)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if point is on line segment
 */
export function pointOnSegment(point: Point2D, a: Point2D, b: Point2D, tolerance: number = 0.001): boolean {
    const len = distance(a, b);
    const d1 = distance(point, a);
    const d2 = distance(point, b);

    return Math.abs(d1 + d2 - len) < tolerance;
}

// ============ POLYGON INTERSECTIONS ==============

/**
 * Check if two polygons intersect (including touching)
 */
export function polygonsIntersect(poly1: Polygon, poly2: Polygon): boolean {
    // Check if any vertex of poly1 is inside poly2
    for (const p of poly1) {
        if (pointInPolygon(p, poly2)) return true;
    }

    // Check if any vertex of poly2 is inside poly1
    for (const p of poly2) {
        if (pointInPolygon(p, poly1)) return true;
    }

    // Check if any edges intersect
    for (let i = 0; i < poly1.length; i++) {
        const a1 = poly1[i];
        const a2 = poly1[(i + 1) % poly1.length];

        for (let j = 0; j < poly2.length; j++) {
            const b1 = poly2[j];
            const b2 = poly2[(j + 1) % poly2.length];

            if (segmentsIntersect(a1, a2, b1, b2)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Check if two line segments intersect
 */
export function segmentsIntersect(a1: Point2D, a2: Point2D, b1: Point2D, b2: Point2D): boolean {
    const d1 = direction(b1, b2, a1);
    const d2 = direction(b1, b2, a2);
    const d3 = direction(a1, a2, b1);
    const d4 = direction(a1, a2, b2);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    if (d1 === 0 && onSegment(b1, b2, a1)) return true;
    if (d2 === 0 && onSegment(b1, b2, a2)) return true;
    if (d3 === 0 && onSegment(a1, a2, b1)) return true;
    if (d4 === 0 && onSegment(a1, a2, b2)) return true;

    return false;
}

function direction(p1: Point2D, p2: Point2D, p3: Point2D): number {
    return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point2D, p2: Point2D, p: Point2D): boolean {
    return p.x >= Math.min(p1.x, p2.x) && p.x <= Math.max(p1.x, p2.x) &&
        p.y >= Math.min(p1.y, p2.y) && p.y <= Math.max(p1.y, p2.y);
}

// ============ POLYGON SIMPLIFICATION ==============

/**
 * Douglas-Peucker algorithm for polygon simplification
 */
export function simplifyPolygon(polygon: Polygon, tolerance: number): Polygon {
    if (polygon.length < 3) return [...polygon];

    const simplified = douglasPeucker(polygon, tolerance);

    // Ensure the result is still a valid polygon
    if (simplified.length < 3) return polygon;

    return simplified;
}

function douglasPeucker(points: Point2D[], tolerance: number): Point2D[] {
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
    }

    return [first, last];
}

function perpendicularDistance(point: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) return distance(point, lineStart);

    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len);

    const closest: Point2D = {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy
    };

    return distance(point, closest);
}
// ============ GEOMETRY OPTIMIZATION ==============

/**
 * Calculate angle between three points (in radians)
 * Used to detect sharp corners vs straight segments
 */
export function angleBetween(p1: Point2D, p2: Point2D, p3: Point2D): number {
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
 * Enhanced geometry optimization with corner preservation
 * Step 1: Micro-filter (remove segments < 0.01mm)
 * Step 2: Collinear Merger (merge straight segments)
 * Step 3: Douglas-Peucker with corner preservation (protect sharp angles)
 * 
 * @param points Input polygon vertices
 * @param tolerance Simplification tolerance in mm (default: 0.05 = 50 microns)
 * @param angleTolerance Angle threshold for corner preservation in degrees (default: 170)
 */
export function optimizeGeometryV2(
    points: Point2D[],
    tolerance: number = 0.05,
    angleTolerance: number = 170
): Point2D[] {
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

/**
 * Step 1: Remove segments shorter than minimum threshold
 */
function filterMicroSegments(points: Point2D[], minLength: number): Point2D[] {
    if (points.length < 3) return [...points];
    
    const filtered: Point2D[] = [];
    
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
function mergeCollinearSegments(points: Point2D[], crossProductTolerance: number): Point2D[] {
    if (points.length < 3) return [...points];
    
    const merged: Point2D[] = [];
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
    points: Point2D[],
    tolerance: number,
    angleThreshold: number
): Point2D[] {
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
    points: Point2D[],
    tolerance: number,
    isCorner: boolean[]
): Point2D[] {
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
    const result: Point2D[] = [first, last];
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
export function optimizeGeometryV3(
    points: Point2D[],
    tolerance: number = 0.2,
    angleThreshold: number = 160
): Point2D[] {
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
function aggressivePointFilter(points: Point2D[], minDistance: number): Point2D[] {
    if (points.length < 3) return [...points];
    
    const filtered: Point2D[] = [];
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
 * Optimize geometry - Default high-performance optimization
 * Alias to optimizeGeometryV3 for consistency
 * 
 * @param points Input polygon vertices
 * @param simplificationTolerance Simplification tolerance in mm (default: 0.1)
 */
export function optimizeGeometry(points: Point2D[], simplificationTolerance: number = 0.1): Point2D[] {
    // Use V3 with the provided tolerance
    return optimizeGeometryV3(points, simplificationTolerance, 160);
}

/**
 * Remove collinear points from polygon using cross product
 * High precision collinearity check
 */
export function removeCollinearPoints(points: Point2D[], tolerance: number = 0.001): Point2D[] {
    if (points.length < 3) return [...points];

    // Preserve closure: check if first and last points are the same
    const isClosed = points.length > 0 &&
        Math.abs(points[0].x - points[points.length - 1].x) < tolerance &&
        Math.abs(points[0].y - points[points.length - 1].y) < tolerance;

    const result: Point2D[] = [];
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

// ============ CONVEX HULL ==============

/**
 * Graham scan algorithm for convex hull
 */
export function convexHull(points: Point2D[]): Polygon {
    if (points.length < 3) return [...points];

    // Find lowest point
    const sorted = [...points].sort((a, b) => a.y - b.y || a.x - b.x);
    const pivot = sorted[0];

    // Sort by polar angle
    sorted.slice(1).sort((a, b) => {
        const angleA = angle(pivot, a);
        const angleB = angle(pivot, b);
        return angleA - angleB;
    });

    const hull: Point2D[] = [pivot];

    for (const point of sorted.slice(1)) {
        while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], point) <= 0) {
            hull.pop();
        }
        hull.push(point);
    }

    return hull;
}

function crossProduct(o: Point2D, a: Point2D, b: Point2D): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// ============ OFFSET / BUFFER ==============

/**
 * Simple polygon offset (for tool compensation)
 * Positive offset = expand, Negative = shrink
 */
export function offsetPolygon(polygon: Polygon, distance: number): Polygon {
    const n = polygon.length;
    if (n < 3) return polygon;

    const result: Point2D[] = [];

    for (let i = 0; i < n; i++) {
        const prev = polygon[(i - 1 + n) % n];
        const curr = polygon[i];
        const next = polygon[(i + 1) % n];

        // Calculate edge normals
        const n1 = normalize({ x: -(curr.y - prev.y), y: curr.x - prev.x });
        const n2 = normalize({ x: -(next.y - curr.y), y: next.x - curr.x });

        // Average normal (bisector direction)
        const avg = normalize({ x: n1.x + n2.x, y: n1.y + n2.y });

        // Handle sharp corners
        const cross = n1.x * n2.y - n1.y * n2.x;
        const dot = n1.x * n2.x + n1.y * n2.y;

        let factor = 1;
        if (Math.abs(1 + dot) > 0.001) {
            factor = 1 / Math.sqrt((1 + dot) / 2);
        }

        const sign = polygonArea(polygon) > 0 ? 1 : -1;

        result.push({
            x: curr.x + avg.x * distance * factor * sign,
            y: curr.y + avg.y * distance * factor * sign
        });
    }

    return result;
}

function normalize(v: Point2D): Point2D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

// ============ RECTANGLE HELPERS ==============

/**
 * Create rectangle polygon from dimensions
 */
export function createRectangle(width: number, height: number, x: number = 0, y: number = 0): Polygon {
    return [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height }
    ];
}

/**
 * Check if polygon is approximately rectangular
 */
export function isRectangular(polygon: Polygon, tolerance: number = 0.01): boolean {
    if (polygon.length !== 4) return false;

    const bounds = getBounds(polygon);
    const expectedArea = bounds.width * bounds.height;
    const actualArea = absPolygonArea(polygon);

    return Math.abs(expectedArea - actualArea) / expectedArea < tolerance;
}

export default {
    distance,
    angle,
    angleBetween,
    rotatePoint,
    translatePoint,
    getBounds,
    polygonArea,
    absPolygonArea,
    polygonCentroid,
    rotatePolygon,
    translatePolygon,
    normalizePolygon,
    pointInPolygon,
    pointOnPolygonEdge,
    polygonsIntersect,
    segmentsIntersect,
    simplifyPolygon,
    convexHull,
    offsetPolygon,
    createRectangle,
    isRectangular,
    removeCollinearPoints,
    optimizeGeometry,
    optimizeGeometryV2,
    optimizeGeometryV3,
    pointsToTypedArray,
    typedArrayToPoints,
    isTypedArray,
    normalizeGeometry
};
