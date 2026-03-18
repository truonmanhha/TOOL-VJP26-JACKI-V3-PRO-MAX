const fs = require('fs');
let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The duplicate CONSTANT is further down, so let's fix it
content = content.replace(
  /const COMMAND_SHORTCUTS: Record<string, string> = {[\s\S]*?'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',[\s\S]*?'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',[\s\S]*?};[\s\S]*?const shortcutTool = COMMAND_SHORTCUTS\[input\.toUpperCase\(\)\];[\s\S]*?if \(shortcutTool && onSelectTool\) {/g,
  `const localShortcutTool = COMMAND_SHORTCUTS[input.toUpperCase()];
      if (localShortcutTool && onSelectTool) {`
);

content = content.replace(
  /const upperInput = input\.toUpperCase\(\);[\s\S]*?const shortcutTool = COMMAND_SHORTCUTS\[upperInput\];/g,
  `const COMMAND_SHORTCUTS: Record<string, string> = {
        'L': 'line', 'C': 'circle', 'A': 'arc', 'PL': 'polyline', 'REC': 'rect', 'POL': 'polygon', 'EL': 'ellipse',
        'M': 'move', 'CO': 'copy', 'MI': 'mirror', 'RO': 'rotate', 'SC': 'scale',
        'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',
        'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',
      };
    const upperInput = input.toUpperCase();
    const shortcutTool = COMMAND_SHORTCUTS[upperInput];`
);

// Actually, I don't need to do this because the original code had the constant. I just need to make sure the original code runs spacebar properly.

