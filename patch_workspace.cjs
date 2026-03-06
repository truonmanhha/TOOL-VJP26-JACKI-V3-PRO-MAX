const fs = require('fs');
const file = 'components/nesting/DrawingWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

const layerStateCode = `
  // Layer State
  const [layers, setLayers] = useState<any[]>([
    { id: '0', name: '0', color: '#ffffff', lineWidth: 1, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true },
    { id: 'defpoints', name: 'Defpoints', color: '#888888', lineWidth: 1, lineType: 'solid', visible: true, locked: false, frozen: false, printable: false },
    { id: 'cut', name: 'Cut', color: '#ff0000', lineWidth: 1, lineType: 'solid', visible: true, locked: false, frozen: false, printable: true }
  ]);
  const [currentLayerId, setCurrentLayerId] = useState<string>('0');
`;

content = content.replace(
  '  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(externalActiveTool || null);',
  '  const [activeDrawTool, setActiveDrawTool] = useState<string | null>(externalActiveTool || null);' + layerStateCode
);

// Add layerId: currentLayerId to new entities
content = content.replace(/id: crypto.randomUUID\(\),\n\s*type: activeDrawTool,\n\s*points: \[currentDrawState.points\[0\], worldPos\]/g, 
  "id: crypto.randomUUID(),\n              type: activeDrawTool,\n              points: [currentDrawState.points[0], worldPos],\n              layerId: currentLayerId");

content = content.replace(/id: crypto.randomUUID\(\),\n\s*type: 'circle',\n\s*points: \[center, worldPos\],\n\s*properties: \{ radius \}/g,
  "id: crypto.randomUUID(),\n              type: 'circle',\n              points: [center, worldPos],\n              properties: { radius },\n              layerId: currentLayerId");

content = content.replace(/id: crypto.randomUUID\(\),\n\s*type: 'arc',\n\s*points: \[\.\.\.currentDrawState.points, worldPos\]/g,
  "id: crypto.randomUUID(),\n              type: 'arc',\n              points: [...currentDrawState.points, worldPos],\n              layerId: currentLayerId");

content = content.replace(/id: crypto.randomUUID\(\),\n\s*type: activeDrawTool,\n\s*points: drawState.points/g,
  "id: crypto.randomUUID(),\n                type: activeDrawTool,\n                points: drawState.points,\n                layerId: currentLayerId");

fs.writeFileSync(file, content);
