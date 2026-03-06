const fs = require('fs');
const file = 'components/nesting/DrawingWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add OSNAP State
const osnapStateCode = `
  // OSNAP State
  const [osnapEnabled, setOsnapEnabled] = useState(true);
  const [activeSnaps, setActiveSnaps] = useState<any[]>(['endpoint', 'midpoint', 'center', 'intersection']);
  const [currentSnap, setCurrentSnap] = useState<any>(null);
`;

content = content.replace(
  '  const [currentLayerId, setCurrentLayerId] = useState<string>(\'0\');',
  '  const [currentLayerId, setCurrentLayerId] = useState<string>(\'0\');\n' + osnapStateCode
);

// Add SnapEngine import
content = content.replace(
  'import { GeometryUtils } from \'@/services/GeometryUtils\';',
  'import { GeometryUtils } from \'@/services/GeometryUtils\';\nimport { SnapEngine } from \'../../services/SnapEngine\';'
);

// Update handleMouseMove
const handleMouseMoveOriginal = `
      if (activeDrawTool) {
        setDrawState(prev => ({ ...prev, currentPos: worldPos }));
      }
`;
const handleMouseMoveNew = `
      let finalPos = worldPos;
      if (osnapEnabled && activeDrawTool) {
         const snap = SnapEngine.findSnapPoint(cadEntities, worldPos, activeSnaps, 20 / pixelsPerUnit);
         setCurrentSnap(snap);
         if (snap) {
            finalPos = snap.point;
         }
      } else {
         setCurrentSnap(null);
      }

      if (activeDrawTool) {
        setDrawState(prev => ({ ...prev, currentPos: finalPos }));
      }
`;
content = content.replace(handleMouseMoveOriginal, handleMouseMoveNew);

// Update handleDrawingClick inside handleClick
content = content.replace(
  'handleDrawingClick(worldPos, drawState);',
  'const clickPos = currentSnap && osnapEnabled ? currentSnap.point : worldPos;\n          handleDrawingClick(clickPos, drawState);'
);


// Update Render Loop to show OSNAP indicator
const renderLoopMarker = '  }, [cadEntities, width, height, worldToScreen, pixelsPerUnit, showGrid, gridSize, gridSizePx, viewOffset]);';
const renderLoopNew = `
    // Draw OSNAP indicator
    if (currentSnap && osnapEnabled) {
      const sp = worldToScreen(currentSnap.point.x, currentSnap.point.y);
      ctx.strokeStyle = '#FFD700'; // Vàng
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const size = 10;
      switch (currentSnap.type) {
        case 'endpoint':
          ctx.rect(sp.x - size/2, sp.y - size/2, size, size);
          break;
        case 'midpoint':
          ctx.moveTo(sp.x, sp.y - size/2);
          ctx.lineTo(sp.x + size/2, sp.y + size/2);
          ctx.lineTo(sp.x - size/2, sp.y + size/2);
          ctx.closePath();
          break;
        case 'center':
          ctx.arc(sp.x, sp.y, size/2, 0, Math.PI * 2);
          break;
        default:
          ctx.arc(sp.x, sp.y, size/2, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
  }, [cadEntities, width, height, worldToScreen, pixelsPerUnit, showGrid, gridSize, gridSizePx, viewOffset, currentSnap, osnapEnabled]);
`;
content = content.replace(renderLoopMarker, renderLoopNew);

// Fix hook dependencies
content = content.replace(
  '    [activeDrawTool, screenToWorld, isDragging, dragStart, dragStartView, pixelsPerUnit]',
  '    [activeDrawTool, screenToWorld, isDragging, dragStart, dragStartView, pixelsPerUnit, osnapEnabled, cadEntities, activeSnaps]'
);

fs.writeFileSync(file, content);
