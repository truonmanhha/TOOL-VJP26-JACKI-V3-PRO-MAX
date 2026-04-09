import { CadEntity } from '../../services/db';
import { getCadStrokeColor } from '../../services/axLineStyleUtils';

interface RenderLeaderEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  opacity: string;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
}

export function renderLeaderEntity({ entity, isSelected, opacity, worldToScreen }: RenderLeaderEntityParams) {
  const screenPts = entity.points.map(p => worldToScreen(p.x, p.y));
  const leaderColor = getCadStrokeColor(entity, isSelected, false);
  const textStr = entity.properties?.text || '';
  const landingLength = Number(entity.properties?.landingLength || 30);

  let arrowHead = null;
  if (screenPts.length >= 2) {
    const tip = screenPts[0];
    const next = screenPts[1];
    const adx = next.x - tip.x;
    const ady = next.y - tip.y;
    const alen = Math.sqrt(adx * adx + ady * ady);
    if (alen > 0) {
      const arrowLen = 12;
      const arrowW = 5;
      const ux = adx / alen, uy = ady / alen;
      const px = -uy, py = ux;
      arrowHead = (
        <polygon
          points={`${tip.x},${tip.y} ${tip.x + ux * arrowLen + px * arrowW},${tip.y + uy * arrowLen + py * arrowW} ${tip.x + ux * arrowLen - px * arrowW},${tip.y + uy * arrowLen - py * arrowW}`}
          fill={leaderColor}
        />
      );
    }
  }

  const pathD = screenPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const lastPt = screenPts[screenPts.length - 1];

  return (
    <g key={entity.id}>
      <path d={pathD} fill="none" stroke={leaderColor} strokeWidth={isSelected ? '2' : '1.5'} opacity={opacity} />
      {arrowHead}
      {textStr && (
        <>
          <line x1={lastPt.x} y1={lastPt.y} x2={lastPt.x + landingLength} y2={lastPt.y} stroke={leaderColor} strokeWidth="1" />
          <text x={lastPt.x + landingLength + 3} y={lastPt.y + 4} fill={leaderColor} fontSize="12" fontFamily="Arial, Helvetica, Tahoma, sans-serif">
            {textStr}
          </text>
        </>
      )}
      {isSelected && screenPts.map((pt, idx) => (
        <circle key={idx} cx={pt.x} cy={pt.y} r="4" fill="#00ff00" />
      ))}
    </g>
  );
}
