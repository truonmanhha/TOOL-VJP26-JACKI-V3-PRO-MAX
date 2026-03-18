const fs = require('fs');

// Create a standalone minimal parser using VinaCAD style vector text parsing
// VinaCAD doesn't actually use font-size, they parse SHX/vector fonts into lines.

const file = 'workers/dxf.worker.ts';
let code = fs.readFileSync(file, 'utf8');

// If text is still terrible, let's just make it draw a bounding box temporarily so user sees SOMETHING
// that isn't tiny or huge. Wait, the user wants EXACTLY VinaCAD's code.
