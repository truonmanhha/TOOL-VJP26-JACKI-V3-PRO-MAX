const fs = require('fs');

let content = fs.readFileSync('components/GCodeViewer.tsx', 'utf8');

// I also noticed "Đang quét..." is taking some time or not being called until menu is clicked.
// Maybe we can run `getGpu` automatically on load so they see it.

// Let's modify the useEffect
const origUseEffect = `  useEffect(() => {
    if (showGpuMenu && detectedGpus.high === 'Đang quét...') {
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
    }
  }, [showGpuMenu]);`;

const newUseEffect = `  useEffect(() => {
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

content = content.replace(origUseEffect, newUseEffect);

fs.writeFileSync('components/GCodeViewer.tsx', content);
console.log('Modified GCodeViewer.tsx for auto-scan');
