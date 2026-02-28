// ============================================================
// VJP26 PART LIST PANEL - ALPHACAM STYLE
// Manage Parts for Nesting
// ============================================================

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Package, RotateCw, Copy, ChevronDown } from 'lucide-react';
import { NestingPart } from '../../types';
import VectorPreview, { cadEntitiesToGeometry } from './NewNestList/VectorPreview';

export interface PartListPanelProps {
    parts: NestingPart[];
    selectedPartIds: Set<string>;
    onSelectPart: (id: string, multi?: boolean) => void;
    onAddPart: (part: NestingPart) => void;
    onUpdatePart: (part: NestingPart) => void;
    onDeletePart: (id: string) => void;
    onDuplicatePart: (id: string) => void;
    onClearAll: () => void;
    onImportFromDrawing: () => void;
}

const ROTATION_OPTIONS = ['0', '90', '180', '270', 'Free'] as const;

const COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
];

const PartListPanel: React.FC<PartListPanelProps> = ({
    parts,
    selectedPartIds,
    onSelectPart,
    onAddPart,
    onUpdatePart,
    onDeletePart,
    onDuplicatePart,
    onClearAll,
    onImportFromDrawing
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPart, setNewPart] = useState<Partial<NestingPart>>({
        name: 'Part',
        width: 100,
        height: 50,
        quantity: 1,
        color: COLORS[0],
        rotationAllowed: true,
        priority: 1,
        enabled: true
    });

    const handleAddPart = () => {
        const part: NestingPart = {
            id: `part_${Date.now()}`,
            label: newPart.name || 'Part',
            name: newPart.name || 'Part',
            width: newPart.width || 100,
            height: newPart.height || 50,
            quantity: newPart.quantity || 1,
            color: newPart.color || COLORS[Math.floor(Math.random() * COLORS.length)],
            rotationAllowed: newPart.rotationAllowed ?? true,
            priority: newPart.priority || 1,
            enabled: true
        };
        onAddPart(part);
        setShowAddForm(false);
        setNewPart({
            name: 'Part',
            width: 100,
            height: 50,
            quantity: 1,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            rotationAllowed: true,
            priority: 1,
            enabled: true
        });
    };

    const updatePartField = (part: NestingPart, field: keyof NestingPart, value: any) => {
        onUpdatePart({ ...part, [field]: value });
    };

    const totalParts = parts.reduce((sum, p) => sum + (p.enabled ? p.quantity : 0), 0);
    const totalArea = parts.reduce((sum, p) => sum + (p.enabled ? p.width * p.height * p.quantity : 0), 0);

    return (
        <div className="h-full flex flex-col bg-slate-800 border-r border-slate-700">
            {/* Header */}
            <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-cyan-400" />
                        <span className="font-bold text-white text-sm">Part List</span>
                    </div>
                    <span className="text-xs text-slate-400">{parts.length} types / {totalParts} pcs</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-700 bg-slate-800/50">
                <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white"
                >
                    <Plus size={12} />
                    Add
                </button>
                <button
                    onClick={onImportFromDrawing}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white"
                    title="Import from Drawing"
                >
                    <Package size={12} />
                    Import
                </button>
                <div className="flex-1" />
                <button
                    onClick={onClearAll}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded"
                    title="Clear All"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Part List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {parts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <Package size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No parts yet</p>
                        <p className="text-xs">Add parts or import from drawing</p>
                    </div>
                ) : (
                    parts.map((part, index) => (
                        <div
                            key={part.id}
                            onClick={() => onSelectPart(part.id)}
                            className={`
                                relative p-2 rounded-lg cursor-pointer transition-all text-xs
                                ${selectedPartIds.has(part.id)
                                    ? 'bg-blue-600/20 border border-blue-500'
                                    : 'bg-slate-700/30 border border-transparent hover:border-slate-600'}
                                ${!part.enabled ? 'opacity-50' : ''}
                            `}
                        >
                            {/* Color indicator */}
                            <div
                                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                                style={{ backgroundColor: part.color }}
                            />

                            <div className="flex items-center gap-2 pl-2">
                                {/* Enable checkbox */}
                                <input
                                    type="checkbox"
                                    checked={part.enabled}
                                    onChange={e => { e.stopPropagation(); updatePartField(part, 'enabled', e.target.checked); }}
                                    className="accent-blue-500"
                                />

                                {/* Preview - Real Geometry */}
                                <div className="w-8 h-8 bg-black border border-slate-600 mr-2 flex items-center justify-center shrink-0">
                                    <VectorPreview
                                        geometry={(() => {
                                            if ((part as any).cadEntities?.length > 0) {
                                                const geo = cadEntitiesToGeometry((part as any).cadEntities);
                                                if (geo.paths.length > 0) return geo;
                                            }
                                            return { paths: [{ type: 'polyline' as const, points: part.geometry }] };
                                        })()}
                                        width={32}
                                        height={32}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white truncate">{part.name}</div>
                                    <div className="text-[10px] text-slate-400">
                                        {part.width} × {part.height} mm
                                    </div>
                                </div>

                                {/* Quantity */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={e => { e.stopPropagation(); updatePartField(part, 'quantity', Math.max(1, part.quantity - 1)); }}
                                        className="w-5 h-5 flex items-center justify-center bg-slate-600 hover:bg-slate-500 rounded text-white"
                                    >
                                        -
                                    </button>
                                    <span className="w-6 text-center text-white font-medium">{part.quantity}</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); updatePartField(part, 'quantity', part.quantity + 1); }}
                                        className="w-5 h-5 flex items-center justify-center bg-slate-600 hover:bg-slate-500 rounded text-white"
                                    >
                                        +
                                    </button>
                                </div>

                                {/* Rotation toggle */}
                                <button
                                    onClick={e => { e.stopPropagation(); updatePartField(part, 'rotationAllowed', !part.rotationAllowed); }}
                                    className={`p-1.5 rounded ${part.rotationAllowed ? 'bg-green-600/20 text-green-400' : 'text-slate-500'}`}
                                    title={part.rotationAllowed ? 'Rotation allowed' : 'Rotation disabled'}
                                >
                                    <RotateCw size={12} />
                                </button>

                                {/* Actions */}
                                <button
                                    onClick={e => { e.stopPropagation(); onDuplicatePart(part.id); }}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                                    title="Duplicate"
                                >
                                    <Copy size={12} />
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); onDeletePart(part.id); }}
                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded"
                                    title="Delete"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats Footer */}
            <div className="px-3 py-2 border-t border-slate-700 bg-slate-900/50 text-[10px] text-slate-400 flex justify-between">
                <span>Total: {totalParts} pcs</span>
                <span>Area: {(totalArea / 1000000).toFixed(2)} m²</span>
            </div>

            {/* Add Part Modal */}
            {showAddForm && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 w-72 shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-white">Add New Part</span>
                            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-slate-500">Name</label>
                                <input
                                    type="text"
                                    value={newPart.name}
                                    onChange={e => setNewPart(p => ({ ...p, name: e.target.value }))}
                                    className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-500">Width (mm)</label>
                                    <input
                                        type="number"
                                        value={newPart.width}
                                        onChange={e => setNewPart(p => ({ ...p, width: Number(e.target.value) }))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500">Height (mm)</label>
                                    <input
                                        type="number"
                                        value={newPart.height}
                                        onChange={e => setNewPart(p => ({ ...p, height: Number(e.target.value) }))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-slate-500">Quantity</label>
                                    <input
                                        type="number"
                                        value={newPart.quantity}
                                        min={1}
                                        onChange={e => setNewPart(p => ({ ...p, quantity: Number(e.target.value) }))}
                                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-xs text-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500">Color</label>
                                    <div className="flex gap-1 flex-wrap">
                                        {COLORS.slice(0, 5).map(c => (
                                            <button
                                                key={c}
                                                onClick={() => setNewPart(p => ({ ...p, color: c }))}
                                                className={`w-5 h-5 rounded ${newPart.color === c ? 'ring-2 ring-white' : ''}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-white">
                                <input
                                    type="checkbox"
                                    checked={newPart.rotationAllowed}
                                    onChange={e => setNewPart(p => ({ ...p, rotationAllowed: e.target.checked }))}
                                    className="accent-blue-500"
                                />
                                Allow Rotation
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPart}
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded font-medium"
                            >
                                Add Part
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PartListPanel;
