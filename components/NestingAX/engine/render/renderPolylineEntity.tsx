import { CadEntity } from '../../services/db';
import { buildBulgedPolylinePath } from '../../services/axBulgeUtils';

interface RenderPolylineEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  strokeDasharray?: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderPolylineEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, strokeDasharray, worldToScreen }: RenderPolylineEntityParams) {
  const isClosed = entity.properties?.closed === true;
  const hasBulges = Array.isArray(entity.properties?.bulges) && entity.properties.bulges.some((value: number) => Math.abs(Number(value || 0)) > 1e-6);
  const pointsStr = entity.points.map(point => {
    const screen = worldToScreen(point.x, point.y);
    return `${screen.x},${screen.y}`;
  }).join(' ');
  const bulgedPath = hasBulges ? buildBulgedPolylinePath(entity, worldToScreen) : '';

  return (
    <g key={entity.id}>
      {hasBulges
        ? <path d={bulgedPath} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
        : isClosed
          ? <polygon points={pointsStr} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
          : <polyline points={pointsStr} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />}
      {isSelected && entity.points.map((pt, idx) => {
        const s = worldToScreen(pt.x, pt.y);
        return <circle key={idx} cx={s.x} cy={s.y} r="4" fill="#00ff00" />;
      })}
    </g>
  );
}
