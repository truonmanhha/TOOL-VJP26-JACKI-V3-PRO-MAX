// ============================================================
// VJP26 NESTING - NO-FIT POLYGON (NFP) GENERATOR
// Foundation for True Shape Nesting
// Based on orbital approach (Burke et al. 2006)
// ============================================================

import {
    Point2D, Polygon, BoundingBox,
    getBounds, translatePolygon, rotatePolygon, normalizePolygon,
    polygonCentroid, pointInPolygon, polygonsIntersect, distance, absPolygonArea
} from './geometry';

export interface NFPResult {
    nfp: Polygon;               // No-Fit Polygon
    innerNFP?: Polygon;         // Inner fit polygon (for holes)
    fixed: Polygon;
    orbiting: Polygon;
    computeTime: number;
}

export interface PlacementResult {
    x: number;
    y: number;
    rotation: number;
    fitness: number;            // Higher = better placement
}

// ============ NFP GENERATION ==============

/**
 * Generate No-Fit Polygon using simplified orbiting approach
 * NFP defines the locus of positions where orbiting polygon touches fixed polygon
 */
export function generateNFP(fixed: Polygon, orbiting: Polygon): NFPResult {
    const startTime = performance.now();

    // Normalize both polygons
    const fixedNorm = normalizePolygon(fixed);
    const orbitingNorm = normalizePolygon(orbiting);

    // Get reference point of orbiting polygon (use first vertex)
    const refPoint = orbitingNorm[0];

    // Calculate NFP by tracing the boundary
    const nfpPoints: Point2D[] = [];

    // For each edge of fixed polygon
    for (let i = 0; i < fixedNorm.length; i++) {
        const fixedEdge = {
            start: fixedNorm[i],
            end: fixedNorm[(i + 1) % fixedNorm.length]
        };

        // For each edge of orbiting polygon (offset by reference)
        for (let j = 0; j < orbitingNorm.length; j++) {
            const orbitEdge = {
                start: { x: -orbitingNorm[j].x + refPoint.x, y: -orbitingNorm[j].y + refPoint.y },
                end: {
                    x: -orbitingNorm[(j + 1) % orbitingNorm.length].x + refPoint.x,
                    y: -orbitingNorm[(j + 1) % orbitingNorm.length].y + refPoint.y
                }
            };

            // Add vertices from fixed polygon offset by orbiting polygon vertices
            nfpPoints.push({
                x: fixedEdge.start.x - orbitEdge.start.x,
                y: fixedEdge.start.y - orbitEdge.start.y
            });
        }
    }

    // Simplify and order NFP points
    const nfp = computeConvexHullNFP(nfpPoints);

    return {
        nfp,
        fixed: fixedNorm,
        orbiting: orbitingNorm,
        computeTime: performance.now() - startTime
    };
}

/**
 * Simplified NFP using Minkowski sum approach (convex polygons only)
 */
export function generateNFPMinkowski(fixed: Polygon, orbiting: Polygon): Polygon {
    // Reflect orbiting polygon (negate all coordinates)
    const reflected = orbiting.map(p => ({ x: -p.x, y: -p.y }));

    // Compute Minkowski sum: fixed ⊕ (-orbiting)
    const sumPoints: Point2D[] = [];

    for (const fp of fixed) {
        for (const rp of reflected) {
            sumPoints.push({ x: fp.x + rp.x, y: fp.y + rp.y });
        }
    }

    // Return convex hull of sum points
    return computeConvexHullNFP(sumPoints);
}

/**
 * Compute convex hull using Graham scan
 */
function computeConvexHullNFP(points: Point2D[]): Polygon {
    if (points.length < 3) return points;

    // Find lowest point
    let lowest = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < points[lowest].y ||
            (points[i].y === points[lowest].y && points[i].x < points[lowest].x)) {
            lowest = i;
        }
    }

    const pivot = points[lowest];

    // Sort by polar angle
    const sorted = points.filter((_, i) => i !== lowest).sort((a, b) => {
        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
        return angleA - angleB;
    });

    const hull: Point2D[] = [pivot];

    for (const point of sorted) {
        while (hull.length > 1) {
            const cross = crossProduct(hull[hull.length - 2], hull[hull.length - 1], point);
            if (cross <= 0) hull.pop();
            else break;
        }
        hull.push(point);
    }

    return hull;
}

function crossProduct(o: Point2D, a: Point2D, b: Point2D): number {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

// ============ PLACEMENT STRATEGIES ==============

/**
 * Find all feasible placement positions within NFP boundary
 */
export function findFeasiblePlacements(
    nfp: Polygon,
    sheetBounds: BoundingBox,
    partBounds: BoundingBox,
    margin: number = 0
): Point2D[] {
    const feasible: Point2D[] = [];

    // Sample points along NFP boundary
    for (let i = 0; i < nfp.length; i++) {
        const current = nfp[i];
        const next = nfp[(i + 1) % nfp.length];

        // Sample edge
        const edgeLen = distance(current, next);
        const samples = Math.max(2, Math.ceil(edgeLen / 10)); // Sample every 10 units

        for (let s = 0; s < samples; s++) {
            const t = s / samples;
            const point: Point2D = {
                x: current.x + (next.x - current.x) * t,
                y: current.y + (next.y - current.y) * t
            };

            // Check if placement is within sheet bounds
            if (point.x + margin >= sheetBounds.minX &&
                point.y + margin >= sheetBounds.minY &&
                point.x + partBounds.width + margin <= sheetBounds.maxX &&
                point.y + partBounds.height + margin <= sheetBounds.maxY) {
                feasible.push(point);
            }
        }
    }

    return feasible;
}

/**
 * Bottom-Left Fill placement strategy
 * Place part at lowest-leftmost position that doesn't overlap
 */
export function bottomLeftPlacement(
    part: Polygon,
    placedParts: Polygon[],
    sheetBounds: BoundingBox,
    gap: number = 2,
    margin: number = 10,
    rotationSteps: number[] = [0, 90, 180, 270]
): PlacementResult | null {
    const partBounds = getBounds(part);

    let bestPlacement: PlacementResult | null = null;

    for (const rotation of rotationSteps) {
        const rotatedPart = rotation === 0 ? part : rotatePolygon(part, rotation);
        const rotatedBounds = getBounds(rotatedPart);

        // Scan from bottom to top, left to right
        const stepX = Math.max(5, rotatedBounds.width / 10);
        const stepY = Math.max(5, rotatedBounds.height / 10);

        for (let y = margin; y <= sheetBounds.height - rotatedBounds.height - margin; y += stepY) {
            for (let x = margin; x <= sheetBounds.width - rotatedBounds.width - margin; x += stepX) {
                const translated = translatePolygon(rotatedPart, x - rotatedBounds.minX, y - rotatedBounds.minY);

                // Check for overlaps with placed parts
                let overlaps = false;
                for (const placed of placedParts) {
                    // Expand placed part by gap
                    if (polygonsOverlapWithGap(translated, placed, gap)) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    const fitness = calculatePlacementFitness(x, y, rotatedBounds, sheetBounds);

                    if (!bestPlacement || fitness > bestPlacement.fitness) {
                        bestPlacement = { x, y, rotation, fitness };
                    }

                    // Bottom-left: take first valid position
                    return bestPlacement;
                }
            }
        }
    }

    return bestPlacement;
}

/**
 * Check if two polygons overlap with gap
 */
function polygonsOverlapWithGap(poly1: Polygon, poly2: Polygon, gap: number): boolean {
    const bounds1 = getBounds(poly1);
    const bounds2 = getBounds(poly2);

    // Quick bounding box check with gap
    if (bounds1.maxX + gap < bounds2.minX || bounds2.maxX + gap < bounds1.minX ||
        bounds1.maxY + gap < bounds2.minY || bounds2.maxY + gap < bounds1.minY) {
        return false;
    }

    // Detailed intersection check
    return polygonsIntersect(poly1, poly2);
}

/**
 * Calculate placement fitness score
 * Prefer bottom-left positions
 */
function calculatePlacementFitness(x: number, y: number, partBounds: BoundingBox, sheetBounds: BoundingBox): number {
    // Normalize position (0-1)
    const normX = x / sheetBounds.width;
    const normY = y / sheetBounds.height;

    // Bottom-left preference: lower is better for both x and y
    return 1000 - (normY * 500 + normX * 500);
}

// ============ GREEDY NESTING ==============

export interface NestingPiece {
    id: string;
    polygon: Polygon;
    quantity: number;
    priority: number;
    allowRotation: boolean;
    rotationSteps: number[];
}

export interface PlacedPiece {
    id: string;
    polygon: Polygon;         // Transformed polygon
    x: number;
    y: number;
    rotation: number;
    instanceIndex: number;
}

export interface NestingSheet {
    width: number;
    height: number;
    margin: number;
    gap: number;
}

export interface GreedyNestingResult {
    placedPieces: PlacedPiece[];
    unplacedPieces: { id: string; remaining: number }[];
    utilization: number;
    computeTime: number;
}

/**
 * Greedy nesting using bottom-left fill
 */
export function greedyNesting(
    pieces: NestingPiece[],
    sheet: NestingSheet,
    sortStrategy: 'AREA_DESC' | 'HEIGHT_DESC' | 'WIDTH_DESC' = 'AREA_DESC'
): GreedyNestingResult {
    const startTime = performance.now();

    const sheetBounds: BoundingBox = {
        minX: 0, minY: 0,
        maxX: sheet.width, maxY: sheet.height,
        width: sheet.width, height: sheet.height
    };

    // Create instances for each piece
    const instances: Array<{ piece: NestingPiece; instanceIndex: number }> = [];
    for (const piece of pieces) {
        for (let i = 0; i < piece.quantity; i++) {
            instances.push({ piece, instanceIndex: i });
        }
    }

    // Sort instances by strategy
    instances.sort((a, b) => {
        const areaA = absPolygonArea(a.piece.polygon);
        const areaB = absPolygonArea(b.piece.polygon);
        const boundsA = getBounds(a.piece.polygon);
        const boundsB = getBounds(b.piece.polygon);

        switch (sortStrategy) {
            case 'AREA_DESC':
                return areaB - areaA;
            case 'HEIGHT_DESC':
                return boundsB.height - boundsA.height;
            case 'WIDTH_DESC':
                return boundsB.width - boundsA.width;
            default:
                return areaB - areaA;
        }
    });

    // Also sort by priority (higher priority first)
    instances.sort((a, b) => b.piece.priority - a.piece.priority);

    const placedPieces: PlacedPiece[] = [];
    const placedPolygons: Polygon[] = [];
    const unplacedCount: Map<string, number> = new Map();

    for (const { piece, instanceIndex } of instances) {
        const rotationSteps = piece.allowRotation ? piece.rotationSteps : [0];

        const placement = bottomLeftPlacement(
            piece.polygon,
            placedPolygons,
            sheetBounds,
            sheet.gap,
            sheet.margin,
            rotationSteps
        );

        if (placement) {
            const rotated = placement.rotation === 0 ? piece.polygon : rotatePolygon(piece.polygon, placement.rotation);
            const bounds = getBounds(rotated);
            const translated = translatePolygon(rotated, placement.x - bounds.minX, placement.y - bounds.minY);

            placedPieces.push({
                id: piece.id,
                polygon: translated,
                x: placement.x,
                y: placement.y,
                rotation: placement.rotation,
                instanceIndex
            });

            placedPolygons.push(translated);
        } else {
            const current = unplacedCount.get(piece.id) || 0;
            unplacedCount.set(piece.id, current + 1);
        }
    }

    // Calculate utilization
    const totalPartArea = placedPolygons.reduce((sum, p) => sum + absPolygonArea(p), 0);
    const sheetArea = sheet.width * sheet.height;
    const utilization = (totalPartArea / sheetArea) * 100;

    const unplacedPieces = Array.from(unplacedCount.entries()).map(([id, remaining]) => ({ id, remaining }));

    return {
        placedPieces,
        unplacedPieces,
        utilization,
        computeTime: performance.now() - startTime
    };
}

export default {
    generateNFP,
    generateNFPMinkowski,
    findFeasiblePlacements,
    bottomLeftPlacement,
    greedyNesting
};
