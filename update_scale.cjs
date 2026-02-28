const fs = require('fs');
const file = 'components/NestingAX/RadialMenu.tsx';
let content = fs.readFileSync(file, 'utf8');

// The active container doesn't have a transition, but we can just add scale to it
content = content.replace(
  /\.radial-menu-container\.active \{/g,
  '.radial-menu-container.active {\n            transform: scale(1.2);'
);

fs.writeFileSync(file, content);
