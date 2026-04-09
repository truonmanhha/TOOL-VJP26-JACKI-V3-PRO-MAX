// ============================================================
// MATERIAL LIST GRID - Panel 3
// Displays list of sheets/materials with editable properties
// ============================================================

import React from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { Language } from '../../../constants';
import { NestingSheet } from './types';

interface MaterialListGridProps {
  sheets: NestingSheet[];
  onUpdate: (id: string, updates: Partial<NestingSheet>) => void;
  onDelete: (id: string) => void;
  lang?: Language;
}

const MaterialListGrid: React.FC<MaterialListGridProps> = ({
  sheets,
  onUpdate,
  onDelete,
  lang = 'vi'
}) => {
  const texts = {
    vi: {
      material: 'Tên Vật Liệu',
      size: 'Kích Thước',
      thickness: 'Độ Dày',
      qty: 'Số Lượng',
      actions: 'Thao Tác',
      empty: 'Chưa có tấm ván nào'
    },
    en: {
      material: 'Material Name',
      size: 'Size',
      thickness: 'Thickness',
      qty: 'Quantity',
      actions: 'Actions',
      empty: 'No sheets yet'
    },
    jp: {
      material: '材料名',
      size: 'サイズ',
      thickness: '厚さ',
      qty: '数量',
      actions: '操作',
      empty: 'シートがありません'
    }
  };

  const t = texts[lang];

  if (sheets.length === 0) {
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
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400">{t.material}</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-cyan-400">{t.size}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.thickness}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.qty}</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-cyan-400">{t.actions}</th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((sheet) => (
            <tr
              key={sheet.id}
              className="border-b border-gray-700/50 hover:bg-cyan-500/5 transition-colors"
            >
              {/* Drag Handle */}
              <td className="px-3 py-2">
                <GripVertical className="w-4 h-4 text-gray-500 cursor-move" />
              </td>

              {/* Material Name */}
              <td className="px-3 py-2">
                <input
                  type="text"
                  value={sheet.materialName}
                  onChange={(e) => onUpdate(sheet.id, { materialName: e.target.value })}
                  className="w-full bg-transparent text-white px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                />
              </td>

              {/* Size */}
              <td className="px-3 py-2 text-gray-300">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={sheet.size.width}
                    onChange={(e) => onUpdate(sheet.id, { size: { ...sheet.size, width: Number(e.target.value) } })}
                    className="w-16 bg-transparent text-white text-right px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors text-xs"
                  />
                  <span className="text-gray-500">x</span>
                  <input
                    type="number"
                    value={sheet.size.height}
                    onChange={(e) => onUpdate(sheet.id, { size: { ...sheet.size, height: Number(e.target.value) } })}
                    className="w-16 bg-transparent text-white text-right px-1 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none focus:bg-gray-800 transition-colors text-xs"
                  />
                </div>
              </td>

              {/* Thickness */}
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={sheet.thickness}
                  onChange={(e) => onUpdate(sheet.id, { thickness: parseFloat(e.target.value) || 0 })}
                  step="0.1"
                  min="0"
                  className="w-20 bg-transparent text-white text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                />
              </td>

              {/* Quantity */}
              <td className="px-3 py-2">
                <input
                  type="number"
                  value={sheet.quantity}
                  onChange={(e) => onUpdate(sheet.id, { quantity: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-16 bg-transparent text-white text-center px-2 py-1 rounded border border-transparent hover:border-cyan-500/30 focus:border-cyan-500 focus:outline-none"
                />
              </td>

              {/* Actions */}
              <td className="px-3 py-2">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onDelete(sheet.id)}
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

export default MaterialListGrid;
