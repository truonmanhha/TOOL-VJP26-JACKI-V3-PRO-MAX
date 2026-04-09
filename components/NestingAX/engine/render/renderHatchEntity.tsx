import React from 'react';
import { CadEntity } from '../../services/db';

interface RenderHatchEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  pixelsPerUnit: number;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderHatchEntity({ entity, isSelected, opacity, pixelsPerUnit, worldToScreen }: RenderHatchEntityParams) {
  if (!entity.points.length) return null;

  const screenPts = entity.points.map(point => worldToScreen(point.x, point.y));
  if (screenPts.length < 3) return null;

  const clipPath = `${screenPts.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`;
  const pattern = entity.properties?.pattern || 'lines';
  const angle = Number(entity.properties?.angle || 45);
  const spacing = Math.max((entity.properties?.spacing || 5) * pixelsPerUnit, 3);
  const hatchBaseColor = entity.properties?.color || '#ffffff';
  const hatchColor = isSelected ? '#00ff00' : hatchBaseColor;
  const hatchOpacity = isSelected ? 1 : 0.22 * Number(opacity || 1);

  let minX = screenPts[0].x;
  let minY = screenPts[0].y;
  let maxX = screenPts[0].x;
  let maxY = screenPts[0].y;
  for (const point of screenPts) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const diagonal = Math.sqrt((maxX - minX) ** 2 + (maxY - minY) ** 2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const angleRad = (angle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);
  const clipId = `hatch-clip-${entity.id}`;
  const lines: React.ReactNode[] = [];
  const count = Math.ceil(diagonal / spacing) + 2;

  for (let i = -count; i <= count; i++) {
    const offset = i * spacing;
    const x1 = cx + offset * cosA - diagonal * sinA;
    const y1 = cy + offset * sinA + diagonal * cosA;
    const x2 = cx + offset * cosA + diagonal * sinA;
    const y2 = cy + offset * sinA - diagonal * cosA;
    lines.push(<line key={`l-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hatchColor} strokeOpacity={hatchOpacity} strokeWidth="0.8" />);
  }

  if (pattern === 'crosshatch') {
    const crossAngle = angleRad + Math.PI / 2;
    const cosB = Math.cos(crossAngle);
    const sinB = Math.sin(crossAngle);
    for (let i = -count; i <= count; i++) {
      const offset = i * spacing;
      const x1 = cx + offset * cosB - diagonal * sinB;
      const y1 = cy + offset * sinB + diagonal * cosB;
      const x2 = cx + offset * cosB + diagonal * sinB;
      const y2 = cy + offset * sinB - diagonal * cosB;
        lines.push(<line key={`c-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hatchColor} strokeOpacity={hatchOpacity} strokeWidth="0.8" />);
    }
  }

  if (pattern === 'dots') {
    lines.length = 0;
    const dotSpacing = Math.max(spacing, 6);
    for (let x = minX; x <= maxX; x += dotSpacing) {
      for (let y = minY; y <= maxY; y += dotSpacing) {
        lines.push(<circle key={`d-${x}-${y}`} cx={x} cy={y} r="1.2" fill={hatchColor} fillOpacity={hatchOpacity} />);
      }
    }
  }

  return (
    <g key={entity.id}>
      <defs>
        <clipPath id={clipId}>
          <path d={clipPath} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {lines}
      </g>
      {isSelected && <path d={clipPath} fill="none" stroke="#00ff00" strokeWidth="2" strokeDasharray="4,4" />}
    </g>
  );
}
