const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAX/services/dxfService.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('PythonDxfService')) {
  // Thêm import
  code = "import { PythonDxfService } from '../../../services/PythonDxfService';\n" + code;
  
  // Thay thế toàn bộ body của class DxfService
  const classStart = code.indexOf('class DxfService {');
  if (classStart !== -1) {
    const beforeClass = code.slice(0, classStart);
    
    const newClass = `class DxfService {
  async importDxf(file: File): Promise<{entities: CadEntity[], boundingBox: any}> {
    try {
      console.log('Sending DXF to Python Backend...');
      const pythonEntities = await PythonDxfService.parse(file);
      
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      const cadEntities: CadEntity[] = pythonEntities.map(e => {
        const arr = e.points as Float32Array;
        for (let i = 0; i < arr.length; i += 3) {
          const x = arr[i];
          const y = arr[i+1];
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
        
        return {
          id: e.id || \`dxf-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`,
          type: 'polyline',
          // Optimize cho WebGL/Canvas: truyền thẳng mảng nhị phân
          rawPoints: arr, 
          // Empty array cho SVG để khỏi lag trình duyệt
          points: [], 
          color: e.color || '#00ff88',
          lineWidth: e.lineWidth || 1,
          layer: 'DXF',
          closed: e.closed || false
        } as unknown as CadEntity;
      });

      if (minX === Infinity) {
        minX = 0; minY = 0; maxX = 100; maxY = 100;
      }

      return {
        entities: cadEntities,
        boundingBox: { minX, minY, maxX, maxY }
      };
    } catch (error) {
      console.error('Lỗi khi import DXF via Python:', error);
      throw error;
    }
  }
}

export const dxfService = new DxfService();
`;
    
    code = beforeClass + newClass;
  }
  
  fs.writeFileSync(file, code);
  console.log('Patched DxfService');
}
