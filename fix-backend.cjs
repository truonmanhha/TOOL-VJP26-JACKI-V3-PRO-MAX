const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/backend/nesting_api.py';
let code = fs.readFileSync(file, 'utf8');

// Thêm Bounding Box logic và lấy color thật
if (!code.includes('min_x, min_y, max_x, max_y')) {
  code = code.replace(
    '# Xác định thực thể có cần đóng vòng tròn không',
    `
                # Tính Bounding Box
                xs = [float(p.x) for p in points]
                ys = [float(p.y) for p in points]
                bbox = {
                    "min_x": min(xs),
                    "min_y": min(ys),
                    "max_x": max(xs),
                    "max_y": max(ys)
                }
                
                # Lấy màu thật từ layer hoặc entity
                color_hex = "#00ff88"
                if hasattr(entity, 'dxf') and hasattr(entity.dxf, 'color'):
                    # Basic ACI color mapping (giả lập 1 vài màu cơ bản của AutoCAD)
                    aci = entity.dxf.color
                    if aci == 1: color_hex = "#ff0000" # Red
                    elif aci == 2: color_hex = "#ffff00" # Yellow
                    elif aci == 3: color_hex = "#00ff00" # Green
                    elif aci == 4: color_hex = "#00ffff" # Cyan
                    elif aci == 5: color_hex = "#0000ff" # Blue
                    elif aci == 6: color_hex = "#ff00ff" # Magenta
                    elif aci == 7: color_hex = "#ffffff" # White
                
                # Xác định thực thể có cần đóng vòng tròn không`
  );
  
  code = code.replace(
    '"color": "#00ff00",',
    '"color": color_hex,\n                    "bbox": bbox,'
  );
  
  fs.writeFileSync(file, code);
  console.log('Backend updated with True Colors and Bounding Boxes');
}
