import { Point2D } from '../types/CADTypes';
import { CadEntity } from '../components/nesting/DrawingTools';

export class ModifyEngine {
    
    /**
     * Trim a line entity using other entities as boundaries
     */
    static trimLine(line: CadEntity, boundaries: CadEntity[], clickPos: Point2D): CadEntity[] {
        if (line.type !== 'line' || line.points.length !== 2) return [line];

        const p1 = line.points[0];
        const p2 = line.points[1];

        // Find all intersection points with boundaries
        let intersections: Point2D[] = [];
        
        for (const b of boundaries) {
            if (b.type === 'line' && b.points.length === 2) {
                const intersect = this.lineIntersection(p1, p2, b.points[0], b.points[1]);
                if (intersect) {
                    intersections.push(intersect);
                }
            }
        }

        if (intersections.length === 0) return [line]; // Cannot trim if no intersections

        // Sort intersections by distance from p1
        intersections.sort((a, b) => this.distance(p1, a) - this.distance(p1, b));

        // Create segments
        const points = [p1, ...intersections, p2];
        let segments = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            segments.push({
                start: points[i],
                end: points[i + 1],
                mid: {
                    x: (points[i].x + points[i + 1].x) / 2,
                    y: (points[i].y + points[i + 1].y) / 2
                }
            });
        }

        // Find segment closest to clickPos to remove
        let closestSegmentIdx = -1;
        let minDistance = Infinity;

        segments.forEach((seg, idx) => {
            const dist = this.distance(clickPos, seg.mid);
            if (dist < minDistance) {
                minDistance = dist;
                closestSegmentIdx = idx;
            }
        });

        if (closestSegmentIdx === -1) return [line];

        // Return remaining segments as new line entities
        const newEntities: CadEntity[] = [];
        segments.forEach((seg, idx) => {
            if (idx !== closestSegmentIdx) {
                // Ensure segment has non-zero length
                if (this.distance(seg.start, seg.end) > 0.001) {
                    newEntities.push({
                        ...line, // Copy layerId and other props
                        id: crypto.randomUUID(),
                        points: [seg.start, seg.end]
                    });
                }
            }
        });

        return newEntities;
    }

    // Helper math functions
    static distance(p1: Point2D, p2: Point2D): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }

    static lineIntersection(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): Point2D | null {
        const det = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        if (Math.abs(det) < 0.001) return null; // Parallel

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / det;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / det;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        return null;
    }
}
