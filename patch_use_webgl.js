const fs = require('fs');
let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// Import the new WebGL2DOverlay
if (!code.includes('import { WebGL2DOverlay }')) {
    code = code.replace(
        "import { CadEntity } from '@/types';",
        "import { CadEntity } from '@/types';\nimport { WebGL2DOverlay } from './WebGL2DOverlay';"
    );
}

// Find renderCadEntities and replace it for lines/polylines
// But wait, the previous code still renders SVGs. 
// For safety, let's just add the WebGL canvas as the first element inside the main container,
// and make SVG skip rendering lines if we have too many.

const renderSvgStart = code.indexOf('const renderCadEntities = () => {');
const renderSvgEnd = code.indexOf('return (', renderSvgStart);

// If we have more than 500 entities, we should skip drawing SVG lines and use WebGL
const replaceContent = `
  const renderCadEntities = () => {
      const visibleEntities = visibleCadEntities;
      // MAGIC: IF we have a huge amount of entities, we STOP rendering most of them in SVG to save CPU
      // They will be rendered by the WebGL canvas underneath.
      const useWebGL = cadEntities.length > 500;
      
      return (
         <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
             <defs>
               <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur stdDeviation="2.5" result="blur" />
                 <feComposite in="SourceGraphic" in2="blur" operator="over" />
               </filter>
             </defs>
             {visibleEntities.map(ent => {
                const isSelected = selectedEntities.has(ent.id);
                const activePart = parts.find(p => p.id === activePartId);
                const isPartActive = activePart?.cadEntities?.some((ce: any) => ce.id === ent.id || ce.properties?.originalId === ent.id);
                
                const strokeColor = isPartActive ? "#22d3ee" : (isSelected ? "#00ff00" : "white");
                const strokeWidth = isPartActive ? "4" : (isSelected ? "2" : "1");
                const opacity = (isPartActive || isSelected) ? "1" : "0.9";
                const filter = isPartActive ? "url(#glow)" : "none";
                const className = isPartActive ? "animate-pulse" : "";
                
                // PERFORMANCE HACK: If using WebGL, ONLY render selected/active entities in SVG
                // or specific types that WebGL doesn't handle well yet (like Text/Dims)
                const isBasicGeometry = ['line', 'polyline', 'rect', 'polygon', 'circle'].includes(ent.type);
                if (useWebGL && isBasicGeometry && !isSelected && !isPartActive) {
                    return null; // Let WebGL draw it!
                }
`;

code = code.substring(0, renderSvgStart) + replaceContent + code.substring(code.indexOf('if (ent.type === \'line\') {', renderSvgStart));

// Now inject the WebGL component into the return statement
code = code.replace(
    '{renderCadEntities()}',
    `{cadEntities.length > 500 && (
          <WebGL2DOverlay 
            entities={cadEntities}
            viewOffset={viewOffset}
            pixelsPerUnit={pixelsPerUnit}
            width={width}
            height={height}
            selectedEntityIds={selectedEntities}
          />
      )}
      {renderCadEntities()}`
);


fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched WebGL");
