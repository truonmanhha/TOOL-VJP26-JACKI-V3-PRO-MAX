import React from 'react';

export const IconLine = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <path fill="none" stroke="rgb(217, 217, 217)" d="M5,19 L19,5" strokeWidth="1.5" />
    <rect fill="rgb(23, 126, 251)" x="3.5" y="17.5" width="3" height="3" />
    <rect fill="rgb(23, 126, 251)" x="17.5" y="3.5" width="3" height="3" />
  </svg>
);

export const IconPolyline = () => (
  <svg viewBox="0 0 24 24" width="24" height="24">
    <polyline fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5" points="4,18 10,8 16,14 22,4" />
    <rect fill="rgb(23, 126, 251)" x="2.5" y="16.5" width="3" height="3" />
    <rect fill="rgb(23, 126, 251)" x="8.5" y="6.5" width="3" height="3" />
    <rect fill="rgb(23, 126, 251)" x="14.5" y="12.5" width="3" height="3" />
    <rect fill="rgb(23, 126, 251)" x="20.5" y="2.5" width="3" height="3" />
  </svg>
);

export const IconCircle = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="1.5" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconArc = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M4,16 A10,10 0 0,1 20,16" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="3" y="15" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="11" y="5" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="19" y="15" width="2" height="2" />
  </svg>
);

export const IconRect = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="6" width="16" height="12" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="3" y="5" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="19" y="17" width="2" height="2" />
  </svg>
);

export const IconEllipse = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <ellipse cx="12" cy="12" rx="9" ry="5" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="11" y="11" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="2" y="11" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="20" y="11" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="11" y="6" width="2" height="2" />
    <rect fill="rgb(23, 126, 251)" stroke="none" x="11" y="16" width="2" height="2" />
  </svg>
);

export const IconPolygon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <polygon points="12,3 20,9 17,19 7,19 4,9" />
  </svg>
);

export const IconSpline = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M3,18 Q8,5 14,12 T21,6" />
    <circle fill="rgb(23, 126, 251)" stroke="none" cx="3" cy="18" r="1" />
    <circle fill="rgb(23, 126, 251)" stroke="none" cx="8" cy="5" r="1" />
    <circle fill="rgb(23, 126, 251)" stroke="none" cx="14" cy="12" r="1" />
    <circle fill="rgb(23, 126, 251)" stroke="none" cx="21" cy="6" r="1" />
  </svg>
);

export const IconHatch = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1">
    <rect x="3" y="3" width="18" height="18" strokeWidth="1.5" />
    <line x1="3" y1="9" x2="9" y2="3" />
    <line x1="3" y1="15" x2="15" y2="3" />
    <line x1="3" y1="21" x2="21" y2="3" />
    <line x1="9" y1="21" x2="21" y2="9" />
    <line x1="15" y1="21" x2="21" y2="15" />
  </svg>
);

export const IconMove = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M12,3 L12,21 M3,12 L21,12" />
    <polygon points="12,3 9,7 15,7" fill="rgb(217, 217, 217)" />
    <polygon points="12,21 9,17 15,17" fill="rgb(217, 217, 217)" />
    <polygon points="3,12 7,9 7,15" fill="rgb(217, 217, 217)" />
    <polygon points="21,12 17,9 17,15" fill="rgb(217, 217, 217)" />
  </svg>
);

export const IconCopy = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="8" y="8" width="12" height="12" />
    <path d="M4,16 L4,4 L16,4" strokeDasharray="2,2" />
    <circle cx="14" cy="14" r="1.5" fill="rgb(23, 126, 251)" stroke="none" />
    <circle cx="10" cy="10" r="1.5" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconRotate = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M20,12 A8,8 0 1,1 12,4" />
    <polygon points="20,12 17,8 23,8" fill="rgb(217, 217, 217)" />
    <circle cx="12" cy="12" r="1.5" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconMirror = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="4,4" />
    <polygon points="10,6 4,18 10,18" fill="rgb(217, 217, 217)" stroke="none" />
    <polygon points="14,6 20,18 14,18" fill="none" />
  </svg>
);

export const IconScale = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="3" y="14" width="7" height="7" />
    <rect x="10" y="4" width="10" height="10" strokeDasharray="2,2" />
    <line x1="10" y1="14" x2="16" y2="8" stroke="rgb(23, 126, 251)" />
    <polygon points="16,8 12,8 16,12" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconTrim = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="6" y1="4" x2="6" y2="20" />
    <line x1="18" y1="4" x2="18" y2="20" />
    <line x1="2" y1="12" x2="22" y2="12" strokeDasharray="2,2" />
    <path d="M9,9 L15,15 M15,9 L9,15" stroke="rgb(255, 80, 80)" strokeWidth="1.5" />
  </svg>
);

export const IconExtend = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="20" y1="4" x2="20" y2="20" />
    <line x1="4" y1="12" x2="18" y2="12" />
    <polygon points="18,12 14,9 14,15" fill="rgb(217, 217, 217)" />
  </svg>
);

export const IconFillet = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M4,20 L4,10 A6,6 0 0,1 10,4 L20,4" />
    <line x1="4" y1="10" x2="4" y2="4" strokeDasharray="1,2" opacity="0.5" />
    <line x1="10" y1="4" x2="4" y2="4" strokeDasharray="1,2" opacity="0.5" />
  </svg>
);

export const IconChamfer = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M4,20 L4,10 L10,4 L20,4" />
    <line x1="4" y1="10" x2="4" y2="4" strokeDasharray="1,2" opacity="0.5" />
    <line x1="10" y1="4" x2="4" y2="4" strokeDasharray="1,2" opacity="0.5" />
  </svg>
);

export const IconOffset = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M6,6 L18,6 L18,18" />
    <path d="M10,10 L22,10 L22,22" strokeDasharray="2,2" />
    <line x1="6" y1="6" x2="10" y2="10" stroke="rgb(23, 126, 251)" />
    <polygon points="10,10 7,9 9,7" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconArray = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="4" width="4" height="4" />
    <rect x="10" y="4" width="4" height="4" />
    <rect x="16" y="4" width="4" height="4" />
    <rect x="4" y="10" width="4" height="4" />
    <rect x="10" y="10" width="4" height="4" />
    <rect x="16" y="10" width="4" height="4" />
    <rect x="4" y="16" width="4" height="4" />
    <rect x="10" y="16" width="4" height="4" />
    <rect x="16" y="16" width="4" height="4" />
  </svg>
);

export const IconExplode = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="8" y="8" width="8" height="8" strokeDasharray="2,2" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="12" y1="16" x2="12" y2="21" />
    <line x1="8" y1="12" x2="3" y2="12" />
    <line x1="16" y1="12" x2="21" y2="12" />
    <polygon points="12,3 10,6 14,6" fill="rgb(217, 217, 217)" />
    <polygon points="12,21 10,18 14,18" fill="rgb(217, 217, 217)" />
    <polygon points="3,12 6,10 6,14" fill="rgb(217, 217, 217)" />
    <polygon points="21,12 18,10 18,14" fill="rgb(217, 217, 217)" />
  </svg>
);

export const IconErase = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M4,7 L20,7" />
    <path d="M8,7 L8,4 L16,4 L16,7" />
    <path d="M6,7 L6,20 C6,21 7,22 8,22 L16,22 C17,22 18,21 18,20 L18,7" />
    <line x1="10" y1="11" x2="10" y2="18" />
    <line x1="14" y1="11" x2="14" y2="18" />
  </svg>
);

export const IconText = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M5,19 L12,4 L19,19" />
    <line x1="8" y1="14" x2="16" y2="14" />
  </svg>
);

export const IconDimension = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="4" y1="8" x2="4" y2="20" opacity="0.5" />
    <line x1="20" y1="8" x2="20" y2="20" opacity="0.5" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <polygon points="4,10 8,8 8,12" fill="rgb(217, 217, 217)" />
    <polygon points="20,10 16,8 16,12" fill="rgb(217, 217, 217)" />
    <text x="12" y="7" fill="rgb(217, 217, 217)" fontSize="6" textAnchor="middle" stroke="none">100</text>
  </svg>
);

export const IconLeader = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <path d="M20,6 L12,6 L5,16" />
    <polygon points="5,16 8,12 9,14" fill="rgb(217, 217, 217)" />
    <line x1="20" y1="8" x2="14" y2="8" opacity="0.5" />
    <line x1="20" y1="4" x2="14" y2="4" opacity="0.5" />
  </svg>
);

export const IconTable = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="16" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="16" x2="20" y2="16" />
    <line x1="12" y1="10" x2="12" y2="20" />
  </svg>
);

export const IconMeasureDistance = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="4" y1="12" x2="20" y2="12" />
    <polygon points="4,12 8,9 8,15" fill="rgb(23, 126, 251)" stroke="none" />
    <polygon points="20,12 16,9 16,15" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconMeasureRadius = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <circle cx="12" cy="12" r="8" />
    <line x1="12" y1="12" x2="20" y2="12" />
    <polygon points="20,12 16,9 16,15" fill="rgb(23, 126, 251)" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="rgb(217, 217, 217)" stroke="none"/>
  </svg>
);

export const IconMeasureAngle = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="4" y1="20" x2="20" y2="20" />
    <line x1="4" y1="20" x2="16" y2="4" />
    <path d="M10,20 A6,6 0 0,0 12,10" strokeDasharray="2,2"/>
  </svg>
);

export const IconMeasureArea = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <polygon points="6,6 18,8 16,18 4,16" fill="rgba(23, 126, 251, 0.2)" stroke="rgb(23, 126, 251)" />
    <circle cx="12" cy="12" r="1.5" fill="rgb(217, 217, 217)" stroke="none" />
  </svg>
);

export const IconLayerProps = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <polygon points="12,3 22,8 12,13 2,8" />
    <polyline points="2,12 12,17 22,12" />
    <polyline points="2,16 12,21 22,16" />
  </svg>
);

export const IconLayerMatch = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="4" width="12" height="12" />
    <path d="M12,12 L20,20" />
    <line x1="16" y1="20" x2="20" y2="20" />
    <line x1="20" y1="16" x2="20" y2="20" />
  </svg>
);

export const IconLayerIsolate = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <polygon points="12,7 18,10 12,13 6,10" fill="rgb(23, 126, 251)" stroke="none" />
    <polyline points="6,14 12,17 18,14" strokeDasharray="2,2" opacity="0.5" />
  </svg>
);

export const IconLayerOff = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" fill="rgb(40,44,52)" stroke="none" />
  </svg>
);

export const IconBlockInsert = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="14" width="6" height="6" />
    <path d="M10,7 L20,7 L20,17" strokeDasharray="2,2" />
    <polygon points="20,17 18,14 22,14" fill="rgb(217, 217, 217)" />
  </svg>
);

export const IconBlockCreate = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="5" y="5" width="14" height="14" />
    <circle cx="12" cy="12" r="3" fill="rgb(23, 126, 251)" stroke="none" />
  </svg>
);

export const IconMatchProp = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <rect x="4" y="4" width="16" height="6" fill="rgba(217,217,217,0.2)" />
    <line x1="8" y1="10" x2="8" y2="20" />
    <line x1="16" y1="10" x2="16" y2="20" />
    <line x1="6" y1="20" x2="18" y2="20" />
  </svg>
);

export const IconList = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgb(217, 217, 217)" strokeWidth="1.5">
    <line x1="8" y1="6" x2="20" y2="6" />
    <line x1="8" y1="12" x2="20" y2="12" />
    <line x1="8" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1.5" />
    <circle cx="4" cy="12" r="1.5" />
    <circle cx="4" cy="18" r="1.5" />
  </svg>
);
