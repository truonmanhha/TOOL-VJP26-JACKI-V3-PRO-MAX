// DXF WORKER - AutoCAD Performance Style
import DxfParser from 'dxf-parser';

const parser = new DxfParser();

self.onmessage = async (e) => {
  const { fileText, fileName } = e.data;
  
  try {
    const dxf = parser.parseSync(fileText);
    if (!dxf || !dxf.entities) {
      self.postMessage({ error: "No entities found" });
      return;
    }

    const processedEntities = dxf.entities.map((entity, index) => {
      let points = [];
      let isClosed = false;

      if (entity.type === "LWPOLYLINE" || entity.type === "POLYLINE") {
        if (entity.vertices) {
          points = entity.vertices.map(v => ({ x: v.x || 0, y: v.y || 0 }));
          isClosed = (entity.flags & 1) === 1 || entity.closed === true;
        }
      } else if (entity.type === "LINE") {
        points = [
          { x: entity.start.x, y: entity.start.y },
          { x: entity.end.x, y: entity.end.y }
        ];
      } else if (entity.type === "ARC" || entity.type === "CIRCLE") {
        points = arcToPoints(entity);
        isClosed = entity.type === "CIRCLE";
      }

      if (points.length < 2) return null;

      // Fast Binary Transfer via ArrayBuffer (Zero-copy)
      const floatArray = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        floatArray[i * 3] = p.x;
        floatArray[i * 3 + 1] = p.y;
        floatArray[i * 3 + 2] = 0;
      });

      return {
        id: `ent-${index}-${Date.now()}`,
        type: entity.type,
        is_closed: isClosed,
        color: entity.color ? `#${entity.color.toString(16).padStart(6, '0')}` : "#00ff00",
        geometry_buffer: floatArray.buffer
      };
    }).filter(ent => ent !== null);

    const buffers = processedEntities.map(e => e.geometry_buffer);
    self.postMessage({ fileName, entities: processedEntities }, buffers);

      const floatArray = new Float32Array(points.length * 3);
      points.forEach((p, i) => {
        floatArray[i * 3] = p.x;
        floatArray[i * 3 + 1] = p.y;
        floatArray[i * 3 + 2] = 0;
      });

      const binaryString = String.fromCharCode(...new Uint8Array(floatArray.buffer));
      const base64 = btoa(binaryString);

      return {
        id: `ent-${index}-${Date.now()}`,
        type: entity.type,
        is_closed: isClosed,
        color: entity.color ? `#${entity.color.toString(16).padStart(6, '0')}` : "#00ff00",
        geometry_b64: base64
      };
    }).filter(ent => ent !== null);

    self.postMessage({ fileName, entities: processedEntities });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};

function arcToPoints(entity) {
  const points = [];
  const radius = entity.radius;
  const center = entity.center;
  let startAngle = entity.startAngle || 0;
  let endAngle = entity.endAngle || (Math.PI * 2);
  
  if (entity.type === 'ARC') {
    startAngle = (entity.startAngle * Math.PI) / 180;
    endAngle = (entity.endAngle * Math.PI) / 180;
  }

  if (endAngle < startAngle) endAngle += 2 * Math.PI;
  const sweep = endAngle - startAngle;
  const segments = Math.max(32, Math.min(256, Math.floor(radius * sweep * 2)));

  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + sweep * (i / segments);
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle)
    });
  }
  return points;
}
