const fs = require('fs');
const file = '../TOOL-VJP26-JACKI-V3-PRO-MAX-nesting-autocad/components/NestingAX/Workspace.tsx';
let code = fs.readFileSync(file, 'utf8');

// Thêm FPS hook sau unsub effect (line ~236)
if (!code.includes('PERFORMANCE PROFILING')) {
  code = code.replace(
    'return unsub;\n  }, []);',
    `return unsub;\n  }, []);\n\n  // ============ PERFORMANCE PROFILING (Phase 1a) ============\n  // FPS counter hook\n  useEffect(() => {\n    let frames = 0;\n    let lastTime = performance.now();\n    let animationFrameId: number;\n    const loop = () => {\n      frames++;\n      const now = performance.now();\n      if (now - lastTime >= 1000) {\n        console.log(\`[Workspace Perf] FPS: \${frames}, Entities: \${cadEntities.length}\`);\n        frames = 0;\n        lastTime = now;\n      }\n      animationFrameId = requestAnimationFrame(loop);\n    };\n    animationFrameId = requestAnimationFrame(loop);\n    return () => cancelAnimationFrame(animationFrameId);\n  }, [cadEntities.length]);\n`
  );
}

// Thêm timer vào handleMouseMoveInternal
if (!code.includes('t0 = performance.now()')) {
  code = code.replace(
    'const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {\n    if (!containerRef.current) return;',
    'const handleMouseMoveInternal = React.useCallback((e: React.MouseEvent) => {\n    if (!containerRef.current) return;\n    const t0 = performance.now();'
  );
  
  code = code.replace(
    '      });\n    }\n  }, [activeDrawTool,',
    '      });\n    }\n\n    const t1 = performance.now();\n    if (Math.random() < 0.1) {\n      console.log(`[Workspace Perf] onMouseMove took ${(t1 - t0).toFixed(2)}ms`);\n    }\n  }, [activeDrawTool,'
  );
}

fs.writeFileSync(file, code);
console.log('Patched Workspace.tsx successfully');
