const fs = require('fs');
let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The only things we actually need to change:
// 1. `if (e.key === 'Enter') {` to `if (e.key === 'Enter' || e.key === ' ') {`
// 2. add `e.preventDefault()` and exception
// 3. zoom ref

content = content.replace(
  /const \[mouseScreenPos, setMouseScreenPos\] = useState\(\{ x: 0, y: 0 \}\);[\s\S]*?const \[mouseWorldPos, setMouseWorldPos\] = useState\(\{ x: 0, y: 0 \}\);/g,
  `const [mouseScreenPos, setMouseScreenPos] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // === MIDDLE MOUSE DOUBLE CLICK FOR ZOOM EXTENTS (AutoCAD Style) ===
  const lastMiddleClickRef = React.useRef<number>(0);`
);

content = content.replace(
  /const handleCommandInputKeyDown = React.useCallback\(\(e: React.KeyboardEvent<HTMLInputElement>\) => \{\s*if \(e\.key === 'Enter'\) \{/g,
  `const handleCommandInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      
      if (e.key === ' ' && activeDrawTool === 'text' && drawState.step === 1) {
        setCommandInput(prev => prev + ' ');
        return;
      }
      
      // If empty and space/enter, repeat last command
      if (!commandInput.trim()) {
        if (commandHistory.length > 0) {
          setCommandInput(commandHistory[commandHistory.length - 1]);
        }
        return;
      }`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', content);
