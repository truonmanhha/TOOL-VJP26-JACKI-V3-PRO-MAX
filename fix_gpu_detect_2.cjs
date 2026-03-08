const fs = require('fs');
let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// We also update the initial gpuName effect

const oldGpuNameEffect = `useEffect(() => {
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

const newGpuNameEffect = `useEffect(() => {
    setTimeout(() => {
        const canvas = document.createElement('canvas'); 
        const options = gpuPreference === 'default' ? {} : { 
            powerPreference: gpuPreference,
            failIfMajorPerformanceCaveat: gpuPreference === 'high-performance'
        };
        const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options); 
        if (gl) { 
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); 
            if (debugInfo) { 
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); 
                setGpuName(renderer ? renderer.replace(/ANGLE \\((.*)\\)/, '$1').split(' Direct3D')[0] : 'Unknown'); 
            } 
        } else {
            setGpuName('Cannot initialize GPU');
        }
    }, 100);
}, [gpuPreference]);`;

content = content.replace(oldGpuNameEffect, newGpuNameEffect);
fs.writeFileSync('components/GCodeViewer.tsx', content);
