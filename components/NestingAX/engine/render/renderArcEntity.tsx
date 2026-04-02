import { CadEntity } from '../../services/db';

interface RenderArcEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  strokeColor: string;
  strokeWidth: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  pixelsPerUnit: number;
}

export function renderArcEntity({ entity, isSelected, opacity, strokeColor, strokeWidth, worldToScreen, pixelsPerUnit }: RenderArcEntityParams) {
  const props = entity.properties;
  if (!props || props.centerX === undefined || entity.points.length < 2) return null;

  const cScreen = worldToScreen(props.centerX, props.centerY);
  const rPx = props.radius * pixelsPerUnit;
  const sScreen = worldToScreen(entity.points[0].x, entity.points[0].y);
  const eScreen = worldToScreen(entity.points[1].x, entity.points[1].y);
  const startAngle = typeof props.startAngle === 'number'
    ? props.startAngle
    : Math.atan2(entity.points[0].y - props.centerY, entity.points[0].x - props.centerX);
  const endAngle = typeof props.endAngle === 'number'
    ? props.endAngle
    : Math.atan2(entity.points[1].y - props.centerY, entity.points[1].x - props.centerX);
  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) angleDiff += 2 * Math.PI;
  const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
  const sweepFlag = 1;
  const d = `M ${sScreen.x} ${sScreen.y} A ${rPx} ${rPx} 0 ${largeArcFlag} ${sweepFlag} ${eScreen.x} ${eScreen.y}`;

  return (
    <g key={entity.id}>
      <path d={d} fill="none" stroke={strokeColor} strokeWidth={strokeWidth} opacity={opacity} />
      {isSelected && (
        <>
          <circle cx={sScreen.x} cy={sScreen.y} r="4" fill="#00ff00" />
          <circle cx={eScreen.x} cy={eScreen.y} r="4" fill="#00ff00" />
          <circle cx={cScreen.x} cy={cScreen.y} r="3" fill="none" stroke="#00ff00" strokeWidth="1" />
        </>
      )}
    </g>
  );
}
