const fs = require('fs');

let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// 1. Re-apply the zoom ref fix
content = content.replace(
  /const \[mouseScreenPos, setMouseScreenPos\] = useState\(\{ x: 0, y: 0 \}\);[\s\S]*?const \[mouseWorldPos, setMouseWorldPos\] = useState\(\{ x: 0, y: 0 \}\);/g,
  `const [mouseScreenPos, setMouseScreenPos] = useState({ x: 0, y: 0 });
  const [mouseWorldPos, setMouseWorldPos] = useState({ x: 0, y: 0 });

  // === MIDDLE MOUSE DOUBLE CLICK FOR ZOOM EXTENTS (AutoCAD Style) ===
  const lastMiddleClickRef = React.useRef<number>(0);`
);

// 2. Re-apply the Spacebar logic but LEAVE the UI ALONE
content = content.replace(
  /const handleCommandInputKeyDown = React.useCallback\(\(e: React.KeyboardEvent<HTMLInputElement>\) => {[\s\S]*?if \(e\.key === 'Enter'\) {[\s\S]*?const input = commandInput\.trim\(\);[\s\S]*?if \(!input\) return;[\s\S]*?console\.log\('📝 Command input:', input, 'DrawState:', drawState, 'Tool:', activeDrawTool\);[\s\S]*?\/\/ Add to history[\s\S]*?setCommandHistory\(prev => \[\.\.\.prev\.slice\(-19\), input\]\);/g,
  `const handleCommandInputKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    
  // In AutoCAD/VinaCAD, Spacebar acts exactly like Enter for commands
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault(); // Stop space from typing a space character
    
    // EXCEPTION: Allow space if we are actually typing text content onto the drawing
    if (e.key === ' ' && activeDrawTool === 'text' && drawState.step === 1) {
       setCommandInput(prev => prev + ' ');
       return;
    }

    const input = commandInput.trim();
    if (!input) {
      // If empty and space/enter, repeat last command (like AutoCAD)
      if (commandHistory.length > 0) {
        const lastCmd = commandHistory[commandHistory.length - 1];
        setCommandInput(lastCmd);
      }
      return;
    }

    console.log('📝 Command input executed:', input, 'Tool:', activeDrawTool);
    setCommandHistory(prev => [...prev.slice(-19), input]);

    // 1. Check if it's a Tool Shortcut (like 'L' for line, 'C' for circle)
    const upperInput = input.toUpperCase();
    const COMMAND_SHORTCUTS: Record<string, string> = {
        'L': 'line', 'C': 'circle', 'A': 'arc', 'PL': 'polyline', 'REC': 'rect', 'POL': 'polygon', 'EL': 'ellipse',
        'M': 'move', 'CO': 'copy', 'MI': 'mirror', 'RO': 'rotate', 'SC': 'scale',
        'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',
        'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',
      };
    const shortcutTool = COMMAND_SHORTCUTS[upperInput];
    
    // If not in middle of writing text, execute the tool shortcut
    if (shortcutTool && !(activeDrawTool === 'text' && drawState.step === 1)) {
        console.log('⌨️ Command shortcut activated:', input, '→', shortcutTool);
        if (onSelectTool) onSelectTool(shortcutTool);
        setCommandInput('');
        return;
    }
    
    // 2. If it is NOT a known tool, and NOT a coordinate/number for an active tool -> CLEAR IT
    // This handles the case where user types gibberish and hits space
    if (!activeDrawTool && !shortcutTool) {
        console.log('⚠️ Unknown command:', input);
        setCommandInput('');
        return;
    }`
);

// We need to also fix the "const shortcutTool = COMMAND_SHORTCUTS[input.toUpperCase()];" redeclaration lower in the file
content = content.replace(
  /const COMMAND_SHORTCUTS: Record<string, string> = {[\s\S]*?'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',[\s\S]*?'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',[\s\S]*?};[\s\S]*?const shortcutTool = COMMAND_SHORTCUTS\[input\.toUpperCase\(\)\];[\s\S]*?if \(shortcutTool && onSelectTool\) {[\s\S]*?console\.log\('⌨️ Command shortcut:', input, '→', shortcutTool\);[\s\S]*?onSelectTool\(shortcutTool\);/g,
  `const localShortcutTool = COMMAND_SHORTCUTS[input.toUpperCase()];
      if (localShortcutTool && onSelectTool) {
        console.log('⌨️ Command shortcut:', input, '→', localShortcutTool);
        onSelectTool(localShortcutTool);`
);

// We want to KEEP the command box as it was. It used to have `{showCommandInput && activeDrawTool && isMouseInWorkspace && (`
// Let's verify we didn't touch it.

fs.writeFileSync('components/NestingAX/Workspace.tsx', content);
