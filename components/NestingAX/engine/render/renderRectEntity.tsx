import { CadEntity } from '../../services/db';

interface RenderRectEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  strokeDasharray?: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderRectEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, strokeDasharray, worldToScreen }: RenderRectEntityParams) {
  const p1 = worldToScreen(entity.points[0].x, entity.points[0].y);
  const p2 = worldToScreen(entity.points[1].x, entity.points[1].y);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const w = Math.abs(p2.x - p1.x);
  const h = Math.abs(p2.y - p1.y);
  return (
    <g key={entity.id}>
      <rect x={x} y={y} width={w} height={h} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
          <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
          <circle cx={p1.x} cy={p2.y} r="4" fill="#00ff00" />
          <circle cx={p2.x} cy={p1.y} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
