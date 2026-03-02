const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAX/Workspace.tsx';
let code = fs.readFileSync(file, 'utf8');

// Vá lỗi polyline render bằng cách thêm rawPoints support
if (!code.includes('const arr = ent.rawPoints as Float32Array;')) {
  code = code.replace(
    /const d = ent\.points\[0\]\s*\?\s*`M \${worldToScreen\(ent\.points\[0\]\.x, ent\.points\[0\]\.y\)\.x} \${worldToScreen\(ent\.points\[0\]\.x, ent\.points\[0\]\.y\)\.y}`\s*:\s*'';\n\s*const pathData = ent\.points\.slice\(1\)\.reduce\(\(acc, p\) => \{[\s\S]*?return acc \+ ` L \${screenP\.x} \${screenP\.y}`;[\s\S]*?\}, d\);/g,
    `let pathData = '';
                if (ent.rawPoints) {
                  // Dữ liệu từ Python (Float32Array [x1,y1,z1, x2,y2,z2...])
                  const arr = ent.rawPoints as Float32Array;
                  if (arr.length >= 3) {
                    const firstP = worldToScreen(arr[0], arr[1]);
                    pathData = \`M \${firstP.x} \${firstP.y}\`;
                    for (let i = 3; i < arr.length; i += 3) {
                      const p = worldToScreen(arr[i], arr[i+1]);
                      pathData += \` L \${p.x} \${p.y}\`;
                    }
                  }
                } else {
                  // Dữ liệu cũ (Array of {x,y})
                  const d = ent.points[0] ? \`M \${worldToScreen(ent.points[0].x, ent.points[0].y).x} \${worldToScreen(ent.points[0].x, ent.points[0].y).y}\` : '';
                  pathData = ent.points.slice(1).reduce((acc, p) => {
                    const screenP = worldToScreen(p.x, p.y);
                    return acc + \` L \${screenP.x} \${screenP.y}\`;
                  }, d);
                }`
  );
  fs.writeFileSync(file, code);
  console.log('Patched Workspace SVG renderer');
}
