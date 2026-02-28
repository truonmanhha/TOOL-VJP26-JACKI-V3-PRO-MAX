// ============================================================
// PART LIST GRID - Panel 2
// Displays list of parts with editable properties
// ============================================================

import React from 'react';
import { Trash2, Edit2, GripVertical } from 'lucide-react';
import { Language } from '../../../constants';
import { NestingPart } from './types';

interface PartListGridProps {
  parts: NestingPart[];
  onUpdate: (id: string, updates: Partial<NestingPart>) => void;
  onDelete: (id: string) => void;
  lang?: Language;
}

const PartListGrid: React.FC<PartListGridProps> = ({
  parts,
  onUpdate,
  onDelete,
  lang = 'vi'
}) => {
  const texts = {
    vi: {
      name: 'Tên',
      size: 'Kích Thước',
      qty: 'SL',
      priority: 'Ưu Tiên',
      symmetry: 'Đối Xứng',
      rotation: 'Xoay',
      smallPart: 'Chi Tiết Nhỏ',
      actions: 'Thao Tác',
      empty: 'Chưa có chi tiết nào'
    },
    en: {
      name: 'Name',
      size: 'Size',
      qty: 'Qty',
      priority: 'Priority',
      symmetry: 'Symmetry',
      rotation: 'Rotation',
      smallPart: 'Small Part',
      actions: 'Actions',
      empty: 'No parts yet'
    },
    jp: {
      name: '名前',
      size: 'サイズ',
      qty: '数量',
      priority: '優先度',
      symmetry: '対称',
      rotation: '回転',
      smallPart: '小部品',
      actions: '操作',
      empty: '部品がありません'
    }
  };

  const t = texts[lang];

  if (parts.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-gray-800 border-b border-cyan-500/20">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400"></th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400">{t.name}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400">{t.size}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.qty}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.priority}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.symmetry}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.rotation}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.smallPart}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr
              key={part.id}
              className="border-b border-gray-700/50 hover:bg-cyan-500/5 transition-colors"
            >
              {/* Drag Handle */}
              <td className="px-3 py-2">
                <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
              </td>

              {/* Name */}
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={part.name}
                  onChange={(e) => onUpdate(part.id, { name: e.target.value })}
                  className="w-full bg-transparent text-white px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                />
              </td>

              {/* Size */}
              <td className="px-3 py-2 text-gray-300">
                {part.size.width} × {part.size.height}
              </td>

              {/* Quantity */}
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={part.quantity}
                  onChange={(e) => onUpdate(part.id, { quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-16 bg-transparent text-white text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                />
              </td>

              {/* Priority */}
              <td className="px-3 py-2">
                <select
                  value={part.priority}
                  onChange={(e) => onUpdate(part.id, { priority: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                >
                  <option value={1}>1 (Cao nhất)</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5 (Thấp nhất)</option>
                </select>
              </td>

              {/* Symmetry */}
              <td className="px-3 py-2">
                <select
                  value={part.symmetry}
                  onChange={(e) => onUpdate(part.id, { symmetry: e.target.value as any })}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                  <option value="both">Both</option>
                </select>
              </td>

              {/* Rotation */}
              <td className="px-3 py-2">
                <select
                  value={part.rotation}
                  onChange={(e) => onUpdate(part.id, { rotation: e.target.value as any })}
                  className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="any">Any</option>
                </select>
              </td>

              {/* Small Part */}
              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={part.isSmallPart}
                  onChange={(e) => onUpdate(part.id, { isSmallPart: e.target.checked })}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-cyan-500/30 rounded focus:ring-cyan-500"
                />
              </td>

              {/* Actions */}
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onDelete(part.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded transition-colors group"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartListGrid;
