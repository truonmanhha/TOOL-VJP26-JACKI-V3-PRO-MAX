import React from 'react';
import { CadEntity } from '../../services/db';
import { getCadStrokeColor } from '../../services/axLineStyleUtils';

interface RenderInsertEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderInsertEntity({ entity, isSelected, opacity, worldToScreen }: RenderInsertEntityParams) {
  if (!entity.points.length) return null;

  const pos = worldToScreen(entity.points[0].x, entity.points[0].y);
  const rotation = Number(entity.properties?.rotation || 0);
  const scaleX = Number(entity.properties?.scaleX || 1);
  const scaleY = Number(entity.properties?.scaleY || 1);
  const blockName = String(entity.properties?.blockName || 'BLOCK');
  const color = getCadStrokeColor(entity, isSelected, false);
  const boxSize = 18;

  return (
    <g key={entity.id} transform={`translate(${pos.x}, ${pos.y}) rotate(${-rotation}) scale(${scaleX}, ${scaleY})`} opacity={opacity}>
      <rect x={-boxSize / 2} y={-boxSize / 2} width={boxSize} height={boxSize} fill="none" stroke={color} strokeWidth={isSelected ? 2 : 1} strokeDasharray="4 2" />
      <path d={`M ${-boxSize / 2} ${boxSize / 2} L ${boxSize / 2} ${-boxSize / 2}`} fill="none" stroke={color} strokeWidth={isSelected ? 2 : 1} />
      <text x={0} y={boxSize / 2 + 10} fill={color} fontSize="10" fontFamily="Arial, Helvetica, Tahoma, sans-serif" textAnchor="middle">
        {blockName}
      </text>
      {isSelected && <circle cx={0} cy={0} r="4" fill="#00ff00" />}
    </g>
  );
}
