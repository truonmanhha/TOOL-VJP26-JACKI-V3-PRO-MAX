import DxfParser from 'dxf-parser';
import fs from 'fs';

const fileContent = fs.readFileSync('12lyaa.dxf', 'utf8');
const parser = new DxfParser();
try {
    const dxf = parser.parseSync(fileContent);
    console.log('Total entities:', dxf.entities.length);
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    dxf.entities.forEach(e => {
        if (e.type === 'LINE') {
            e.vertices.forEach(v => {
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            });
        } else if (e.type === 'ARC') {
            const r = e.radius;
            minX = Math.min(minX, e.center.x - r); maxX = Math.max(maxX, e.center.x + r);
            minY = Math.min(minY, e.center.y - r); maxY = Math.max(maxY, e.center.y + r);
        }
    });
    
    console.log('Bounds: X(', minX, 'to', maxX, '), Y(', minY, 'to', maxY, ')');
    
} catch (e) {
    console.error('Error:', e);
}
