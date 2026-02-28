// ============================================================
// DXF & SVG Import/Export Service — NestingAX (Task 19 + Task 20)
// Parses DXF files (via dxf-parser) and SVG files (via DOMParser)
// Exports CAD entities to DXF R12, SVG, and PDF (via jsPDF)
// Returns CadEntity[] compatible with workspace drawing system
// DWG Support: 3-tier external converter fallback (LibreDWG -> ODA -> QCAD)
//   + WASM fallback (LibreDwg-web) for browser-only environments
// ============================================================

import DxfParser from 'dxf-parser';
import { jsPDF } from 'jspdf';
import { LibreDwg } from '@mlightcad/libredwg-web';
import { CadEntity } from './db';

import { uploadDxf } from '../../../services/dxfApiClient';
import { DxfImportEntity } from '../../../services/dxfApiTypes';

// File type constants for LibreDwg
const DWG_FILE_TYPE = 0;

export class DxfService {
  private parser: DxfParser;
  private libredwg: any = null; // Cache LibreDwg instance (LibreDwgEx) - prevent re-initialization

  constructor() {
    this.parser = new DxfParser();
  }

  /**
   * Parse DXF file into CadEntity array.
   * Tries backend API first (higher accuracy: ezdxf + OCS/WCS + block explosion),
   * then falls back to client-side dxf-parser.
   * @param file — DXF file to parse
   * @param layerId — optional layer to assign to all imported entities
   */
  async parseDxfFile(file: File, layerId?: string): Promise<CadEntity[]> {
    try {
      const apiResponse = await uploadDxf(file);
      if (apiResponse.success && apiResponse.entities.length > 0) {
        console.log(`📄 DXF parsed via backend: ${apiResponse.entities.length} entities`);
        return apiResponse.entities.map(e => this._apiToCadEntity(e, layerId));
      }
      if (apiResponse.errors?.length > 0) {
        console.warn('[NestingAX DXF] Server warnings:', apiResponse.errors);
      }
    } catch (apiError) {
      console.warn('[NestingAX DXF] Backend unavailable, using fallback:', apiError);
    }
    return this._parseDxfFileFallback(file, layerId);
  }

  /**
   * Convert DxfImportEntity (backend API format) to CadEntity (NestingAX format).
   */
  private _apiToCadEntity(e: DxfImportEntity, layerId?: string): CadEntity {
    return {
      id: e.id,
      type: e.type,
      points: e.points.map(([x, y]) => ({ x, y })),
      properties: {
        ...e.properties,
        closed: e.is_closed,
        area: e.area,
      },
      layerId: e.layer || layerId,
    };
  }

  /**
   * Fallback: Parse DXF file using client-side dxf-parser library.
   * Used when backend API is unavailable.
   */
  private async _parseDxfFileFallback(file: File, layerId?: string): Promise<CadEntity[]> {
    const content = await file.text();
    try {
      const dxf = this.parser.parseSync(content);
      const entities: CadEntity[] = [];
      if (dxf.entities) {
        dxf.entities.forEach((ent: any) => {
          switch (ent.type?.toUpperCase()) {
            case 'LINE': {
              const p1Raw = (ent.vertices && ent.vertices[0]) ? ent.vertices[0] : (ent.start || {});
              const p2Raw = (ent.vertices && ent.vertices[1]) ? ent.vertices[1] : (ent.end || {});
              entities.push({
                id: crypto.randomUUID(),
                type: 'line',
                points: [
                  { x: p1Raw.x ?? 0, y: p1Raw.y ?? 0 },
                  { x: p2Raw.x ?? 0, y: p2Raw.y ?? 0 }
                ],
                layerId
              });
              break;
            }
            case 'CIRCLE': {
              entities.push({
                id: crypto.randomUUID(),
                type: 'circle',
                points: [{ x: ent.center.x, y: ent.center.y }],
                properties: { radius: ent.radius },
                layerId
              });
              break;
            }
            case 'ARC': {
              const sa = ent.startAngle ?? 0;
              const ea = ent.endAngle ?? (2 * Math.PI);
              const r = ent.radius ?? 0;
              const cx = ent.center?.x ?? 0;
              const cy = ent.center?.y ?? 0;
              const p1 = { x: cx + r * Math.cos(sa), y: cy + r * Math.sin(sa) };
              const p2 = { x: cx + r * Math.cos(ea), y: cy + r * Math.sin(ea) };
              const arcSpan = ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa);
              const midA = sa + arcSpan / 2;
              const p3 = { x: cx + r * Math.cos(midA), y: cy + r * Math.sin(midA) };
              entities.push({
                id: crypto.randomUUID(),
                type: 'arc',
                points: [p1, p3, p2],
                properties: { radius: r, centerX: cx, centerY: cy, startAngle: sa * 180 / Math.PI, endAngle: ea * 180 / Math.PI },
                layerId
              });
              break;
            }
            case 'LWPOLYLINE':
            case 'POLYLINE': {
              let polyPts = (ent.vertices || []).map((p: any) => ({ x: p.x, y: p.y }));
              if (polyPts.length >= 2) {
                const isClosed = ent.shape === 1 || ent.closed === true || ent.is_closed === true;
                if (isClosed && polyPts.length > 0) {
                  const first = polyPts[0];
                  const last = polyPts[polyPts.length - 1];
                  const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
                  if (dist > 0.0001) {
                    polyPts = [...polyPts, { x: first.x, y: first.y }];
                  }
                }
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'polyline',
                  points: polyPts,
                  properties: { closed: isClosed },
                  layerId
                });
              }
              break;
            }
            case 'ELLIPSE': {
              const cx = ent.center?.x ?? 0;
              const cy = ent.center?.y ?? 0;
              const majorR = ent.majorAxisEndPoint?.x ?? ent.majorRadius ?? 50;
              const minorR = (ent.minorAxisEndPoint?.y ?? ent.minorRadius ?? 30);
              const ratio = minorR / majorR;
              entities.push({
                id: crypto.randomUUID(),
                type: 'ellipse',
                points: [{ x: cx, y: cy }],
                properties: { rx: majorR, ry: minorR, ratio },
                layerId
              });
              break;
            }
            case 'TEXT': {
              const textStr = ent.text || '';
              if (textStr.trim()) {
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'text',
                  points: [{ x: ent.startPoint?.x ?? 0, y: ent.startPoint?.y ?? 0 }],
                  properties: {
                    text: textStr,
                    fontSize: ent.nominalHeight ?? 14,
                    rotation: ent.rotation ?? 0
                  },
                  layerId
                });
              }
              break;
            }
            case 'MTEXT': {
              const mtextStr = ent.text || '';
              if (mtextStr.trim()) {
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'text',
                  points: [{ x: ent.insertionPoint?.x ?? 0, y: ent.insertionPoint?.y ?? 0 }],
                  properties: {
                    text: mtextStr,
                    fontSize: ent.nominalHeight ?? 14,
                    rotation: ent.rotation ?? 0
                  },
                  layerId
                });
              }
              break;
            }
            case 'SPLINE': {
              const splinePts = (ent.controlPoints || []).map((p: any) => ({ x: p.x, y: p.y }));
              if (splinePts.length >= 2) {
                const degree = ent.degree ?? 3;
                const knots = ent.knots;
                const sampled = this.sampleBSpline(splinePts, degree, knots, 50);
                if (sampled.length >= 2) {
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'spline',
                    points: sampled,
                    properties: { degree, knots },
                    layerId
                  });
                }
              }
              break;
            }
            default:
              break;
          }
        });
      }

      console.log(`📄 DXF parsed (fallback): ${entities.length} entities`);
      return entities;
    } catch (err) {
      console.error('❌ Failed to parse DXF (fallback):', err);
      return [];
    }
  }

  /**
   * Parse DWG file content into CadEntity array using LibreDWG.
   * Supported: LINE, LINE2D, CIRCLE, ARC, LWPOLYLINE, POLYLINE, POLYLINE2D, POLYLINE3D, ELLIPSE, TEXT, MTEXT
   * @param fileContent — binary DWG file content as Uint8Array
   * @param layerId — optional layer to assign to all imported entities
   */
  /**
   * Parse DWG file content into CadEntity array using LibreDWG.
   * Supported: LINE, CIRCLE, ARC, LWPOLYLINE, POLYLINE, ELLIPSE, TEXT, MTEXT
   * Note: LibreDwg API uses different property names (startPoint vs start, etc.)
   * @param fileContent — binary DWG file content as Uint8Array
   * @param layerId — optional layer to assign to all imported entities
   */
  async parseDwgFile(fileContent: Uint8Array, layerId?: string): Promise<CadEntity[]> {
    console.log('🔵 parseDwgFile CALLED with', fileContent.byteLength, 'bytes');
    try {
      // Use cached LibreDwg instance (create only once)
      if (!this.libredwg) {
        console.log('📦 LibreDwg WASM initializing (not cached)...');
        this.libredwg = await LibreDwg.create();
        console.log('✅ LibreDwg WASM initialized successfully');
      } else {
        console.log('📦 LibreDwg WASM already cached, reusing...');
      }
      const libredwg = this.libredwg;
      
      // Parse DWG binary data - dwg_read_data returns a Dwg_Data pointer (number)
      console.log('📖 Calling dwg_read_data() with file type 0 (DWG)...');
      const dwgPtr = libredwg.dwg_read_data(fileContent, DWG_FILE_TYPE);
      if (!dwgPtr || dwgPtr === 0) {
        console.error('❌ dwg_read_data() returned null/invalid DWG data');
        throw new Error('Failed to read DWG data');
      }
      console.log('✅ dwg_read_data() success - DWG binary parsed');

      // Convert DWG to intermediate format
      console.log('🔄 Calling convert() to extract entities from DWG database...');
      const db = libredwg.convert(dwgPtr);
      const entities: CadEntity[] = [];
      const entityStats: Record<string, number> = {};
      
      if (!db) {
        console.error('❌ convert() returned null/undefined database');
        throw new Error('Failed to convert DWG data to database');
      }
      
      console.log('✅ convert() completed, extracted entities count:', db?.entities?.length || 0);
      
      // Extract entities from DwgDatabase - entities are in db.entities[]
      if (db && db.entities && Array.isArray(db.entities)) {
        console.log(`🔄 Processing ${db.entities.length} entities...`);
        db.entities.forEach((ent: any, index: number) => {
          try {
            const entType = ent.type?.toUpperCase() || '';
            console.log(`📦 Entity ${index}: type='${entType}'`);

            switch (entType) {
              case 'LINE': {
                // LibreDwg uses startPoint/endPoint, not start/end
                if (ent.startPoint && ent.endPoint) {
                  console.log(`✅ Entity ${index}: Converted LINE`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'line',
                    points: [
                      { x: ent.startPoint.x ?? 0, y: ent.startPoint.y ?? 0 },
                      { x: ent.endPoint.x ?? 0, y: ent.endPoint.y ?? 0 }
                    ],
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped LINE - missing startPoint or endPoint`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'CIRCLE': {
                if (ent.center && ent.radius !== undefined) {
                  console.log(`✅ Entity ${index}: Converted CIRCLE (r=${ent.radius})`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'circle',
                    points: [{ x: ent.center.x ?? 0, y: ent.center.y ?? 0 }],
                    properties: { radius: ent.radius },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped CIRCLE - missing center or radius`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'ARC': {
                if (ent.center && ent.radius !== undefined) {
                  console.log(`✅ Entity ${index}: Converted ARC (r=${ent.radius})`);
                  const sa = ent.startAngle ?? 0;
                  const ea = ent.endAngle ?? (2 * Math.PI);
                  const r = ent.radius;
                  const cx = ent.center.x ?? 0;
                  const cy = ent.center.y ?? 0;
                  const p1 = { x: cx + r * Math.cos(sa), y: cy + r * Math.sin(sa) };
                  const p2 = { x: cx + r * Math.cos(ea), y: cy + r * Math.sin(ea) };
                  const arcSpan = ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa);
                  const midA = sa + arcSpan / 2;
                  const p3 = { x: cx + r * Math.cos(midA), y: cy + r * Math.sin(midA) };

                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'arc',
                    points: [p1, p3, p2],
                    properties: { radius: r, centerX: cx, centerY: cy, startAngle: sa * 180 / Math.PI, endAngle: ea * 180 / Math.PI },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped ARC - missing center or radius`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'LWPOLYLINE': {
                // LibreDwg uses 'vertices' array with each vertex having {x, y, bulge, ...}
                if (ent.vertices && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
                  let polyPts = ent.vertices.map((v: any) => ({
                    x: v.x ?? 0,
                    y: v.y ?? 0
                  }));
                  const flagVal = typeof ent.flag === 'number' ? ent.flag : 0;
                  const flagClosed = (flagVal & 1) === 1 || (flagVal & 512) === 512;
                  const propClosed = ent.closed === true || ent.is_closed === true || (typeof ent.flag_s === 'string' && ent.flag_s.includes('CLOSED'));
                  const first = polyPts[0];
                  const last = polyPts[polyPts.length - 1];
                  const closingDist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
                  const geoClosed = closingDist < 0.01;
                  
                  // DWG-specific heuristic: LibreDwg WASM often does NOT expose the closed flag
                  // (flag=0 or flag=undefined). For CNC nesting, LWPOLYLINE with >= 3 vertices
                  // is almost always a closed boundary (rectangles, part contours).
                  // Smart check: if closing distance is comparable to existing edges, treat as closed.
                  let dwgAutoClose = false;
                  if (!flagClosed && !propClosed && !geoClosed && polyPts.length >= 3) {
                    // Compute average edge length of existing segments
                    let totalEdgeLen = 0;
                    for (let i = 0; i < polyPts.length - 1; i++) {
                      totalEdgeLen += Math.sqrt(
                        (polyPts[i+1].x - polyPts[i].x) ** 2 + (polyPts[i+1].y - polyPts[i].y) ** 2
                      );
                    }
                    const avgEdgeLen = totalEdgeLen / (polyPts.length - 1);
                    // If closing distance is within 5x the average edge length, auto-close
                    // This catches rectangles (closing edge ≈ normal edge) but avoids truly open shapes
                    dwgAutoClose = avgEdgeLen > 0 && closingDist <= avgEdgeLen * 5;

                  }
                  
                  const isClosed = flagClosed || propClosed || geoClosed || dwgAutoClose;

                  
                  if (isClosed && closingDist > 0.0001) {
                    polyPts = [...polyPts, { x: first.x, y: first.y }];
                  }
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'polyline',
                    points: polyPts,
                    properties: { closed: isClosed },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped LWPOLYLINE - insufficient vertices`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'POLYLINE': {
                // Legacy POLYLINE also uses vertices in LibreDwg
                if (ent.vertices && Array.isArray(ent.vertices) && ent.vertices.length >= 2) {
                  let polyPts = ent.vertices.map((v: any) => ({
                    x: v.x ?? 0,
                    y: v.y ?? 0
                  }));
                  const flagClosed = typeof ent.flag === 'number' ? (ent.flag & 1) === 1 : false;
                  const propClosed = ent.closed === true || ent.is_closed === true;
                  const first = polyPts[0];
                  const last = polyPts[polyPts.length - 1];
                  const closingDist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
                  const geoClosed = closingDist < 0.01;
                  // DWG heuristic: smart auto-close (same as LWPOLYLINE)
                  let dwgAutoClose = false;
                  if (!flagClosed && !propClosed && !geoClosed && polyPts.length >= 3) {
                    let totalEdgeLen = 0;
                    for (let i = 0; i < polyPts.length - 1; i++) {
                      totalEdgeLen += Math.sqrt(
                        (polyPts[i+1].x - polyPts[i].x) ** 2 + (polyPts[i+1].y - polyPts[i].y) ** 2
                      );
                    }
                    const avgEdgeLen = totalEdgeLen / (polyPts.length - 1);
                    dwgAutoClose = avgEdgeLen > 0 && closingDist <= avgEdgeLen * 5;
                  }
                  const isClosed = flagClosed || propClosed || geoClosed || dwgAutoClose;
                  if (isClosed && closingDist > 0.0001) {
                    polyPts = [...polyPts, { x: first.x, y: first.y }];
                  }
                  console.log(`✅ Entity ${index}: Converted POLYLINE (${polyPts.length} points, closed=${isClosed})`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'polyline',
                    points: polyPts,
                    properties: { closed: isClosed },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped POLYLINE - insufficient vertices`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'ELLIPSE': {
                if (ent.center) {
                  console.log(`✅ Entity ${index}: Converted ELLIPSE`);
                  const cx = ent.center.x ?? 0;
                  const cy = ent.center.y ?? 0;
                  // majorAxisEndPoint contains endpoint of major axis, radiusRatio is minor/major
                  const majorAxisPt = ent.majorAxisEndPoint || { x: 50, y: 0 };
                  const majorR = Math.sqrt(majorAxisPt.x * majorAxisPt.x + majorAxisPt.y * majorAxisPt.y) || 50;
                  const ratio = ent.radiusRatio ?? 0.6;
                  const minorR = majorR * ratio;

                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'ellipse',
                    points: [{ x: cx, y: cy }],
                    properties: { rx: majorR, ry: minorR, ratio },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped ELLIPSE - missing center`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'TEXT': {
                const textStr = ent.text || '';
                if (textStr.trim()) {
                  console.log(`✅ Entity ${index}: Converted TEXT`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'text',
                    points: [{
                      x: ent.insertionPoint?.x ?? ent.startPoint?.x ?? 0,
                      y: ent.insertionPoint?.y ?? ent.startPoint?.y ?? 0
                    }],
                    properties: {
                      text: textStr,
                      fontSize: ent.height ?? 14,
                      rotation: ent.rotation ?? 0
                    },
                    layerId
                  });
                } else {
                  console.log(`⏭️ Entity ${index}: Skipped TEXT - empty text`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'MTEXT': {
                const mtextStr = ent.text || '';
                if (mtextStr.trim()) {
                  console.log(`✅ Entity ${index}: Converted MTEXT`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'text',
                    points: [{
                      x: ent.insertionPoint?.x ?? 0,
                      y: ent.insertionPoint?.y ?? 0
                    }],
                    properties: {
                      text: mtextStr,
                      fontSize: ent.height ?? 14,
                      rotation: ent.rotation ?? 0
                    },
                    layerId
                  });
                } else {
                  console.log(`⏭️ Entity ${index}: Skipped MTEXT - empty text`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'RECTANGLE': {
                let rectPoints: any[] = [];
                
                // Handle points array format
                if (ent.points && Array.isArray(ent.points) && ent.points.length >= 4) {
                  rectPoints = ent.points.slice(0, 4).map((p: any) => ({
                    x: p.x ?? 0,
                    y: p.y ?? 0
                  }));
                }
                // Handle basePoint + width + height format
                else if (ent.basePoint && typeof ent.width === 'number' && typeof ent.height === 'number') {
                  const x0 = ent.basePoint.x ?? 0;
                  const y0 = ent.basePoint.y ?? 0;
                  const w = ent.width;
                  const h = ent.height;
                  const rot = (ent.rotation ?? 0) * (Math.PI / 180); // Convert degrees to radians
                  
                  // Calculate 4 corners of rectangle
                  const corners = [
                    { x: 0, y: 0 },
                    { x: w, y: 0 },
                    { x: w, y: h },
                    { x: 0, y: h }
                  ];
                  
                  // Apply rotation and translation
                  rectPoints = corners.map(corner => {
                    const cosR = Math.cos(rot);
                    const sinR = Math.sin(rot);
                    const rotX = corner.x * cosR - corner.y * sinR;
                    const rotY = corner.x * sinR + corner.y * cosR;
                    return {
                      x: x0 + rotX,
                      y: y0 + rotY
                    };
                  });
                }
                
                if (rectPoints.length === 4) {
                  console.log(`✅ Entity ${index}: Converted RECTANGLE`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'polyline',
                    points: rectPoints,
                    properties: {
                      closed: true,
                      filled: false
                    },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped RECTANGLE - invalid geometry`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'HATCH': {
                if (ent.paths && Array.isArray(ent.paths) && ent.paths.length > 0) {
                  console.log(`✅ Entity ${index}: Converted HATCH (${ent.paths.length} paths, pattern='${ent.pattern || 'SOLID'}')`);
                  ent.paths.forEach((path: any, pathIdx: number) => {
                    let pathPoints: any[] = [];
                    if (path.vertices && Array.isArray(path.vertices)) {
                      pathPoints = path.vertices;
                    } else if (path.edges && Array.isArray(path.edges)) {
                      path.edges.forEach((edge: any) => {
                        if (edge.start && !pathPoints.some(p => p.x === edge.start.x && p.y === edge.start.y)) {
                          pathPoints.push(edge.start);
                        }
                      });
                    }
                    if (pathPoints.length >= 2) {
                      const polyPts = pathPoints.map((p: any) => ({
                        x: p.x ?? 0,
                        y: p.y ?? 0
                      }));
                      entities.push({
                        id: crypto.randomUUID(),
                        type: 'polyline',
                        points: polyPts,
                        properties: { 
                          closed: true, 
                          filled: true,
                          pattern: ent.pattern || 'SOLID'
                        },
                        layerId
                      });
                    }
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped HATCH - no valid paths`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'SPLINE': {
                if (ent.controlPoints && Array.isArray(ent.controlPoints) && ent.controlPoints.length >= 2) {
                  const splinePts = ent.controlPoints.map((p: any) => ({
                    x: p.x ?? 0,
                    y: p.y ?? 0
                  }));
                  const degree = ent.degree ?? 3;
                  const knots = ent.knots;
                  const sampled = this.sampleBSpline(splinePts, degree, knots, 50);
                  if (sampled.length >= 2) {
                    console.log(`✅ Entity ${index}: Converted SPLINE (degree=${degree}, ${splinePts.length} control pts → ${sampled.length} sampled pts)`);
                    entities.push({
                      id: crypto.randomUUID(),
                      type: 'spline',
                      points: sampled,
                      properties: { degree, numControlPoints: splinePts.length },
                      layerId
                    });
                  }
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped SPLINE - insufficient control points`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'SOLID': {
                if (ent.points && Array.isArray(ent.points) && ent.points.length >= 3) {
                  const solidPts = ent.points.map((p: any) => ({
                    x: p.x ?? 0,
                    y: p.y ?? 0
                  }));
                  console.log(`✅ Entity ${index}: Converted SOLID (${solidPts.length} points)`);
                  entities.push({
                    id: crypto.randomUUID(),
                    type: 'polyline',
                    points: solidPts,
                    properties: { closed: true, filled: true },
                    layerId
                  });
                } else {
                  console.warn(`⏭️ Entity ${index}: Skipped SOLID - insufficient points`);
                }
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              case 'INSERT': {
                console.log(`⏭️ Entity ${index}: INSERT block references not yet supported (blockName='${ent.blockName || 'unknown'}')`);
                // TODO: Implement block expansion (requires recursive entity parsing)
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
              }

              default:
                console.log(`⏭️ Entity ${index}: Entity type '${entType}' not mapped yet`);
                entityStats[entType] = (entityStats[entType] || 0) + 1;
                break;
            }
          } catch (entityErr) {
            console.error(`❌ Entity ${index}: Failed to parse:`, entityErr);
          }
        });
      }

      // Log entity type distribution statistics
      const sortedStats = Object.entries(entityStats).sort((a, b) => b[1] - a[1]);
      console.log('📊 Entity type distribution:');
      sortedStats.forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

      // Cleanup: Free memory
      console.log('🧹 Calling dwg_free() for memory cleanup...');
      libredwg.dwg_free(dwgPtr);
      console.log('✅ dwg_free() cleanup complete');

      console.log(`✅ parseDwgFile DONE: ${entities.length} entities converted`);
      return entities;
    } catch (err) {
      console.error('❌ parseDwgFile FAILED:', err);
      return [];
    }
  }

  /**
   * Convert DWG file to DXF using external converters (3-tier fallback).
   * Follows FreeCAD pattern: DWG -> DXF -> existing DXF parser
   * 
   * Fallback strategy (external converters):
   * 1. LibreDWG converter: dwg2dxf <input.dwg> -o <output.dxf>
   * 2. ODA/Teigha FileConverter: ODAFileConverter <indir> <outdir> ACAD2000 DXF 0 1 <basename>
   * 3. QCAD dwg2dwg converter: dwg2dwg -f -o <output.dxf> <input.dwg>
   * 4. If all external tools unavailable: fallback to LibreDwg WASM (browser-compatible)
   * 
   * Why this pattern:
   * - External converters understand all DWG versions (2000, 2004, 2010, 2018, etc.)
   * - Parsing via existing DXF logic reduces bugs
   * - Production tools (AutoCAD, FreeCAD) use same pattern
   * - WASM is fallback for browser-only environments (no subprocess access)
   * 
   * @param dwgFile - DWG file to convert
   * @param layerId - optional layer to assign to imported entities
   * @returns CadEntity[] (via external converter -> DXF parse, or empty if conversion fails)
   */
  private async convertDwgToDxf(dwgFile: File, layerId?: string): Promise<CadEntity[]> {
    // Try Python backend API first (supports DWG via LibreDWG CLI)
    try {
      const apiResponse = await uploadDxf(dwgFile);
      if (apiResponse.success && apiResponse.entities.length > 0) {
        console.log(`📄 DWG parsed via backend: ${apiResponse.entities.length} entities`);
        return apiResponse.entities.map(e => this._apiToCadEntity(e, layerId));
      }
    } catch (apiError) {
      console.warn('[NestingAX DWG] Backend unavailable, using fallback:', apiError);
    }

    // Fallback: Try Express DWG->DXF converter
    try {
      const formData = new FormData();
      formData.append('file', dwgFile);
      const response = await fetch('/api/convert-dwg-to-dxf', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.dxfContent) {
          console.log('🔄 Converting DWG to DXF via LibreDWG/ODA/QCAD converter');
          const dxfFile = new File([result.dxfContent], dwgFile.name.replace(/\.dwg$/i, '.dxf'), { type: 'text/plain' });
          const entities = await this._parseDxfFileFallback(dxfFile, layerId);
          console.log(`📄 DXF parsed from DWG: ${entities.length} entities`);
          return entities;
        }
      }
    } catch (apiErr) {
      console.warn('⚠️ Backend DWG converter API unavailable:', apiErr);
    }
    
    // If all converters failed, return empty array (trigger WASM fallback in caller)
    return [];
  }

  /**
   * Parse SVG file content into CadEntity array.
   * Supported: <line>, <circle>, <ellipse>, <rect>, <polyline>, <polygon>, <text>, <path> (basic M/L/H/V/Z)
   * @param layerId — optional layer to assign to all imported entities
   */
  parseSvgFile(content: string, layerId?: string): CadEntity[] {
    const entities: CadEntity[] = [];
    const domParser = new DOMParser();
    const doc = domParser.parseFromString(content, 'image/svg+xml');
    
    // Check for parse error
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      console.error('❌ SVG parse error:', errorNode.textContent);
      return [];
    }

    const n = (el: Element, attr: string) => parseFloat(el.getAttribute(attr) || '0');
    
    // <line>
    doc.querySelectorAll('line').forEach(el => {
      entities.push({
        id: crypto.randomUUID(),
        type: 'line',
        points: [
          { x: n(el, 'x1'), y: n(el, 'y1') },
          { x: n(el, 'x2'), y: n(el, 'y2') }
        ],
        layerId
      });
    });

    // <circle>
    doc.querySelectorAll('circle').forEach(el => {
      entities.push({
        id: crypto.randomUUID(),
        type: 'circle',
        points: [{ x: n(el, 'cx'), y: n(el, 'cy') }],
        properties: { radius: n(el, 'r') },
        layerId
      });
    });

    // <ellipse>
    doc.querySelectorAll('ellipse').forEach(el => {
      entities.push({
        id: crypto.randomUUID(),
        type: 'ellipse',
        points: [{ x: n(el, 'cx'), y: n(el, 'cy') }],
        properties: { rx: n(el, 'rx'), ry: n(el, 'ry') },
        layerId
      });
    });

    // <rect>
    doc.querySelectorAll('rect').forEach(el => {
      const x = n(el, 'x');
      const y = n(el, 'y');
      const w = n(el, 'width');
      const h = n(el, 'height');
      if (w <= 0 || h <= 0) return;
      entities.push({
        id: crypto.randomUUID(),
        type: 'rect',
        points: [
          { x, y },
          { x: x + w, y: y + h }
        ],
        layerId
      });
    });

    // <polyline>
    doc.querySelectorAll('polyline').forEach(el => {
      const pts = this.parseSvgPointsAttr(el.getAttribute('points') || '');
      if (pts.length < 2) return;
      entities.push({
        id: crypto.randomUUID(),
        type: 'polyline',
        points: pts,
        properties: { closed: false },
        layerId
      });
    });

    // <polygon>
    doc.querySelectorAll('polygon').forEach(el => {
      const pts = this.parseSvgPointsAttr(el.getAttribute('points') || '');
      if (pts.length < 2) return;
      // Auto-close polygon
      const first = pts[0];
      const last = pts[pts.length - 1];
      const dx = first.x - last.x;
      const dy = first.y - last.y;
      if (Math.sqrt(dx * dx + dy * dy) > 0.001) {
        pts.push({ x: first.x, y: first.y });
      }
      entities.push({
        id: crypto.randomUUID(),
        type: 'polyline',
        points: pts,
        properties: { closed: true },
        layerId
      });
    });

    // <text>
    doc.querySelectorAll('text').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (!text) return;
      entities.push({
        id: crypto.randomUUID(),
        type: 'text',
        points: [{ x: n(el, 'x'), y: n(el, 'y') }],
        properties: { text, fontSize: n(el, 'font-size') || 14 },
        layerId
      });
    });

    // <path> (basic M/L/H/V/Z only)
    doc.querySelectorAll('path').forEach(el => {
      const d = el.getAttribute('d') || '';
      const pts = this.parseSvgBasicPath(d);
      if (pts.length < 2) return;
      entities.push({
        id: crypto.randomUUID(),
        type: 'polyline',
        points: pts,
        layerId
      });
    });

    console.log(`📄 SVG parsed: ${entities.length} entities`);
    return entities;
  }

  /** Parse SVG points attribute "x1,y1 x2,y2 ..." into {x,y}[] */
  private parseSvgPointsAttr(str: string): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    const nums = str.trim().split(/[\s,]+/).map(Number).filter(v => !isNaN(v));
    for (let i = 0; i + 1 < nums.length; i += 2) {
      pts.push({ x: nums[i], y: nums[i + 1] });
    }
    return pts;
  }

  /** Parse basic SVG path d attribute — M, L, H, V, Z commands only */
  private parseSvgBasicPath(d: string): { x: number; y: number }[] {
    const pts: { x: number; y: number }[] = [];
    let cx = 0, cy = 0, startX = 0, startY = 0;
    const cmds = d.match(/[MLHVZCSQTAmlhvzcsqta][^MLHVZCSQTAmlhvzcsqta]*/g);
    if (!cmds) return pts;

    for (const cmd of cmds) {
      const type = cmd[0];
      const args = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(v => !isNaN(v));

      switch (type) {
        case 'M':
          if (args.length >= 2) { cx = args[0]; cy = args[1]; startX = cx; startY = cy; pts.push({ x: cx, y: cy }); }
          for (let i = 2; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; pts.push({ x: cx, y: cy }); }
          break;
        case 'm':
          if (args.length >= 2) { cx += args[0]; cy += args[1]; startX = cx; startY = cy; pts.push({ x: cx, y: cy }); }
          for (let i = 2; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; pts.push({ x: cx, y: cy }); }
          break;
        case 'L':
          for (let i = 0; i + 1 < args.length; i += 2) { cx = args[i]; cy = args[i + 1]; pts.push({ x: cx, y: cy }); }
          break;
        case 'l':
          for (let i = 0; i + 1 < args.length; i += 2) { cx += args[i]; cy += args[i + 1]; pts.push({ x: cx, y: cy }); }
          break;
        case 'H':
          for (const a of args) { cx = a; pts.push({ x: cx, y: cy }); }
          break;
        case 'h':
          for (const a of args) { cx += a; pts.push({ x: cx, y: cy }); }
          break;
        case 'V':
          for (const a of args) { cy = a; pts.push({ x: cx, y: cy }); }
          break;
        case 'v':
          for (const a of args) { cy += a; pts.push({ x: cx, y: cy }); }
          break;
        case 'Z':
        case 'z':
          if (pts.length > 0) {
            cx = startX; cy = startY;
            const last = pts[pts.length - 1];
            if (Math.abs(last.x - startX) > 0.001 || Math.abs(last.y - startY) > 0.001) {
              pts.push({ x: startX, y: startY });
            }
          }
          break;
        default:
          break;
      }
    }
    return pts;
  }

  /**
   * Detect file type from extension and parse accordingly (Task 19 + Task 20).
   * DWG files: Try external converters first (DWG->DXF), fallback to WASM
   * Used by Workspace drag-drop handler.
   */
  async parseImportFile(
    file: File,
    layerId?: string
  ): Promise<{ entities: CadEntity[]; fileType: 'dxf' | 'svg' | 'dwg' | 'unknown'; fileName: string }> {
    const name = file.name.toLowerCase();

    if (name.endsWith('.dxf')) {
      const entities = await this.parseDxfFile(file, layerId);
      return { entities, fileType: 'dxf', fileName: file.name };
    } else if (name.endsWith('.svg')) {
      const content = await file.text();
      return { entities: this.parseSvgFile(content, layerId), fileType: 'svg', fileName: file.name };
    } else if (name.endsWith('.dwg')) {
      // DWG conversion strategy: external converters (DXF) -> WASM fallback
      console.log('📄 DWG file detected, attempting DWG->DXF conversion...');
      
      // Try external converter first (Node.js via backend API)
      const entitiesFromConverter = await this.convertDwgToDxf(file, layerId);
      
      if (entitiesFromConverter.length > 0) {
        // External converter succeeded - entities already parsed
        console.log(`📄 DXF parsed from DWG conversion: ${entitiesFromConverter.length} entities`);
        return { entities: entitiesFromConverter, fileType: 'dwg', fileName: file.name };
      } else {
        // External converter unavailable - use WASM fallback (browser-compatible)
        console.warn('⚠️ No external DWG converter found, using LibreDwg WASM fallback');
        const buffer = await file.arrayBuffer();
        const entities = await this.parseDwgFile(new Uint8Array(buffer), layerId);
        return { entities, fileType: 'dwg', fileName: file.name };
      }
    } else {
      console.warn('⚠️ Unsupported file type:', name);
      return { entities: [], fileType: 'unknown', fileName: file.name };
    }
  }

  // ============ EXPORT — DXF R12 ============
  exportToDxf(entities: CadEntity[], sheetWidth?: number, sheetHeight?: number): string {
    let dxf = "0\nSECTION\n2\nENTITIES\n";

    if (sheetWidth && sheetHeight) {
      const pts = [{x:0,y:0},{x:sheetWidth,y:0},{x:sheetWidth,y:sheetHeight},{x:0,y:sheetHeight},{x:0,y:0}];
      for (let i = 0; i < 4; i++) {
        dxf += "0\nLINE\n8\nSHEET\n";
        dxf += `10\n${pts[i].x}\n20\n${pts[i].y}\n30\n0.0\n`;
        dxf += `11\n${pts[i+1].x}\n21\n${pts[i+1].y}\n31\n0.0\n`;
      }
    }

    entities.forEach(ent => {
      switch (ent.type) {
        case 'line': {
          const [p1, p2] = ent.points;
          dxf += "0\nLINE\n8\n0\n";
          dxf += `10\n${p1.x}\n20\n${p1.y}\n30\n0.0\n`;
          dxf += `11\n${p2.x}\n21\n${p2.y}\n31\n0.0\n`;
          break;
        }
        case 'circle': {
          const c = ent.points[0];
          const r = ent.properties?.radius || 0;
          dxf += "0\nCIRCLE\n8\n0\n";
          dxf += `10\n${c.x}\n20\n${c.y}\n30\n0.0\n`;
          dxf += `40\n${r}\n`;
          break;
        }
        case 'rect': {
          const [rp1, rp2] = ent.points;
          const x1 = Math.min(rp1.x, rp2.x), x2 = Math.max(rp1.x, rp2.x);
          const y1 = Math.min(rp1.y, rp2.y), y2 = Math.max(rp1.y, rp2.y);
          const rPts = [{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2},{x:x1,y:y1}];
          for (let i = 0; i < 4; i++) {
            dxf += "0\nLINE\n8\n0\n";
            dxf += `10\n${rPts[i].x}\n20\n${rPts[i].y}\n30\n0.0\n`;
            dxf += `11\n${rPts[i+1].x}\n21\n${rPts[i+1].y}\n31\n0.0\n`;
          }
          break;
        }
        case 'arc': {
          const props = ent.properties;
          if (props && props.centerX !== undefined) {
            const sa = Math.atan2(ent.points[0].y - props.centerY, ent.points[0].x - props.centerX) * 180 / Math.PI;
            const ea = Math.atan2(ent.points[2].y - props.centerY, ent.points[2].x - props.centerX) * 180 / Math.PI;
            dxf += "0\nARC\n8\n0\n";
            dxf += `10\n${props.centerX}\n20\n${props.centerY}\n30\n0.0\n`;
            dxf += `40\n${props.radius}\n`;
            dxf += `50\n${sa < 0 ? sa + 360 : sa}\n`;
            dxf += `51\n${ea < 0 ? ea + 360 : ea}\n`;
          }
          break;
        }
        case 'ellipse': {
          const ec = ent.points[0];
          const rx = ent.properties?.rx || 50;
          const ry = ent.properties?.ry || 30;
          const ratio = ry / rx;
          dxf += "0\nELLIPSE\n8\n0\n";
          dxf += `10\n${ec.x}\n20\n${ec.y}\n30\n0.0\n`;
          dxf += `11\n${rx}\n21\n0.0\n31\n0.0\n`;
          dxf += `40\n${ratio}\n`;
          dxf += `41\n0.0\n42\n${2 * Math.PI}\n`;
          break;
        }
        case 'spline':
        case 'polyline':
        case 'polygon': {
          const pts = ent.points;
          if (pts.length >= 2) {
            for (let i = 0; i < pts.length - 1; i++) {
              dxf += "0\nLINE\n8\n0\n";
              dxf += `10\n${pts[i].x}\n20\n${pts[i].y}\n30\n0.0\n`;
              dxf += `11\n${pts[i+1].x}\n21\n${pts[i+1].y}\n31\n0.0\n`;
            }
          }
          break;
        }
        case 'text': {
          const tp = ent.points[0];
          const txt = ent.properties?.text || '';
          const fs = ent.properties?.fontSize || 10;
          if (txt) {
            dxf += "0\nTEXT\n8\n0\n";
            dxf += `10\n${tp.x}\n20\n${tp.y}\n30\n0.0\n`;
            dxf += `40\n${fs}\n`;
            dxf += `1\n${txt}\n`;
          }
          break;
        }
        case 'slot':
        case 'obround': {
          const [sp1, sp2] = ent.points;
          const sx1 = Math.min(sp1.x, sp2.x), sx2 = Math.max(sp1.x, sp2.x);
          const sy1 = Math.min(sp1.y, sp2.y), sy2 = Math.max(sp1.y, sp2.y);
          const sw = sx2 - sx1, sh = sy2 - sy1;
          const sr = Math.min(sw, sh) / 2;
          if (sw >= sh) {
            dxf += "0\nLINE\n8\n0\n";
            dxf += `10\n${sx1 + sr}\n20\n${sy1}\n30\n0.0\n11\n${sx2 - sr}\n21\n${sy1}\n31\n0.0\n`;
            dxf += "0\nLINE\n8\n0\n";
            dxf += `10\n${sx1 + sr}\n20\n${sy2}\n30\n0.0\n11\n${sx2 - sr}\n21\n${sy2}\n31\n0.0\n`;
            dxf += "0\nARC\n8\n0\n";
            dxf += `10\n${sx1 + sr}\n20\n${sy1 + sr}\n30\n0.0\n40\n${sr}\n50\n90\n51\n270\n`;
            dxf += "0\nARC\n8\n0\n";
            dxf += `10\n${sx2 - sr}\n20\n${sy1 + sr}\n30\n0.0\n40\n${sr}\n50\n270\n51\n90\n`;
          } else {
            dxf += "0\nLINE\n8\n0\n";
            dxf += `10\n${sx1}\n20\n${sy1 + sr}\n30\n0.0\n11\n${sx1}\n21\n${sy2 - sr}\n31\n0.0\n`;
            dxf += "0\nLINE\n8\n0\n";
            dxf += `10\n${sx2}\n20\n${sy1 + sr}\n30\n0.0\n11\n${sx2}\n21\n${sy2 - sr}\n31\n0.0\n`;
            dxf += "0\nARC\n8\n0\n";
            dxf += `10\n${sx1 + sr}\n20\n${sy1 + sr}\n30\n0.0\n40\n${sr}\n50\n180\n51\n360\n`;
            dxf += "0\nARC\n8\n0\n";
            dxf += `10\n${sx1 + sr}\n20\n${sy2 - sr}\n30\n0.0\n40\n${sr}\n50\n0\n51\n180\n`;
          }
          break;
        }
        default:
          break;
      }
    });

    dxf += "0\nENDSEC\n0\nEOF";
    return dxf;
  }

  // ============ EXPORT — SVG ============
  exportToSvg(entities: CadEntity[], sheetWidth?: number, sheetHeight?: number): string {
    const w = sheetWidth || 1000;
    const h = sheetHeight || 1000;
    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n`;
    svg += `<rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="#999" stroke-width="0.5" stroke-dasharray="4,2"/>\n`;

    entities.forEach(ent => {
      switch (ent.type) {
        case 'line': {
          const [p1, p2] = ent.points;
          svg += `<line x1="${p1.x}" y1="${h - p1.y}" x2="${p2.x}" y2="${h - p2.y}" stroke="#000" stroke-width="0.5"/>\n`;
          break;
        }
        case 'circle': {
          const c = ent.points[0];
          const r = ent.properties?.radius || 0;
          svg += `<circle cx="${c.x}" cy="${h - c.y}" r="${r}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          break;
        }
        case 'rect': {
          const [rp1, rp2] = ent.points;
          const x = Math.min(rp1.x, rp2.x);
          const y = Math.min(rp1.y, rp2.y);
          const rw = Math.abs(rp2.x - rp1.x);
          const rh = Math.abs(rp2.y - rp1.y);
          svg += `<rect x="${x}" y="${h - y - rh}" width="${rw}" height="${rh}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          break;
        }
        case 'arc': {
          const props = ent.properties;
          if (props && props.centerX !== undefined && ent.points.length >= 3) {
            const sx = ent.points[0].x, sy = h - ent.points[0].y;
            const ex = ent.points[2].x, ey = h - ent.points[2].y;
            const r = props.radius;
            const sa = Math.atan2(ent.points[0].y - props.centerY, ent.points[0].x - props.centerX);
            const ea = Math.atan2(ent.points[2].y - props.centerY, ent.points[2].x - props.centerX);
            let sweep = ea - sa;
            if (sweep < 0) sweep += 2 * Math.PI;
            const largeArc = sweep > Math.PI ? 1 : 0;
            svg += `<path d="M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} 0 ${ex} ${ey}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          }
          break;
        }
        case 'ellipse': {
          const ec = ent.points[0];
          const rx = ent.properties?.rx || 50;
          const ry = ent.properties?.ry || 30;
          svg += `<ellipse cx="${ec.x}" cy="${h - ec.y}" rx="${rx}" ry="${ry}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          break;
        }
        case 'spline':
        case 'polyline':
        case 'polygon': {
          if (ent.points.length >= 2) {
            const pStr = ent.points.map(p => `${p.x},${h - p.y}`).join(' ');
            svg += `<polyline points="${pStr}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          }
          break;
        }
        case 'text': {
          const tp = ent.points[0];
          const txt = ent.properties?.text || '';
          const fs = ent.properties?.fontSize || 10;
          if (txt) {
            svg += `<text x="${tp.x}" y="${h - tp.y}" font-size="${fs}" fill="#000">${this.escapeXml(txt)}</text>\n`;
          }
          break;
        }
        case 'slot':
        case 'obround': {
          const [sp1, sp2] = ent.points;
          const sx1 = Math.min(sp1.x, sp2.x), sx2 = Math.max(sp1.x, sp2.x);
          const sy1 = Math.min(sp1.y, sp2.y), sy2 = Math.max(sp1.y, sp2.y);
          const sw = sx2 - sx1, sh2 = sy2 - sy1;
          const sr = Math.min(sw, sh2) / 2;
          svg += `<rect x="${sx1}" y="${h - sy2}" width="${sw}" height="${sh2}" rx="${sr}" ry="${sr}" fill="none" stroke="#000" stroke-width="0.5"/>\n`;
          break;
        }
        default:
          break;
      }
    });

    svg += `</svg>`;
    return svg;
  }

  private escapeXml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }


  /**
   * Sample a B-spline curve from control points, degree, and optional knot vector.
   * Uses Cox-de Boor recursion to evaluate basis functions.
   * Returns numSamples evenly-spaced points along the curve.
   */
  private sampleBSpline(
    controlPoints: { x: number; y: number }[],
    degree: number,
    knots: number[] | undefined,
    numSamples: number
  ): { x: number; y: number }[] {
    const n = controlPoints.length;
    const p = Math.min(degree, n - 1); // clamp degree

    // Generate uniform knot vector if not provided
    let knotVec: number[];
    if (knots && knots.length === n + p + 1) {
      knotVec = knots;
    } else {
      // Clamped uniform: p+1 zeros, interior knots, p+1 ones
      knotVec = [];
      const m = n + p + 1;
      for (let i = 0; i < m; i++) {
        if (i <= p) knotVec.push(0);
        else if (i >= m - p - 1) knotVec.push(1);
        else knotVec.push((i - p) / (n - p));
      }
    }

    // Cox-de Boor basis function evaluation
    const basis = (i: number, deg: number, t: number): number => {
      if (deg === 0) {
        return (t >= knotVec[i] && t < knotVec[i + 1]) ? 1 : 0;
      }
      let left = 0, right = 0;
      const dLeft = knotVec[i + deg] - knotVec[i];
      const dRight = knotVec[i + deg + 1] - knotVec[i + 1];
      if (dLeft > 1e-10) left = ((t - knotVec[i]) / dLeft) * basis(i, deg - 1, t);
      if (dRight > 1e-10) right = ((knotVec[i + deg + 1] - t) / dRight) * basis(i + 1, deg - 1, t);
      return left + right;
    };

    // Determine parameter range from knot vector
    const tMin = knotVec[p];
    const tMax = knotVec[n]; // = knotVec[knotVec.length - p - 1]
    const points: { x: number; y: number }[] = [];

    for (let s = 0; s <= numSamples; s++) {
      const t = tMin + (s / numSamples) * (tMax - tMin);
      // Clamp last sample to just below tMax to avoid basis edge case
      const tEval = s === numSamples ? tMax - 1e-10 : t;
      let x = 0, y = 0;
      for (let i = 0; i < n; i++) {
        const b = basis(i, p, tEval);
        x += b * controlPoints[i].x;
        y += b * controlPoints[i].y;
      }
      points.push({ x, y });
    }

    // Ensure last point is exactly the last control point (clamped spline property)
    if (points.length > 0) {
      points[points.length - 1] = {
        x: controlPoints[n - 1].x,
        y: controlPoints[n - 1].y
      };
    }

    return points;
  }
  // ============ EXPORT — PDF (via jsPDF) ============
  exportToPdf(entities: CadEntity[], sheetWidth?: number, sheetHeight?: number): Blob {
    const w = sheetWidth || 1000;
    const h = sheetHeight || 1000;
    const isLandscape = w >= h;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [w, h]
    });

    doc.setDrawColor(150);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 1], 0);
    doc.rect(0, 0, w, h);
    doc.setLineDashPattern([], 0);

    doc.setDrawColor(0);
    doc.setLineWidth(0.15);

    entities.forEach(ent => {
      switch (ent.type) {
        case 'line': {
          const [p1, p2] = ent.points;
          doc.line(p1.x, h - p1.y, p2.x, h - p2.y);
          break;
        }
        case 'circle': {
          const c = ent.points[0];
          const r = ent.properties?.radius || 0;
          doc.circle(c.x, h - c.y, r, 'S');
          break;
        }
        case 'rect': {
          const [rp1, rp2] = ent.points;
          const x = Math.min(rp1.x, rp2.x);
          const y = Math.min(rp1.y, rp2.y);
          const rw = Math.abs(rp2.x - rp1.x);
          const rh = Math.abs(rp2.y - rp1.y);
          doc.rect(x, h - y - rh, rw, rh, 'S');
          break;
        }
        case 'arc': {
          const props = ent.properties;
          if (props && props.centerX !== undefined && ent.points.length >= 3) {
            this.drawPdfArc(doc, props.centerX, h - props.centerY, props.radius,
              ent.points[0], ent.points[2], h);
          }
          break;
        }
        case 'ellipse': {
          const ec = ent.points[0];
          const rx = ent.properties?.rx || 50;
          const ry = ent.properties?.ry || 30;
          doc.ellipse(ec.x, h - ec.y, rx, ry, 'S');
          break;
        }
        case 'spline':
        case 'polyline':
        case 'polygon': {
          const pts = ent.points;
          if (pts.length >= 2) {
            for (let i = 0; i < pts.length - 1; i++) {
              doc.line(pts[i].x, h - pts[i].y, pts[i+1].x, h - pts[i+1].y);
            }
          }
          break;
        }
        case 'text': {
          const tp = ent.points[0];
          const txt = ent.properties?.text || '';
          const fs = ent.properties?.fontSize || 10;
          if (txt) {
            doc.setFontSize(fs);
            doc.text(txt, tp.x, h - tp.y);
          }
          break;
        }
        case 'slot':
        case 'obround': {
          const [sp1, sp2] = ent.points;
          const sx1 = Math.min(sp1.x, sp2.x), sx2 = Math.max(sp1.x, sp2.x);
          const sy1 = Math.min(sp1.y, sp2.y), sy2 = Math.max(sp1.y, sp2.y);
          const sw = sx2 - sx1, sh2 = sy2 - sy1;
          const sr = Math.min(sw, sh2) / 2;
          doc.roundedRect(sx1, h - sy2, sw, sh2, sr, sr, 'S');
          break;
        }
        default:
          break;
      }
    });

    return doc.output('blob') as unknown as Blob;
  }

  private drawPdfArc(doc: jsPDF, cx: number, cy: number, r: number,
    pStart: { x: number; y: number }, pEnd: { x: number; y: number }, sheetH: number) {
    const segments = 32;
    let sa = Math.atan2(pStart.y - (sheetH - cy), pStart.x - cx);
    let ea = Math.atan2(pEnd.y - (sheetH - cy), pEnd.x - cx);
    if (ea <= sa) ea += 2 * Math.PI;
    const step = (ea - sa) / segments;
    for (let i = 0; i < segments; i++) {
      const a1 = sa + step * i;
      const a2 = sa + step * (i + 1);
      doc.line(
        cx + r * Math.cos(a1), cy - r * Math.sin(a1),
        cx + r * Math.cos(a2), cy - r * Math.sin(a2)
      );
    }
  }

  // ============ DOWNLOAD HELPERS ============
  downloadFile(content: string, fileName: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, fileName);
  }

  downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const dxfService = new DxfService();
