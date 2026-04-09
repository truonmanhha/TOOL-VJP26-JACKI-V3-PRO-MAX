import { CadEntity } from '../../services/db';

interface RenderSplineEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  strokeDasharray?: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderSplineEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, strokeDasharray, worldToScreen }: RenderSplineEntityParams) {
  const screenPts = entity.points.map(point => worldToScreen(point.x, point.y));
  if (screenPts.length < 2) return null;

  const d = screenPts.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

  return (
    <g key={entity.id}>
      <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
      {isSelected && screenPts.map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#00ff00" />
      ))}
    </g>
  );
}
