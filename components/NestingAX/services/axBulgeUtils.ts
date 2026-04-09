import { CadEntity } from './db';

interface ScreenPoint {
  x: number;
  y: number;
}

export function buildBulgedPolylinePath(
  entity: CadEntity,
  worldToScreen: (x: number, y: number) => ScreenPoint
) {
  const points = entity.points || [];
  if (points.length === 0) return '';

  const bulges: number[] = Array.isArray(entity.properties?.bulges) ? entity.properties.bulges : [];
  const closed = Boolean(entity.properties?.closed);
  const lastIndex = closed ? points.length : points.length - 1;

  const first = worldToScreen(points[0].x, points[0].y);
  let path = `M ${first.x} ${first.y}`;

  const getSegmentEnd = (index: number) => {
    if (index === points.length - 1) {
      return closed ? points[0] : points[index];
    }
    return points[index + 1];
  };

  for (let i = 0; i < lastIndex - 1 + (closed ? 1 : 0); i++) {
    const start = points[i];
    const end = getSegmentEnd(i);
    if (!end || (start.x === end.x && start.y === end.y)) continue;

    const startScreen = worldToScreen(start.x, start.y);
    const endScreen = worldToScreen(end.x, end.y);
    const bulge = Number(bulges[i] || 0);

    if (Math.abs(bulge) < 1e-6) {
      path += ` L ${endScreen.x} ${endScreen.y}`;
      continue;
    }

    const chord = Math.hypot(endScreen.x - startScreen.x, endScreen.y - startScreen.y);
    const theta = 4 * Math.atan(Math.abs(bulge));
    const radius = chord / (2 * Math.sin(theta / 2));
    const largeArcFlag = theta > Math.PI ? 1 : 0;
    const sweepFlag = bulge > 0 ? 0 : 1;
    path += ` A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endScreen.x} ${endScreen.y}`;
  }

  if (closed) {
    path += ' Z';
  }

  return path;
}
