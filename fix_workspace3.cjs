const fs = require('fs');
let content = fs.readFileSync('components/NestingAX/Workspace.tsx', 'utf8');

content = content.replace(
  /console\.log\('⌨️ Command shortcut:', input, '→', shortcutTool\);\s*onSelectTool\(shortcutTool\);/g,
  `console.log('⌨️ Command shortcut:', input, '→', localShortcutTool);
        onSelectTool(localShortcutTool);`
);

fs.writeFileSync('components/NestingAX/Workspace.tsx', content);
