const fs = require('fs');
const file = 'components/NestingAX/RadialMenu.tsx';
let content = fs.readFileSync(file, 'utf8');

// Since we increased size from 700 to 840, we need to adjust the position calculation as well.
// The code had `style={{ left: x - 350, top: y - 350 }}` (which is x - 700/2)
// Since it's now 840px, it should be `x - 420, y - 420` to keep the center exactly under the mouse cursor!

content = content.replace(
  /style=\{\{ left: x - 350, top: y - 350 \}\}/g,
  'style={{ left: x - 420, top: y - 420 }}'
);

fs.writeFileSync(file, content);
