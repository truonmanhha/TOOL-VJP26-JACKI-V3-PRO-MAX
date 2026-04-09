const fs = require('fs');
const file = 'components/DxfPreview.tsx';
let code = fs.readFileSync(file, 'utf8');

// The ultimate fix: render font in absolute screen coordinates
// to completely bypass all canvas scaling bugs
const newRender = `
        ctx.save();
        
        // 1. Get the current transform matrix before we mess with it
        const matrix = ctx.getTransform();
        
        // 2. Calculate the exact screen pixel position of this text point
        const pixelX = matrix.a * p.x + matrix.c * p.y + matrix.e;
        const pixelY = matrix.b * p.x + matrix.d * p.y + matrix.f;
        
        // 3. Reset all transforms so we are drawing in raw CSS pixels
        ctx.resetTransform();
        
        // 4. Translate to the exact pixel coordinate
        ctx.translate(pixelX, pixelY);
        
        // 5. Apply the rotation (remembering we flipped Y so we might need to negate the angle)
        ctx.rotate(-angle);
        
        // 6. Calculate exactly how many pixels tall the font should be on screen
        // height is in CAD units. viewState.scale converts units to pixels.
        let pixelHeight = height * viewState.scale;
        
        // 7. Force a minimum size so it NEVER gets too small to read!
        pixelHeight = Math.max(pixelHeight, 14); 
        
        ctx.font = \`\${pixelHeight}px Arial\`;
        ctx.fillStyle = entity.color || '#FFFFFF';
        ctx.textBaseline = 'bottom';
        ctx.fillText(entity.text, 0, 0);
        
        ctx.restore();
`;

// Replace TEXT block
code = code.replace(/ctx\.save\(\);\s*ctx\.translate\(p\.x, p\.y\);\s*ctx\.rotate\(angle\);\s*ctx\.scale\(1, -1\);\s*const BIG_FONT_SIZE = 1000;\s*ctx\.font = `\${BIG_FONT_SIZE}px Arial`;\s*const scaleToRealWorld = height \/ BIG_FONT_SIZE;\s*ctx\.scale\(scaleToRealWorld, scaleToRealWorld\);\s*ctx\.fillStyle = entity\.color \|\| '#FFFFFF';\s*ctx\.textBaseline = 'bottom';\s*ctx\.fillText\(entity\.text, 0, 0\);\s*ctx\.restore\(\);/g, newRender);

// Replace DIMENSION block
code = code.replace(/ctx\.save\(\);\s*ctx\.translate\(p\.x, p\.y\);\s*ctx\.rotate\(angle\);\s*ctx\.scale\(1, -1\);\s*const BIG_FONT_SIZE = 1000;\s*ctx\.font = `\${BIG_FONT_SIZE}px Arial`;\s*const scaleToRealWorld = height \/ BIG_FONT_SIZE;\s*ctx\.scale\(scaleToRealWorld, scaleToRealWorld\);\s*ctx\.fillStyle = entity\.color \|\| '#FFFFFF';\s*ctx\.textAlign = 'center';\s*ctx\.textBaseline = 'bottom';\s*ctx\.fillText\(text, 0, 0\);\s*ctx\.restore\(\);/g, newRender.replace("ctx.textBaseline = 'bottom';", "ctx.textAlign = 'center';\n        ctx.textBaseline = 'bottom';"));

fs.writeFileSync(file, code);
console.log('Applied absolute pixel transform fix');
