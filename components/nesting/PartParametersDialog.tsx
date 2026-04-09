// ============================================================
// PART PARAMETERS DIALOG
// Dialog for entering part parameters after selecting geometry
// Appears after user presses Enter when selecting parts
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Package, Palette, Type } from 'lucide-react';
import DrawingWorkspace from './DrawingWorkspace';

interface PartParametersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (params: PartParameters) => void;
  partData: {
    width: number;
    height: number;
    area: number;
    geometry: any[];
  } | null;
  defaultName?: string;
}

export interface PartParameters {
  name: string;
  quantityMode: 'max' | 'custom';
  customQuantity: number;
}

const PartParametersDialog: React.FC<PartParametersDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  partData,
  defaultName = 'Part 1'
}) => {
  const [inputMode, setInputMode] = useState<'input' | 'draw'>('input');
  const [name, setName] = useState(defaultName);
  const [quantityMode, setQuantityMode] = useState<'max' | 'custom'>('custom');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [partWidth, setPartWidth] = useState(partData?.width || 100);
  const [partHeight, setPartHeight] = useState(partData?.height || 100);

  const handleConfirm = () => {
    onConfirm({
      name,
      quantityMode,
      customQuantity
    });
    // Reset form
    setName(defaultName);
    setInputMode('input');
    setQuantityMode('custom');
    setCustomQuantity(1);
    setPartWidth(partData?.width || 100);
    setPartHeight(partData?.height || 100);
  };

  const handleDrawingComplete = (entities: any[]) => {
    if (entities.length > 0 && entities[0].type === 'rect') {
      const geom = entities[0];
      const w = Math.abs(geom.points[1].x - geom.points[0].x);
      const h = Math.abs(geom.points[1].y - geom.points[0].y);
      setPartWidth(Math.round(w));
      setPartHeight(Math.round(h));
      setInputMode('input');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!partData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101]"
          >
            <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 w-[600px] overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600/30 rounded-lg">
                    <Package className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Thông Số Chi Tiết</h3>
                    <p className="text-xs text-slate-400">Nhập thông tin cho part vừa chọn</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Mode Toggle */}
              <div className="px-6 py-2 border-b border-slate-700 flex gap-2">
                <div className="flex gap-1 bg-slate-700 p-1 rounded">
                  <button
                    onClick={() => setInputMode('input')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                      inputMode === 'input'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Type size={12} />
                    Nhập Số
                  </button>
                  <button
                    onClick={() => setInputMode('draw')}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                      inputMode === 'draw'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-slate-300'
                    }`}
                  >
                    <Palette size={12} />
                    Vẽ Kích Thước
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
                {inputMode === 'draw' ? (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-cyan-400 font-medium">
                      💡 Vẽ hình chữ nhật để xác định kích thước part
                    </div>
                    <DrawingWorkspace
                      activeDrawTool="rect"
                      onCadEntitiesChange={handleDrawingComplete}
                      width={520}
                      height={280}
                    />
                  </div>
                ) : (
                  <>
                    {/* Part Info Preview */}
                    <div className="bg-slate-600/50 rounded-lg p-4 border border-slate-500">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-xs text-slate-300 mb-1">Chiều Rộng</div>
                          <div className="text-lg font-bold text-cyan-400">{partWidth.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-300 mb-1">Chiều Cao</div>
                          <div className="text-lg font-bold text-cyan-400">{partHeight.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-300 mb-1">Diện Tích</div>
                          <div className="text-lg font-bold text-cyan-400">{(partWidth * partHeight).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Part Dimensions */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                          Chiều Rộng (mm)
                        </label>
                        <input
                          type="number"
                          value={partWidth}
                          onChange={(e) => setPartWidth(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                          Chiều Cao (mm)
                        </label>
                        <input
                          type="number"
                          value={partHeight}
                          onChange={(e) => setPartHeight(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2.5 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Part Name Input */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">
                        Tên Chi Tiết <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tên chi tiết..."
                        autoFocus
                        className="w-full px-4 py-2.5 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Quantity Mode */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-3">
                        Số Lượng <span className="text-red-400">*</span>
                      </label>
                      
                      <div className="space-y-3">
                        {/* Max Possible Option */}
                        <label
                          className={`
                            flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${quantityMode === 'max' 
                              ? 'bg-purple-600/20 border-purple-500' 
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name="quantityMode"
                            value="max"
                            checked={quantityMode === 'max'}
                            onChange={() => setQuantityMode('max')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-white">Max Possible</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              Sử dụng tối đa số lượng có thể từ tấm ván
                            </div>
                          </div>
                        </label>

                        {/* Custom Quantity Option */}
                        <label
                          className={`
                            flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                            ${quantityMode === 'custom' 
                              ? 'bg-purple-600/20 border-purple-500' 
                              : 'bg-slate-700/50 border-slate-600 hover:border-slate-500'
                            }
                          `}
                        >
                          <input
                            type="radio"
                            name="quantityMode"
                            value="custom"
                            checked={quantityMode === 'custom'}
                            onChange={() => setQuantityMode('custom')}
                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-2">Custom Quantity</div>
                            <input
                              type="number"
                              min="1"
                              value={customQuantity}
                              onChange={(e) => {
                                setCustomQuantity(parseInt(e.target.value) || 1);
                                setQuantityMode('custom');
                              }}
                              onKeyDown={handleKeyDown}
                              disabled={quantityMode !== 'custom'}
                              className={`
                                w-full px-3 py-2 rounded-lg text-white
                                ${quantityMode === 'custom'
                                  ? 'bg-slate-700 border border-slate-500 focus:ring-2 focus:ring-purple-500'
                                  : 'bg-slate-700/50 border border-slate-600 text-slate-400 cursor-not-allowed'
                                }
                                focus:outline-none transition-all
                              `}
                            />
                          </div>
                        </label>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg font-semibold text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all"
                >
                  Hủy (ESC)
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!name.trim()}
                  className={`
                    px-6 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 transition-all
                    ${!name.trim()
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-xl'
                    }
                  `}
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận (ENTER)</span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PartParametersDialog;
