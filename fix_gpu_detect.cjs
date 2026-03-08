const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// The issue might be that WebGL doesn't dynamically swap adaptors reliably when creating context on a hidden canvas,
// or our UI doesn't reflect the swap.

// Wait, the way WebGL powerPreference works is, you request a context from a *new* canvas.
// Once a canvas is bound to a WebGL context, its power preference is locked.

// Let's modify our getGpu logic to be absolutely sure it's doing it right.
// Also modify the initialization of `gpuName` and `detectedGpus`.

const oldUseEffect = `  useEffect(() => {
    // Luôn quét sẵn để người dùng có thể thấy ngay
    const getGpu = (pref: WebGLPowerPreference) => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl', { powerPreference: pref });
            if (!gl) return 'Không xác định';
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (!ext) return 'Không xác định';
            const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            return renderer ? renderer.replace(/ANGLE \\((.*)\\)/, '$1').substring(0, 30) + '...' : 'Không xác định';
        } catch(e) { return 'Không xác định'; }
    };
    setDetectedGpus({
        high: getGpu('high-performance'),
        low: getGpu('low-power')
    });
  }, []);`;

const newUseEffect = `  useEffect(() => {
    const getGpu = (pref: WebGLPowerPreference) => {
        try {
            const canvas = document.createElement('canvas');
            // Force hardware acceleration by requesting failIfMajorPerformanceCaveat if high-performance
            const options = { 
                powerPreference: pref,
                failIfMajorPerformanceCaveat: pref === 'high-performance'
            };
            const gl = canvas.getContext('webgl2', options) || canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
            if (!gl) return 'Không xác định (Fallback)';
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (!ext) return 'Không xác định (No Ext)';
            const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
            return renderer ? renderer.replace(/ANGLE \\((.*)\\)/, '$1').split(' Direct3D')[0].substring(0, 40) : 'Không xác định';
        } catch(e) { return 'Không xác định (Lỗi)'; }
    };
    
    // We run it with a slight delay to ensure browser has settled
    setTimeout(() => {
        setDetectedGpus({
            high: getGpu('high-performance'),
            low: getGpu('low-power')
        });
    }, 500);
  }, []);`;

content = content.replace(oldUseEffect, newUseEffect);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Fixed gpu detection logic');
