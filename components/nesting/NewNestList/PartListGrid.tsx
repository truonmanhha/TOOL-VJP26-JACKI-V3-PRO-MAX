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
      size: 'Dimensions',
      qty: 'Required',
      priority: 'Priority',
      symmetry: 'Mirror',
      rotation: 'Rotation',
      smallPart: 'Small Part',
      kit: 'Kit Number',
      nested: 'Nested',
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
      kit: 'キット番号',
      nested: 'ネスト済み',
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
        <thead className="sticky top-0 bg-gray-800 border-b border-cyan-500/20 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400"></th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400 min-w-[120px]">{t.name}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400 min-w-[100px]">{t.size}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[60px]">{t.qty}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[80px]">{t.priority}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[90px]">{t.symmetry}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[80px]">{t.rotation}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[80px]">{t.smallPart}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[80px]">{t.kit}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[60px]">{t.nested}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400 w-[60px]">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {parts.map((part, index) => (
            <tr
              key={part.id}
              className="border-b border-gray-700/50 hover:bg-cyan-500/5 transition-colors group"
            >
              {/* Drag Handle */}
              <td className="px-3 py-2">
                <GripVertical className="w-4 h-4 text-gray-500 cursor-move group-hover:text-gray-300 transition-colors" />
              </td>

              {/* Name */}
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={part.name}
                  onChange={(e) => onUpdate(part.id, { name: e.target.value })}
                  className="w-full bg-transparent text-white px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors"
                />
              </td>

              <td className="px-3 py-2">
                 <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={part.size.width}
                      onChange={(e) => onUpdate(part.id, { size: { ...part.size, width: Number(e.target.value) } })}
                      className="w-16 bg-transparent text-white text-right px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors text-xs"
                    />
                    <span className="text-gray-500">x</span>
                    <input
                      type="number"
                      value={part.size.height}
                      onChange={(e) => onUpdate(part.id, { size: { ...part.size, height: Number(e.target.value) } })}
                      className="w-16 bg-transparent text-white text-right px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors text-xs"
                    />
                 </div>
              </td>

              <td className="px-3 py-2">
                <input
                  type="number"
                  value={part.quantity}
                  onChange={(e) => onUpdate(part.id, { quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full bg-transparent text-white text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors"
                />
              </td>

              <td className="px-3 py-2">
                <select
                  value={part.priority}
                  onChange={(e) => onUpdate(part.id, { priority: parseInt(e.target.value) })}
                  className="w-full bg-transparent text-white px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 cursor-pointer transition-colors text-center appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </td>

              <td className="px-3 py-2">
                <select
                  value={part.symmetry}
                  onChange={(e) => onUpdate(part.id, { symmetry: e.target.value as any })}
                  className="w-full bg-transparent text-white px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 cursor-pointer transition-colors text-center appearance-none"
                   style={{ backgroundImage: 'none' }}
                >
                  <option value="none">None</option>
                  <option value="horizontal">Hor</option>
                  <option value="vertical">Ver</option>
                  <option value="both">All</option>
                </select>
              </td>

              <td className="px-3 py-2">
                <select
                  value={part.rotation}
                  onChange={(e) => onUpdate(part.id, { rotation: e.target.value as any })}
                  className="w-full bg-transparent text-white px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 cursor-pointer transition-colors text-center appearance-none"
                   style={{ backgroundImage: 'none' }}
                >
                  <option value="none">0°</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="any">Any</option>
                </select>
              </td>

              <td className="px-3 py-2 text-center">
                <input
                  type="checkbox"
                  checked={part.isSmallPart}
                  onChange={(e) => onUpdate(part.id, { isSmallPart: e.target.checked })}
                  className="w-4 h-4 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-gray-800 cursor-pointer hover:border-cyan-400 transition-colors"
                />
              </td>

              <td className="px-3 py-2">
                <input
                  type="text"
                  value={part.kitNumber || ''}
                  onChange={(e) => onUpdate(part.id, { kitNumber: e.target.value })}
                  placeholder="-"
                  className="w-full bg-transparent text-white text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors placeholder-gray-600"
                />
              </td>

              <td className="px-3 py-2">
                <input
                  type="number"
                  value={part.nestedQuantity || 0}
                  onChange={(e) => onUpdate(part.id, { nestedQuantity: parseInt(e.target.value) || 0 })}
                  className="w-full bg-transparent text-gray-400 text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors focus:text-white"
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
