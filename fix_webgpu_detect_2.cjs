const fs = require('fs');
let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const additionalWebGPULogic = `useEffect(() => {
    setTimeout(async () => {
        const getGpuGL = (pref: WebGLPowerPreference) => {
            try {
                const canvas = document.createElement('canvas'); 
                const options = pref === 'default' ? {} : { 
                    powerPreference: pref,
                    failIfMajorPerformanceCaveat: pref === 'high-performance'
                };
                const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options); 
                if (gl) { 
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info'); 
                    if (debugInfo) { 
                        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL); 
                        return renderer ? renderer.replace(/ANGLE \\((.*)\\)/, '$1').split(' Direct3D')[0] : 'Unknown';
                    } 
                }
                return 'Cannot initialize GPU';
            } catch(e) { return 'Error'; }
        };

        let currentGpu = getGpuGL(gpuPreference);
        
        if (navigator.gpu) {
            try {
                const adapter = await navigator.gpu.requestAdapter({ powerPreference: gpuPreference === 'default' ? undefined : gpuPreference });
                if (adapter && adapter.info && adapter.info.device) {
                    currentGpu = adapter.info.device + ' (WebGPU)';
                }
            } catch(e) {}
        }
        
        setGpuName(currentGpu);
    }, 100);
}, [gpuPreference]);`;

content = content.replace(/useEffect\(\(\) => \{\n    setTimeout\(\(\) => \{\n        const canvas = document\.createElement\('canvas'\); [^]+?    \}, 100\);\n\}, \[gpuPreference\]\);/m, additionalWebGPULogic);
fs.writeFileSync('components/GCodeViewer.tsx', content);
