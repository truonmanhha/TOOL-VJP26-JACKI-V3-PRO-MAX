const fs = require('fs');
const file = 'components/NestingAX/RadialMenu.tsx';
let content = fs.readFileSync(file, 'utf8');

// Thêm lệnh Cắt (Trim) và Kéo dài (Extend) vào phần Chỉnh sửa
content = content.replace(
  '{ name: "Chỉnh sửa", icon: "icon-edit", action: null, color: "#00E676", sub: [\n    { name: "Di chuyển"',
  '{ name: "Chỉnh sửa", icon: "icon-edit", action: null, color: "#00E676", sub: [\n    { name: "Cắt (Trim)", icon: "icon-trim", action: "trim", color: "#FF5252" },\n    { name: "Kéo dài (Extend)", icon: "icon-extend", action: "extend", color: "#00E676" },\n    { name: "Di chuyển"'
);

// Thay thế Pháo Hoa bằng OSNAP
content = content.replace(
  '{ name: "Pháo Hoa", icon: "icon-firework", action: "fireworks", color: "#FF6B35", sub: null },',
  '{ name: "OSNAP (Bật/Tắt)", icon: "icon-zap", action: "osnap_toggle", color: "#FFD700", sub: null },'
);

fs.writeFileSync(file, content);
