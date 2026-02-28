import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useNestingStore } from '../store';
import { NestingSheet } from '../types';

interface AddSheetDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddSheetDialog: React.FC<AddSheetDialogProps> = ({ isOpen, onClose }) => {
    const addSheet = useNestingStore(state => state.addSheet);
    const [formData, setFormData] = useState<Partial<NestingSheet>>({
        name: 'New Sheet',
        width: 2440,
        height: 1220,
        quantity: 1,
        material: 'MDF',
        thickness: 18,
        source: 'stock'
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addSheet({
            id: `S${Date.now()}`,
            name: formData.name || 'Sheet',
            width: Number(formData.width),
            height: Number(formData.height),
            quantity: Number(formData.quantity ?? 1),
            material: formData.material,
            thickness: formData.thickness,
            source: formData.source || 'stock'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-[420px] overflow-hidden">
                <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950">
                    <h3 className="font-bold text-white text-sm">Add New Sheet</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
                    <div>
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Width (mm)</label>
                            <input
                                type="number"
                                value={formData.width}
                                onChange={e => setFormData({ ...formData, width: Number(e.target.value) })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Height (mm)</label>
                            <input
                                type="number"
                                value={formData.height}
                                onChange={e => setFormData({ ...formData, height: Number(e.target.value) })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Material</label>
                            <input
                                type="text"
                                value={formData.material}
                                onChange={e => setFormData({ ...formData, material: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Thickness</label>
                            <input
                                type="number"
                                value={formData.thickness}
                                onChange={e => setFormData({ ...formData, thickness: Number(e.target.value) })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Source</label>
                            <select
                                value={formData.source}
                                onChange={e => setFormData({ ...formData, source: e.target.value as 'stock' | 'remnant' })}
                                className="w-full bg-slate-800 border border-slate-700 text-white text-sm px-2 py-1.5 rounded focus:border-blue-500 outline-none"
                            >
                                <option value="stock">Stock</option>
                                <option value="remnant">Remnant</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors shadow-lg shadow-blue-900/50">
                            <Check size={14} /> Add Sheet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
