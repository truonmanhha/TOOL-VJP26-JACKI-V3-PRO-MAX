const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/services/PythonDxfService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const pointsArray = [];\n      for (let i = 0; i < floatArray.length; i += 3) {\n        pointsArray.push({\n          x: floatArray[i],\n          y: floatArray[i + 1],\n        });\n      }',
  `// TỐI ƯU CỰC ĐỈNH: Không tạo object {x, y}. Trả thẳng Float32Array cho React.
      // GPU WebGL và Path2D đều nuốt chửng Array này siêu mượt!`
);

code = code.replace(
  'points: pointsArray,',
  'points: floatArray, // This is now a flat Float32Array [x1, y1, z1, x2, y2, z2]'
);

fs.writeFileSync(file, code);
console.log('Optimized PythonDxfService');
