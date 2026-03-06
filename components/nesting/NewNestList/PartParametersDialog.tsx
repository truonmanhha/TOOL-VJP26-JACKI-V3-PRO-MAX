// ============================================================
// PART PARAMETERS DIALOG
// Dialog for entering part parameters after selecting geometry
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import Draggable from 'react-draggable';
import { Language } from '../../../constants';
import { PartParameters, NestingPart } from './types';
import VectorPreview, { cadEntitiesToGeometry, generateThumbnail } from './VectorPreview';

interface PartParametersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (part: NestingPart) => void;
  selectedGeometry?: any;
  geometrySize?: { width: number; height: number };
  thumbnail?: string;
  lang?: Language;
}

const PartParametersDialog: React.FC<PartParametersDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedGeometry,
  geometrySize = { width: 100, height: 100 },
  thumbnail,
  lang = 'vi'
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<PartParameters>({
    name: `Part ${Date.now()}`,
    quantity: 1,
    maxPossible: false,
    priority: 3,
    symmetry: 'none',
    rotation: 'any',
    isSmallPart: false
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState({ width: 500, height: 'auto' as const });

  // Auto-resize and position modal to fit within viewport
  useEffect(() => {
    if (!isOpen || !nodeRef.current) return;

    // Wait for modal to render and get dimensions
    const timer = setTimeout(() => {
      const modalRect = nodeRef.current?.getBoundingClientRect();
      if (!modalRect) return;

      const modalWidth = 500; // Current modal width
      const modalHeight = modalRect.height;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 40; // Padding from edges

      // Calculate safe dimensions (80% of viewport)
      const maxWidth = viewportWidth - padding;
      const maxHeight = viewportHeight - padding;

      let newWidth = modalWidth;
      let newHeight = modalHeight;

      // Check if modal exceeds viewport and scale down if needed
      if (modalHeight > maxHeight) {
        const scale = maxHeight / modalHeight;
        newWidth = modalWidth * scale;
        newHeight = modalHeight * scale;
      }

      if (newWidth > maxWidth) {
        const scale = maxWidth / newWidth;
        newWidth = maxWidth;
        newHeight = newHeight * scale;
      }

      // Update scale if needed
      if (newWidth !== modalWidth) {
        setScale({ width: newWidth, height: 'auto' });
      }

      // Calculate center position
      let newX = (viewportWidth - newWidth) / 2;
      let newY = (viewportHeight - newHeight) / 2;

      // Clamp to safe bounds
      newX = Math.max(20, Math.min(newX, viewportWidth - newWidth - 20));
      newY = Math.max(20, Math.min(newY, viewportHeight - newHeight - 20));

      setPosition({ x: newX, y: newY });
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Clamp position during drag to keep modal inside viewport
  const handleDrag = (e: any, data: any) => {
    if (!nodeRef.current) return;

    const modalRect = nodeRef.current.getBoundingClientRect();
    const modalWidth = modalRect.width;
    const modalHeight = modalRect.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Clamp X and Y within viewport
    let clampedX = Math.max(0, Math.min(data.x, viewportWidth - modalWidth));
    let clampedY = Math.max(0, Math.min(data.y, viewportHeight - modalHeight));

    setPosition({ x: clampedX, y: clampedY });
  };

  const texts = {
    vi: {
      title: 'Thông Số Chi Tiết',
      name: 'Tên chi tiết',
      quantity: 'Số lượng',
      maxPossible: 'Tối đa có thể',
      customQty: 'Số lượng tùy chỉnh',
      priority: 'Ưu tiên',
      symmetry: 'Đối xứng',
      rotation: 'Xoay',
      smallPart: 'Chi tiết nhỏ',
      preview: 'Xem Trước',
      size: 'Kích thước',
      cancel: 'Hủy',
      ok: 'Xác Nhận'
    },
    en: {
      title: 'Part Parameters',
      name: 'Part name',
      quantity: 'Quantity',
      maxPossible: 'Max Possible',
      customQty: 'Custom Quantity',
      priority: 'Priority',
      symmetry: 'Symmetry',
      rotation: 'Rotation',
      smallPart: 'Small Part',
      kit: 'Kit Number',
      preview: 'Preview',
      size: 'Size',
      cancel: 'Cancel',
      ok: 'OK'
    },
    jp: {
      title: '部品パラメータ',
      name: '部品名',
      quantity: '数量',
      maxPossible: '最大可能',
      customQty: 'カスタム数量',
      priority: '優先度',
      symmetry: '対称',
      rotation: '回転',
      smallPart: '小部品',
      kit: 'キット番号',
      preview: 'プレビュー',
      size: 'サイズ',
      cancel: 'キャンセル',
      ok: 'OK'
    }
  };

  const t = texts[lang];

  // Convert geometry to preview format
  const geometryForPreview = React.useMemo(() => {
    if (!selectedGeometry) return undefined;
    
    // If selectedGeometry is an array of CAD entities
    if (Array.isArray(selectedGeometry)) {
      return cadEntitiesToGeometry(selectedGeometry);
    }
    
    // If selectedGeometry already has paths
    if (selectedGeometry.paths) {
      return selectedGeometry;
    }
    
    return undefined;
  }, [selectedGeometry]);

  const handleConfirm = () => {
    // Generate thumbnail from geometry if not provided
    let finalThumbnail = thumbnail;
    if (!finalThumbnail && geometryForPreview) {
      finalThumbnail = generateThumbnail(geometryForPreview, 200, 200);
    }

    const newPart: NestingPart = {
      id: `part-${Date.now()}`,
      name: params.name,
      size: geometrySize,
      quantity: params.maxPossible ? 999 : (params.customQty || params.quantity),
      priority: params.priority,
      symmetry: params.symmetry,
      rotation: params.rotation,
      isSmallPart: params.isSmallPart,
      kitNumber: params.kitNumber,
      geometry: selectedGeometry,
      thumbnail: finalThumbnail
    };

    onConfirm(newPart);
    onClose();
  };

  if (!isOpen) return null;

  // Modal content - Rendered directly inside Canvas (no Portal)
  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".window-header"
      defaultPosition={position}
      position={position}
      onDrag={handleDrag}
      bounds="parent"
        onStart={() => {
          // no-op for now, reserved for future (e.g., bringToFront)
        }}
        onStop={() => {
          // Ensure modal remains fully inside parent after drag ends
          const node = nodeRef.current;
          if (!node) return;
          const rect = node.getBoundingClientRect();
          const vw = window.innerWidth;
          const vh = window.innerHeight;

          let nx = position.x;
          let ny = position.y;

          // If right edge out of viewport
          if (rect.right > vw - 10) {
            nx = Math.max(10, position.x - (rect.right - vw) - 10);
          }
          // If left edge out
          if (rect.left < 10) {
            nx = Math.min(position.x + (10 - rect.left), vw - rect.width - 10);
          }
          // If bottom out
          if (rect.bottom > vh - 10) {
            ny = Math.max(10, position.y - (rect.bottom - vh) - 10);
          }
          // If top out
          if (rect.top < 10) {
            ny = Math.min(position.y + (10 - rect.top), vh - rect.height - 10);
          }

          // Update position if changed
          if (nx !== position.x || ny !== position.y) {
            setPosition({ x: nx, y: ny });
          }
        }}
      >
        <motion.div
          ref={nodeRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          style={{ width: scale.width }}
          className="pointer-events-auto absolute max-h-[90vh] bg-gray-900 rounded-xl shadow-2xl border border-cyan-500/30 flex flex-col overflow-hidden z-50"
        >
          {/* Header - Draggable Handle */}
          <div className="window-header bg-gradient-to-r from-cyan-900/50 to-blue-900/50 px-4 py-2.5 cursor-move border-b border-cyan-500/30 flex items-center justify-between select-none rounded-t-xl">
            <h3 className="text-base font-bold text-white">{t.title}</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {/* Preview - Vector Rendering */}
            <div className="flex items-center gap-3">
              <div className="w-32 h-32 bg-gray-800 rounded-lg border border-cyan-500/20 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                {geometryForPreview ? (
                  <VectorPreview 
                    geometry={geometryForPreview} 
                    width={120} 
                    height={120}
                    className="w-full h-full"
                  />
                ) : thumbnail ? (
                  <img src={thumbnail} alt="Part preview" className="max-w-full max-h-full" />
                ) : (
                  <div className="text-center">
                    <div className="text-gray-500 text-xs mb-1">{t.preview}</div>
                    <div className="text-gray-600 text-[10px]">No Geometry</div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="text-xs text-gray-400">
                  {t.size}: <span className="text-white text-sm font-semibold">{geometrySize.width.toFixed(2)} × {geometrySize.height.toFixed(2)} mm</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-green-500 rounded"></div>
                      <span>Geometry/Feed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-red-500 rounded"></div>
                      <span>Rapid (G0)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t.name}</label>
              <input
                type="text"
                value={params.name}
                onChange={(e) => setParams({ ...params, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t.quantity}</label>
              <div className="space-y-1.5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={params.maxPossible}
                    onChange={(e) => setParams({ ...params, maxPossible: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white text-sm">{t.maxPossible}</span>
                </label>
                {!params.maxPossible && (
                  <input
                    type="number"
                    value={params.quantity}
                    onChange={(e) => setParams({ ...params, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                    className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">{t.priority}</label>
              <select
                value={params.priority}
                onChange={(e) => setParams({ ...params, priority: parseInt(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
              >
                <option value={1}>1 (Cao nhất)</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5 (Thấp nhất)</option>
              </select>
            </div>

            {/* Symmetry & Rotation */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t.symmetry}</label>
                <select
                  value={params.symmetry}
                  onChange={(e) => setParams({ ...params, symmetry: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="both">Both</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t.rotation}</label>
                <select
                  value={params.rotation}
                  onChange={(e) => setParams({ ...params, rotation: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="any">Any</option>
                </select>
              </div>
            </div>

            {/* Small Part & Kit Number */}
            <div className="flex gap-4">
              <div className="flex-1">
                 <label className="block text-xs font-medium text-gray-400 mb-1">{t.kit}</label>
                 <input
                    type="text"
                    value={params.kitNumber || ''}
                    onChange={(e) => setParams({ ...params, kitNumber: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                    placeholder="Optional"
                 />
              </div>
              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={params.isSmallPart}
                    onChange={(e) => setParams({ ...params, isSmallPart: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white text-sm">{t.smallPart}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-gray-800/50 border-t border-cyan-500/20 rounded-b-xl flex-shrink-0">
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-4 py-1 text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              {t.ok}
            </button>
          </div>
        </motion.div>
      </Draggable>
    );
};

export default PartParametersDialog;
