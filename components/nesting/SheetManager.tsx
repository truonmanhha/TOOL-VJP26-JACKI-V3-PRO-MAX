// ============================================================
// VJP26 SHEET MANAGER - ALPHACAM STYLE
// Manage Material Sheets Database
// ============================================================

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Package, Layers } from 'lucide-react';
import { NestingSheet } from '../../types';

export interface SheetManagerProps {
    sheets: NestingSheet[];
    selectedSheetId: string | null;
    onSelectSheet: (id: string) => void;
    onAddSheet: (sheet: NestingSheet) => void;
    onUpdateSheet: (sheet: NestingSheet) => void;
    onDeleteSheet: (id: string) => void;
    onClose: () => void;
}

const MATERIALS = ['Gỗ MDF', 'Gỗ Plywood', 'Ván Ép', 'Inox', 'Nhôm', 'Thép', 'Mica', 'Acrylic'];
const COMMON_SIZES = [
    { name: '1220x2440 (4x8)', width: 1220, height: 2440 },
    { name: '1525x3050 (5x10)', width: 1525, height: 3050 },
    { name: '1830x2440 (6x8)', width: 1830, height: 2440 },
    { name: '1000x2000', width: 1000, height: 2000 },
];

const SheetManager: React.FC<SheetManagerProps> = ({
    sheets,
    selectedSheetId,
    onSelectSheet,
    onAddSheet,
    onUpdateSheet,
    onDeleteSheet,
    onClose
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSheet, setNewSheet] = useState<Partial<NestingSheet>>({
        width: 1220,
        height: 2440,
        margin: 10,
        material: 'Gỗ MDF',
        thickness: 18,
        quantity: 1
    });

    const handleAddSheet = () => {
        const sheet: NestingSheet = {
            id: `sheet_${Date.now()}`,
            name: `${newSheet.material} ${newSheet.width}x${newSheet.height}`,
            width: newSheet.width || 1220,
            height: newSheet.height || 2440,
            margin: newSheet.margin || 10,
            material: newSheet.material || 'Gỗ MDF',
            thickness: newSheet.thickness,
            quantity: newSheet.quantity
        };
        onAddSheet(sheet);
        setShowAddForm(false);
        setNewSheet({ width: 1220, height: 2440, margin: 10, material: 'Gỗ MDF', thickness: 18, quantity: 1 });
    };

    const applyCommonSize = (size: typeof COMMON_SIZES[0]) => {
        setNewSheet(prev => ({ ...prev, width: size.width, height: size.height }));
    };

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-[400px] max-h-[500px] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-700">
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-white">Sheet Manager</span>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <X size={18} />
                </button>
            </div>

            {/* Sheet List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {sheets.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Package size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có sheet nào</p>
                        <p className="text-xs">Click "Add Sheet" để thêm</p>
                    </div>
                ) : (
                    sheets.map(sheet => (
                        <div
                            key={sheet.id}
                            onClick={() => onSelectSheet(sheet.id)}
                            className={`
                                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                                ${selectedSheetId === sheet.id
                                    ? 'bg-blue-600/30 border border-blue-500'
                                    : 'bg-slate-700/50 border border-transparent hover:border-slate-600'}
                            `}
                        >
                            {/* Preview */}
                            <div className="w-12 h-12 bg-slate-900 rounded border border-slate-600 flex items-center justify-center">
                                <div
                                    className="bg-slate-600 rounded-sm"
                                    style={{
                                        width: sheet.width > sheet.height ? 36 : 24,
                                        height: sheet.width > sheet.height ? 24 : 36
                                    }}
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-white text-sm truncate">
                                    {sheet.name || `${sheet.width}x${sheet.height}`}
                                </div>
                                <div className="text-xs text-slate-400 flex items-center gap-2">
                                    <span>{sheet.material}</span>
                                    {sheet.thickness && <span>• {sheet.thickness}mm</span>}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    {sheet.width} × {sheet.height} mm | Margin: {sheet.margin}mm
                                </div>
                            </div>

                            {/* Quantity */}
                            {sheet.quantity && sheet.quantity > 1 && (
                                <div className="px-2 py-1 bg-cyan-600/20 text-cyan-400 rounded text-xs font-bold">
                                    ×{sheet.quantity}
                                </div>
                            )}

                            {/* Actions */}
                            <button
                                onClick={e => { e.stopPropagation(); onDeleteSheet(sheet.id); }}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Add Form */}
            {showAddForm ? (
                <div className="p-4 border-t border-slate-700 bg-slate-900/50 space-y-3">
                    <div className="text-sm font-medium text-white mb-2">New Sheet</div>

                    {/* Quick Size Buttons */}
                    <div className="flex flex-wrap gap-1">
                        {COMMON_SIZES.map(size => (
                            <button
                                key={size.name}
                                onClick={() => applyCommonSize(size)}
                                className="px-2 py-1 text-[10px] bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                            >
                                {size.name}
                            </button>
                        ))}
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500">Width (mm)</label>
                            <input
                                type="number"
                                value={newSheet.width}
                                onChange={e => setNewSheet(prev => ({ ...prev, width: Number(e.target.value) }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500">Height (mm)</label>
                            <input
                                type="number"
                                value={newSheet.height}
                                onChange={e => setNewSheet(prev => ({ ...prev, height: Number(e.target.value) }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500">Margin (mm)</label>
                            <input
                                type="number"
                                value={newSheet.margin}
                                onChange={e => setNewSheet(prev => ({ ...prev, margin: Number(e.target.value) }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            />
                        </div>
                    </div>

                    {/* Material & Thickness */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[10px] text-slate-500">Material</label>
                            <select
                                value={newSheet.material}
                                onChange={e => setNewSheet(prev => ({ ...prev, material: e.target.value }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            >
                                {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-slate-500">Thickness (mm)</label>
                            <input
                                type="number"
                                value={newSheet.thickness}
                                onChange={e => setNewSheet(prev => ({ ...prev, thickness: Number(e.target.value) }))}
                                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSheet}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium"
                        >
                            Add Sheet
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-3 border-t border-slate-700">
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white"
                    >
                        <Plus size={16} />
                        Add Sheet
                    </button>
                </div>
            )}
        </div>
    );
};

export default SheetManager;
