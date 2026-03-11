const fs = require('fs');

// We will use standard HTML5 Canvas 2D instead of WebGL. 
// WebGL has strict shader compilation that might fail depending on context.
// Canvas 2D is extremely robust, never black-screens, and is 1000x faster than SVG.

let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

const targetStr = `  const renderCadEntities = () => {`;
const insertIndex = code.indexOf(targetStr);

const canvasOverlayCode = `
  // === CANVAS 2D RENDERER FOR PERFORMANCE ===
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set styles
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.9;
    
    // Begin path
    ctx.beginPath();
    
    // Only draw unselected, non-active basic geometry (SVG handles the rest for interactions)
    const useCanvas = cadEntities.length > 300; // Trigger threshold
    
    if (useCanvas) {
      const activePart = parts.find(p => p.id === activePartId);
      
      for (const ent of visibleCadEntities) {
        const isSelected = selectedEntities.has(ent.id);
        const isPartActive = activePart?.cadEntities?.some((ce: any) => ce.id === ent.id || ce.properties?.originalId === ent.id);
        
        if (isSelected || isPartActive) continue; // Let SVG draw highlights
        
        if (ent.type === 'line' && ent.points.length >= 2) {
          const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
          const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        else if (ent.type === 'polyline' && ent.points.length > 1) {
          const isClosed = ent.properties?.closed;
          let pts = ent.points;
          if (!isClosed && pts.length === 4) {
             pts = [...pts, pts[0]]; // auto-close rectangle fix
          }
          const p0 = worldToScreen(pts[0].x, pts[0].y);
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < pts.length; i++) {
            const p = worldToScreen(pts[i].x, pts[i].y);
            ctx.lineTo(p.x, p.y);
          }
          if (isClosed) {
            ctx.lineTo(p0.x, p0.y);
          }
        }
        else if (ent.type === 'rect') {
          const p1 = worldToScreen(ent.points[0].x, ent.points[0].y);
          const p2 = worldToScreen(ent.points[1].x, ent.points[1].y);
          const x = Math.min(p1.x, p2.x);
          const y = Math.min(p1.y, p2.y);
          const w = Math.abs(p2.x - p1.x);
          const h = Math.abs(p2.y - p1.y);
          ctx.rect(x, y, w, h);
        }
        else if (ent.type === 'circle') {
          const center = worldToScreen(ent.points[0].x, ent.points[0].y);
          const radius = (ent.properties?.radius || 0) * pixelsPerUnit;
          // We must stroke immediately for circles as they interrupt current path in some ways
          ctx.moveTo(center.x + radius, center.y);
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        }
      }
      
      // Draw everything
      ctx.stroke();
    }
  }, [visibleCadEntities, selectedEntities, activePartId, parts, viewOffset, pixelsPerUnit, width, height]);
`;

code = code.substring(0, insertIndex) + canvasOverlayCode + '\n' + code.substring(insertIndex);

// We need to modify renderCadEntities to skip drawing what Canvas drew
const svgStart = code.indexOf('const renderCadEntities = () => {');
const lineIfStart = code.indexOf('if (ent.type === \'line\') {', svgStart);

const svgCondition = `
                const useCanvas = cadEntities.length > 300;
                const isBasicGeometry = ['line', 'polyline', 'rect', 'circle'].includes(ent.type);
                if (useCanvas && isBasicGeometry && !isSelected && !isPartActive) {
                    return null; // Canvas 2D draws this!
                }
                
                if (ent.type === 'line') {`;

code = code.substring(0, lineIfStart) + svgCondition + code.substring(lineIfStart + 26);

// Finally add the <canvas> tag
const mainReturn = code.indexOf('{renderCadEntities()}');
code = code.substring(0, mainReturn) + 
       `<canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 pointer-events-none z-10" />\n      ` + 
       code.substring(mainReturn);

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Canvas 2D patch applied");
