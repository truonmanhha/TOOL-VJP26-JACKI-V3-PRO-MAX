const fs = require('fs');
let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

// The duplicate CONSTANT is further down, so let's fix it
content = content.replace(
  /const COMMAND_SHORTCUTS: Record<string, string> = {[\s\S]*?'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',[\s\S]*?'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',[\s\S]*?};[\s\S]*?const shortcutTool = COMMAND_SHORTCUTS\[input\.toUpperCase\(\)\];[\s\S]*?if \(shortcutTool && onSelectTool\) {/g,
  `const localShortcutTool = COMMAND_SHORTCUTS[input.toUpperCase()];
      if (localShortcutTool && onSelectTool) {`
);

content = content.replace(
  /const input = commandInput\.trim\(\);[\s\S]*?if \(!input\) return;/g,
  `const input = commandInput.trim();
      if (!input) return;

      const COMMAND_SHORTCUTS: Record<string, string> = {
        'L': 'line', 'C': 'circle', 'R': 'rect', 'PL': 'polyline',
        'E': 'ellipse', 'PG': 'polygon', 'A': 'arc', 'SL': 'slot', 'OB': 'obround',
        'M': 'move', 'CP': 'copy', 'MI': 'mirror', 'RO': 'rotate', 'SC': 'scale',
        'OF': 'offset', 'TR': 'trim', 'EX': 'extend', 'F': 'fillet', 'CH': 'chamfer',
        'DIM': 'dimension', 'T': 'text', 'HA': 'hatch', 'LE': 'leader',
      };`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', content);
