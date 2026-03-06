const fs = require('fs');
const file = 'components/NestingAXApp.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldCode = `    if (tool === 'redo') {
      undoManager.redo();
      return;
    }`;

const newCode = `    if (tool === 'redo') {
      undoManager.redo();
      return;
    }
    if (tool === 'osnap_toggle') {
      handleToggleSnap();
      return;
    }
    if (tool === 'layer_panel') {
      // For now just toggle a simple state or ignore, since we don't have complex UI
      console.log('Layer panel triggered');
      return;
    }
    if (tool === 'trim' || tool === 'extend' || tool === 'offset') {
      // Enable command mode in Workspace
      setActiveDrawTool(tool);
      return;
    }`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(file, content);
