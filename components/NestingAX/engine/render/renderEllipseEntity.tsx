import { CadEntity } from '../../services/db';

interface RenderEllipseEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  pixelsPerUnit: number;
}

export function renderEllipseEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, worldToScreen, pixelsPerUnit }: RenderEllipseEntityParams) {
  const center = worldToScreen(entity.points[0].x, entity.points[0].y);
  const rx = (entity.properties?.rx || 0) * pixelsPerUnit;
  const ry = (entity.properties?.ry || 0) * pixelsPerUnit;
  const rotation = entity.properties?.rotation || 0;

  return (
    <g key={entity.id} transform={rotation ? `rotate(${-rotation}, ${center.x}, ${center.y})` : undefined}>
      <ellipse cx={center.x} cy={center.y} rx={rx} ry={ry} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={center.x} cy={center.y} r="4" fill="#00ff00" />
          <circle cx={center.x + rx} cy={center.y} r="4" fill="#00ff00" />
          <circle cx={center.x - rx} cy={center.y} r="4" fill="#00ff00" />
          <circle cx={center.x} cy={center.y - ry} r="4" fill="#00ff00" />
          <circle cx={center.x} cy={center.y + ry} r="4" fill="#00ff00" />
        </>
      )}
    </g>
  );
}
