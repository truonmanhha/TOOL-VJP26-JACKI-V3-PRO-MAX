/**
 * GEOMETRY UTILS - CAD ENGINE CORE
 * Xử lý Bulge, Arc, Spline và Vertex Snapping chuẩn AutoCAD
 */

export interface Point {
  x: number;
  y: number;
}

export class GeometryUtils {
  static readonly TOLERANCE = 0.01; // Sai số 0.01mm cho Vertex Snapping

  /**
   * 1. BULGE SOLVER: Tính toán thông số Arc từ 2 điểm và độ võng (Bulge)
   */
  static getArcDataFromBulge(p1: Point, p2: Point, bulge: number) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const L = Math.sqrt(dx * dx + dy * dy);

    if (L < this.TOLERANCE) return null;

    // Radius: R = (L/2) * (Math.abs(bulge) + 1/Math.abs(bulge)) / 2
    const r = (L / 2) * (Math.abs(bulge) + 1 / Math.abs(bulge)) / 2;

    // Khoảng cách từ dây cung tới tâm
    const h = (L / 2) * (1 - bulge * bulge) / (2 * bulge);

    // Tọa độ tâm
    const centerX = (p1.x + p2.x) / 2 - h * (dy / L);
    const centerY = (p1.y + p2.y) / 2 + h * (dx / L);

    const startAngle = Math.atan2(p1.y - centerY, p1.x - centerX);
    const endAngle = Math.atan2(p2.y - centerY, p2.x - centerX);

    return {
      center: { x: centerX, y: centerY },
      radius: r,
      startAngle,
      endAngle,
      clockwise: bulge < 0
    };
  }

  /**
   * 2. LINEARIZATION: Chia nhỏ Arc thành chuỗi điểm cho Nesting
   * Xử lý triệt để bước nhảy góc qua điểm 0
   */
  static arcToPoints(arc: any, viewScale: number = 1.0) {
    const points: Point[] = [];
    let { startAngle, endAngle, center, radius, clockwise } = arc;

    // Adaptive Resolution: Sai số dây cung (Chordal Tolerance)
    // Càng to càng nhiều điểm, càng nhỏ càng ít điểm
    let segments = 32;
    if (radius > 500) segments = 128;
    else if (radius < 10) segments = 8;

    // 🎯 XỬ LÝ BƯỚC NHẢY GÓC: Ép cung luôn đi đúng quãng đường quy định bởi Bulge
    if (clockwise && endAngle > startAngle) endAngle -= Math.PI * 2;
    if (!clockwise && endAngle < startAngle) endAngle += Math.PI * 2;

    const totalSweep = endAngle - startAngle;

    for (let i = 0; i <= segments; i++) {
      const currentAngle = startAngle + (i / segments) * totalSweep;
      points.push({
        x: center.x + radius * Math.cos(currentAngle),
        y: center.y + radius * Math.sin(currentAngle)
      });
    }
    return points;
  }

  /**
   * 3. VERTEX SNAPPING: Hút điểm đầu cuối để tạo hình kín
   */
  static snapPoints(p1: Point, p2: Point): Point {
    const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    return dist < this.TOLERANCE ? p1 : p2;
  }

  static normalizeAngle(angle: number): number {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
  }
}
