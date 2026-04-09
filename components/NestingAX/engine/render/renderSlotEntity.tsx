import { CadEntity } from '../../services/db';

interface RenderSlotEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  pixelsPerUnit: number;
}

export function renderSlotEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, worldToScreen, pixelsPerUnit }: RenderSlotEntityParams) {
  const c1 = worldToScreen(entity.points[0].x, entity.points[0].y);
  const c2 = worldToScreen(entity.points[1].x, entity.points[1].y);
  const wPx = (entity.properties?.width || 0) * pixelsPerUnit;
  const halfW = wPx / 2;
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return null;
  const nx = (-dy / len) * halfW;
  const ny = (dx / len) * halfW;
  const d = `M ${c1.x + nx} ${c1.y + ny} L ${c2.x + nx} ${c2.y + ny} A ${halfW} ${halfW} 0 1 1 ${c2.x - nx} ${c2.y - ny} L ${c1.x - nx} ${c1.y - ny} A ${halfW} ${halfW} 0 1 1 ${c1.x + nx} ${c1.y + ny} Z`;

  return (
    <g key={entity.id}>
      <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={c1.x} cy={c1.y} r="4" fill="#00ff00" />
          <circle cx={c2.x} cy={c2.y} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
