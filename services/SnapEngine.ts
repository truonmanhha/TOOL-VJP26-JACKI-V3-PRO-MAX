import { Point2D } from '../types/CADTypes';
import { CadEntity } from '../components/nesting/DrawingTools';

export type SnapType = 'endpoint' | 'midpoint' | 'center' | 'intersection' | 'nearest' | 'none';

export interface SnapResult {
    point: Point2D;
    type: SnapType;
    entityId?: string;
    distance: number;
}

export class SnapEngine {
    
    /**
     * Tìm điểm snap gần nhất từ danh sách entities
     */
    static findSnapPoint(
        entities: CadEntity[], 
        worldPos: Point2D, 
        activeSnaps: SnapType[], 
        hitThreshold: number = 20
    ): SnapResult | null {
        
        let bestSnap: SnapResult | null = null;
        let minDistance = hitThreshold;

        for (const entity of entities) {
            // Check Endpoint
            if (activeSnaps.includes('endpoint')) {
                for (const p of entity.points) {
                    const dist = this.distance(worldPos, p);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestSnap = { point: p, type: 'endpoint', entityId: entity.id, distance: dist };
                    }
                }
            }

            // Check Midpoint (for line)
            if (activeSnaps.includes('midpoint') && entity.type === 'line' && entity.points.length === 2) {
                const mid = {
                    x: (entity.points[0].x + entity.points[1].x) / 2,
                    y: (entity.points[0].y + entity.points[1].y) / 2
                };
                const dist = this.distance(worldPos, mid);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSnap = { point: mid, type: 'midpoint', entityId: entity.id, distance: dist };
                }
            }

            // Check Center (for circle/arc)
            if (activeSnaps.includes('center') && (entity.type === 'circle' || entity.type === 'arc')) {
                const center = entity.points[0]; // Giả sử point 0 là tâm
                const dist = this.distance(worldPos, center);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSnap = { point: center, type: 'center', entityId: entity.id, distance: dist };
                }
            }
        }

        return bestSnap;
    }

    static distance(p1: Point2D, p2: Point2D): number {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}
