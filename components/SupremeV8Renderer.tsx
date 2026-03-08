'use client';

import React, { useRef, useEffect } from 'react';
import { GPUObject } from './GPURenderer';

interface SupremeV8Props {
    objects: GPUObject[];
    sheetWidth: number;
    sheetHeight: number;
}

/**
 * 🚀 AUTOCAD SUPREME V8 (OffscreenCanvas - Zero Lag Core)
 * The nuclear option: Rendering is completely detached from the React UI thread.
 */
const SupremeV8Renderer: React.FC<SupremeV8Props> = ({ objects, sheetWidth, sheetHeight }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);
    const isGhostMode = useRef(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        const offscreen = canvasRef.current.transferControlToOffscreen();
        workerRef.current = new Worker(new URL('@/workers/renderer.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.postMessage({
            type: 'INIT',
            payload: {
                canvas: offscreen,
                width: canvasRef.current.clientWidth,
                height: canvasRef.current.clientHeight,
                pixelRatio: window.devicePixelRatio
            }
        }, [offscreen]);

        // 🚀 GHOST PAN INTERVENTION (AutoCAD 2024 Style)
        const handleMouseDown = (e: MouseEvent) => {
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) { 
                isGhostMode.current = true;
                workerRef.current?.postMessage({ type: 'GHOST_ON' });
            }
        };

        const handleMouseUp = () => {
            if (isGhostMode.current) {
                isGhostMode.current = false;
                workerRef.current?.postMessage({ type: 'GHOST_OFF' });
            }
        };

        const canvas = canvasRef.current;
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            workerRef.current?.postMessage({
                type: 'RESIZE',
                payload: { width: entry.contentRect.width, height: entry.contentRect.height }
            });
        });
        resizeObserver.observe(canvasRef.current);

        return () => {
            workerRef.current?.terminate();
            resizeObserver.disconnect();
            canvas.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // 1. Transfer control to worker
        const offscreen = canvasRef.current.transferControlToOffscreen();
        workerRef.current = new Worker(new URL('@/workers/renderer.worker.ts', import.meta.url), { type: 'module' });

        workerRef.current.postMessage({
            type: 'INIT',
            payload: {
                canvas: offscreen,
                width: canvasRef.current.clientWidth,
                height: canvasRef.current.clientHeight,
                pixelRatio: window.devicePixelRatio
            }
        }, [offscreen]);

        // 2. Handle Resize
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            workerRef.current?.postMessage({
                type: 'RESIZE',
                payload: { width: entry.contentRect.width, height: entry.contentRect.height }
            });
        });
        resizeObserver.observe(canvasRef.current);

        return () => {
            workerRef.current?.terminate();
            resizeObserver.disconnect();
        };
    }, []);

    // 3. Sync Objects (Only on structural change)
    useEffect(() => {
        workerRef.current?.postMessage({
            type: 'UPDATE_OBJECTS',
            payload: { objects }
        });
    }, [objects]);

    return (
        <div className="w-full h-full relative bg-black overscroll-none touch-none">
            <div className="absolute top-2 left-2 z-10 bg-red-500/20 backdrop-blur px-2 py-1 rounded text-[10px] text-red-400 font-mono border border-red-500/30 select-none pointer-events-none">
                SUPREME V8: NUCLEAR MULTI-THREADED CORE (OFFSCREEN)
            </div>
            <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
    );
};

export default SupremeV8Renderer;
