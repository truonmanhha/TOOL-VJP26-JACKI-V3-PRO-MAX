import React from 'react';
import { CadEntity } from '../../services/db';
import { getCadStrokeColor } from '../../services/axLineStyleUtils';
import { buildDimensionLayout } from './annotations/dimensionLayout';

interface RenderDimensionEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  toCadAnnotationScale: (worldHeight?: number) => number;
}

export function renderDimensionEntity({
  entity,
  isSelected,
  opacity,
  worldToScreen,
  toCadAnnotationScale,
}: RenderDimensionEntityParams) {
  const layout = buildDimensionLayout(entity, worldToScreen, 1);
  if (!layout) return null;

  const dimColor = getCadStrokeColor(entity, isSelected, false);

  return (
    <g key={entity.id}>
      <line x1={layout.p1.x} y1={layout.p1.y} x2={layout.p2.x} y2={layout.p2.y} stroke={dimColor} strokeWidth={isSelected ? '2' : '1'} opacity={opacity} />
      <line x1={layout.tickAStart.x} y1={layout.tickAStart.y} x2={layout.tickAEnd.x} y2={layout.tickAEnd.y} stroke={dimColor} strokeWidth={isSelected ? '2' : '1'} />
      <line x1={layout.tickBStart.x} y1={layout.tickBStart.y} x2={layout.tickBEnd.x} y2={layout.tickBEnd.y} stroke={dimColor} strokeWidth={isSelected ? '2' : '1'} />
      <line x1={layout.textLeaderStart.x} y1={layout.textLeaderStart.y} x2={layout.textLeaderEnd.x} y2={layout.textLeaderEnd.y} stroke={dimColor} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.5" />
      <text x={layout.textPos.x} y={layout.textPos.y + layout.dimTextPx * 0.08} fill={dimColor} fontSize={layout.dimTextPx} fontFamily="Arial, Helvetica, Tahoma, sans-serif" textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>
        {layout.dimText}
      </text>
      {isSelected && (
        <>
          <circle cx={layout.p1.x} cy={layout.p1.y} r="4" fill="#00ff00" />
          <circle cx={layout.p2.x} cy={layout.p2.y} r="4" fill="#00ff00" />
          <circle cx={layout.textPos.x} cy={layout.textPos.y} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
