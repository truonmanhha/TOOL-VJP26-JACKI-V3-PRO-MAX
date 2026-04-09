import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCw, Maximize2, FlipHorizontal } from 'lucide-react';
import { NestingPart } from '../../types';

interface AddPartDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (part: NestingPart) => void;
    editPart?: NestingPart | null;
}

const ROTATION_OPTIONS = [
    { value: 'none', label: 'Không xoay (0°)', degrees: 0 },
    { value: '90', label: '90°', degrees: 90 },
    { value: '180', label: '180°', degrees: 180 },
    { value: '270', label: '270°', degrees: 270 },
    { value: 'any', label: 'Tự do (Any)', degrees: -1 },
];

const PRIORITY_OPTIONS = [
    { value: 1, label: '1 - Cao nhất' },
    { value: 2, label: '2 - Cao' },
    { value: 3, label: '3 - Bình thường' },
    { value: 4, label: '4 - Thấp' },
    { value: 5, label: '5 - Thấp nhất' },
];

const COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const AddPartDialog: React.FC<AddPartDialogProps> = ({ isOpen, onClose, onAdd, editPart }) => {
    const [name, setName] = useState('');
    const [width, setWidth] = useState(100);
    const [height, setHeight] = useState(100);
    const [quantity, setQuantity] = useState(1);
    const [priority, setPriority] = useState(3);
    const [mirrorAllowed, setMirrorAllowed] = useState(false);
    const [rotation, setRotation] = useState('any');
    const [isSmallPart, setIsSmallPart] = useState(false);
    const [kitNumber, setKitNumber] = useState('');
    const [color, setColor] = useState(COLORS[0]);

    // Reset form when dialog opens or editPart changes
    useEffect(() => {
        if (editPart) {
            setName(editPart.name);
            setWidth(editPart.width);
            setHeight(editPart.height);
            setQuantity(editPart.quantity);
            setPriority(editPart.priority || 3);
            setMirrorAllowed(editPart.mirrorAllowed || false);
            setRotation(editPart.rotationAllowed ? 'any' : 'none');
            setIsSmallPart(editPart.isSmallPart || false);
            setKitNumber(editPart.kitNumber?.toString() || '');
            setColor(editPart.color || COLORS[0]);
        } else if (isOpen) {
            // Reset to defaults for new part
            setName('');
            setWidth(100);
            setHeight(100);
            setQuantity(1);
            setPriority(3);
            setMirrorAllowed(false);
            setRotation('any');
            setIsSmallPart(false);
            setKitNumber('');
            setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
        }
    }, [isOpen, editPart]);

    const handleSubmit = () => {
        if (!name.trim() || width <= 0 || height <= 0 || quantity <= 0) {
            alert('Vui lòng điền đầy đủ thông tin hợp lệ');
            return;
        }

        const part: NestingPart = {
            id: editPart?.id || `part_${Date.now()}`,
            name: name.trim(),
            label: name.slice(0, 3).toUpperCase(),
            width,
            height,
            quantity,
            priority,
            mirrorAllowed,
            rotationAllowed: rotation === 'any',
            rotation: rotation === 'any' ? undefined : parseInt(rotation) || 0,
            isSmallPart,
            kitNumber: kitNumber || undefined,
            color,
            enabled: true,
        };

        onAdd(part);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-slate-800 rounded-xl shadow-2xl w-[500px] border border-slate-600"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-slate-600 rounded-t-xl">
                        <h2 className="text-white font-bold">
                            {editPart ? 'Chỉnh sửa Chi tiết' : 'Thêm Chi tiết Mới'}
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {/* Row 1: Name & Color */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Tên chi tiết *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                    placeholder="VD: Mặt bàn, Chân ghế..."
                                    autoFocus
                                />
                            </div>
                            <div className="w-20">
                                <label className="block text-xs text-slate-400 mb-1">Màu</label>
                                <div className="flex flex-wrap gap-1">
                                    {COLORS.slice(0, 4).map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setColor(c)}
                                            className={`w-5 h-5 rounded ${color === c ? 'ring-2 ring-white' : ''}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Dimensions */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Chiều rộng (mm) *</label>
                                <input
                                    type="number"
                                    value={width}
                                    onChange={e => setWidth(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                    min={1}
                                />
                            </div>
                            <div className="flex items-end pb-2 text-slate-500">×</div>
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Chiều cao (mm) *</label>
                                <input
                                    type="number"
                                    value={height}
                                    onChange={e => setHeight(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                    min={1}
                                />
                            </div>
                        </div>

                        {/* Row 3: Quantity & Priority */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Số lượng *</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                    min={1}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Độ ưu tiên</label>
                                <select
                                    value={priority}
                                    onChange={e => setPriority(parseInt(e.target.value))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                >
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 4: Rotation */}
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">
                                <RotateCw size={12} className="inline mr-1" /> Xoay cho phép
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {ROTATION_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setRotation(opt.value)}
                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${rotation === opt.value
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 5: Options */}
                        <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={mirrorAllowed}
                                    onChange={e => setMirrorAllowed(e.target.checked)}
                                    className="accent-cyan-500"
                                />
                                <FlipHorizontal size={14} className="text-slate-400" />
                                <span className="text-sm text-white">Cho phép lật gương</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isSmallPart}
                                    onChange={e => setIsSmallPart(e.target.checked)}
                                    className="accent-cyan-500"
                                />
                                <Maximize2 size={14} className="text-slate-400" />
                                <span className="text-sm text-white">Small Part</span>
                            </label>
                        </div>

                        {/* Row 6: Kit Number */}
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-xs text-slate-400 mb-1">Kit Number (tùy chọn)</label>
                                <input
                                    type="number"
                                    value={kitNumber}
                                    onChange={e => setKitNumber(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                                    placeholder="Nhóm Kit"
                                    min={1}
                                />
                            </div>
                            <div className="flex-1">
                                {/* Preview */}
                                <label className="block text-xs text-slate-400 mb-1">Xem trước</label>
                                <div
                                    className="h-[38px] rounded border border-slate-600 flex items-center justify-center text-xs text-white"
                                    style={{ backgroundColor: color + '40' }}
                                >
                                    {name || 'Part'} ({width}×{height}) ×{quantity}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 px-4 py-3 bg-slate-900/50 border-t border-slate-600 rounded-b-xl">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded text-white text-sm font-medium"
                        >
                            <Check size={16} />
                            {editPart ? 'Cập nhật' : 'Thêm chi tiết'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AddPartDialog;
