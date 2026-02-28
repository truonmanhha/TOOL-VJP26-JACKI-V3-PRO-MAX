
import DxfParser from "dxf-parser";

const parser = new DxfParser();

// Helper for high-precision snapping
const snap = (p: { x: number; y: number }) => ({
  x: Math.round(p.x * 10000) / 10000,
  y: Math.round(p.y * 10000) / 10000
});

// Adaptive resolution for curves (AutoCAD style)
const getArcPoints = (entity: any) => {
  const { center, radius, startAngle, endAngle } = entity;
  let s = startAngle;
  let e = endAngle;
  if (e < s) e += 2 * Math.PI;
  const sweep = e - s;
  const segments = Math.max(32, Math.min(512, Math.floor(radius * sweep * 5)));
  
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = s + sweep * (i / segments);
    points.push(snap({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    }));
  }
  return points;
};

const getCirclePoints = (entity: any) => {
  const { center, radius } = entity;
  const segments = Math.max(64, Math.min(1024, Math.floor(radius * 30)));
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (2 * Math.PI * i) / segments;
    points.push(snap({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    }));
  }
  return points;
};

self.onmessage = async (e) => {
  const { content, fileName } = e.data;
  
  try {
    const dxf = parser.parseSync(content);
    const resultParts: any[] = [];
    
    if (!dxf || !dxf.entities) {
      self.postMessage({ success: false, error: "Invalid DXF" });
      return;
    }

    dxf.entities.forEach((entity: any, idx: number) => {
      let geometry: any[] = [];
      let isClosed = false;

      switch (entity.type) {
        case "LWPOLYLINE":
        case "POLYLINE":
          if (entity.vertices) {
            geometry = entity.vertices.map((v: any) => snap({ x: v.x, y: v.y }));
            isClosed = (entity.shape & 1) === 1 || entity.closed === true;
          }
          break;
        case "LINE":
          geometry = [snap(entity.start), snap(entity.end)];
          break;
        case "ARC":
          geometry = getArcPoints(entity);
          break;
        case "CIRCLE":
          geometry = getCirclePoints(entity);
          isClosed = true;
          break;
      }

      if (geometry.length > 0) {
        // Prepare data for GPU: Float32Array is much faster than JSON arrays
        const flatPoints = new Float32Array(geometry.length * 2);
        geometry.forEach((p, i) => {
          flatPoints[i * 2] = p.x;
          flatPoints[i * 2 + 1] = p.y;
        });

        resultParts.push({
          id: `worker-${Date.now()}-${idx}`,
          name: `${entity.type}-${idx}`,
          geometry: flatPoints, // Transferable object
          isClosed,
          type: entity.type
        });
      }
    });

    // Send back results as transferable to avoid cloning overhead
    self.postMessage({ 
      success: true, 
      parts: resultParts,
      fileName 
    });
  } catch (err: any) {
    self.postMessage({ success: false, error: err.message });
  }
};
