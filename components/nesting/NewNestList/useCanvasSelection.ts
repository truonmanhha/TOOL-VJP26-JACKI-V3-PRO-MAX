// ============================================================
// CANVAS SELECTION HOOK
// Hook for handling vector selection from canvas using Fabric.js
// ============================================================

import { useEffect, useCallback, useRef } from 'react';

interface UseCanvasSelectionProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onSelectionComplete?: (geometry: any, bounds: { width: number; height: number }) => void;
  onSelectionCancel?: () => void;
}

/**
 * Custom hook to handle canvas selection with visual feedback
 * 
 * Workflow:
 * 1. Enter selection mode (highlight becomes active)
 * 2. User clicks/drags to select objects
 * 3. Selected objects get green dashed border
 * 4. Press Enter to confirm, Esc to cancel
 */
export const useCanvasSelection = ({
  canvasRef,
  onSelectionComplete,
  onSelectionCancel
}: UseCanvasSelectionProps) => {
  const selectionModeRef = useRef(false);
  const selectedObjectsRef = useRef<any[]>([]);
  const originalStylesRef = useRef<Map<any, any>>(new Map());

  // Highlight selected objects with green dashed border
  const highlightObjects = useCallback((objects: any[]) => {
    objects.forEach(obj => {
      if (!originalStylesRef.current.has(obj)) {
        originalStylesRef.current.set(obj, {
          stroke: obj.stroke,
          strokeWidth: obj.strokeWidth,
          strokeDashArray: obj.strokeDashArray
        });
      }

      // Apply green dashed highlight
      obj.set({
        stroke: '#22c55e', // Green-500
        strokeWidth: 2,
        strokeDashArray: [5, 5]
      });
    });
  }, []);

  // Restore original styles
  const restoreStyles = useCallback(() => {
    originalStylesRef.current.forEach((style, obj) => {
      obj.set(style);
    });
    originalStylesRef.current.clear();
  }, []);

  // Enter selection mode
  const enterSelectionMode = useCallback(() => {
    selectionModeRef.current = true;
    selectedObjectsRef.current = [];
    
    // Change cursor to crosshair
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'crosshair';
    }

    console.log('Entered selection mode - Click and drag to select objects, press Enter to confirm, Esc to cancel');
  }, [canvasRef]);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    selectionModeRef.current = false;
    restoreStyles();
    selectedObjectsRef.current = [];
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }

    console.log('Exited selection mode');
  }, [canvasRef, restoreStyles]);

  // Handle selection completion
  const completeSelection = useCallback(() => {
    if (selectedObjectsRef.current.length === 0) {
      alert('No objects selected!');
      return;
    }

    // Calculate bounds of selected objects
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedObjectsRef.current.forEach(obj => {
      const bounds = obj.getBoundingRect();
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.left + bounds.width);
      maxY = Math.max(maxY, bounds.top + bounds.height);
    });

    const geometry = {
      objects: selectedObjectsRef.current.map(obj => ({
        type: obj.type,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        angle: obj.angle,
        // Store other relevant properties
      })),
      bounds: { minX, minY, maxX, maxY }
    };

    const size = {
      width: maxX - minX,
      height: maxY - minY
    };

    onSelectionComplete?.(geometry, size);
    exitSelectionMode();
  }, [onSelectionComplete, exitSelectionMode]);

  // Handle selection cancel
  const cancelSelection = useCallback(() => {
    onSelectionCancel?.();
    exitSelectionMode();
  }, [onSelectionCancel, exitSelectionMode]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectionModeRef.current) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        completeSelection();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [completeSelection, cancelSelection]);

  // Handle mouse events for selection
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!selectionModeRef.current) return;
    
    // TODO: Implement selection box logic
    // This will integrate with Fabric.js canvas
    console.log('Mouse down for selection', e);
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!selectionModeRef.current) return;
    
    // TODO: Complete selection box and highlight objects
    console.log('Mouse up for selection', e);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, handleMouseDown, handleMouseUp]);

  return {
    enterSelectionMode,
    exitSelectionMode,
    isSelectionMode: selectionModeRef.current,
    selectedObjects: selectedObjectsRef.current
  };
};

export default useCanvasSelection;
