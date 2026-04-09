import React from 'react';

interface IconProps {
  className?: string;
}

export const NewNestListIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`nesting-icon ${className}`} fill="none">
    <g className="notepad-group">
      <rect x="8" y="8" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="2" className="notepad-left" />
      <path d="M 12 14 L 24 14" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
      <path d="M 12 18 L 24 18" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
      <path d="M 12 22 L 24 22" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
    </g>
    <g className="notepad-group-2">
      <rect x="22" y="12" width="20" height="24" rx="2" stroke="currentColor" strokeWidth="2" className="notepad-right" />
      <path d="M 26 18 L 38 18" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
      <path d="M 26 22 L 38 22" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
      <path d="M 26 26 L 38 26" stroke="currentColor" strokeWidth="1.5" className="notepad-line" />
    </g>
  </svg>
);

export const PartLibraryIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`library-icon ${className}`} fill="none">
    <g className="box-stack">
      <rect x="10" y="10" width="28" height="8" rx="1" stroke="currentColor" strokeWidth="2" className="box-1" />
      <rect x="10" y="20" width="28" height="8" rx="1" stroke="currentColor" strokeWidth="2" className="box-2" />
      <rect x="10" y="30" width="28" height="8" rx="1" stroke="currentColor" strokeWidth="2" className="box-3" />
    </g>
  </svg>
);

export const NestPartsIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`nest-icon ${className}`} fill="none">
    <g className="nest-shapes">
      <rect x="12" y="12" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="2" className="nest-outer" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2" className="nest-inner" />
      <polygon points="24,16 28,28 20,28" stroke="currentColor" strokeWidth="2" className="nest-center" />
    </g>
  </svg>
);

export const ManualNestIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`manual-icon ${className}`} fill="none">
    <g className="hand-group">
      <path d="M 14 28 L 14 12 M 20 28 L 20 8 M 26 28 L 26 10 M 32 28 L 32 14 M 38 28 L 38 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="fingers" />
      <path d="M 10 28 Q 14 34 26 34 Q 38 34 40 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="palm" />
    </g>
  </svg>
);

export const NestingInfoIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`info-icon ${className}`} fill="none">
    <g className="info-group">
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" className="info-ring-1" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2" className="info-ring-2" />
      <circle cx="24" cy="14" r="2" fill="currentColor" className="info-dot" />
      <path d="M 24 18 L 24 28 M 20 28 L 28 28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>
);

export const SaveOffCutIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`save-icon ${className}`} fill="none">
    <g className="disk-group">
      <rect x="10" y="10" width="28" height="28" rx="2" stroke="currentColor" strokeWidth="2" className="disk-body" />
      <rect x="12" y="12" width="24" height="10" stroke="currentColor" strokeWidth="1.5" className="disk-label" />
      <rect x="14" y="16" width="4" height="4" fill="currentColor" className="disk-hole" />
      <rect x="10" y="24" width="28" height="12" rx="1" stroke="currentColor" strokeWidth="2" className="disk-drawer" />
    </g>
  </svg>
);

export const ImportProjectIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`import-icon ${className}`} fill="none">
    <g className="import-group">
      <path d="M 24 10 L 24 30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="arrow-stem" />
      <path d="M 18 24 L 24 30 L 30 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-head" />
      <path d="M 8 24 L 8 34 Q 8 38 12 38 L 36 38 Q 40 38 40 34 L 40 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="folder-outline" />
    </g>
  </svg>
);

export const ExportProjectIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`export-icon ${className}`} fill="none">
    <g className="export-group">
      <path d="M 24 32 L 24 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="arrow-stem" />
      <path d="M 18 18 L 24 12 L 30 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="arrow-head" />
      <path d="M 8 24 L 8 34 Q 8 38 12 38 L 36 38 Q 40 38 40 34 L 40 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="folder-outline" />
    </g>
  </svg>
);

export const ImportDXFIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`import-dxf-icon ${className}`} fill="none">
    <g className="dxf-group">
      <path d="M 10 12 L 10 36 Q 10 38 12 38 L 36 38 Q 38 38 38 36 L 38 18 L 26 18 L 26 12 L 12 12 Q 10 12 10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="file-outline" />
      <path d="M 26 12 L 26 18 L 38 18" stroke="currentColor" strokeWidth="1.5" className="file-fold" />
      <circle cx="24" cy="26" r="6" stroke="currentColor" strokeWidth="1.5" className="dxf-circle" />
    </g>
  </svg>
);

export const SheetDatabaseIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`database-icon ${className}`} fill="none">
    <g className="sheets-group">
      <rect x="12" y="10" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="2" className="sheet-1" />
      <rect x="10" y="18" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="2" className="sheet-2" />
      <rect x="14" y="26" width="24" height="16" rx="1" stroke="currentColor" strokeWidth="2" className="sheet-3" />
    </g>
  </svg>
);

export const LayersIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`layers-icon ${className}`} fill="none">
    <g className="layers-group">
      <path d="M 24 12 L 38 18 L 38 28 L 24 34 L 10 28 L 10 18 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="layer-1" />
      <path d="M 24 20 L 34 24 L 34 30 L 24 34 L 14 30 L 14 24 Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="layer-2" />
    </g>
  </svg>
);

export const UndoIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`undo-icon ${className}`} fill="none" style={{ color: '#06b6d4' }}>
    <g className="undo-group">
      <path d="M 34 14 Q 22 14 16 20 Q 12 24 12 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="undo-arc" />
      <path d="M 12 32 L 18 28 L 18 36 Z" fill="currentColor" className="undo-arrow" />
    </g>
  </svg>
);

export const RedoIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`redo-icon ${className}`} fill="none" style={{ color: '#06b6d4' }}>
    <g className="redo-group">
      <path d="M 14 14 Q 26 14 32 20 Q 36 24 36 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="redo-arc" />
      <path d="M 36 32 L 30 28 L 30 36 Z" fill="currentColor" className="redo-arrow" />
    </g>
  </svg>
);

export const FullscreenIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`fullscreen-icon ${className}`} fill="none">
    <g className="fullscreen-group">
      <path d="M 16 16 L 12 12 L 12 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="corner-tl" />
      <path d="M 32 16 L 36 12 L 36 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="corner-tr" />
      <path d="M 16 32 L 12 36 L 12 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="corner-bl" />
      <path d="M 32 32 L 36 36 L 36 28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="corner-br" />
    </g>
  </svg>
);

export const ExportDXFIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`export-dxf-icon ${className}`} fill="none">
    <g className="export-dxf-group">
      <path d="M 10 12 L 10 36 Q 10 38 12 38 L 36 38 Q 38 38 38 36 L 38 18 L 26 18 L 26 12 L 12 12 Q 10 12 10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="file-outline" />
      <path d="M 26 12 L 26 18 L 38 18" stroke="currentColor" strokeWidth="1.5" className="file-fold" />
      <path d="M 24 32 L 24 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="arrow-up" />
      <path d="M 20 24 L 24 20 L 28 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arrow-head" />
    </g>
  </svg>
);

export const ExportPDFIcon: React.FC<IconProps> = ({ className = "" }) => (
  <svg viewBox="0 0 48 48" className={`export-pdf-icon ${className}`} fill="none">
    <g className="pdf-group">
      <path d="M 10 12 L 10 36 Q 10 38 12 38 L 36 38 Q 38 38 38 36 L 38 18 L 26 18 L 26 12 L 12 12 Q 10 12 10 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="file-outline" />
      <path d="M 26 12 L 26 18 L 38 18" stroke="currentColor" strokeWidth="1.5" className="file-fold" />
      <g className="pdf-label">
        <text x="24" y="28" fontSize="10" fill="currentColor" fontWeight="bold" textAnchor="middle">PDF</text>
      </g>
    </g>
  </svg>
);
