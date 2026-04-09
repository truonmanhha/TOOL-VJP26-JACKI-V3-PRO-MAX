const fs = require('fs');
const file = 'components/DxfPreview.tsx';
let code = fs.readFileSync(file, 'utf8');

const newRender = `
        // Tính toán kích thước thật trên màn hình của chữ (bằng pixel)
        // Nếu file DXF có chữ cao 5mm, viewState.scale là 2, thì chữ sẽ cao 10px trên màn hình
        const actualPixelHeight = height * viewState.scale;
        
        // NẾU CHỮ QUÁ BÉ (< 2px) -> KHÔNG VẼ ĐỂ TỐI ƯU HIỆU NĂNG VÀ KHÔNG BỊ TRÌNH DUYỆT LỖI
        // NẾU CHỮ ĐỦ NHÌN (> 2px) -> VẼ BẰNG TOẠ ĐỘ TUYỆT ĐỐI CỦA TRÌNH DUYỆT
        if (actualPixelHeight >= 2) {
          ctx.save();
          
          // Lấy ma trận chuyển đổi hiện tại để biết chính xác điểm (p.x, p.y)
          // nằm ở pixel thứ mấy trên màn hình
          const matrix = ctx.getTransform();
          const screenX = matrix.a * p.x + matrix.c * p.y + matrix.e;
          const screenY = matrix.b * p.x + matrix.d * p.y + matrix.f;
          
          // Reset toàn bộ transform về gốc để vẽ bằng Pixel tĩnh của trình duyệt (bypass canvas zoom)
          ctx.resetTransform();
          ctx.translate(screenX, screenY);
          
          // Ma trận của DXF có trục Y lật ngược so với màn hình, nên góc xoay cũng phải lật lại
          ctx.rotate(-angle);
          
          // Vẽ font bằng pixel thật
          ctx.font = \`\${Math.max(actualPixelHeight, 5)}px Arial\`;
          ctx.fillStyle = entity.color || '#FFFFFF';
          ctx.textBaseline = 'bottom';
          ctx.fillText(entity.text, 0, 0);
          
          ctx.restore();
        } else if (actualPixelHeight > 0.5) {
          // Nếu chữ bé xíu nhưng vẫn hiển thị được một chấm mờ mờ, ta vẽ 1 đường gạch ngang thay thế
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          // Chiều dài giả lập của chuỗi văn bản (khoảng 0.8 * chiều cao * số ký tự)
          ctx.lineTo(entity.text.length * height * 0.8, 0);
          ctx.strokeStyle = entity.color || '#FFFFFF';
          ctx.lineWidth = height * 0.2;
          ctx.stroke();
          ctx.restore();
        }
`;

// Extract everything from `ctx.save();` up to `ctx.restore();` inside the TEXT rendering block
code = code.replace(/ctx\.save\(\);\s*ctx\.translate\(p\.x, p\.y\);\s*ctx\.rotate\(angle\);\s*ctx\.scale\(1, -1\);\s*const BIG_FONT_SIZE = 1000;\s*ctx\.font = `\${BIG_FONT_SIZE}px Arial`;\s*const scaleToRealWorld = height \/ BIG_FONT_SIZE;\s*ctx\.scale\(scaleToRealWorld, scaleToRealWorld\);\s*ctx\.fillStyle = entity\.color \|\| '#FFFFFF';\s*ctx\.textBaseline = 'bottom';\s*ctx\.fillText\(entity\.text, 0, 0\);\s*ctx\.restore\(\);/g, newRender);

code = code.replace(/ctx\.save\(\);\s*ctx\.translate\(p\.x, p\.y\);\s*ctx\.rotate\(angle\);\s*ctx\.scale\(1, -1\);\s*const BIG_FONT_SIZE = 1000;\s*ctx\.font = `\${BIG_FONT_SIZE}px Arial`;\s*const scaleToRealWorld = height \/ BIG_FONT_SIZE;\s*ctx\.scale\(scaleToRealWorld, scaleToRealWorld\);\s*ctx\.fillStyle = entity\.color \|\| '#FFFFFF';\s*ctx\.textAlign = 'center';\s*ctx\.textBaseline = 'bottom';\s*ctx\.fillText\(text, 0, 0\);\s*ctx\.restore\(\);/g, newRender.replace("ctx.textBaseline = 'bottom';", "ctx.textAlign = 'center';\n          ctx.textBaseline = 'bottom';"));

fs.writeFileSync(file, code);
console.log('Applied ultimate bypass scaling');
