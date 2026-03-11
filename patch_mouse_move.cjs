const fs = require('fs');
let code = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// Use native throttling instead of lodash
code = code.replace(
  '  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {',
  `
  const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {
    // Only process mouse move every 16ms (~60fps) if dragging
    if (isDragging && rafMouseMoveRef.current) return;
    if (isDragging) {
      rafMouseMoveRef.current = requestAnimationFrame(() => {
        rafMouseMoveRef.current = null;
      });
    }
`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', code);
console.log("Patched");
