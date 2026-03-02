// ============================================================
// CrosshairCanvas.tsx - Hardware-Optimized Cursor Overlay
// ============================================================
// Performance-first crosshair rendering with:
// - Independent RAF loop (60 FPS guaranteed)
// - High-DPI awareness (devicePixelRatio)
// - Predictive rendering (lag compensation)
// - Zero impact on main 3D render
// ============================================================

import React, { useEffect, useRef, useCallback } from 'react';

interface CrosshairCanvasProps {
  enabled?: boolean;
  color?: string;
  size?: number;
  lineWidth?: number;
  style?: 'plus' | 'circle' | 'reticle';
  usePrediction?: boolean;
  predictionLookAhead?: number; // ms ahead to predict
}

interface MousePosition {
  x: number;
  y: number;
  time: number;
}

const CrosshairCanvas: React.FC<CrosshairCanvasProps> = ({
  enabled = true,
  color = '#0099ff',
  size = 15,
  lineWidth = 1.5,
  style = 'plus',
  usePrediction = false,
  predictionLookAhead = 8, // Predict 8ms ahead (half a frame @60fps)
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posRef = useRef<MousePosition>({ x: 0, y: 0, time: 0 });
  const historyRef = useRef<MousePosition[]>([]);
  const rafRef = useRef<number | null>(null);

  // ============ Draw Functions ============
  const drawPlusCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawCircleCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    // Outer circle
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Crosshair lines (smaller)
    const innerSize = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y - innerSize);
    ctx.lineTo(x, y + innerSize);
    ctx.moveTo(x - innerSize, y);
    ctx.lineTo(x + innerSize, y);
    ctx.stroke();
  };

  const drawReticleCrosshair = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;

    const gap = 3;
    const armLength = size;

    // Top arm
    ctx.beginPath();
    ctx.moveTo(x, y - gap);
    ctx.lineTo(x, y - gap - armLength);
    ctx.stroke();

    // Bottom arm
    ctx.beginPath();
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + gap + armLength);
    ctx.stroke();

    // Left arm
    ctx.beginPath();
    ctx.moveTo(x - gap, y);
    ctx.lineTo(x - gap - armLength, y);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + gap + armLength, y);
    ctx.stroke();

    // Center square
    const dotSize = 2;
    ctx.fillStyle = color;
    ctx.fillRect(x - dotSize, y - dotSize, dotSize * 2, dotSize * 2);
  };

  const drawCrosshair = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number) => {
    switch (style) {
      case 'circle':
        drawCircleCrosshair(ctx, x, y);
        break;
      case 'reticle':
        drawReticleCrosshair(ctx, x, y);
        break;
      case 'plus':
      default:
        drawPlusCrosshair(ctx, x, y);
        break;
    }
  }, [color, size, lineWidth, style]);

  // ============ Prediction Logic ============
  const getPredictedPosition = useCallback((): { x: number; y: number } => {
    if (!usePrediction || historyRef.current.length < 2) {
      return { x: posRef.current.x, y: posRef.current.y };
    }

    const latest = historyRef.current[historyRef.current.length - 1];
    const previous = historyRef.current[historyRef.current.length - 2];

    const timeDiff = Math.max(latest.time - previous.time, 1); // Avoid division by 0
    const vx = (latest.x - previous.x) / timeDiff;
    const vy = (latest.y - previous.y) / timeDiff;

    // Predict ahead by predictionLookAhead ms
    const predictedX = latest.x + vx * predictionLookAhead;
    const predictedY = latest.y + vy * predictionLookAhead;

    return { x: predictedX, y: predictedY };
  }, [usePrediction, predictionLookAhead]);

  // ============ Main Setup ============
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    updateCanvasSize();

    // ============ Animation Frame Loop ============
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Get position (with optional prediction)
      const pos = getPredictedPosition();

      // Draw crosshair
      drawCrosshair(ctx, pos.x, pos.y);

      // Schedule next frame
      rafRef.current = requestAnimationFrame(animate);
    };

    // ============ Event Listeners ============
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const newPos: MousePosition = {
        x: e.clientX,
        y: e.clientY,
        time: now,
      };

      posRef.current = newPos;

      // Maintain history for prediction
      if (usePrediction) {
        historyRef.current.push(newPos);
        if (historyRef.current.length > 3) {
          historyRef.current.shift();
        }
      }
    };

    const handleResize = () => {
      updateCanvasSize();
    };

    const handlePointerLeave = () => {
      // Optionally hide crosshair when pointer leaves window
      // ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    // Use passive listener for better scroll performance
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('pointermove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    document.addEventListener('pointerleave', handlePointerLeave);

    // Start animation loop
    rafRef.current = requestAnimationFrame(animate);

    // ============ Cleanup ============
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [enabled, color, size, lineWidth, style, usePrediction, predictionLookAhead, drawCrosshair, getPredictedPosition]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ cursor: 'none' }}
    />
  );
};

export default CrosshairCanvas;
