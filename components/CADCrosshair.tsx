'use client';

import React, { useRef, useEffect } from 'react';

interface CADCrosshairProps {
    containerRef: React.RefObject<HTMLDivElement>;
    color?: string;
    size?: number; // Size of the center box
}

/**
 * 🚀 ZERO-LATENCY CROSSHAIR ENGINE (AutoCAD Style)
 * Uses a dedicated 2D Canvas overlay to bypass Three.js render loop.
 */
const CADCrosshair: React.FC<CADCrosshairProps> = ({ containerRef, color = '#00ffff', size = 10 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        // Resize canvas to match container
        const resize = () => {
            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
        };
        resize();
        window.addEventListener('resize', resize);

        // Track mouse with high precision
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mousePos.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };
        container.addEventListener('mousemove', handleMouseMove);

        // 🚀 HIGH-SPEED DRAW LOOP (60-144 FPS)
        let animationId: number;
        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const { x, y } = mousePos.current;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash([]); // Solid lines

            // 1. Full Screen Crosshair lines
            ctx.beginPath();
            // Horizontal
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            // Vertical
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();

            // 2. Center Snap Box (AutoCAD Style)
            ctx.strokeRect(x - size/2, y - size/2, size, size);

            animationId = requestAnimationFrame(render);
        };
        animationId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            container.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
        };
    }, [containerRef, color, size]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none z-[100]"
            style={{ mixBlendMode: 'difference' }} // Makes it visible on any background
        />
    );
};

export default CADCrosshair;
