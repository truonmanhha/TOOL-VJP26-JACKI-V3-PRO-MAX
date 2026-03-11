const fs = require('fs');

// We need to revert the Workspace.tsx to its state before we injected WebGL2DOverlay
// because it seems WebGL is causing a black screen (likely an exception in the render loop or shader error)

let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// 1. Remove the import
code = code.replace("import { CadEntity } from '@/types';\nimport { WebGL2DOverlay } from './WebGL2DOverlay';", "import { CadEntity } from '@/types';");

// 2. Fix renderCadEntities
const svgStart = code.indexOf('const renderCadEntities = () => {');
const lineIfStart = code.indexOf('if (ent.type === \'line\') {', svgStart);

const originalRenderStart = `  const renderCadEntities = () => {
      // console.log('🎨 Rendering CAD Entities. Count:', cadEntities.length);
      const visibleEntities = visibleCadEntities;
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
                
                // NEW: Highlight if part is active in Sidebar
                const activePart = parts.find(p => p.id === activePartId);
                const isPartActive = activePart?.cadEntities?.some((ce: any) => ce.id === ent.id || ce.properties?.originalId === ent.id);
                
                const strokeColor = isPartActive ? "#22d3ee" : (isSelected ? "#00ff00" : "white");
                const strokeWidth = isPartActive ? "4" : (isSelected ? "2" : "1");
                const opacity = (isPartActive || isSelected) ? "1" : "0.9";
                const filter = isPartActive ? "url(#glow)" : "none";
                const className = isPartActive ? "animate-pulse" : "";
                
                `;

code = code.substring(0, svgStart) + originalRenderStart + code.substring(lineIfStart);

// 3. Remove the WebGL overlay tag
code = code.replace(
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
      {renderCadEntities()}`,
    `{renderCadEntities()}`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Reverted WebGL patch");

