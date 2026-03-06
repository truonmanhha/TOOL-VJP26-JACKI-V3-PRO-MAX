const fs = require('fs');
const file = 'components/nesting/DrawingWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldRenderCode = `
    // Draw entities
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';

    cadEntities.forEach(entity => {
`;

const newRenderCode = `
    // Draw entities
    cadEntities.forEach(entity => {
      // Find layer
      const layer = layers.find(l => l.id === entity.layerId);
      
      // Check visibility
      if (layer && !layer.visible) return;
      
      ctx.strokeStyle = layer?.color || '#00ff88';
      ctx.lineWidth = layer?.lineWidth || 2;
      ctx.fillStyle = layer?.color ? layer.color + '1a' : 'rgba(0, 255, 136, 0.1)'; // 10% opacity
`;

content = content.replace(oldRenderCode, newRenderCode);
fs.writeFileSync(file, content);
