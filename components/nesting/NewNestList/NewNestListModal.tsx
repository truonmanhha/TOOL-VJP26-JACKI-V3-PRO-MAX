// ============================================================
// NEW NEST LIST MODAL - Main Component
// Floating modal for creating new nesting projects
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, FilePlus, FileBox, Play } from 'lucide-react';
import { Language } from '../../../constants';
import ToolsPanel from './ToolsPanel';
import PartListGrid from './PartListGrid';
import MaterialListGrid from './MaterialListGrid';
import ActionsPanel from './ActionsPanel';
import SettingsModal, { SettingsModalConfig } from './SettingsModal';
import { NestingPart, NestingSheet } from './types';

interface NewNestListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectParts?: () => void;
  onSelectSheet?: () => void;
  onOpenSettings?: () => void;
  lang?: Language;
  // Controlled state from parent
  parts?: NestingPart[];
  sheets?: NestingSheet[];
  onUpdatePart?: (id: string, updates: Partial<NestingPart>) => void;
  onDeletePart?: (id: string) => void;
  onUpdateSheet?: (id: string, updates: Partial<NestingSheet>) => void;
  onDeleteSheet?: (id: string) => void;
}

const NewNestListModal: React.FC<NewNestListModalProps> = ({
  isOpen,
  onClose,
  onSelectParts,
  onSelectSheet,
  onOpenSettings,
  lang = 'vi',
  parts: externalParts,
  sheets: externalSheets,
  onUpdatePart,
  onDeletePart,
  onUpdateSheet,
  onDeleteSheet
}) => {
  // Use external state if provided, otherwise use internal state
  const [internalParts, setInternalParts] = useState<NestingPart[]>([]);
  const [internalSheets, setInternalSheets] = useState<NestingSheet[]>([]);
  const [settingsTab, setSettingsTab] = useState<'general' | 'strategy' | 'extensions' | null>(null);
  const [nestingSettings, setNestingSettings] = useState<SettingsModalConfig>({
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
  });
  
  const parts = externalParts !== undefined ? externalParts : internalParts;
  const sheets = externalSheets !== undefined ? externalSheets : internalSheets;
  const [isNesting, setIsNesting] = useState(false);

  // Translations
  const texts = {
    vi: {
      title: 'New Nest List',
      close: 'Đóng',
      addPart: 'Thêm Chi Tiết',
      addSheet: 'Thêm Khổ Ván',
      settings: 'Cài Đặt',
      nest: 'Chạy Nesting',
      parts: 'Danh Sách Chi Tiết Cần Nest',
      sheets: 'Danh Sách Tấm Ván',
      noParts: 'Chưa có chi tiết nào. Nhấn "Thêm Chi Tiết" để bắt đầu.',
      noSheets: 'Chưa có tấm ván nào. Nhấn "Thêm Khổ Ván" để bắt đầu.'
    },
    en: {
      title: 'New Nest List',
      close: 'Close',
      addPart: 'Add Part',
      addSheet: 'Add Sheet',
      settings: 'Settings',
      nest: 'Run Nesting',
      parts: 'Parts to Nest',
      sheets: 'Sheet List',
      noParts: 'No parts yet. Click "Add Part" to start.',
      noSheets: 'No sheets yet. Click "Add Sheet" to start.'
    },
    jp: {
      title: '新規ネストリスト',
      close: '閉じる',
      addPart: '部品追加',
      addSheet: 'シート追加',
      settings: '設定',
      nest: 'ネスト実行',
      parts: 'ネストする部品リスト',
      sheets: 'シートリスト',
      noParts: '部品がありません。「部品追加」をクリックしてください。',
      noSheets: 'シートがありません。「シート追加」をクリックしてください。'
    }
  };

  const t = texts[lang];

  // Handlers - Use external handlers if provided, otherwise use internal state
  const handleAddPart = (part: NestingPart) => {
    setInternalParts(prev => [...prev, part]);
  };

  const handleUpdatePart = (id: string, updates: Partial<NestingPart>) => {
    if (onUpdatePart) {
      onUpdatePart(id, updates);
    } else {
      setInternalParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    }
  };

  const handleDeletePart = (id: string) => {
    if (onDeletePart) {
      onDeletePart(id);
    } else {
      setInternalParts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleAddSheet = (sheet: NestingSheet) => {
    setInternalSheets(prev => [...prev, sheet]);
  };

  const handleUpdateSheet = (id: string, updates: Partial<NestingSheet>) => {
    if (onUpdateSheet) {
      onUpdateSheet(id, updates);
    } else {
      setInternalSheets(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const handleDeleteSheet = (id: string) => {
    if (onDeleteSheet) {
      onDeleteSheet(id);
    } else {
      setInternalSheets(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleNest = async () => {
    if (parts.length === 0 || sheets.length === 0) {
      alert(lang === 'vi' ? 'Cần có ít nhất 1 chi tiết và 1 tấm ván!' : 'Need at least 1 part and 1 sheet!');
      return;
    }

    setIsNesting(true);
    
    try {
      // TODO: Call nesting algorithm
      // This will be implemented in the backend integration step
      console.log('Starting nesting with:', { parts, sheets });
      
      // Simulate nesting process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert(lang === 'vi' ? 'Nesting hoàn tất!' : 'Nesting completed!');
    } catch (error) {
      console.error('Nesting error:', error);
      alert(lang === 'vi' ? 'Lỗi khi chạy nesting!' : 'Error running nesting!');
    } finally {
      setIsNesting(false);
    }
  };

  // Check if can run nesting
  const canNest = parts.length > 0 && sheets.length > 0 && !isNesting;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          className="relative w-[90vw] h-[85vh] bg-gray-900 rounded-xl shadow-2xl border border-cyan-500/30 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-900/50 to-blue-900/50 border-b border-cyan-500/30">
            <div className="flex items-center gap-3">
              <FileBox className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-bold text-white">{t.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="h-[calc(100%-80px)] grid grid-rows-[auto_1fr_auto] gap-4 p-6">
            
            {/* Panel 1: Tools */}
            <ToolsPanel
              onAddPart={onSelectParts}
              onAddSheet={onSelectSheet}
              onOpenSettings={() => setSettingsTab('general')}
              lang={lang}
            />

            {/* Panel 2 & 3: NORMAL VIEW (Parts + Sheets) */}
            {!settingsTab && (
              <div className="grid grid-cols-2 gap-4">
                {/* Part List Grid */}
                <div className="bg-gray-800/50 rounded-lg border border-cyan-500/20 overflow-hidden">
                  <div className="px-4 py-2 bg-cyan-900/30 border-b border-cyan-500/20">
                    <h3 className="text-sm font-semibold text-cyan-400">{t.parts}</h3>
                  </div>
                  <PartListGrid
                    parts={parts}
                    onUpdate={handleUpdatePart}
                    onDelete={handleDeletePart}
                    lang={lang}
                  />
                </div>

                {/* Material List Grid */}
                <div className="bg-gray-800/50 rounded-lg border border-cyan-500/20 overflow-hidden">
                  <div className="px-4 py-2 bg-cyan-900/30 border-b border-cyan-500/20">
                    <h3 className="text-sm font-semibold text-cyan-400">{t.sheets}</h3>
                  </div>
                  <MaterialListGrid
                    sheets={sheets}
                    onUpdate={handleUpdateSheet}
                    onDelete={handleDeleteSheet}
                    lang={lang}
                  />
                </div>
              </div>
            )}

            {/* SETTINGS VIEW */}
            {settingsTab && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg border border-cyan-500/20 overflow-hidden flex flex-col"
              >
                {/* Settings Header */}
                <div className="px-4 py-3 bg-cyan-900/30 border-b border-cyan-500/20">
                  <h3 className="text-sm font-semibold text-cyan-400">⚙️ Cài Đặt Nesting</h3>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-cyan-500/20 bg-gray-700/30">
                  <button
                    onClick={() => setSettingsTab('general')}
                    className={`px-4 py-2 text-sm font-medium ${
                      settingsTab === 'general'
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-700/50'
                        : 'text-gray-400 hover:text-cyan-300'
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => setSettingsTab('strategy')}
                    className={`px-4 py-2 text-sm font-medium ${
                      settingsTab === 'strategy'
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-700/50'
                        : 'text-gray-400 hover:text-cyan-300'
                    }`}
                  >
                    Strategy
                  </button>
                  <button
                    onClick={() => setSettingsTab('extensions')}
                    className={`px-4 py-2 text-sm font-medium ${
                      settingsTab === 'extensions'
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-gray-700/50'
                        : 'text-gray-400 hover:text-cyan-300'
                    }`}
                  >
                    Extensions
                  </button>
                </div>

                {/* Settings Content - Embedded (Not Modal) */}
                <div className="p-4 overflow-y-auto max-h-[calc(100vh-400px)]">
                  {/* GENERAL TAB */}
                  {settingsTab === 'general' && (
                    <div className="space-y-4">
                      {/* Nesting Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phương Pháp Nesting
                        </label>
                        <select
                          value={nestingSettings?.nestingMethod || 'vero'}
                          onChange={(e) => setNestingSettings({...nestingSettings, nestingMethod: e.target.value as any})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="rectangular">Rectangular Nesting</option>
                          <option value="vero">Vero Nesting</option>
                          <option value="trueShape">True Shape Nesting</option>
                        </select>
                      </div>

                      {/* Item to Nest */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Mục Cần Nest
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="itemToNest"
                              value="toolpaths"
                              checked={nestingSettings?.itemToNest === 'toolpaths'}
                              onChange={(e) => setNestingSettings({...nestingSettings, itemToNest: e.target.value as any})}
                              className="w-4 h-4"
                            />
                            <span className="text-gray-300">Đường Cắt</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="itemToNest"
                              value="geometries"
                              checked={nestingSettings?.itemToNest === 'geometries'}
                              onChange={(e) => setNestingSettings({...nestingSettings, itemToNest: e.target.value as any})}
                              className="w-4 h-4"
                            />
                            <span className="text-gray-300">Hình Học</span>
                          </label>
                        </div>
                      </div>

                      {/* Nest List Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Tên Danh Sách Nest
                        </label>
                        <input
                          type="text"
                          value={nestingSettings?.nestListName || 'New Nest List 1'}
                          onChange={(e) => setNestingSettings({...nestingSettings, nestListName: e.target.value})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* STRATEGY TAB */}
                  {settingsTab === 'strategy' && (
                    <div className="space-y-4">
                      {/* NC Code */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          NC Code
                        </label>
                        <select
                          value={nestingSettings?.ncCode || 'subroutines'}
                          onChange={(e) => setNestingSettings({...nestingSettings, ncCode: e.target.value as any})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="subroutines">Subroutines</option>
                          <option value="linear">Linear</option>
                        </select>
                      </div>

                      {/* Sheet Order */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Sheet Order
                        </label>
                        <select
                          value={nestingSettings?.sheetOrder || 'bestUtilisation'}
                          onChange={(e) => setNestingSettings({...nestingSettings, sheetOrder: e.target.value as any})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="bestUtilisation">Best Utilisation</option>
                          <option value="pickedOrder">Picked Order</option>
                        </select>
                      </div>

                      {/* Pack To */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Pack To
                        </label>
                        <select
                          value={nestingSettings?.packTo || 'topLeft'}
                          onChange={(e) => setNestingSettings({...nestingSettings, packTo: e.target.value as any})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="topLeft">Top Left</option>
                          <option value="bottomLeft">Bottom Left</option>
                          <option value="topRight">Top Right</option>
                          <option value="bottomRight">Bottom Right</option>
                        </select>
                      </div>

                      {/* Offcut Preference */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Offcut Preference
                        </label>
                        <select
                          value={nestingSettings?.offcutPreference || 'vertical'}
                          onChange={(e) => setNestingSettings({...nestingSettings, offcutPreference: e.target.value as any})}
                          className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        >
                          <option value="vertical">Vertical</option>
                          <option value="horizontal">Horizontal</option>
                        </select>
                      </div>

                      {/* Numeric Inputs */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-600">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Min Gap (mm)
                          </label>
                          <input
                            type="number"
                            value={nestingSettings?.minGap || 5}
                            onChange={(e) => setNestingSettings({...nestingSettings, minGap: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Lead-In Gap (mm)
                          </label>
                          <input
                            type="number"
                            value={nestingSettings?.leadInGap || 2}
                            onChange={(e) => setNestingSettings({...nestingSettings, leadInGap: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Edge Gap (mm)
                          </label>
                          <input
                            type="number"
                            value={nestingSettings?.edgeGap || 5}
                            onChange={(e) => setNestingSettings({...nestingSettings, edgeGap: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Computation Time (s)
                          </label>
                          <input
                            type="number"
                            value={nestingSettings?.computationTime || 60}
                            onChange={(e) => setNestingSettings({...nestingSettings, computationTime: parseFloat(e.target.value)})}
                            className="w-full bg-slate-700 border border-cyan-500/30 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXTENSIONS TAB */}
                  {settingsTab === 'extensions' && (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.assistedNest || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, assistedNest: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Assisted Nest</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.bridgedNesting || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, bridgedNesting: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Bridged Nesting</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.cutSmallPartsFirst || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, cutSmallPartsFirst: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Cut Small Parts First</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.cutWholePartTogether || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, cutWholePartTogether: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Cut Whole Part Together</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.drillThenCutInnerPathsFirst || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, drillThenCutInnerPathsFirst: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Drill Then Cut Inner Paths First</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.groupEachPartSeparately || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, groupEachPartSeparately: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Group Each Part Separately</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.leaveEdgeGapUncut || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, leaveEdgeGapUncut: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Leave Edge Gap Uncut</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.mergeLikePartQuantities || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, mergeLikePartQuantities: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Merge Like Part Quantities</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.minimiseSheetPatterns || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, minimiseSheetPatterns: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Minimise Sheet Patterns</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.minimiseToolChanges || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, minimiseToolChanges: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Minimise Tool Changes</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.nestSmallPartsFirst || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, nestSmallPartsFirst: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Nest Small Parts First</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.onionSkinSmallParts || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, onionSkinSmallParts: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Onion Skin Small Parts</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.orderByPart || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, orderByPart: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Order By Part</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.partQuantityMultiplier || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, partQuantityMultiplier: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Part Quantity Multiplier</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.preventNestingInApertures || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, preventNestingInApertures: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Prevent Nesting in Apertures</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.removeGroups || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, removeGroups: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Remove Groups</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.repeatFirstRowColumn || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, repeatFirstRowColumn: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Repeat First Row/Column</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.rollSplit || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, rollSplit: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Roll Split</span>
                      </label>

                      <label className="flex items-center gap-3 p-2 rounded hover:bg-slate-700/50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={nestingSettings?.extensions?.suppressFinalSort || false}
                          onChange={(e) => setNestingSettings({...nestingSettings, extensions: {...nestingSettings?.extensions, suppressFinalSort: e.target.checked}})}
                          className="w-4 h-4 rounded cursor-pointer"
                        />
                        <span className="text-gray-300">Suppress Final Sort</span>
                      </label>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Panel 4: Actions */}
            {!settingsTab ? (
              <ActionsPanel
                onNest={handleNest}
                onClose={onClose}
                canNest={canNest}
                isNesting={isNesting}
                lang={lang}
              />
            ) : (
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setSettingsTab(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  ← {lang === 'vi' ? 'Quay Lại' : 'Back'}
                </button>
                <button
                  onClick={() => {
                    console.log('Saving settings:', nestingSettings);
                    setSettingsTab(null);
                  }}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                >
                  💾 {lang === 'vi' ? 'Lưu Cài Đặt' : 'Save'}
                </button>
              </div>
            )}
          </div>

          {/* Progress Overlay */}
          {isNesting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="bg-gray-800 rounded-lg p-8 border border-cyan-500/30 max-w-md w-full">
                <h3 className="text-lg font-bold text-white mb-4 text-center">
                  {lang === 'vi' ? 'Đang Xử Lý...' : 'Processing...'}
                </h3>
                <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500"
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-4 text-center">
                  {lang === 'vi' ? 'Đang tối ưu hóa bố trí...' : 'Optimizing layout...'}
                </p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NewNestListModal;
