// ============================================================
// ACTIONS PANEL - Panel 4
// Contains Nest and Close buttons
// ============================================================

import React from 'react';
import { Play, X } from 'lucide-react';
import { Language } from '../../../constants';

interface ActionsPanelProps {
  onNest: () => void;
  onClose: () => void;
  canNest: boolean;
  isNesting: boolean;
  lang?: Language;
}

const ActionsPanel: React.FC<ActionsPanelProps> = ({
  onNest,
  onClose,
  canNest,
  isNesting,
  lang = 'vi'
}) => {
  const texts = {
    vi: {
      nest: 'Chạy Nesting',
      close: 'Đóng',
      nesting: 'Đang Xử Lý...'
    },
    en: {
      nest: 'Run Nesting',
      close: 'Close',
      nesting: 'Processing...'
    },
    jp: {
      nest: 'ネスト実行',
      close: '閉じる',
      nesting: '処理中...'
    }
  };

  const t = texts[lang];

  return (
    <div className="flex items-center justify-end gap-3">
      {/* Close Button */}
      <button
        onClick={onClose}
        disabled={isNesting}
        className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 shadow-lg font-medium"
      >
        <X className="w-5 h-5" />
        <span>{t.close}</span>
      </button>

      {/* Nest Button */}
      <button
        onClick={onNest}
        disabled={!canNest}
        className={`flex items-center gap-2 px-8 py-2.5 rounded-lg transition-all duration-200 shadow-lg font-medium ${
          canNest
            ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white hover:shadow-green-500/50'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Play className="w-5 h-5" />
        <span>{isNesting ? t.nesting : t.nest}</span>
      </button>
    </div>
  );
};

export default ActionsPanel;
