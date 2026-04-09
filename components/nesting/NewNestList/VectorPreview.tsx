// ============================================================
// VECTOR PREVIEW COMPONENT
// Real-time vector rendering with auto-scaling
// ============================================================

import React, { useRef, useEffect } from 'react';

interface GeometryPoint {
  x: number;
  y: number;
}

interface GeometryPath {
  type: 'line' | 'arc' | 'polyline';
  points: GeometryPoint[];
  isRapid?: boolean; // G0 moves (red) vs G1 feed moves (green)
}

interface VectorPreviewProps {
  geometry?: {
    paths: GeometryPath[];
  };
  width?: number;
  height?: number;
  className?: string;
  showDebugInfo?: boolean; // Show scale and dimensions overlay
}

/**
 * VectorPreview Component
 */
const VectorPreview: React.FC<VectorPreviewProps> = ({
  geometry,
  width = 200,
  height = 200,
  className = '',
  showDebugInfo = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1f2937'; // Dark gray background
    ctx.fillRect(0, 0, width, height);

    // Check if geometry exists
    if (!geometry || !geometry.paths || geometry.paths.length === 0) {
      // Draw "No Preview" text
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No Preview', width / 2, height / 2);
      return;
    }

    // STEP 1: Calculate Bounding Box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    geometry.paths.forEach(path => {
      path.points.forEach(point => {
        if (point == null || point.x == null || point.y == null || isNaN(point.x) || isNaN(point.y)) return;
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
      });
    });

    // Handle empty or invalid bounds
    if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY)) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Invalid Data', width / 2, height / 2);
      return;
    }

    const geomWidth = maxX - minX;
    const geomHeight = maxY - minY;

    if (geomWidth === 0 && geomHeight === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Too Small', width / 2, height / 2);
      return;
    }

    // STEP 2: Calculate Auto-scaling
    const paddingRatio = width <= 100 ? 0.05 : 0.15; 
    const padding = Math.min(width, height) * paddingRatio;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;

    const scaleX = geomWidth > 0 ? availableWidth / geomWidth : Infinity;
    const scaleY = geomHeight > 0 ? availableHeight / geomHeight : Infinity;
    const scale = Math.min(scaleX, scaleY); 

    const scaledWidth = geomWidth * scale;
    const scaledHeight = geomHeight * scale;

    // STEP 3: Sort paths
    const sortedPaths = [...geometry.paths].sort((a, b) => {
      if (a.isRapid && !b.isRapid) return -1;
      if (!a.isRapid && b.isRapid) return 1;
      return 0;
    });

    // STEP 4: Render Geometry with adaptive styling
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Sharper, clearer lines for small thumbnails
    const lineWidth = width <= 100 ? 1.5 : 2.0;
    ctx.lineWidth = lineWidth;

    sortedPaths.forEach(path => {
      if (!path.points || path.points.length < 2) return;

      let strokeColor = path.isRapid ? '#ef4444' : '#22c55e';
      ctx.strokeStyle = strokeColor;
      
      // Removed shadowBlur for small thumbnails to ensure sharp edges
      if (width > 100) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 4;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();

      const centerXOffset = (width - scaledWidth) / 2;
      const centerYOffset = (height - scaledHeight) / 2;
      
      path.points.forEach((point, i) => {
        if (!point) return;
        // REMOVED Math.round to allow sub-pixel rendering for small scales
        const x = (point.x - minX) * scale + centerXOffset;
        const y = height - ((point.y - minY) * scale + centerYOffset);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      // ALWAYS close and fill geometry paths (not rapid moves)
      if (!path.isRapid && path.points.length > 2) {
        ctx.closePath();
        // Add subtle fill to help identify shapes in small previews
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fill();
      }

      ctx.stroke();
    });

    ctx.shadowBlur = 0;

    if (showDebugInfo) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, width, 60);
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px monospace';
      const info = [`Size: ${geomWidth.toFixed(1)}x${geomHeight.toFixed(1)}`, `Scale: ${scale.toFixed(3)}x`, `Paths: ${geometry.paths.length}`];
      info.forEach((text, i) => ctx.fillText(text, 5, 15 + i * 15));
    }

  }, [geometry, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`rounded-lg ${className}`}
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
};

export default VectorPreview;

// ============================================================
// HELPER FUNCTIONS FOR GEOMETRY CONVERSION
// ============================================================

/**
 * Convert CAD entities to geometry format
 */
export function cadEntitiesToGeometry(entities: any[]): { paths: GeometryPath[] } {
  const paths: GeometryPath[] = [];

  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    return { paths: [] };
  }

  entities.forEach((entity) => {
    if (!entity) return;
    const type = (entity.type || '').toLowerCase();
    const points = entity.points || [];

    // --- STRATEGY: POINT-FIRST IDENTIFICATION ---
    // If we have more than 2 points, it's essentially a shape/polyline.
    // Render it as such regardless of the "type" label.
    if (points.length > 2) {
      const pts = [...points];
      // Auto-close if the type implies a closed shape or points are close
      const isClosed = type.includes('poly') || type.includes('rect') || type.includes('polygon') || type.includes('solid');
      if (isClosed) {
        const first = pts[0], last = pts[pts.length - 1];
        const dist = Math.sqrt(Math.pow(first.x - last.x, 2) + Math.pow(first.y - last.y, 2));
        if (dist > 0.001) pts.push({ ...first });
      }
      paths.push({ type: 'polyline', points: pts, isRapid: false });
      return; // Skip specialized logic if we already rendered via points
    }

    // --- SPECIALIZED PRIMITIVE LOGIC (for 1 or 2 point definitions) ---
    if (type === 'line') {
      const p1 = entity.start || points[0];
      const p2 = entity.end || points[1];
      if (p1 && p2) paths.push({ type: 'line', points: [p1, p2], isRapid: false });
    } 
    else if (type === 'circle') {
      const center = entity.center || points[0];
      const radius = entity.radius || entity.properties?.radius || 10;
      if (center && radius) {
        const circlePts: GeometryPoint[] = [];
        for (let i = 0; i <= 32; i++) {
          const a = (i / 32) * Math.PI * 2;
          circlePts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
        }
        paths.push({ type: 'polyline', points: circlePts, isRapid: false });
      }
    } 
    else if (type === 'rect' || type === 'rectangle' || type === 'polygon') {
      // Handle 2-point definitions (center + vertex or corner + corner)
      const p1 = points[0], p2 = points[1];
      if (p1 && p2) {
        const sides = entity.properties?.sides || (type.includes('rect') ? 4 : 6);
        const radius = entity.properties?.radius || Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        const angleOffset = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        
        if (type.includes('rect') && !entity.properties?.sides) {
          // Standard 2-corner rectangle
          paths.push({
            type: 'polyline',
            points: [{ x: p1.x, y: p1.y }, { x: p2.x, y: p1.y }, { x: p2.x, y: p2.y }, { x: p1.x, y: p2.y }, { x: p1.x, y: p1.y }],
            isRapid: false
          });
        } else {
          // Polygon from center + vertex
          const polyPts: GeometryPoint[] = [];
          for (let i = 0; i <= sides; i++) {
            const a = angleOffset + (2 * Math.PI * i) / sides;
            polyPts.push({ x: p1.x + radius * Math.cos(a), y: p1.y + radius * Math.sin(a) });
          }
          paths.push({ type: 'polyline', points: polyPts, isRapid: false });
        }
      }
    }
    else if (type === 'arc') {
      const center = (entity.properties?.centerX !== undefined) ? { x: entity.properties.centerX, y: entity.properties.centerY } : (entity.center || points[0]);
      const radius = Math.abs(entity.radius || entity.properties?.radius || 10);
      const startAngle = (entity.startAngle ?? entity.properties?.startAngle ?? 0) * (Math.PI / 180);
      const endAngle = (entity.endAngle ?? entity.properties?.endAngle ?? 360) * (Math.PI / 180);
      if (center && radius) {
        let sweep = endAngle > startAngle ? endAngle - startAngle : (endAngle + 2 * Math.PI - startAngle);
        if (sweep <= 0) sweep = Math.PI * 2;
        const arcPts: GeometryPoint[] = [];
        for (let i = 0; i <= 32; i++) {
          const a = startAngle + (i / 32) * sweep;
          arcPts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
        }
        paths.push({ type: 'polyline', points: arcPts, isRapid: false });
      }
    }
    else if (points.length >= 1) {
      // Ultimate fallback: Just draw whatever points we have
      paths.push({ type: 'polyline', points: points, isRapid: false });
    }
  });

  return { paths };
}

/**
 * Convert DXF entities to geometry format
 */
export function dxfEntitiesToGeometry(entities: any[]): { paths: GeometryPath[] } {
  const paths: GeometryPath[] = [];
  entities.forEach(entity => {
    if (entity.geometry && entity.geometry.length >= 2) {
      paths.push({ type: 'polyline', points: entity.geometry, isRapid: false });
    }
  });
  return { paths };
}

/**
 * Convert G-code toolpath to geometry format
 */
export function gcodeToGeometry(toolpath: any[]): { paths: GeometryPath[] } {
  const paths: GeometryPath[] = [];
  let currentPath: GeometryPoint[] = [];
  let isRapid = false;

  toolpath.forEach(command => {
    if (command.type === 'G0') {
      if (currentPath.length >= 2) paths.push({ type: 'polyline', points: [...currentPath], isRapid: false });
      currentPath = [{ x: command.x, y: command.y }];
      isRapid = true;
    } else if (command.type === 'G1') {
      if (isRapid && currentPath.length >= 1) {
        currentPath.push({ x: command.x, y: command.y });
        paths.push({ type: 'polyline', points: [...currentPath], isRapid: true });
        currentPath = [{ x: command.x, y: command.y }];
        isRapid = false;
      } else {
        currentPath.push({ x: command.x, y: command.y });
      }
    }
  });

  if (currentPath.length >= 2) paths.push({ type: 'polyline', points: currentPath, isRapid });
  return { paths };
}

/**
 * Generate thumbnail from geometry (returns base64 data URL)
 */
export function generateThumbnail(
  geometry: { paths: GeometryPath[] },
  width: number = 200,
  height: number = 200
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, width, height);

  if (!geometry || !geometry.paths || geometry.paths.length === 0) return canvas.toDataURL('image/png');

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  geometry.paths.forEach(path => {
    path.points.forEach(point => {
      minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
    });
  });

  if (!isFinite(minX)) return canvas.toDataURL('image/png');

  const geomWidth = maxX - minX, geomHeight = maxY - minY;
  if (geomWidth === 0 && geomHeight === 0) return canvas.toDataURL('image/png');

  const padding = 10;
  const scale = Math.min((width - padding * 2) / geomWidth, (height - padding * 2) / geomHeight);
  const offsetX = (width - geomWidth * scale) / 2 - minX * scale;
  const offsetY = (height - geomHeight * scale) / 2 - minY * scale;

  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 1.5;

  geometry.paths.forEach(path => {
    if (path.points.length < 2) return;
    ctx.strokeStyle = path.isRapid ? '#ef4444' : '#22c55e';
    ctx.beginPath();
    path.points.forEach((p, i) => {
      const x = p.x * scale + offsetX, y = height - (p.y * scale + offsetY);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  return canvas.toDataURL('image/png');
}
