const fs = require('fs');
const file = 'components/NestingAX/RadialMenu.tsx';
let content = fs.readFileSync(file, 'utf8');

// The user wants it "about 0.3% bigger", which I interpret as scaling it up a bit (maybe 1.3x or 1.03x, likely 1.3x since 0.3 is 30%)
// Actually, let's use CSS transform on the active container to scale the whole thing up, or just scale the container

content = content.replace(
  /\.radial-menu-container\.active \{/g,
  '.radial-menu-container.active {\n            transform: scale(1.3);'
);

fs.writeFileSync(file, content);
