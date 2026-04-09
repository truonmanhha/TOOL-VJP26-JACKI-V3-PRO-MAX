// ============================================================
// INTEGRATION EXAMPLE
// How to integrate New Nest List into existing NestingTool
// ============================================================

import React, { useState } from 'react';
import { FileBox } from 'lucide-react';
import { 
  NewNestListModal, 
  PartParametersDialog,
  AdvancedSettingsDialog,
  NestingPart,
  NestingSheet,
  NestingSettings 
} from './nesting/NewNestList';
import { calculateNesting } from '../services/nestingApiClient';

/**
 * EXAMPLE 1: Add button to toolbar
 * 
 * In your NestingTool component, add this button to the toolbar section:
 */
export function ToolbarIntegrationExample() {
  const [isNewNestListOpen, setIsNewNestListOpen] = useState(false);

  return (
    <div className="toolbar flex items-center gap-2">
      {/* ... existing toolbar buttons ... */}
      
      {/* NEW NEST LIST BUTTON */}
      <button
        onClick={() => setIsNewNestListOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50 font-medium"
        title="Open New Nest List"
      >
        <FileBox className="w-5 h-5" />
        <span>NEW NEST LIST</span>
      </button>

      {/* NEW NEST LIST MODAL */}
      <NewNestListModal
        isOpen={isNewNestListOpen}
        onClose={() => setIsNewNestListOpen(false)}
        lang="vi"
      />
    </div>
  );
}

/**
 * EXAMPLE 2: Full integration with canvas interaction
 */
export function FullIntegrationExample() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSelectingParts, setIsSelectingParts] = useState(false);
  const [isSelectingSheet, setIsSelectingSheet] = useState(false);
  const [showPartDialog, setShowPartDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [selectedGeometry, setSelectedGeometry] = useState<any>(null);
  const [nestingSettings, setNestingSettings] = useState<NestingSettings>({
    algorithm: 'vero',
    objectType: 'geometry',
    spacing: 5,
    margin: 10,
    startCorner: 'bottom-left',
    nestingOrder: 'best-utilization',
    offcutDirection: 'auto',
    allowRotation: true,
    mergeParts: false,
    drillFirst: true,
    optimizeToolpath: true,
    useRemnants: true
  });

  // Handle part selection from canvas
  const handleSelectParts = () => {
    setIsModalOpen(false); // Hide modal
    setIsSelectingParts(true);
    
    // TODO: Integrate with your canvas selection logic
    console.log('Entering part selection mode...');
    
    // Example: After user selects objects on canvas
    // setSelectedGeometry(selectedObjects);
    // setShowPartDialog(true);
    // setIsSelectingParts(false);
  };

  // Handle sheet selection from canvas
  const handleSelectSheet = () => {
    setIsModalOpen(false); // Hide modal
    setIsSelectingSheet(true);
    
    // TODO: Integrate with your canvas selection logic
    console.log('Entering sheet selection mode...');
  };

  // Handle part parameters confirmation
  const handlePartConfirm = (part: NestingPart) => {
    console.log('Part added:', part);
    setShowPartDialog(false);
    setIsModalOpen(true); // Show modal again
  };

  // Handle settings save
  const handleSettingsSave = (settings: NestingSettings) => {
    setNestingSettings(settings);
    console.log('Settings saved:', settings);
  };

  return (
    <>
      {/* Main Modal */}
      <NewNestListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectParts={handleSelectParts}
        onSelectSheet={handleSelectSheet}
        onOpenSettings={() => setShowSettingsDialog(true)}
        lang="vi"
      />

      {/* Part Parameters Dialog */}
      <PartParametersDialog
        isOpen={showPartDialog}
        onClose={() => {
          setShowPartDialog(false);
          setIsModalOpen(true);
        }}
        onConfirm={handlePartConfirm}
        selectedGeometry={selectedGeometry}
        geometrySize={{ width: 100, height: 100 }} // Calculate from geometry
        lang="vi"
      />

      {/* Advanced Settings Dialog */}
      <AdvancedSettingsDialog
        isOpen={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        onSave={handleSettingsSave}
        initialSettings={nestingSettings}
        lang="vi"
      />
    </>
  );
}

/**
 * EXAMPLE 3: Using the nesting API
 */
export async function nestingApiExample(
  parts: NestingPart[],
  sheets: NestingSheet[],
  settings: NestingSettings
) {
  try {
    // Call nesting API
    const result = await calculateNesting(parts, sheets, settings);
    
    console.log('Nesting completed!');
    console.log('Utilization:', result.utilization, '%');
    console.log('Placements:', result.placements);
    
    // TODO: Render result on canvas
    result.placements.forEach(placement => {
      // Draw part at placement.position with placement.rotation
    });
    
    return result;
  } catch (error) {
    console.error('Nesting failed:', error);
    alert('Nesting calculation failed. Please try again.');
  }
}

/**
 * EXAMPLE 4: Canvas selection integration with Fabric.js
 */
export function FabricCanvasSelectionExample(
  canvas: any, // fabric.Canvas
  onSelectionComplete: (geometry: any, size: { width: number; height: number }) => void
) {
  // Enter selection mode
  canvas.defaultCursor = 'crosshair';
  canvas.selection = true;
  
  let isSelecting = false;
  let selectionRect: any = null;
  let startPoint = { x: 0, y: 0 };
  
  // Mouse down - start selection
  const handleMouseDown = (e: any) => {
    if (!isSelecting) {
      isSelecting = true;
      const pointer = canvas.getPointer(e.e);
      startPoint = { x: pointer.x, y: pointer.y };
      
      // Create selection rectangle
      selectionRect = new fabric.Rect({
        left: startPoint.x,
        top: startPoint.y,
        width: 0,
        height: 0,
        fill: 'rgba(34, 197, 94, 0.1)',
        stroke: '#22c55e',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      });
      canvas.add(selectionRect);
    }
  };
  
  // Mouse move - update selection
  const handleMouseMove = (e: any) => {
    if (isSelecting && selectionRect) {
      const pointer = canvas.getPointer(e.e);
      
      if (pointer.x < startPoint.x) {
        selectionRect.set({ left: pointer.x });
      }
      if (pointer.y < startPoint.y) {
        selectionRect.set({ top: pointer.y });
      }
      
      selectionRect.set({
        width: Math.abs(pointer.x - startPoint.x),
        height: Math.abs(pointer.y - startPoint.y)
      });
      
      canvas.renderAll();
    }
  };
  
  // Mouse up - complete selection
  const handleMouseUp = (e: any) => {
    if (isSelecting && selectionRect) {
      // Find objects within selection
      const selectedObjects: any[] = [];
      canvas.forEachObject((obj: any) => {
        if (obj !== selectionRect && obj.intersectsWithRect(selectionRect.aCoords)) {
          selectedObjects.push(obj);
          
          // Highlight selected object
          obj.set({
            stroke: '#22c55e',
            strokeWidth: 2,
            strokeDashArray: [5, 5]
          });
        }
      });
      
      canvas.remove(selectionRect);
      canvas.renderAll();
      
      isSelecting = false;
      selectionRect = null;
      
      // Calculate bounds
      if (selectedObjects.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        selectedObjects.forEach(obj => {
          const bounds = obj.getBoundingRect();
          minX = Math.min(minX, bounds.left);
          minY = Math.min(minY, bounds.top);
          maxX = Math.max(maxX, bounds.left + bounds.width);
          maxY = Math.max(maxY, bounds.top + bounds.height);
        });
        
        const size = {
          width: maxX - minX,
          height: maxY - minY
        };
        
        onSelectionComplete(selectedObjects, size);
      }
    }
  };
  
  // Add event listeners
  canvas.on('mouse:down', handleMouseDown);
  canvas.on('mouse:move', handleMouseMove);
  canvas.on('mouse:up', handleMouseUp);
  
  // Cleanup function
  return () => {
    canvas.off('mouse:down', handleMouseDown);
    canvas.off('mouse:move', handleMouseMove);
    canvas.off('mouse:up', handleMouseUp);
    canvas.defaultCursor = 'default';
  };
}

/**
 * EXAMPLE 5: Keyboard shortcuts integration
 */
export function KeyboardShortcutsExample() {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New Nest List
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        // Open New Nest List modal
      }
      
      // Enter: Confirm selection
      if (e.key === 'Enter') {
        // Complete current selection
      }
      
      // Esc: Cancel selection
      if (e.key === 'Escape') {
        // Cancel current operation
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return null;
}

/**
 * EXAMPLE 6: Add to existing NestingTool.tsx
 * 
 * In your NestingTool.tsx file, add these imports at the top:
 */
/*
import { 
  NewNestListModal, 
  PartParametersDialog,
  AdvancedSettingsDialog 
} from './nesting/NewNestList';
*/

/**
 * Then add state variables:
 */
/*
const [isNewNestListOpen, setIsNewNestListOpen] = useState(false);
*/

/**
 * Add button to toolbar (around line 200-300):
 */
/*
<button
  onClick={() => setIsNewNestListOpen(true)}
  className="p-2 hover:bg-gray-700 rounded transition-colors"
  title="New Nest List"
>
  <FileBox className="w-5 h-5" />
</button>
*/

/**
 * Add modal before closing return statement (around line 1100):
 */
/*
<NewNestListModal
  isOpen={isNewNestListOpen}
  onClose={() => setIsNewNestListOpen(false)}
  lang={lang}
/>
*/

// ============================================================
// That's it! The module is now integrated.
// All original code remains untouched.
// ============================================================
