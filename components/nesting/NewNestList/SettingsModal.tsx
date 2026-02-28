// ============================================================
// SETTINGS MODAL - Nesting Configuration
// Dark Mode, Draggable, Tab-based interface
// ============================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Settings } from 'lucide-react';
import { Language } from '../../../constants';
import Draggable from 'react-draggable';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (settings: SettingsModalConfig) => void;
  lang?: Language;
}

export interface SettingsModalConfig {
  // General Tab
  nestingMethod: 'rectangular' | 'trueShape' | 'vero';
  itemToNest: 'toolpaths' | 'geometries';
  nestListName: string;

  // Strategy Tab
  ncCode: 'subroutines' | 'linear';
  sheetOrder: 'bestUtilisation' | 'pickedOrder';
  packTo: 'topLeft' | 'bottomLeft' | 'topRight' | 'bottomRight';
  offcutPreference: 'vertical' | 'horizontal';
  minGap: number;
  leadInGap: number;
  edgeGap: number;
  computationTime: number;

  // Extensions Tab
  extensions: {
    assistedNest: boolean;
    bridgedNesting: boolean;
    cutSmallPartsFirst: boolean;
    cutWholePartTogether: boolean;
    drillThenCutInnerPathsFirst: boolean;
    groupEachPartSeparately: boolean;
    leaveEdgeGapUncut: boolean;
    mergeLikePartQuantities: boolean;
    minimiseSheetPatterns: boolean;
    minimiseToolChanges: boolean;
    nestSmallPartsFirst: boolean;
    onionSkinSmallParts: boolean;
    orderByPart: boolean;
    partQuantityMultiplier: boolean;
    preventNestingInApertures: boolean;
    removeGroups: boolean;
    repeatFirstRowColumn: boolean;
    rollSplit: boolean;
    suppressFinalSort: boolean;
  };
}

const DEFAULT_SETTINGS: SettingsModalConfig = {
  nestingMethod: 'vero',
  itemToNest: 'geometries',
  nestListName: 'New Nest List 1',
  ncCode: 'subroutines',
  sheetOrder: 'bestUtilisation',
  packTo: 'topLeft',
  offcutPreference: 'vertical',
  minGap: 5,
  leadInGap: 2,
  edgeGap: 5,
  computationTime: 60,
  extensions: {
    assistedNest: false,
    bridgedNesting: false,
    cutSmallPartsFirst: false,
    cutWholePartTogether: false,
    drillThenCutInnerPathsFirst: false,
    groupEachPartSeparately: false,
    leaveEdgeGapUncut: false,
    mergeLikePartQuantities: false,
    minimiseSheetPatterns: false,
    minimiseToolChanges: false,
    nestSmallPartsFirst: false,
    onionSkinSmallParts: false,
    orderByPart: false,
    partQuantityMultiplier: false,
    preventNestingInApertures: false,
    removeGroups: false,
    repeatFirstRowColumn: false,
    rollSplit: false,
    suppressFinalSort: false,
  }
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lang = 'vi'
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'strategy' | 'extensions'>('general');
  const [settings, setSettings] = useState<SettingsModalConfig>(DEFAULT_SETTINGS);

  const texts = {
    vi: {
      title: 'Cài Đặt Nesting',
      general: 'Cài Đặt Chung',
      strategy: 'Chiến Lược',
      extensions: 'Mở Rộng',
      ok: 'Lưu',
      cancel: 'Hủy',
      nestingMethod: 'Phương Pháp Nesting',
      rectangularNesting: 'Rectangular Nesting',
      trueShapeNesting: 'True Shape Nesting',
      veroNesting: 'Vero Nesting',
      itemToNest: 'Mục Cần Nest',
      toolpaths: 'Đường Cắt',
      geometries: 'Hình Học',
      nestListName: 'Tên Danh Sách Nest',
      ncCode: 'Mã NC',
      subroutines: 'Subroutines',
      linear: 'Linear',
      sheetOrder: 'Thứ Tự Tấm',
      bestUtilisation: 'Tối Ưu Nhất',
      pickedOrder: 'Theo Thứ Tự Chọn',
      packTo: 'Đóng Gói Tới',
      topLeft: 'Góc Trên Trái',
      bottomLeft: 'Góc Dưới Trái',
      topRight: 'Góc Trên Phải',
      bottomRight: 'Góc Dưới Phải',
      offcutPreference: 'Ưu Tiên Phần Dư',
      vertical: 'Dọc',
      horizontal: 'Ngang',
      minGap: 'Khoảng Cách Tối Thiểu (mm)',
      leadInGap: 'Khoảng Cách Tiếp Cận (mm)',
      edgeGap: 'Khoảng Cách Cạnh (mm)',
      computationTime: 'Thời Gian Tính Toán (giây)',
      preview: 'Xem Trước',
      extensionsList: 'Danh Sách Phần Mở Rộng',
      assistedNest: 'Assisted Nest',
      bridgedNesting: 'Bridged Nesting',
      cutSmallPartsFirst: 'Cut Small Parts First',
      cutWholePartTogether: 'Cut Whole Part Together',
      drillThenCutInnerPathsFirst: 'Drill then Cut Inner Paths First',
      groupEachPartSeparately: 'Group Each Part Separately',
      leaveEdgeGapUncut: 'Leave Edge Gap Uncut',
      mergeLikePartQuantities: 'Merge Like Part Quantities',
      minimiseSheetPatterns: 'Minimise Sheet Patterns',
      minimiseToolChanges: 'Minimise Tool Changes',
      nestSmallPartsFirst: 'Nest Small Parts First',
      onionSkinSmallParts: 'Onion Skin Small Parts',
      orderByPart: 'Order By Part',
      partQuantityMultiplier: 'Part Quantity Multiplier',
      preventNestingInApertures: 'Prevent Nesting in Apertures',
      removeGroups: 'Remove Groups',
      repeatFirstRowColumn: 'Repeat First Row/Column',
      rollSplit: 'Roll Split',
      suppressFinalSort: 'Suppress Final Sort',
    },
    en: {
      title: 'Nesting Settings',
      general: 'General',
      strategy: 'Strategy',
      extensions: 'Extensions',
      ok: 'Save',
      cancel: 'Cancel',
      nestingMethod: 'Nesting Method',
      rectangularNesting: 'Rectangular Nesting',
      trueShapeNesting: 'True Shape Nesting',
      veroNesting: 'Vero Nesting',
      itemToNest: 'Item to Nest',
      toolpaths: 'Toolpaths',
      geometries: 'Geometries',
      nestListName: 'Nest List Name',
      ncCode: 'NC Code',
      subroutines: 'Subroutines',
      linear: 'Linear',
      sheetOrder: 'Sheet Order',
      bestUtilisation: 'Best Utilisation',
      pickedOrder: 'Picked Order',
      packTo: 'Pack To',
      topLeft: 'Top-Left',
      bottomLeft: 'Bottom-Left',
      topRight: 'Top-Right',
      bottomRight: 'Bottom-Right',
      offcutPreference: 'Offcut Preference',
      vertical: 'Vertical',
      horizontal: 'Horizontal',
      minGap: 'Min Gap (mm)',
      leadInGap: 'Lead-In Gap (mm)',
      edgeGap: 'Edge Gap (mm)',
      computationTime: 'Computation Time (seconds)',
      preview: 'Preview',
      extensionsList: 'Extensions List',
      assistedNest: 'Assisted Nest',
      bridgedNesting: 'Bridged Nesting',
      cutSmallPartsFirst: 'Cut Small Parts First',
      cutWholePartTogether: 'Cut Whole Part Together',
      drillThenCutInnerPathsFirst: 'Drill then Cut Inner Paths First',
      groupEachPartSeparately: 'Group Each Part Separately',
      leaveEdgeGapUncut: 'Leave Edge Gap Uncut',
      mergeLikePartQuantities: 'Merge Like Part Quantities',
      minimiseSheetPatterns: 'Minimise Sheet Patterns',
      minimiseToolChanges: 'Minimise Tool Changes',
      nestSmallPartsFirst: 'Nest Small Parts First',
      onionSkinSmallParts: 'Onion Skin Small Parts',
      orderByPart: 'Order By Part',
      partQuantityMultiplier: 'Part Quantity Multiplier',
      preventNestingInApertures: 'Prevent Nesting in Apertures',
      removeGroups: 'Remove Groups',
      repeatFirstRowColumn: 'Repeat First Row/Column',
      rollSplit: 'Roll Split',
      suppressFinalSort: 'Suppress Final Sort',
    }
  };

  const t = texts[lang] || texts.vi;

  const handleSave = () => {
    onSave?.(settings);
    onClose();
  };

  const handleChange = (key: keyof SettingsModalConfig, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExtensionChange = (key: keyof SettingsModalConfig['extensions'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      extensions: { ...prev.extensions, [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <Draggable bounds="parent" handle=".modal-header">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
      >
        <div className="bg-slate-900 border-2 border-cyan-500/40 rounded-xl shadow-2xl w-[900px] max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="modal-header bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-500/30 px-6 py-4 flex items-center justify-between cursor-move">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-white">{t.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-cyan-500/20 bg-slate-800/50">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'general'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                  : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              {t.general}
            </button>
            <button
              onClick={() => setActiveTab('strategy')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'strategy'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                  : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              {t.strategy}
            </button>
            <button
              onClick={() => setActiveTab('extensions')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'extensions'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                  : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              {t.extensions}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="flex gap-6">
                {/* Left Column - Inputs */}
                <div className="flex-1 space-y-4">
                  {/* Nesting Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.nestingMethod}
                    </label>
                    <select
                      value={settings.nestingMethod}
                      onChange={(e) => handleChange('nestingMethod', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="rectangular">{t.rectangularNesting}</option>
                      <option value="trueShape">{t.trueShapeNesting}</option>
                      <option value="vero">{t.veroNesting}</option>
                    </select>
                  </div>

                  {/* Item to Nest */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.itemToNest}
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="toolpaths"
                          checked={settings.itemToNest === 'toolpaths'}
                          onChange={(e) => handleChange('itemToNest', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300">{t.toolpaths}</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value="geometries"
                          checked={settings.itemToNest === 'geometries'}
                          onChange={(e) => handleChange('itemToNest', e.target.value)}
                          className="w-4 h-4"
                        />
                        <span className="text-gray-300">{t.geometries}</span>
                      </label>
                    </div>
                  </div>

                  {/* Nest List Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.nestListName}
                    </label>
                    <input
                      type="text"
                      value={settings.nestListName}
                      onChange={(e) => handleChange('nestListName', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="w-48">
                  <div className="bg-gray-700/50 border border-gray-600 rounded h-64 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-sm">{t.preview}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Strategy Tab */}
            {activeTab === 'strategy' && (
              <div className="flex gap-6">
                {/* Left Column - Inputs */}
                <div className="flex-1 space-y-4">
                  {/* NC Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.ncCode}
                    </label>
                    <select
                      value={settings.ncCode}
                      onChange={(e) => handleChange('ncCode', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="subroutines">{t.subroutines}</option>
                      <option value="linear">{t.linear}</option>
                    </select>
                  </div>

                  {/* Sheet Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.sheetOrder}
                    </label>
                    <select
                      value={settings.sheetOrder}
                      onChange={(e) => handleChange('sheetOrder', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="bestUtilisation">{t.bestUtilisation}</option>
                      <option value="pickedOrder">{t.pickedOrder}</option>
                    </select>
                  </div>

                  {/* Pack To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.packTo}
                    </label>
                    <select
                      value={settings.packTo}
                      onChange={(e) => handleChange('packTo', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="topLeft">{t.topLeft}</option>
                      <option value="bottomLeft">{t.bottomLeft}</option>
                      <option value="topRight">{t.topRight}</option>
                      <option value="bottomRight">{t.bottomRight}</option>
                    </select>
                  </div>

                  {/* Offcut Preference */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.offcutPreference}
                    </label>
                    <select
                      value={settings.offcutPreference}
                      onChange={(e) => handleChange('offcutPreference', e.target.value)}
                      className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="vertical">{t.vertical}</option>
                      <option value="horizontal">{t.horizontal}</option>
                    </select>
                  </div>

                  {/* Numeric Inputs */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.minGap}
                      </label>
                      <input
                        type="number"
                        value={settings.minGap}
                        onChange={(e) => handleChange('minGap', parseFloat(e.target.value))}
                        className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.leadInGap}
                      </label>
                      <input
                        type="number"
                        value={settings.leadInGap}
                        onChange={(e) => handleChange('leadInGap', parseFloat(e.target.value))}
                        className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.edgeGap}
                      </label>
                      <input
                        type="number"
                        value={settings.edgeGap}
                        onChange={(e) => handleChange('edgeGap', parseFloat(e.target.value))}
                        className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t.computationTime}
                      </label>
                      <input
                        type="number"
                        value={settings.computationTime}
                        onChange={(e) => handleChange('computationTime', parseFloat(e.target.value))}
                        className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="w-48">
                  <div className="bg-gray-700/50 border border-gray-600 rounded h-64 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">📊</div>
                      <p className="text-sm">{t.preview}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Extensions Tab */}
            {activeTab === 'extensions' && (
              <div className="max-h-96 overflow-y-auto space-y-3">
                {Object.entries({
                  assistedNest: t.assistedNest,
                  bridgedNesting: t.bridgedNesting,
                  cutSmallPartsFirst: t.cutSmallPartsFirst,
                  cutWholePartTogether: t.cutWholePartTogether,
                  drillThenCutInnerPathsFirst: t.drillThenCutInnerPathsFirst,
                  groupEachPartSeparately: t.groupEachPartSeparately,
                  leaveEdgeGapUncut: t.leaveEdgeGapUncut,
                  mergeLikePartQuantities: t.mergeLikePartQuantities,
                  minimiseSheetPatterns: t.minimiseSheetPatterns,
                  minimiseToolChanges: t.minimiseToolChanges,
                  nestSmallPartsFirst: t.nestSmallPartsFirst,
                  onionSkinSmallParts: t.onionSkinSmallParts,
                  orderByPart: t.orderByPart,
                  partQuantityMultiplier: t.partQuantityMultiplier,
                  preventNestingInApertures: t.preventNestingInApertures,
                  removeGroups: t.removeGroups,
                  repeatFirstRowColumn: t.repeatFirstRowColumn,
                  rollSplit: t.rollSplit,
                  suppressFinalSort: t.suppressFinalSort,
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.extensions[key as keyof typeof settings.extensions]}
                      onChange={(e) => handleExtensionChange(key as keyof typeof settings.extensions, e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <span className="text-gray-300">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Buttons */}
          <div className="border-t border-cyan-500/20 bg-slate-800/50 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded transition-all duration-200 font-medium"
            >
              {t.ok}
            </button>
          </div>
        </div>
      </motion.div>
    </Draggable>
  );
};

export default SettingsModal;
