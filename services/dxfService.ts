import DxfParser from "dxf-parser";
import { DXFEntityResult } from "../types";
import { WorkerManager } from "./WorkerManager";

// Singleton WorkerManager instance
let workerManager: WorkerManager | null = null;

function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    workerManager = new WorkerManager({ dxfPoolSize: 2, debug: false });
  }
  return workerManager;
}

export class DxfService {
  private parser: DxfParser;

  private snap(p: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.round(p.x * 10000) / 10000,
      y: Math.round(p.y * 10000) / 10000
    };
  }

  public async parseFile(file: File, tolerance: number = 0.5): Promise<DXFEntityResult[]> {
    const text = await file.text();
    const results: DXFEntityResult[] = [];

    console.log(`📄 File: ${file.name} - Parsing with Worker...`);

    try {
      const manager = getWorkerManager();
      const workerResult = await manager.parseDxf(text, file.name);
      
      if (!workerResult || !workerResult.entities) {
        console.warn(`⚠️ Worker returned no entities`);
        return [];
      }

      // Convert worker result to DXFEntityResult format
      workerResult.entities.forEach((entity: any) => {
        results.push({
          id: entity.id || `ENT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: entity.type,
          area: entity.area || 0,
          verticesCount: entity.verticesCount || entity.geometry?.length || 0,
          isClosed: entity.isClosed || false,
          geometry: entity.geometry || []
        });
      });

      console.log(`✨ Total entities returned: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[DxfService] Worker parsing failed, falling back to sync:', error);
      // Fallback to synchronous parsing for small files
      return this._parseSyncFallback(text, file.name, tolerance);
    }
  }

  private async _parseSyncFallback(text: string, fileName: string, tolerance: number): Promise<DXFEntityResult[]> {
    const parser = new DxfParser();
    const dxf = parser.parseSync(text);
    const results: DXFEntityResult[] = [];

    if (!dxf || !dxf.entities) return [];
    
    console.log(`📄 File: ${fileName} - Tổng entities: ${dxf.entities.length}`);

    let rawPaths: { points: { x: number, y: number }[], originalType: string }[] = [];

    dxf.entities.forEach((entity: any) => {
      switch (entity.type) {
        case "LWPOLYLINE":
        case "POLYLINE":
          if (entity.vertices && entity.vertices.length > 0) {
            let points = entity.vertices.map((v: any) => this.snap({ x: v.x, y: v.y }));
            
            // Kiểm tra xem polyline có closed không (flags bit 0, shape bit 0, hoặc closed property)
            const isClosed = (entity.flags & 1) === 1 || (entity.shape & 1) === 1 || entity.closed === true;
            
            if (isClosed && points.length > 2) {
              const closedPoints = [...points];
              if (this.dist(closedPoints[0], closedPoints[closedPoints.length - 1]) > 0.0001) {
                closedPoints.push({ x: closedPoints[0].x, y: closedPoints[0].y });
              }
              console.log(`📦 ${entity.type} CLOSED (${points.length} vertices) → Giữ nguyên polygon`);
              results.push({
                id: `POLY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: entity.type,
                area: this.calculatePolygonArea(closedPoints),
                verticesCount: closedPoints.length,
                isClosed: true,
                geometry: closedPoints
              });
            } else {
              console.log(`📂 ${entity.type} OPEN (${points.length} vertices) → rawPaths`);
              rawPaths.push({ points, originalType: entity.type });
            }
          }
          break;
        case "LINE": {
          const p1Raw = (entity.vertices && entity.vertices[0]) ? entity.vertices[0] : entity.start;
          const p2Raw = (entity.vertices && entity.vertices[1]) ? entity.vertices[1] : entity.end;
          if (p1Raw && p2Raw) {
            const p1 = this.snap({ x: p1Raw.x, y: p1Raw.y });
            const p2 = this.snap({ x: p2Raw.x, y: p2Raw.y });
            if (this.dist(p1, p2) > 0.0001) {
              console.log(`  📍 LINE: (${p1.x.toFixed(1)},${p1.y.toFixed(1)}) → (${p2.x.toFixed(1)},${p2.y.toFixed(1)})`);
              rawPaths.push({ points: [p1, p2], originalType: "LINE" });
            }
          }
          break;
        }
        case "ARC":
          const arcPoints = this.arcToPoints(entity).map(p => this.snap(p));
          if (arcPoints.length >= 2) {
            rawPaths.push({ points: arcPoints, originalType: "ARC" });
          }
          break;
        case "CIRCLE":
          const circlePoints = this.circleToPoints(entity).map(p => this.snap(p));
          results.push({
            id: `CIRCLE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: "CIRCLE",
            area: Math.PI * Math.pow(entity.radius, 2),
            verticesCount: circlePoints.length,
            isClosed: true,
            geometry: circlePoints
          });
          break;
        case "SPLINE":
          const splinePoints = this.splineToPoints(entity).map(p => this.snap(p));
          if (splinePoints.length >= 2) {
            rawPaths.push({ points: splinePoints, originalType: "SPLINE" });
          }
          break;
      }
    });

    rawPaths.forEach((path, index) => {
      const isClosed = this.isClosedPath(path.points, tolerance);
      console.log(`✅ Entity ${index + 1}: ${path.originalType} (${path.points.length} points) - Closed: ${isClosed}`);
      results.push({
        id: `ENT-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        type: path.originalType,
        area: this.calculatePolygonArea(path.points),
        verticesCount: path.points.length,
        isClosed: isClosed,
        geometry: path.points
      });
    });

    console.log(`✨ Total entities returned: ${results.length}`);

    return results;
  }

  private isClosedPath(points: { x: number, y: number }[], tolerance: number): boolean {
    if (points.length < 2) return false;
    const start = points[0];
    const end = points[points.length - 1];
    return this.dist(start, end) <= tolerance;
  }

  public smartJoin(entities: DXFEntityResult[], tolerance: number): DXFEntityResult[] {
    const pathsToProcess = entities.map(e => ({
      points: (e.geometry || []).map(p => this.snap(p)),
      originalType: e.type
    }));
    const joined = this.joinPaths(pathsToProcess, tolerance);
    return joined.map((path, index) => ({
      id: `REPAIR-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
      type: path.isAutoJoined ? "JOINED PROFILE" : path.originalType,
      area: this.calculatePolygonArea(path.points),
      verticesCount: path.points.length,
      isClosed: path.isClosed,
      geometry: path.points
    })).filter(e => e.verticesCount > 1 || e.area > 0.001);
  }

  public explode(entity: DXFEntityResult): DXFEntityResult[] {
    if (!entity.geometry || entity.geometry.length < 2) return [];
    const segments: DXFEntityResult[] = [];
    for (let i = 0; i < entity.geometry.length - 1; i++) {
      segments.push({
        id: `EXP-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        type: "LINE",
        area: 0,
        verticesCount: 2,
        isClosed: false,
        geometry: [entity.geometry[i], entity.geometry[i+1]]
      });
    }
    return segments;
  }

  private arcToPoints(entity: any): { x: number, y: number }[] {
    const center = entity.center;
    const radius = entity.radius;
    let startAngle = entity.startAngle;
    let endAngle = entity.endAngle;
    if (endAngle < startAngle) endAngle += 2 * Math.PI;
    const sweep = endAngle - startAngle;
    
    // Adaptive resolution: smooth curves even for large radii
    const segments = Math.max(32, Math.min(512, Math.floor(radius * sweep * 5)));
    
    const points: { x: number, y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + sweep * (i / segments);
      points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }
    return points;
  }

  private circleToPoints(entity: any): { x: number, y: number }[] {
    const center = entity.center;
    const radius = entity.radius;
    const segments = Math.max(64, Math.min(1024, Math.floor(radius * 30)));
    
    const points: { x: number, y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (2 * Math.PI * i) / segments;
      points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
    }
    return points;
  }

  private splineToPoints(entity: any): { x: number, y: number }[] {
    if (!entity.controlPoints || entity.controlPoints.length < 2) {
      return entity.vertices ? entity.vertices.map((v: any) => ({ x: v.x, y: v.y })) : [];
    }
    const cp = entity.controlPoints;
    const segments = Math.max(cp.length * 10, 100);
    const points: { x: number, y: number }[] = [];
    for (let i = 0; i <= segments; i++) {
      points.push(this.getSplinePoint(i / segments, cp));
    }
    return points;
  }

  private getSplinePoint(t: number, cp: any[]): { x: number, y: number } {
    const n = cp.length - 1;
    if (t <= 0) return { x: cp[0].x, y: cp[0].y };
    if (t >= 1) return { x: cp[n].x, y: cp[n].y };
    let x = 0, y = 0;
    for (let i = 0; i <= n; i++) {
      const b = this.bernstein(i, n, t);
      x += cp[i].x * b;
      y += cp[i].y * b;
    }
    return { x, y };
  }

  private bernstein(i: number, n: number, t: number): number {
    return this.comb(n, i) * Math.pow(t, i) * Math.pow(1 - t, n - i);
  }

  private comb(n: number, k: number): number {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) res = res * (n - i + 1) / i;
    return res;
  }

  private joinPaths(paths: { points: { x: number, y: number }[], originalType: string }[], tolerance: number) {
    let pool = paths.map(p => ({ ...p, isAutoJoined: false }));
    let merged = true;
    let safetyCounter = 0;
    while (merged && safetyCounter < 10000) {
      merged = false;
      safetyCounter++;
      for (let i = 0; i < pool.length; i++) {
        const p1 = pool[i].points;
        if (p1.length === 0) continue;
        const s1 = p1[0];
        const e1 = p1[p1.length - 1];
        if (this.dist(s1, e1) < 0.0001 && p1.length > 2) continue;
        for (let j = 0; j < pool.length; j++) {
          if (i === j) continue;
          const p2 = pool[j].points;
          if (p2.length === 0) continue;
          const s2 = p2[0];
          const e2 = p2[p2.length - 1];
          let combined: { x: number, y: number }[] | null = null;
          if (this.dist(e1, s2) <= tolerance) {
            combined = [...p1, ...p2.slice(1)];
          } else if (this.dist(e1, e2) <= tolerance) {
            combined = [...p1, ...[...p2].reverse().slice(1)];
          } else if (this.dist(s1, s2) <= tolerance) {
            combined = [...[...p1].reverse(), ...p2.slice(1)];
          } else if (this.dist(s1, e2) <= tolerance) {
            combined = [...p2, ...p1.slice(1)];
          }
          if (combined) {
            pool[i].points = combined;
            pool[i].isAutoJoined = true;
            pool.splice(j, 1);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
    return pool.map(p => {
      if (p.points.length < 2) return { ...p, isClosed: false, isAutoJoined: p.isAutoJoined };
      const s = p.points[0];
      const e = p.points[p.points.length - 1];
      const isClosed = this.dist(s, e) < 0.0001;
      let finalPoints = [...p.points];
      if (isClosed && p.points.length > 2 && this.dist(s, e) > 0.0001) {
        finalPoints[finalPoints.length - 1] = { x: s.x, y: s.y };
      }
      return { ...p, points: finalPoints, isClosed, isAutoJoined: p.isAutoJoined };
    });
  }

  private dist(p1: { x: number, y: number }, p2: { x: number, y: number }): number {
    if (!p1 || !p2) return Infinity;
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  }

  private calculatePolygonArea(vertices: { x: number; y: number }[]): number {
    if (vertices.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i].x * vertices[j].y;
      area -= vertices[j].x * vertices[i].y;
    }
    return Math.abs(area / 2.0);
  }
}
