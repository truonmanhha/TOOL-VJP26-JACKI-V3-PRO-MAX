import { CadEntity } from '../../../services/db';
import { getCadAnnotationScale, getCadDimensionText } from '../../../services/axAnnotationUtils';
import { resolveDimensionStyle } from '../../../services/dimensionStyles';

interface ScreenPoint {
  x: number;
  y: number;
}

export interface AXDimensionLayout {
  p1: ScreenPoint;
  p2: ScreenPoint;
  textPos: ScreenPoint;
  dimText: string;
  dimTextPx: number;
  tickAStart: ScreenPoint;
  tickAEnd: ScreenPoint;
  tickBStart: ScreenPoint;
  tickBEnd: ScreenPoint;
  textLeaderStart: ScreenPoint;
  textLeaderEnd: ScreenPoint;
}

export function buildDimensionLayout(
  entity: CadEntity,
  worldToScreen: (x: number, y: number) => ScreenPoint,
  pixelsPerUnit: number
): AXDimensionLayout | null {
  if (!entity.points || entity.points.length < 2) return null;

  const p1 = worldToScreen(entity.points[0].x, entity.points[0].y);
  const p2 = worldToScreen(entity.points[1].x, entity.points[1].y);
  const style = resolveDimensionStyle(entity.properties?.dimensionStyle);
  const textPos = entity.points.length >= 3
    ? worldToScreen(entity.points[2].x, entity.points[2].y)
    : { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - style.textOffsetWorld * pixelsPerUnit };

  const value = entity.properties?.value ?? 0;
  const unit = entity.properties?.unit || 'mm';
  const dimText = getCadDimensionText(value, unit, entity.properties?.text);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const tickSize = style.arrowSize;
  const nx = len > 0 ? (-dy / len) * tickSize : 0;
  const ny = len > 0 ? (dx / len) * tickSize : tickSize;
  const dimTextPx = getCadAnnotationScale(pixelsPerUnit, entity.properties?.textHeight || style.textOffsetWorld * 1.5);

  return {
    p1,
    p2,
    textPos,
    dimText,
    dimTextPx,
    tickAStart: { x: p1.x - nx, y: p1.y - ny },
    tickAEnd: { x: p1.x + nx, y: p1.y + ny },
    tickBStart: { x: p2.x - nx, y: p2.y - ny },
    tickBEnd: { x: p2.x + nx, y: p2.y + ny },
    textLeaderStart: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
    textLeaderEnd: textPos,
  };
}
