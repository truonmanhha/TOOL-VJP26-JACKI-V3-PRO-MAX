const fs = require('fs');
const file = 'components/nesting/DrawingWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import ModifyEngine
content = content.replace(
  'import { SnapEngine } from \'../../services/SnapEngine\';',
  'import { SnapEngine } from \'../../services/SnapEngine\';\nimport { ModifyEngine } from \'../../services/ModifyEngine\';'
);

// Add command prompt state
content = content.replace(
  '  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(externalActiveTool || null);',
  '  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(externalActiveTool || null);\n  const [commandPrompt, setCommandPrompt] = useState<string>(\'\');'
);

// Show prompt on tool change
content = content.replace(
  '  // Reset drawing state when tool changes\n  useEffect(() => {\n    setDrawState({ step: 0, points: [], currentPos: null });\n  }, [activeDrawTool]);',
  '  // Reset drawing state when tool changes\n  useEffect(() => {\n    setDrawState({ step: 0, points: [], currentPos: null });\n    if (activeDrawTool === \'trim\') {\n        setCommandPrompt(\'Lệnh Trim: Chọn đoạn thẳng để cắt...\');\n    } else {\n        setCommandPrompt(\'\');\n    }\n  }, [activeDrawTool]);'
);

// Add Trim click handling
const clickHandlerOld = `
      if (e.button === 0) {
        if (activeDrawTool) {
          const clickPos = currentSnap && osnapEnabled ? currentSnap.point : worldPos;
          handleDrawingClick(clickPos, drawState);
          return;
`;

const clickHandlerNew = `
      if (e.button === 0) {
        if (activeDrawTool) {
          if (activeDrawTool === 'trim') {
            // Trim logic
            const hitThreshold = 10 / zoom;
            const hitEntity = [...cadEntities].reverse().find(entity => {
              if (entity.type === 'line') {
                const p1 = entity.points[0];
                const p2 = entity.points[1];
                const dist = Math.abs((p2.y - p1.y) * worldPos.x - (p2.x - p1.x) * worldPos.y + p2.x * p1.y - p2.y * p1.x) / Math.sqrt((p2.y - p1.y) ** 2 + (p2.x - p1.x) ** 2);
                
                // also check bounds
                const minX = Math.min(p1.x, p2.x) - hitThreshold;
                const maxX = Math.max(p1.x, p2.x) + hitThreshold;
                const minY = Math.min(p1.y, p2.y) - hitThreshold;
                const maxY = Math.max(p1.y, p2.y) + hitThreshold;

                return dist < hitThreshold && worldPos.x >= minX && worldPos.x <= maxX && worldPos.y >= minY && worldPos.y <= maxY;
              }
              return false; // only support trim line for now
            });

            if (hitEntity) {
               const boundaries = cadEntities.filter(e => e.id !== hitEntity.id);
               const newEntities = ModifyEngine.trimLine(hitEntity, boundaries, worldPos);
               
               // Replace hitEntity with newEntities
               setCadEntities(prev => {
                  const filtered = prev.filter(e => e.id !== hitEntity.id);
                  return [...filtered, ...newEntities];
               });
            }
            return;
          }

          const clickPos = currentSnap && osnapEnabled ? currentSnap.point : worldPos;
          handleDrawingClick(clickPos, drawState);
          return;
`;

content = content.replace(clickHandlerOld, clickHandlerNew);

// Add prompt to UI
const infoBarOld = `
      {/* Info Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800 rounded px-2 py-1">
        <div>
          Zoom: {zoom.toFixed(2)}x | Entities: {cadEntities.length} | Grid: {showGrid ? 'On' : 'Off'}
        </div>
`;

const infoBarNew = `
      {/* Info Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-800 rounded px-2 py-1">
        <div className="flex items-center gap-4">
          <span>Zoom: {zoom.toFixed(2)}x | Entities: {cadEntities.length} | Grid: {showGrid ? 'On' : 'Off'}</span>
          {commandPrompt && <span className="text-emerald-400 font-medium">{commandPrompt}</span>}
        </div>
`;

content = content.replace(infoBarOld, infoBarNew);

fs.writeFileSync(file, content);
