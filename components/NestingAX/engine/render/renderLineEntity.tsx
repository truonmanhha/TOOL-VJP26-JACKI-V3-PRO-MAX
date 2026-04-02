import { CadEntity } from '../../services/db';

interface RenderLineEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  strokeDasharray?: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderLineEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, strokeDasharray, worldToScreen }: RenderLineEntityParams) {
  const p1 = worldToScreen(entity.points[0].x, entity.points[0].y);
  const p2 = worldToScreen(entity.points[1].x, entity.points[1].y);
  return (
    <g key={entity.id}>
      <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={p1.x} cy={p1.y} r="4" fill="#00ff00" />
          <circle cx={p2.x} cy={p2.y} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
