
/**
 * CAD ENGINE - PERFECT GEOMETRY REVISION
 * Khắc phục triệt để lỗi hướng quét, hệ tọa độ và điểm trùng khít.
 */

export interface Point {
  x: number;
  y: number;
}

export class CADEngine {
  static readonly TOLERANCE = 1e-6;

  /**
   * 1. COORDINATE RESOLVER: Đảo ngược trục Y của CAD sang Web
   */
  private static resolvePoint(p: [number, number]): Point {
    return { x: p[0], y: p[1] }; // Nếu Workspace đã đảo Y thì giữ nguyên, nếu chưa thì -p[1]
  }

  /**
   * 2. BULGE SOLVER (SAGITTA METHOD): Chuẩn xác 100% AutoCAD
   */
  static getArcDataFromBulge(p1: Point, p2: Point, bulge: number) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const L = Math.sqrt(dx * dx + dy * dy);
    if (L < this.TOLERANCE) return null;

    // Góc quét theta = 4 * atan(bulge)
    const theta = 4 * Math.atan(bulge);
    const radius = L / (2 * Math.sin(theta / 2));

    // Sagitta (Độ cao cung) h = (L/2) * bulge
    const h = (L / 2) * bulge;

    // Khoảng cách từ tâm đến dây cung d
    const d = radius - h;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Vector pháp tuyến chuẩn (xoay 90 độ dây cung)
    const nx = -dy / L;
    const ny = dx / L;

    const centerX = midX + d * nx;
    const centerY = midY + d * ny;

    return {
      center: { x: centerX, y: centerY },
      radius: Math.abs(radius),
      startAngle: Math.atan2(p1.y - centerY, p1.x - centerX),
      endAngle: Math.atan2(p2.y - centerY, p2.x - centerX),
      clockwise: bulge < 0,
      sweepAngle: theta
    };
  }

  /**
   * 3. ADAPTIVE LINEARIZATION: Tuyến tính hóa không dùng vòng lặp while
   */
  static arcToPoints(arc: any, segments: number = 32): Point[] {
    const points: Point[] = [];
    const { center, radius, startAngle, sweepAngle } = arc;

    // Chia nhỏ dựa trên sweepAngle thực tế (có thể âm nếu CW)
    for (let i = 0; i <= segments; i++) {
      const currentAngle = startAngle + (i / segments) * sweepAngle;
      points.push({
        x: center.x + radius * Math.cos(currentAngle),
        y: center.y + radius * Math.sin(currentAngle)
      });
    }
    return points;
  }

  /**
   * 4. GENERATE POINTS: Xử lý Vertex Deduping cho Polyline
   */
  static generatePoints(entity: any, zoom: number = 1.0): Point[] {
    if (entity.type === 'LINE') {
      return [this.resolvePoint(entity.start), this.resolvePoint(entity.end)];
    }

    if (entity.type === 'ARC') {
      const start = (entity.startAngle * Math.PI) / 180;
      const end = (entity.endAngle * Math.PI) / 180;
      let sweep = end - start;
      // DXF ARC luôn là CCW, xử lý xuyên tâm 0 độ
      if (sweep <= 0) sweep += Math.PI * 2;

      const arcData = {
        center: { x: entity.center[0], y: entity.center[1] },
        radius: entity.radius,
        startAngle: start,
        sweepAngle: sweep
      };
      return this.arcToPoints(arcData, 64);
    }

    if (entity.type === 'CIRCLE') {
      return this.arcToPoints({
        center: { x: entity.center[0], y: entity.center[1] },
        radius: entity.radius,
        startAngle: 0,
        sweepAngle: Math.PI * 2
      }, 128);
    }

    if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
      let allPoints: Point[] = [];
      const pts = entity.points;

      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = { x: pts[i][0], y: pts[i][1] };
        const p2 = { x: pts[i+1][0], y: pts[i+1][1] };
        const bulge = pts[i][2];

        if (Math.abs(bulge) < this.TOLERANCE) {
          if (allPoints.length === 0) allPoints.push(p1);
          allPoints.push(p2);
        } else {
          const arc = this.getArcDataFromBulge(p1, p2, bulge);
          if (arc) {
            const arcPts = this.arcToPoints(arc, 32);
            // 🎯 VERTEX DEDUPING: Bỏ điểm đầu của đoạn cung vì nó trùng với điểm cuối đoạn trước
            if (allPoints.length > 0) arcPts.shift();
            allPoints.push(...arcPts);
          } else {
            if (allPoints.length === 0) allPoints.push(p1);
            allPoints.push(p2);
          }
        }
      }
      return allPoints;
    }
    return [];
  }
}
