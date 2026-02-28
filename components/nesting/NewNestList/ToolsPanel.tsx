// ============================================================
// TOOLS PANEL - Panel 1
// Contains buttons for adding parts, sheets, and settings
// ============================================================

import React from 'react';
import { FilePlus, FileBox, Settings } from 'lucide-react';
import { Language } from '../../../constants';

interface ToolsPanelProps {
  onAddPart?: () => void;
  onAddSheet?: () => void;
  onOpenSettings?: () => void;
  lang?: Language;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  onAddPart,
  onAddSheet,
  onOpenSettings,
  lang = 'vi'
}) => {
  const texts = {
    vi: {
      addPart: 'Thêm Chi Tiết Từ Bản Vẽ',
      addSheet: 'Thêm Khổ Ván Từ Bản Vẽ',
      settings: 'Cài Đặt Nesting'
    },
    en: {
      addPart: 'Add Part From Drawing',
      addSheet: 'Add Sheet From Drawing',
      settings: 'Nesting Settings'
    },
    jp: {
      addPart: '図面から部品追加',
      addSheet: '図面からシート追加',
      settings: 'ネスト設定'
    }
  };

  const t = texts[lang];

  return (
    <div className="flex items-center gap-3">
      {/* Add Part Button */}
      <button
        onClick={onAddPart}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/50 font-medium"
      >
        <FilePlus className="w-5 h-5" />
        <span>{t.addPart}</span>
      </button>

      {/* Add Sheet Button */}
      <button
        onClick={onAddSheet}
        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-green-500/50 font-medium"
      >
        <FileBox className="w-5 h-5" />
        <span>{t.addSheet}</span>
      </button>

      {/* Settings Button */}
      <button
        onClick={onOpenSettings}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
      >
        <Settings className="w-5 h-5" />
        <span>{t.settings}</span>
      </button>
    </div>
  );
};

export default ToolsPanel;
