import React from 'react';

interface PlacedPartPreview {
  partId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  polygon?: { x: number; y: number }[];
}

interface PerformingNestProps {
  progress: number;           // 0-100
  partsPlaced: number;
  totalParts: number;
  sheetsUsed: number;
  utilization: number;        // 0-100
  placements: PlacedPartPreview[];
  currentSheetW: number;
  currentSheetH: number;
  onStop: () => void;
  onAbort: () => void;
  onHide: () => void;
  currentAction: string;
}

const PerformingNest: React.FC<PerformingNestProps> = ({
  progress, partsPlaced, totalParts, sheetsUsed, utilization,
  placements, currentSheetW, currentSheetH, onStop, onAbort, onHide, currentAction
}) => {
  // SVG scale: fit sheet into 192px width, maintain aspect ratio
  const svgW = 192;
  const scale = currentSheetW > 0 ? svgW / currentSheetW : 1;
  const svgH = currentSheetH > 0 ? Math.round(currentSheetH * scale) : 320;
  const clampedSvgH = Math.min(svgH, 320);
  const finalScale = currentSheetH > 0 ? clampedSvgH / currentSheetH : scale;

  const intermediateResult = Math.max(1, Math.floor(progress / 20));

  return (
    // Overlay backdrop
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
      fontFamily: "'Work Sans', sans-serif",
    }}>
      {/* Modal */}
      <div style={{
        width: 500,
        backgroundColor: 'white',
        border: '1px solid #9ca3af',
        boxShadow: '0px 0px 10px rgba(0,0,0,0.5), inset 1px 1px 0px #ffffff, inset -1px -1px 0px #707070',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'white', padding: '4px 8px',
          borderBottom: '1px solid #d1d5db', height: 32,
        }}>
          <span style={{ fontSize: 12, color: '#374151', userSelect: 'none' }}>Performing Nest</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: 'remove', size: '10px' },
              { icon: 'check_box_outline_blank', size: '10px' },
              { icon: 'close', size: '12px' }
            ].map((item, i) => (
              <button key={i} disabled style={{
                width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'default', color: '#4b5563',
              }}>
                <span className="material-icons-outlined" style={{ fontSize: item.size }}>{item.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, backgroundColor: 'white' }}>

          {/* Current action status */}
          {currentAction && (
            <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' }}>
              {currentAction}
            </div>
          )}

          {/* 3-column row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>

            {/* Left: Hide + nav buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={onHide} style={btnStyle}>Hide</button>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button disabled style={{ ...btnStyle, padding: '4px 8px' }}>{'<<'}</button>
                <button disabled style={{ ...btnStyle, padding: '4px 8px' }}>{'>>'}</button>
              </div>
            </div>

            {/* Center: Stats — English labels */}
            <div style={{ textAlign: 'center', fontFamily: 'sans-serif', lineHeight: 1.5 }}>
              <div style={infoTextStyle}>Intermediate result: <span style={{ fontWeight: 400 }}>{intermediateResult}</span> &nbsp; Fill Ratio: <span style={{ fontWeight: 400 }}>{utilization}%</span></div>
              <div style={infoTextStyle}>Number of sheets: <span style={{ fontWeight: 400 }}>{sheetsUsed}</span> &nbsp; Number of layouts: <span style={{ fontWeight: 400 }}>1</span></div>
              <div style={infoTextStyle}>Layout: <span style={{ fontWeight: 400 }}>1</span> &nbsp; Multiplicity: <span style={{ fontWeight: 400 }}>{partsPlaced}</span></div>
              <div style={infoTextStyle}>Parts: <span style={{ fontWeight: 400 }}>{partsPlaced}/{totalParts}</span> &nbsp; Fill Ratio: <span style={{ fontWeight: 400 }}>{utilization}%</span></div>
            </div>

            {/* Right: Stop + Abort */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={onStop} style={btnStyle}>Stop</button>
              <button onClick={onAbort} style={btnStyle}>Abort</button>
            </div>
          </div>

          {/* Preview box — SVG canvas */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            <div style={{
              width: 192, height: 320,
              backgroundColor: '#d1d5db',
              border: '1px solid black',
              boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {currentSheetW > 0 ? (
                <svg
                  width={svgW}
                  height={clampedSvgH}
                  viewBox={`0 0 ${svgW} ${clampedSvgH}`}
                >
                  {/* Sheet background */}
                  <rect x={0} y={0} width={svgW} height={clampedSvgH}
                    fill="#e5e7eb" stroke="#6b7280" strokeWidth={1} />
                  {/* Placed parts — appear one-by-one */}
                  {placements.map((p, i) => {
                    if (p.polygon && p.polygon.length > 0) {
                      const pointsStr = p.polygon
                        .map(pt => `${pt.x * finalScale},${pt.y * finalScale}`)
                        .join(' ');
                      return (
                        <polygon
                          key={`${p.partId}-${i}`}
                          points={pointsStr}
                          fill="rgba(59,130,246,0.6)"
                          stroke="#1d4ed8"
                          strokeWidth={0.5}
                        />
                      );
                    }
                    return (
                      <rect
                        key={`${p.partId}-${i}`}
                        x={p.x * finalScale}
                        y={p.y * finalScale}
                        width={Math.max(1, p.w * finalScale)}
                        height={Math.max(1, p.h * finalScale)}
                        fill="rgba(59,130,246,0.6)"
                        stroke="#1d4ed8"
                        strokeWidth={0.5}
                      />
                    );
                  })}
                </svg>
              ) : (
                <span style={{ fontSize: 10, color: '#6b7280' }}>Waiting...</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Shared styles
const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: 'white',
  border: '1px solid #d1d5db',
  fontSize: 11,
  color: '#374151',
  cursor: 'pointer',
  borderRadius: 2,
  boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
  minWidth: 60,
  fontFamily: "'Work Sans', sans-serif",
};

const infoTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: '#1f2937',
  fontWeight: 500,
  margin: '2px 0',
};

export default PerformingNest;
