import { CadEntity } from '../../services/db';
import { getCadStrokeColor } from '../../services/axLineStyleUtils';

interface RenderTextEntityParams {
  entity: CadEntity;
  isSelected: boolean;
  worldToScreen: (x: number, y: number) => { x: number; y: number };
  toCadAnnotationScale: (worldHeight?: number) => number;
}

export function renderTextEntity({ entity, isSelected, worldToScreen, toCadAnnotationScale }: RenderTextEntityParams) {
  const pos = worldToScreen(entity.points[0].x, entity.points[0].y);
  const textStr = entity.properties?.text || '';
  const lines = String(textStr).split(/\n|\\P/g);
  const fontSizeWorld = entity.properties?.textHeight || entity.properties?.fontSize || 2.5;
  const fontSizeScreen = toCadAnnotationScale(fontSizeWorld);
  const rotation = entity.properties?.rotation || 0;
  const textColor = getCadStrokeColor(entity, isSelected, false);
  const attachment = Number(entity.properties?.attachment ?? 0);
  const lineSpacing = Number(entity.properties?.lineSpacingFactor || 1.2) * 100;
  const textAnchor = attachment === 1 || attachment === 4 || attachment === 7 ? 'start'
    : attachment === 2 || attachment === 5 || attachment === 8 ? 'middle'
    : attachment === 3 || attachment === 6 || attachment === 9 ? 'end'
    : 'start';

  return (
    <g key={entity.id} transform={rotation ? `rotate(${-rotation}, ${pos.x}, ${pos.y})` : undefined}>
      <g transform={`translate(${pos.x}, ${pos.y}) scale(${fontSizeScreen / 100})`}>
        <text
          x={0}
          y={0}
          fill={textColor}
          fontSize={100}
          fontFamily="Arial, Helvetica, Tahoma, sans-serif"
          textAnchor={textAnchor}
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={0} dy={index === 0 ? 0 : lineSpacing}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
      {isSelected && (
        <>
          <circle cx={pos.x} cy={pos.y} r="4" fill="#00ff00" />
          <rect
            x={pos.x - 2}
            y={pos.y - fontSizeScreen * 0.6}
            width={textStr.length * fontSizeScreen * 0.6 + 4}
            height={fontSizeScreen * Math.max(1.2, lines.length * (lineSpacing / 100))}
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        </>
      )}
    </g>
  );
}
