// ============================================================
// ADVANCED NESTING SETTINGS DIALOG
// Tabbed dialog for configuring nesting algorithm parameters
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings2, Layers, Zap, Puzzle } from 'lucide-react';
import { Language } from '../../../constants';

interface AdvancedSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: NestingSettings) => void;
  initialSettings?: Partial<NestingSettings>;
  lang?: Language;
}

export interface NestingSettings {
  // General Tab
  algorithm: 'rectangular' | 'true-shape' | 'vero';
  objectType: 'toolpath' | 'geometry';
  spacing: number;
  margin: number;

  // Strategy Tab
  startCorner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  nestingOrder: 'best-utilization' | 'by-size' | 'by-priority';
  offcutDirection: 'horizontal' | 'vertical' | 'auto';
  allowRotation: boolean;

  // Extensions Tab
  mergeParts: boolean;
  drillFirst: boolean;
  optimizeToolpath: boolean;
  useRemnants: boolean;
}

const defaultSettings: NestingSettings = {
  algorithm: 'vero',
  objectType: 'geometry',
  spacing: 5,
  margin: 10,
  startCorner: 'bottom-left',
  nestingOrder: 'best-utilization',
  offcutDirection: 'auto',
  allowRotation: true,
  mergeParts: false,
  drillFirst: true,
  optimizeToolpath: true,
  useRemnants: true
};

const AdvancedSettingsDialog: React.FC<AdvancedSettingsDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
  lang = 'vi'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'strategy' | 'extensions'>('general');
  const [settings, setSettings] = useState<NestingSettings>({
    ...defaultSettings,
    ...initialSettings
  });

  const texts = {
    vi: {
      title: 'Cài Đặt Nâng Cao',
      general: 'Chung',
      strategy: 'Chiến Lược',
      extensions: 'Mở Rộng',
      algorithm: 'Thuật Toán',
      objectType: 'Loại Đối Tượng',
      spacing: 'Khoảng Cách (mm)',
      margin: 'Lề (mm)',
      startCorner: 'Góc Bắt Đầu',
      nestingOrder: 'Thứ Tự Xếp',
      offcutDirection: 'Hướng Phần Thừa',
      allowRotation: 'Cho Phép Xoay',
      mergeParts: 'Gộp Chi Tiết',
      drillFirst: 'Khoan Trước',
      optimizeToolpath: 'Tối Ưu Đường Dao',
      useRemnants: 'Sử Dụng Phần Thừa',
      cancel: 'Hủy',
      save: 'Lưu',
      rectangular: 'Hình Chữ Nhật',
      trueShape: 'Hình Dạng Thực',
      vero: 'Vero (Khuyến Nghị)',
      toolpath: 'Đường Dao',
      geometry: 'Hình Học',
      topLeft: 'Trên - Trái',
      topRight: 'Trên - Phải',
      bottomLeft: 'Dưới - Trái',
      bottomRight: 'Dưới - Phải',
      bestUtil: 'Tối Ưu Nhất',
      bySize: 'Theo Kích Thước',
      byPriority: 'Theo Ưu Tiên',
      horizontal: 'Ngang',
      vertical: 'Dọc',
      auto: 'Tự Động'
    },
    en: {
      title: 'Advanced Settings',
      general: 'General',
      strategy: 'Strategy',
      extensions: 'Extensions',
      algorithm: 'Algorithm',
      objectType: 'Object Type',
      spacing: 'Spacing (mm)',
      margin: 'Margin (mm)',
      startCorner: 'Start Corner',
      nestingOrder: 'Nesting Order',
      offcutDirection: 'Offcut Direction',
      allowRotation: 'Allow Rotation',
      mergeParts: 'Merge Parts',
      drillFirst: 'Drill First',
      optimizeToolpath: 'Optimize Toolpath',
      useRemnants: 'Use Remnants',
      cancel: 'Cancel',
      save: 'Save',
      rectangular: 'Rectangular',
      trueShape: 'True Shape',
      vero: 'Vero (Recommended)',
      toolpath: 'Toolpath',
      geometry: 'Geometry',
      topLeft: 'Top Left',
      topRight: 'Top Right',
      bottomLeft: 'Bottom Left',
      bottomRight: 'Bottom Right',
      bestUtil: 'Best Utilization',
      bySize: 'By Size',
      byPriority: 'By Priority',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      auto: 'Auto'
    },
    jp: {
      title: '詳細設定',
      general: '一般',
      strategy: '戦略',
      extensions: '拡張',
      algorithm: 'アルゴリズム',
      objectType: 'オブジェクトタイプ',
      spacing: '間隔 (mm)',
      margin: 'マージン (mm)',
      startCorner: '開始コーナー',
      nestingOrder: 'ネスト順序',
      offcutDirection: 'オフカット方向',
      allowRotation: '回転を許可',
      mergeParts: '部品をマージ',
      drillFirst: '最初にドリル',
      optimizeToolpath: 'ツールパスを最適化',
      useRemnants: '残材を使用',
      cancel: 'キャンセル',
      save: '保存',
      rectangular: '長方形',
      trueShape: '実形状',
      vero: 'Vero (推奨)',
      toolpath: 'ツールパス',
      geometry: 'ジオメトリ',
      topLeft: '左上',
      topRight: '右上',
      bottomLeft: '左下',
      bottomRight: '右下',
      bestUtil: '最適利用',
      bySize: 'サイズ別',
      byPriority: '優先度別',
      horizontal: '水平',
      vertical: '垂直',
      auto: '自動'
    }
  };

  const t = texts[lang];

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-[700px] h-[600px] bg-gray-900 rounded-xl shadow-2xl border border-cyan-500/30 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <Settings2 className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-bold text-white">{t.title}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              {t.general}
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'strategy'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Zap className="w-4 h-4" />
              {t.strategy}
            </button>
            <button
              onClick={() => setActiveTab('extensions')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                activeTab === 'extensions'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <Puzzle className="w-4 h-4" />
              {t.extensions}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Algorithm */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.algorithm}</label>
                  <select
                    value={settings.algorithm}
                    onChange={(e) => setSettings({ ...settings, algorithm: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="rectangular">{t.rectangular}</option>
                    <option value="true-shape">{t.trueShape}</option>
                    <option value="vero">{t.vero}</option>
                  </select>
                </div>

                {/* Object Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.objectType}</label>
                  <select
                    value={settings.objectType}
                    onChange={(e) => setSettings({ ...settings, objectType: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="toolpath">{t.toolpath}</option>
                    <option value="geometry">{t.geometry}</option>
                  </select>
                </div>

                {/* Spacing */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.spacing}</label>
                  <input
                    type="number"
                    value={settings.spacing}
                    onChange={(e) => setSettings({ ...settings, spacing: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Margin */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.margin}</label>
                  <input
                    type="number"
                    value={settings.margin}
                    onChange={(e) => setSettings({ ...settings, margin: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="0.1"
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'strategy' && (
              <div className="space-y-6">
                {/* Start Corner */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.startCorner}</label>
                  <select
                    value={settings.startCorner}
                    onChange={(e) => setSettings({ ...settings, startCorner: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="top-left">{t.topLeft}</option>
                    <option value="top-right">{t.topRight}</option>
                    <option value="bottom-left">{t.bottomLeft}</option>
                    <option value="bottom-right">{t.bottomRight}</option>
                  </select>
                </div>

                {/* Nesting Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.nestingOrder}</label>
                  <select
                    value={settings.nestingOrder}
                    onChange={(e) => setSettings({ ...settings, nestingOrder: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="best-utilization">{t.bestUtil}</option>
                    <option value="by-size">{t.bySize}</option>
                    <option value="by-priority">{t.byPriority}</option>
                  </select>
                </div>

                {/* Offcut Direction */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{t.offcutDirection}</label>
                  <select
                    value={settings.offcutDirection}
                    onChange={(e) => setSettings({ ...settings, offcutDirection: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 text-white border border-cyan-500/30 rounded-lg focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="horizontal">{t.horizontal}</option>
                    <option value="vertical">{t.vertical}</option>
                    <option value="auto">{t.auto}</option>
                  </select>
                </div>

                {/* Allow Rotation */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.allowRotation}
                      onChange={(e) => setSettings({ ...settings, allowRotation: e.target.checked })}
                      className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                    />
                    <span className="text-white">{t.allowRotation}</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'extensions' && (
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.mergeParts}
                    onChange={(e) => setSettings({ ...settings, mergeParts: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white">{t.mergeParts}</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.drillFirst}
                    onChange={(e) => setSettings({ ...settings, drillFirst: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white">{t.drillFirst}</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.optimizeToolpath}
                    onChange={(e) => setSettings({ ...settings, optimizeToolpath: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white">{t.optimizeToolpath}</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.useRemnants}
                    onChange={(e) => setSettings({ ...settings, useRemnants: e.target.checked })}
                    className="w-4 h-4 text-cyan-500 bg-gray-800 border-cyan-500/30 rounded"
                  />
                  <span className="text-white">{t.useRemnants}</span>
                </label>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-800/50 border-t border-cyan-500/20">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg transition-colors"
            >
              {t.save}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdvancedSettingsDialog;
