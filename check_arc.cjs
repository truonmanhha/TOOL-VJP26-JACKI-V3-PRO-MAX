const DxfParser = require('dxf-parser');
const parser = new DxfParser();
const fs = require('fs');

const dxfContent = fs.readFileSync('12lyaa.dxf', 'utf-8');
const dxf = parser.parseSync(dxfContent);

const arcs = dxf.entities.filter(e => e.type === 'ARC');
if (arcs.length > 0) {
    console.log('Sample ARC:', arcs[0]);
} else {
    console.log('No ARCs found');
}
