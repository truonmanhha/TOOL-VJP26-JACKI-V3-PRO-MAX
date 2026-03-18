const fs = require('fs');
const file = 'components/DxfPreview.tsx';
let code = fs.readFileSync(file, 'utf8');

// The standard CAD text rendering logic that never fails and never gets too small/big:
const newRender = `
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);
        
        // Luôn lật Y để chữ không bị lộn ngược do ma trận Canvas lật
        ctx.scale(1, -1);
        
        // Bí quyết của các web CAD (giống VinaCAD):
        // Chữ trong bản vẽ thường chỉ cao 2.5 hoặc 5 đơn vị. 
        // Trình duyệt cấm vẽ font < 10px. 
        // Ta set font = 100px (an toàn), sau đó scale không gian vẽ lại tương ứng.
        const FONT_SAFE_SIZE = 100;
        const scaleFactor = height / FONT_SAFE_SIZE;
        
        ctx.scale(scaleFactor, scaleFactor);
        
        // Font nét đơn giống CAD nhất có thể
        ctx.font = \`\${FONT_SAFE_SIZE}px "Segoe UI", Arial, sans-serif\`;
        ctx.fillStyle = entity.color || '#FFFFFF';
        ctx.textBaseline = 'bottom';
        ctx.fillText(entity.text, 0, 0);
        
        ctx.restore();
`;

// Extract everything from `ctx.save();` up to `ctx.restore();` inside the TEXT rendering block
code = code.replace(/ctx\.save\(\);[\s\S]*?ctx\.restore\(\);/g, (match, offset) => {
  if (match.includes("pixelX = matrix.a") || match.includes("Math.max(pixelHeight, 14)")) {
    if (match.includes("ctx.textAlign = 'center';")) {
      return newRender.replace("ctx.textBaseline = 'bottom';", "ctx.textAlign = 'center';\n        ctx.textBaseline = 'bottom';");
    }
    return newRender;
  }
  return match;
});

fs.writeFileSync(file, code);
console.log('Applied CAD standard font scale');
