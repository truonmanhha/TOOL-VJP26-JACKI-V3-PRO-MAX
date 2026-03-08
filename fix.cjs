const fs = require('fs');

function fix(file) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix imports
    content = content.replace(/import \{\n    AdvancedNestingEngine,\n    NestingOutput,\n    PartInput,\n    SheetInput,\n    NestingStrategy,\n    fileParser\nimport \{ SpatialIndexService, SpatialItem \} from '@\/services\/SpatialIndexService';\nimport \{ getBounds \} from '@\/services\/nesting\/geometry';\n\n\} from '@\/services\/nesting';/, `import {
    AdvancedNestingEngine,
    NestingOutput,
    PartInput,
    SheetInput,
    NestingStrategy,
    fileParser
} from '@/services/nesting';
import { SpatialIndexService, SpatialItem } from '@/services/SpatialIndexService';
import { getBounds } from '@/services/nesting/geometry';`);

    content = content.replace(/className=\\"/g, 'className="');
    content = content.replace(/color=\\"/g, 'color="');
    content = content.replace(/<div className="absolute top-4 left-4 z-20 flex gap-2">\n\n                    <div className="absolute top-4 left-4 z-20 flex gap-2">/g, '<div className="absolute top-4 left-4 z-20 flex gap-2">');
    
    // Remove duplicates
    let lines = content.split('\n');
    let out = [];
    let skip = false;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('setImportLoading(true);') && lines[i+1]?.includes('for (let i = 0; i < files.length; i++) {') && lines[i+2]?.includes('const file = files[i];') && lines[i+3]?.includes('const formData = new FormData();')) {
            // we found the duplicate handleFileImport logic
            let j = i;
            while (j < lines.length && !lines[j].includes('}, [parts.length]);')) {
                j++;
            }
            if (lines[j].includes('}, [parts.length]);')) {
                i = j;
                continue;
            }
        }
        
        if (lines[i].includes('<GPURenderer') && lines[i+1]?.includes('objects={gpuObjects}') && lines[i+7]?.includes('objects={gpuObjects}')) {
             out.push(lines[i]);
             out.push(lines[i+1]);
             out.push(lines[i+2]);
             out.push(lines[i+3]);
             out.push(lines[i+4]);
             out.push(lines[i+5]);
             out.push(lines[i+6]);
             i += 11;
             continue;
        }
        
        out.push(lines[i]);
    }
    
    fs.writeFileSync(file, out.join('\n'));
}

fix('components/NestingWorkspace.tsx');
