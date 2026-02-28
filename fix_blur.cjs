const fs = require('fs');
const file = 'components/NestingAX/RadialMenu.tsx';
let content = fs.readFileSync(file, 'utf8');

// The drop shadow with currentColor can cause severe blurring in SVGs, or font rendering issues.
// Let's replace the drop-shadow with a cleaner text-shadow or improve the SVG filter,
// But wait, the user's original CSS was: filter: drop-shadow(0 0 5px currentColor);
// Why is it blurry now? Oh, because we scaled the whole container to scale(1.2)! 
// Scaling HTML containers often scales up rasterized text in some browsers instead of re-rendering vectors!
// To fix the "blur" from scaling, we should NOT scale the HTML container but rather scale the SVG viewBox OR just adjust the width/height of the container. 
// OR simply add a sharp SVG property. Wait, "transform: scale" on HTML can cause blur. Let's change the width/height of the container instead of transform: scale.
// width: 700px * 1.2 = 840px.

content = content.replace(
  /\.radial-menu-container\.active \{\n            transform: scale\(1\.2\);\n            visibility: visible;/g,
  '.radial-menu-container.active {\n            visibility: visible;'
);

// We need to scale the width and height directly.
content = content.replace(
  /width: 700px;\n            height: 700px;/g,
  'width: 840px;\n            height: 840px;'
);

fs.writeFileSync(file, content);
