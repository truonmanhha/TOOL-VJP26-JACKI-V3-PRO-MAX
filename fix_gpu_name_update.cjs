const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// We need to also update the `gpuName` when the user selects a new GPU preference,
// so the UI label updates immediately.

// We can put an effect that updates `gpuName` whenever `gpuPreference` changes.

const currentGpuNameEffect = `useEffect(() => { const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl'); if (gl) { const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); if (debugInfo) { const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); setGpuName(renderer); } } }, []);`;

const newGpuNameEffect = `useEffect(() => {
    const canvas = document.createElement('canvas'); 
    const options = gpuPreference === 'default' ? {} : { powerPreference: gpuPreference };
    const gl = canvas.getContext('webgl', options); 
    if (gl) { 
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); 
        if (debugInfo) { 
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); 
            setGpuName(renderer); 
        } 
    } 
}, [gpuPreference]);`;

content = content.replace(currentGpuNameEffect, newGpuNameEffect);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Fixed gpuName effect');
