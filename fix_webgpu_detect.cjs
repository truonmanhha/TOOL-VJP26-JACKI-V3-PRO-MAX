const fs = require('fs');
let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

const additionalWebGPULogic = `  useEffect(() => {
    // Luôn quét sẵn để người dùng có thể thấy ngay
    const getGpu = (pref: WebGLPowerPreference) => {
        try {
            const canvas = document.createElement('canvas');
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
    setTimeout(async () => {
        let highGpu = getGpu('high-performance');
        let lowGpu = getGpu('low-power');

        // Let's also try WebGPU to extract accurate adapter names if WebGL is returning the same for both!
        if (navigator.gpu) {
            try {
                const highAdapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
                if (highAdapter && highAdapter.info && highAdapter.info.device) {
                    highGpu = highAdapter.info.device + ' (WebGPU)';
                }
                const lowAdapter = await navigator.gpu.requestAdapter({ powerPreference: 'low-power' });
                if (lowAdapter && lowAdapter.info && lowAdapter.info.device) {
                    lowGpu = lowAdapter.info.device + ' (WebGPU)';
                }
            } catch(e) { console.warn('WebGPU info extraction failed', e); }
        }

        setDetectedGpus({
            high: highGpu,
            low: lowGpu
        });
    }, 500);
  }, []);`;

content = content.replace(/  useEffect\(\(\) => \{\n    const getGpu = [^]+?  \}, \[\]\);/m, additionalWebGPULogic);
fs.writeFileSync('components/GCodeViewer.tsx', content);
