const fs = require('fs');
let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// Undo the previous patch just in case it caused issues
code = code.replace(
  `  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {
    // Only process mouse move every 16ms (~60fps) if dragging
    if (isDragging && rafMouseMoveRef.current) return;
    if (isDragging) {
      rafMouseMoveRef.current = requestAnimationFrame(() => {
        rafMouseMoveRef.current = null;
      });
    }
`,
  '  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {\n'
);

// We'll throttle wheel zoom, as that's very demanding
code = code.replace(
  '  const handleWheel = React.useCallback((e: React.WheelEvent) => {',
  `  const wheelTimeout = useRef<number | null>(null);
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    if (wheelTimeout.current) return; // simple throttle
    wheelTimeout.current = window.setTimeout(() => {
        wheelTimeout.current = null;
    }, 16); // 60fps cap
`
);


// And optimize the grid - when we zoom out far, the grid is too dense
code = code.replace(
  '  let gridSizeUnits = 100;\n  while (gridSizeUnits * pixelsPerUnit < 20 && gridSizeUnits < 1000000) {\n    gridSizeUnits *= 10;\n  }',
  `  // Adaptive grid logic
  let gridSizeUnits = 100;
  // Increase grid size dramatically when zoomed out to prevent pattern lag
  if (pixelsPerUnit < 0.1) gridSizeUnits = 10000;
  else if (pixelsPerUnit < 1) gridSizeUnits = 1000;
  else if (pixelsPerUnit < 5) gridSizeUnits = 500;
  
  while (gridSizeUnits * pixelsPerUnit < 50 && gridSizeUnits < 10000000) {
    gridSizeUnits *= 10;
  }`
);


// Culling texts even more aggressively
code = code.replace(
  'const fontSizeScreen = fontSizeWorld * pixelsPerUnit;\n                    if (fontSizeScreen < 3) return null; // Culling',
  `const fontSizeScreen = fontSizeWorld * pixelsPerUnit;
                    if (fontSizeScreen < 8) return null; // AGGRESSIVE Culling: don't render small text
                    // Hide text when zoomed out far regardless of size to maintain FPS
                    if (pixelsPerUnit < 0.5) return null;`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched mouse move and zoom and text");
