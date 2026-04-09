import { CadEntity } from '../../services/db';

interface RenderPolygonEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  pixelsPerUnit: number;
}

export function renderPolygonEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, worldToScreen, pixelsPerUnit }: RenderPolygonEntityParams) {
  const center = worldToScreen(entity.points[0].x, entity.points[0].y);
  const sides = entity.properties?.sides || 6;
  const radius = (entity.properties?.radius || 0) * pixelsPerUnit;
  const edgePt = worldToScreen(entity.points[1].x, entity.points[1].y);
  const angleOffset = Math.atan2(edgePt.y - center.y, edgePt.x - center.x);
  const pts: string[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = angleOffset + (2 * Math.PI * i) / sides;
    pts.push(`${center.x + radius * Math.cos(angle)},${center.y + radius * Math.sin(angle)}`);
  }

  return (
    <g key={entity.id}>
      <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
          {pts.map((pt, idx) => {
            const [px, py] = pt.split(',').map(Number);
            return <circle key={idx} cx={px} cy={py} r="4" fill="#00ff00" />;
          })}
        </>
      )}
    </g>
  );
}
