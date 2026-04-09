import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus, Database, Palette, Type } from 'lucide-react';
import { NestingSheet } from '../../types';
import DrawingWorkspace from './DrawingWorkspace';

interface SheetDatabaseDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectSheet: (sheet: NestingSheet) => void;
    existingSheets: NestingSheet[];
}

// Vietnamese standard sheet sizes
const PRESET_SHEETS = [
    { material: 'MDF', name: 'MDF 18mm', width: 1220, height: 2440, thickness: 18 },
    { material: 'MDF', name: 'MDF 15mm', width: 1220, height: 2440, thickness: 15 },
    { material: 'MDF', name: 'MDF 12mm', width: 1220, height: 2440, thickness: 12 },
    { material: 'MDF', name: 'MDF 6mm', width: 1220, height: 2440, thickness: 6 },
    { material: 'Plywood', name: 'Plywood 18mm', width: 1220, height: 2440, thickness: 18 },
    { material: 'Plywood', name: 'Plywood 12mm', width: 1220, height: 2440, thickness: 12 },
    { material: 'Plywood', name: 'Plywood 9mm', width: 1220, height: 2440, thickness: 9 },
    { material: 'Plywood', name: 'Plywood 6mm', width: 1220, height: 2440, thickness: 6 },
    { material: 'Plywood', name: 'Plywood 3mm', width: 1220, height: 2440, thickness: 3 },
    { material: 'Ván dán', name: 'Ván dán 15mm', width: 1220, height: 2440, thickness: 15 },
    { material: 'Ván dán', name: 'Ván dán 10mm', width: 1220, height: 2440, thickness: 10 },
    { material: 'Ván dán', name: 'Ván dán 5mm', width: 1220, height: 2440, thickness: 5 },
    { material: 'Compact', name: 'Compact 18mm', width: 1220, height: 2440, thickness: 18 },
    { material: 'Compact', name: 'Compact 12mm', width: 1220, height: 2440, thickness: 12 },
    { material: 'Melamine', name: 'Melamine 18mm', width: 1220, height: 2440, thickness: 18 },
    { material: 'Melamine', name: 'Melamine 15mm', width: 1220, height: 2440, thickness: 15 },
    { material: 'MDF', name: 'MDF Half Sheet', width: 1220, height: 1220, thickness: 18 },
    { material: 'Plywood', name: 'Plywood Small', width: 610, height: 1220, thickness: 12 },
];

const MATERIAL_COLORS: Record<string, string> = {
    'MDF': '#3b82f6',
    'Plywood': '#22c55e',
    'Ván dán': '#f59e0b',
    'Compact': '#8b5cf6',
    'Melamine': '#ec4899',
};

const SheetDatabaseDialog: React.FC<SheetDatabaseDialogProps> = ({
    isOpen,
    onClose,
    onSelectSheet,
    existingSheets
}) => {
    const [inputMode, setInputMode] = useState<'input' | 'draw'>('input');
    const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [customMargin, setCustomMargin] = useState(10);
    const [filterMaterial, setFilterMaterial] = useState<string>('all');
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customMaterial, setCustomMaterial] = useState('MDF');
    const [customWidth, setCustomWidth] = useState(1220);
    const [customHeight, setCustomHeight] = useState(2440);
    const [customThickness, setCustomThickness] = useState(18);

    const materials = ['all', ...Array.from(new Set(PRESET_SHEETS.map(s => s.material)))];
    const filteredSheets = filterMaterial === 'all'
        ? PRESET_SHEETS
        : PRESET_SHEETS.filter(s => s.material === filterMaterial);

    const handleDrawingComplete = (entities: any[]) => {
        if (entities.length > 0 && entities[0].type === 'rect') {
            const geom = entities[0];
            const w = Math.abs(geom.points[1].x - geom.points[0].x);
            const h = Math.abs(geom.points[1].y - geom.points[0].y);
            setCustomWidth(Math.round(w));
            setCustomHeight(Math.round(h));
            setInputMode('input');
        }
    };

    const handleAddSheet = () => {
        if (selectedPreset === null && !showCustomForm) return;

        let sheet: NestingSheet;

        if (showCustomForm) {
            sheet = {
                id: `sheet_${Date.now()}`,
                name: customName || `${customMaterial} ${customThickness}mm`,
                material: customMaterial,
                width: customWidth,
                height: customHeight,
                thickness: customThickness,
                margin: customMargin,
                quantity,
            };
        } else {
            const preset = filteredSheets[selectedPreset!];
            sheet = {
                id: `sheet_${Date.now()}`,
                name: preset.name,
                material: preset.material,
                width: preset.width,
                height: preset.height,
                thickness: preset.thickness,
                margin: customMargin,
                quantity,
            };
        }

        onSelectSheet(sheet);
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
                    className="bg-slate-800 rounded-xl shadow-2xl max-h-[80vh] flex flex-col border border-slate-600"
                    style={{ width: inputMode === 'draw' && customMargin >= 0 ? '900px' : '700px' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-b border-slate-600 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <Database size={18} className="text-green-400" />
                            <h2 className="text-white font-bold">Thư viện Ván / Sheet Database</h2>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Controls Bar */}
                    <div className="px-4 py-2 border-b border-slate-700 flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-slate-400">Lọc:</span>
                        <div className="flex gap-1">
                            {materials.map(m => (
                                <button
                                    key={m}
                                    onClick={() => setFilterMaterial(m)}
                                    className={`px-2 py-1 rounded text-xs ${filterMaterial === m
                                        ? 'bg-green-600 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                    }`}
                                >
                                    {m === 'all' ? 'Tất cả' : m}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1" />

                        {/* Mode Toggle */}
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

                        <button
                            onClick={() => setShowCustomForm(!showCustomForm)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium ${
                                showCustomForm
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            <Plus size={14} />
                            {showCustomForm ? 'Danh sách' : 'Tạo mới'}
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden flex gap-2 p-2">
                        {/* Left: Sheet List or Drawing */}
                        <div className="flex-1 overflow-y-auto bg-slate-900/30 rounded border border-slate-700 p-2">
                            {inputMode === 'draw' ? (
                                <div className="flex flex-col gap-2 h-full">
                                    <div className="text-xs text-cyan-400 font-medium px-2">
                                        💡 Vẽ hình chữ nhật để xác định kích thước ván
                                    </div>
                                    <DrawingWorkspace
                                        activeDrawTool="rect"
                                        onCadEntitiesChange={handleDrawingComplete}
                                        width={430}
                                        height={380}
                                    />
                                </div>
                            ) : showCustomForm ? (
                                <div className="p-4 space-y-4">
                                    <div className="text-xs text-slate-400 mb-2">Tạo ván tùy chỉnh:</div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Tên ván</label>
                                            <input
                                                type="text"
                                                value={customName}
                                                onChange={e => setCustomName(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                                placeholder="VD: MDF Custom"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Chất liệu</label>
                                            <select
                                                value={customMaterial}
                                                onChange={e => setCustomMaterial(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                            >
                                                {Object.keys(MATERIAL_COLORS).map(m => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Rộng (mm)</label>
                                            <input
                                                type="number"
                                                value={customWidth}
                                                onChange={e => setCustomWidth(parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Cao (mm)</label>
                                            <input
                                                type="number"
                                                value={customHeight}
                                                onChange={e => setCustomHeight(parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Dày (mm)</label>
                                            <input
                                                type="number"
                                                value={customThickness}
                                                onChange={e => setCustomThickness(parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {filteredSheets.map((sheet, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedPreset(idx)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedPreset === idx
                                                    ? 'border-green-500 bg-green-900/30'
                                                    : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <div
                                                    className="w-3 h-3 rounded"
                                                    style={{ backgroundColor: MATERIAL_COLORS[sheet.material] || '#6b7280' }}
                                                />
                                                <span className="text-sm font-medium text-white">{sheet.name}</span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {sheet.width} × {sheet.height} mm • {sheet.thickness}mm
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right: Settings Panel */}
                        <div className="w-[220px] bg-slate-900/50 rounded border border-slate-700 p-3 flex flex-col gap-3 overflow-y-auto">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Số lượng</label>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    min={1}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1">Margin (mm)</label>
                                <input
                                    type="number"
                                    value={customMargin}
                                    onChange={e => setCustomMargin(Math.max(0, parseInt(e.target.value) || 0))}
                                    min={0}
                                    className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                                />
                            </div>

                            {/* Preview */}
                            {(selectedPreset !== null || showCustomForm) && (
                                <div className="flex-1 flex flex-col">
                                    <label className="block text-xs text-slate-400 mb-1">Xem trước</label>
                                    <div className="flex-1 bg-slate-800 rounded border border-slate-600 flex items-center justify-center p-2 min-h-[100px]">
                                        <div
                                            className="relative border-2 border-dashed border-green-500"
                                            style={{
                                                width: 80,
                                                height: (showCustomForm ? customHeight : filteredSheets[selectedPreset!]?.height || 2440)
                                                    / (showCustomForm ? customWidth : filteredSheets[selectedPreset!]?.width || 1220) * 80,
                                                maxHeight: 140
                                            }}
                                        >
                                            <div className="absolute inset-1 bg-green-900/30 flex items-center justify-center text-[7px] text-green-400 text-center overflow-hidden">
                                                {showCustomForm ? customWidth : filteredSheets[selectedPreset!]?.width}×{showCustomForm ? customHeight : filteredSheets[selectedPreset!]?.height}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                            onClick={handleAddSheet}
                            disabled={selectedPreset === null && !showCustomForm}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 rounded text-white text-sm font-medium"
                        >
                            <Check size={16} />
                            Thêm ván
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SheetDatabaseDialog;
