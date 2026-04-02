import { CadEntity } from '../../services/db';

interface RenderCircleEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  strokeDasharray?: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  pixelsPerUnit: number;
}

export function renderCircleEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, strokeDasharray, worldToScreen, pixelsPerUnit }: RenderCircleEntityParams) {
  const center = worldToScreen(entity.points[0].x, entity.points[0].y);
  const radius = (entity.properties?.radius || 0) * pixelsPerUnit;

  return (
    <g key={entity.id}>
      <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
          <circle cx={center.x} cy={center.y - radius} r="4" fill="#00ff00" />
          <circle cx={center.x} cy={center.y + radius} r="4" fill="#00ff00" />
          <circle cx={center.x - radius} cy={center.y} r="4" fill="#00ff00" />
          <circle cx={center.x + radius} cy={center.y} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
