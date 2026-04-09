import DxfParser from "dxf-parser";
import { DXFEntityResult } from "../types";
import { WorkerManager } from "./WorkerManager";

// Singleton WorkerManager instance
let workerManager: WorkerManager | null = null;

function getWorkerManager(): WorkerManager {
  if (!workerManager) {
    workerManager = new WorkerManager({ dxfPoolSize: 2, debug: false });
  }
  return workerManager;
}

const VJP_DEFAULT_COLOR = '#FFFFFF';

const AUTOCAD_COLOR_INDEX: { [key: number]: string } = {
  1: '#FF0000', // Red
  2: '#FFFF00', // Yellow
  3: '#00FF00', // Green
  4: '#00FFFF', // Cyan
  5: '#0000FF', // Blue
  6: '#FF00FF', // Magenta
  7: '#FFFFFF', // White
  8: '#4D4D4D',
  9: '#999999',
  250: '#3C3C3C',
  251: '#555555',
  252: '#6E6E6E',
  253: '#878787',
  254: '#A0A0A0',
  255: '#B9B9B9',
};

function getAciColor(colorIndex: number | undefined): string {
  if (colorIndex === undefined || colorIndex === null) return VJP_DEFAULT_COLOR;
  if (colorIndex === 0 || colorIndex === 256) return VJP_DEFAULT_COLOR; // ByBlock or ByLayer, handle later
  return AUTOCAD_COLOR_INDEX[colorIndex] || VJP_DEFAULT_COLOR;
}

export class DxfService {
  private parser: DxfParser;

  constructor() {
    this.parser = new DxfParser();
  }

  private snap(p: { x: number; y: number }): { x: number; y: number } {
    return {
      x: Math.round(p.x * 10000) / 10000,
      y: Math.round(p.y * 10000) / 10000
    };
  }

  private dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private isClosedPath(points: { x: number; y: number }[], tolerance: number): boolean {
    if (points.length < 2) return false;
    const p1 = points[0];
    const p2 = points[points.length - 1];
    return this.dist(p1, p2) < tolerance;
  }

  private calculatePolygonArea(points: { x: number; y: number }[]): number {
    if (points.length < 3) return 0; // Not a polygon
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length]; // Wrap around to the first point
      area += (p1.x * p2.y) - (p2.x * p1.y);
    }
    return Math.abs(area / 2);
  }

  private arcToPoints(arc: any, numSegments: number = 32): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const startAngle = arc.startAngle * Math.PI / 180;
    const endAngle = arc.endAngle * Math.PI / 180;
    const radius = arc.radius;
    const center = arc.center;

    // Ensure the arc goes in the correct direction (counter-clockwise from startAngle to endAngle)
    let currentAngle = startAngle;
    let angleIncrement = (endAngle - startAngle) / numSegments;

    // Handle arcs that cross the 0/360 degree boundary
    if (endAngle < startAngle) {
      angleIncrement = (endAngle + (2 * Math.PI) - startAngle) / numSegments;
    }

    for (let i = 0; i <= numSegments; i++) {
      const angle = startAngle + i * angleIncrement;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  }

  private circleToPoints(circle: any, numSegments: number = 64): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const center = circle.center;
    const radius = circle.radius;

    for (let i = 0; i <= numSegments; i++) {
      const angle = (2 * Math.PI * i) / numSegments;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);
      points.push({ x, y });
    }
    return points;
  }
  
  private splineToPoints(spline: any, numSegments: number = 100): { x: number; y: number }[] {
    // This is a simplified approach. A proper NURBS evaluation would be complex.
    // For now, we'll just connect the control points.
    // TODO: Implement proper NURBS evaluation or use a library if available in DXF-parser for better spline approximation.
    const points: { x: number; y: number }[] = [];
    if (!spline.controlPoints || spline.controlPoints.length === 0) return points;

    for (let i = 0; i < spline.controlPoints.length; i++) {
        points.push(spline.controlPoints[i]);
    }
    return points;
  }

  private ellipseToPoints(ellipse: any, numSegments: number = 64): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const center = ellipse.center;
    const majorAxis = ellipse.majorAxisEndPoint;
    const ratio = ellipse.axisRatio;
    
    // Calculate major axis length and angle
    const a = Math.sqrt(majorAxis.x * majorAxis.x + majorAxis.y * majorAxis.y);
    const rotation = Math.atan2(majorAxis.y, majorAxis.x);
    
    // Calculate minor axis length
    const b = a * ratio;
    
    // Default to full ellipse if angles not provided
    const startAngle = ellipse.startAngle !== undefined ? ellipse.startAngle : 0;
    let endAngle = ellipse.endAngle !== undefined ? ellipse.endAngle : 2 * Math.PI;
    
    if (endAngle < startAngle) {
      endAngle += 2 * Math.PI;
    }
    
    let angleIncrement = (endAngle - startAngle) / numSegments;
    
    for (let i = 0; i <= numSegments; i++) {
      const theta = startAngle + i * angleIncrement;
      
      // Parametric equation of ellipse (before rotation)
      const xLocal = a * Math.cos(theta);
      const yLocal = b * Math.sin(theta);
      
      // Apply rotation
      const xRotated = xLocal * Math.cos(rotation) - yLocal * Math.sin(rotation);
      const yRotated = xLocal * Math.sin(rotation) + yLocal * Math.cos(rotation);
      
      // Translate to center
      points.push({
        x: center.x + xRotated,
        y: center.y + yRotated
      });
    }
    
    return points;
  }

  public async parseFile(file: File, tolerance: number = 0.5): Promise<DXFEntityResult[]> {
    const text = await file.text();
    const results: DXFEntityResult[] = [];

    console.log(`📄 File: ${file.name} - Parsing with Worker...`);

    try {
      const manager = getWorkerManager();
      const workerResult = await manager.parseDxf(text, file.name);
      
      if (!workerResult || !workerResult.entities) {
        console.warn(`⚠️ Worker returned no entities`);
        return [];
      }

      // Convert worker result to DXFEntityResult format
      workerResult.entities.forEach((entity: any) => {
        const result: DXFEntityResult = {
          id: entity.id || `ENT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: entity.type,
          area: entity.area || 0,
          verticesCount: entity.verticesCount || entity.geometry?.length || 0,
          isClosed: entity.isClosed || false,
          geometry: entity.geometry || [],
          layer: entity.layer,
          linetype: entity.linetype,
          linetypePattern: entity.linetypePattern,
          color: getAciColor(entity.colorIndex)
        };

        // Extract text properties from worker result
        if (entity.properties) {
          if (entity.properties.text) {
            result.text = entity.properties.text;
            result.textHeight = entity.properties.fontSize;
            result.rotation = entity.properties.rotation;
            if (entity.properties.isDimension) {
              result.type = 'DIMENSION';
              result.text = entity.properties.text;
              result.mtext = entity.properties.text;
            }
          }
        }

        results.push(result);
      });

      console.log(`✨ Total entities returned: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[DxfService] Worker parsing failed, falling back to sync:', error);
      // Fallback to synchronous parsing for small files
      return this._parseSyncFallback(text, file.name, tolerance);
    }
  }

  public exportToDxf(entities: DXFEntityResult[], width: number, height: number): string {
    let dxf = `0\nSECTION\n2\nENTITIES\n`;
    entities.forEach(ent => {
      if (!ent.geometry || ent.geometry.length === 0) return;
      if (ent.type === 'LINE' && ent.geometry.length === 2) {
        dxf += `0\nLINE\n8\n${ent.layer || '0'}\n62\n${ent.color === '#FFFFFF' ? 7 : 1}\n10\n${ent.geometry[0].x}\n20\n${ent.geometry[0].y}\n11\n${ent.geometry[1].x}\n21\n${ent.geometry[1].y}\n`;
      } else if (ent.type === 'POLYLINE' || ent.type === 'JOINED_POLYLINE' || ent.type === 'HATCH_BOUNDARY' || ent.type === 'SPLINE' || ent.type === 'ELLIPSE') {
        dxf += `0\nPOLYLINE\n8\n${ent.layer || '0'}\n66\n1\n70\n${ent.isClosed ? 1 : 0}\n`;
        ent.geometry.forEach(p => {
          dxf += `0\nVERTEX\n8\n${ent.layer || '0'}\n10\n${p.x}\n20\n${p.y}\n`;
        });
        dxf += `0\nSEQEND\n`;
      } else if (ent.type === 'CIRCLE' && ent.geometry.length > 0) {
        // Find bounding box to approximate center and radius
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        ent.geometry.forEach(p => {
          minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
        });
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const r = (maxX - minX) / 2;
        dxf += `0\nCIRCLE\n8\n${ent.layer || '0'}\n10\n${cx}\n20\n${cy}\n40\n${r}\n`;
      }
    });
    dxf += `0\nENDSEC\n0\nEOF\n`;
    return dxf;
  }

  public exportToSvg(entities: DXFEntityResult[], width: number, height: number): string {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
    entities.forEach(ent => {
      if (!ent.geometry || ent.geometry.length < 2) return;
      let d = `M ${ent.geometry[0].x} ${height - ent.geometry[0].y} `;
      for (let i = 1; i < ent.geometry.length; i++) {
        d += `L ${ent.geometry[i].x} ${height - ent.geometry[i].y} `;
      }
      if (ent.isClosed) d += 'Z';
      svg += `<path d="${d}" fill="none" stroke="${ent.color || 'black'}" stroke-width="1" />`;
    });
    svg += '</svg>';
    return svg;
  }

  public exportToPdf(entities: DXFEntityResult[], width: number, height: number): Blob {
    // Basic placeholder. Real PDF generation requires jsPDF or similar.
    console.warn("exportToPdf is a stub. Use a library like jsPDF for real PDF generation.");
    return new Blob(['PDF Data placeholder'], { type: 'application/pdf' });
  }

  public downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  public downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public explode(entity: DXFEntityResult): DXFEntityResult[] {
    if (!entity.geometry || entity.geometry.length < 2) return [entity];
    
    const exploded: DXFEntityResult[] = [];
    for (let i = 0; i < entity.geometry.length - 1; i++) {
      exploded.push({
        id: `EXPLODED-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'LINE',
        color: entity.color,
        layer: entity.layer,
        linetype: entity.linetype,
        linetypePattern: entity.linetypePattern,
        area: 0,
        verticesCount: 2,
        isClosed: false,
        geometry: [entity.geometry[i], entity.geometry[i + 1]]
      });
    }
    
    // If closed, add the closing line
    if (entity.isClosed) {
      exploded.push({
        id: `EXPLODED-${Date.now()}-close-${Math.random().toString(36).substr(2, 4)}`,
        type: 'LINE',
        color: entity.color,
        layer: entity.layer,
        linetype: entity.linetype,
        linetypePattern: entity.linetypePattern,
        area: 0,
        verticesCount: 2,
        isClosed: false,
        geometry: [entity.geometry[entity.geometry.length - 1], entity.geometry[0]]
      });
    }

    return exploded;
  }

  public smartJoin(entities: DXFEntityResult[], tolerance: number = 0.5): DXFEntityResult[] {
    // Basic greedy join implementation
    let paths = entities.filter(e => e.geometry && e.geometry.length > 0).map(e => ({
      points: [...e.geometry!],
      originalEntity: e
    }));
    let joinedPaths: any[] = [];
    let used = new Set<number>();

    for (let i = 0; i < paths.length; i++) {
      if (used.has(i)) continue;
      let currentPath = [...paths[i].points];
      used.add(i);
      let foundMatch = true;

      while (foundMatch) {
        foundMatch = false;
        let startPoint = currentPath[0];
        let endPoint = currentPath[currentPath.length - 1];

        for (let j = 0; j < paths.length; j++) {
          if (used.has(j)) continue;
          let candidate = paths[j].points;
          let candStart = candidate[0];
          let candEnd = candidate[candidate.length - 1];

          if (this.dist(endPoint, candStart) <= tolerance) {
            currentPath.push(...candidate.slice(1));
            used.add(j);
            foundMatch = true;
            break;
          } else if (this.dist(endPoint, candEnd) <= tolerance) {
            currentPath.push(...[...candidate].reverse().slice(1));
            used.add(j);
            foundMatch = true;
            break;
          } else if (this.dist(startPoint, candEnd) <= tolerance) {
            currentPath.unshift(...candidate.slice(0, -1));
            used.add(j);
            foundMatch = true;
            break;
          } else if (this.dist(startPoint, candStart) <= tolerance) {
            currentPath.unshift(...[...candidate].reverse().slice(0, -1));
            used.add(j);
            foundMatch = true;
            break;
          }
        }
      }
      joinedPaths.push({
        points: currentPath,
        color: paths[i].originalEntity.color,
        layer: paths[i].originalEntity.layer,
        linetype: paths[i].originalEntity.linetype,
        linetypePattern: paths[i].originalEntity.linetypePattern
      });
    }

    // Add entities that couldn't be joined (no geometry)
    const nonGeometric = entities.filter(e => !e.geometry || e.geometry.length === 0);

    const resultEntities = joinedPaths.map((path, index) => {
      const isClosed = this.isClosedPath(path.points, tolerance);
      return {
        id: `JOINED-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'JOINED_POLYLINE',
        color: path.color,
        layer: path.layer,
        linetype: path.linetype,
        linetypePattern: path.linetypePattern,
        area: this.calculatePolygonArea(path.points),
        verticesCount: path.points.length,
        isClosed: isClosed,
        geometry: path.points
      };
    });

    return [...nonGeometric, ...resultEntities];
  }

  private _parseSyncFallback(text: string, fileName: string, tolerance: number = 0.5): DXFEntityResult[] {
    console.warn(`⚠️ Falling back to synchronous DXF parsing for ${fileName}. This may be slow for large files.`);
    this.parser = new DxfParser();
    const dxf = this.parser.parseSync(text);

    if (!dxf) {
      console.error('✗ DXF synchronous parsing failed: No DXF object returned.');
      return [];
    }

    const blockDefinitions = new Map<string, any>();
    if (dxf.blocks) {
      for (const blockName in dxf.blocks) {
        if (dxf.blocks.hasOwnProperty(blockName)) {
          blockDefinitions.set(blockName, dxf.blocks[blockName]);
        }
      }
    }

    const linetypeDefinitions = new Map<string, number[]>();
    if (dxf.tables && (dxf.tables as any).ltypes) {
      for (const linetypeName in (dxf.tables as any).ltypes) {
        const linetype = (dxf.tables as any).ltypes[linetypeName];
        if (linetype && linetype.pattern) {
          const canvasPattern: number[] = [];
          linetype.pattern.forEach((segment: number) => {
            if (segment !== 0) {
              canvasPattern.push(Math.abs(segment));
            }
          });
          if (canvasPattern.length === 0) {
            linetypeDefinitions.set(linetype.name, []);
          } else {
            linetypeDefinitions.set(linetype.name, canvasPattern);
          }
        }
      }
    }

    const layerDefinitions = new Map<string, any>();
    if (dxf.tables && (dxf.tables as any).layers) {
      for (const layerName in (dxf.tables as any).layers) {
        const layer = (dxf.tables as any).layers[layerName];
        if (layer) {
          layerDefinitions.set(layer.name, {
            color: getAciColor(layer.colorIndex),
            visible: layer.visible !== false // Assuming default visible
          });
        }
      }
    }

    const results: DXFEntityResult[] = [];
    let rawPaths: { points: { x: number, y: number }[], originalType: string, color: string, layer: string, linetype?: string, linetypePattern?: number[] }[] = [];

    const processEntity = (entity: any, transform: any) => {
      if (!entity) return;

      const insertionPoint = transform ? transform.insertionPoint : { x: 0, y: 0 };
      const currentLinetype = entity.linetype || 'BYLAYER';
      const entityLayer = entity.layer || '0';
      const layerProps = layerDefinitions.get(entityLayer);
      
      // Determine final color: Entity color -> Layer color -> Default
      const entityColor = entity.colorIndex !== undefined && entity.colorIndex !== 256 ? getAciColor(entity.colorIndex) : (layerProps?.color || VJP_DEFAULT_COLOR);

      switch (entity.type) {
        case 'INSERT': {
          const block = blockDefinitions.get(entity.block);
          if (block && block.entities) {
            console.log(`📦 Expanding BLOCK: ${entity.block}`);
            const insertTransform = {
              insertionPoint: {
                x: (entity.position?.x || 0) + insertionPoint.x,
                y: (entity.position?.y || 0) + insertionPoint.y
              },
              // TODO: Add scale and rotation
            };
            block.entities.forEach((blockEntity: any) => processEntity(blockEntity, insertTransform));
          }
          break;
        }
        case "LWPOLYLINE":
        case "POLYLINE":
          if (entity.vertices && entity.vertices.length > 0) {
            let points = entity.vertices.map((v: any) => this.snap({
              x: v.x + insertionPoint.x,
              y: v.y + insertionPoint.y
            }));

            rawPaths.push({
              points,
              originalType: entity.type,
              color: entityColor,
              layer: entityLayer,
              linetype: currentLinetype,
              linetypePattern: linetypeDefinitions.get(currentLinetype) || []
            });
          }
          break;
        case "LINE": {
          const p1Raw = (entity.vertices && entity.vertices[0]) ? entity.vertices[0] : entity.start;
          const p2Raw = (entity.vertices && entity.vertices[1]) ? entity.vertices[1] : entity.end;
          if (p1Raw && p2Raw) {
            const p1 = this.snap({ x: p1Raw.x + insertionPoint.x, y: p1Raw.y + insertionPoint.y });
            const p2 = this.snap({ x: p2Raw.x + insertionPoint.x, y: p2Raw.y + insertionPoint.y });
            if (this.dist(p1, p2) > 0.0001) {
              rawPaths.push({
                points: [p1, p2],
                originalType: "LINE",
                color: entityColor,
                layer: entityLayer,
                linetype: currentLinetype,
                linetypePattern: linetypeDefinitions.get(currentLinetype) || []
              });
            }
          }
          break;
        }
        case "ARC": {
          const center = { x: entity.center.x + insertionPoint.x, y: entity.center.y + insertionPoint.y };
          const arcPoints = this.arcToPoints({ ...entity, center }).map(p => this.snap(p));
          if (arcPoints.length >= 2) {
            rawPaths.push({
              points: arcPoints,
              originalType: "ARC",
              color: entityColor,
              layer: entityLayer,
              linetype: currentLinetype,
              linetypePattern: linetypeDefinitions.get(currentLinetype) || []
            });
          }
          break;
        }
        case "CIRCLE": {
          const center = { x: entity.center.x + insertionPoint.x, y: entity.center.y + insertionPoint.y };
          const circlePoints = this.circleToPoints({ ...entity, center }).map(p => this.snap(p));
          results.push({
            id: `CIRCLE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: "CIRCLE",
            color: entityColor,
            layer: entityLayer,
            linetype: currentLinetype,
            linetypePattern: linetypeDefinitions.get(currentLinetype) || [],
            area: Math.PI * Math.pow(entity.radius, 2),
            verticesCount: circlePoints.length,
            isClosed: true,
            geometry: circlePoints
          });
          break;
        }
        case "ELLIPSE": {
          const center = { x: entity.center.x + insertionPoint.x, y: entity.center.y + insertionPoint.y };
          const ellipsePoints = this.ellipseToPoints({ ...entity, center }).map(p => this.snap(p));
          
          if (ellipsePoints.length >= 2) {
            // Determine if closed (full 2PI sweep)
            const startAngle = entity.startAngle !== undefined ? entity.startAngle : 0;
            let endAngle = entity.endAngle !== undefined ? entity.endAngle : 2 * Math.PI;
            if (endAngle < startAngle) endAngle += 2 * Math.PI;
            const isClosed = Math.abs(endAngle - startAngle - 2 * Math.PI) < 0.01;

            if (isClosed) {
              results.push({
                id: `ELLIPSE-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: "ELLIPSE",
                color: entityColor,
                layer: entityLayer,
                linetype: currentLinetype,
                linetypePattern: linetypeDefinitions.get(currentLinetype) || [],
                area: this.calculatePolygonArea(ellipsePoints), // Approximation
                verticesCount: ellipsePoints.length,
                isClosed: true,
                geometry: ellipsePoints
              });
            } else {
              rawPaths.push({
                points: ellipsePoints,
                originalType: "ELLIPSE",
                color: entityColor,
                layer: entityLayer,
                linetype: currentLinetype,
                linetypePattern: linetypeDefinitions.get(currentLinetype) || []
              });
            }
          }
          break;
        }
        case "SPLINE": {
          const transformedControlPoints = entity.controlPoints.map((cp: any) => ({
              x: cp.x + insertionPoint.x,
              y: cp.y + insertionPoint.y
          }));
          const splinePoints = this.splineToPoints({ ...entity, controlPoints: transformedControlPoints }).map(p => this.snap(p));
          if (splinePoints.length >= 2) {
            rawPaths.push({
              points: splinePoints,
              originalType: "SPLINE",
              color: entityColor,
              layer: entityLayer,
              linetype: currentLinetype,
              linetypePattern: linetypeDefinitions.get(currentLinetype) || []
            });
          }
          break;
        }
        case "TEXT":
        case "MTEXT": {
          const textStr = (entity.text || '').toString().trim();
          if (textStr) {
            const pos = entity.startPoint || entity.insertionPoint || entity.position || entity.firstAlignmentPoint || entity.vertices?.[0];
            if (pos) {
              const p = this.snap({
                x: (pos.x ?? 0) + insertionPoint.x,
                y: (pos.y ?? 0) + insertionPoint.y
              });
              
              let textHeight = entity.textHeight || entity.nominalHeight || entity.height || 2.5;
              // Hardcore boost for architectural floor plans where text is often 2.5mm in a 50000mm drawing
              if (textHeight < 50) textHeight *= 40;

              results.push({
                id: `${entity.type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                type: entity.type,
                text: textStr,
                textHeight: textHeight,
                rotation: (entity.rotation || 0) + (transform ? transform.rotation || 0 : 0),
                color: entityColor,
                layer: entityLayer,
                linetype: currentLinetype,
                linetypePattern: linetypeDefinitions.get(currentLinetype) || [],
                area: 0,
                verticesCount: 1,
                isClosed: false,
                geometry: [p]
              });
            }
          }
          break;
        }
        case "DIMENSION": {
          const dimText = entity.text || entity.mtext || '';
          let dimTextHeight = entity.textHeight || entity.dimTextHeight || 2.5;
          if (dimTextHeight < 50) dimTextHeight *= 40; // Hardcore boost
          
          const dimRotation = entity.textRotation || entity.rotation || 0;

          results.push({
            id: `DIM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: entity.type,
            color: entityColor,
            layer: entityLayer,
            linetype: currentLinetype,
            linetypePattern: linetypeDefinitions.get(currentLinetype) || [],
            area: 0,
            verticesCount: 0,
            isClosed: false,
            geometry: [],

            dimensionType: entity.dimensionType,
            mtext: dimText,
            text: dimText,
            textHeight: dimTextHeight,
            rotation: dimRotation,
            textPosition: this.snap({ x: entity.textPosition.x + insertionPoint.x, y: entity.textPosition.y + insertionPoint.y }),
            extLine1Start: this.snap({ x: entity.extArcPoint.x + insertionPoint.x, y: entity.extArcPoint.y + insertionPoint.y }),
            extLine1End: this.snap({ x: entity.extLine1Point.x + insertionPoint.x, y: entity.extLine1Point.y + insertionPoint.y }),
            extLine2Start: this.snap({ x: entity.extArcPoint.x + insertionPoint.x, y: entity.extArcPoint.y + insertionPoint.y }),
            extLine2End: this.snap({ x: entity.extLine2Point.x + insertionPoint.x, y: entity.extLine2Point.y + insertionPoint.y }),
            dimLineStart: this.snap({ x: entity.dimLinePoint.x + insertionPoint.x, y: entity.dimLinePoint.y + insertionPoint.y }),
            dimLineEnd: this.snap({ x: entity.dimLinePoint.x + insertionPoint.x, y: entity.dimLinePoint.y + insertionPoint.y }),
            measurement: entity.actualMeasurement || entity.measurement,

            originalDxfData: entity
          });
          break;
        }
        case "HATCH": {
          // Simplistic HATCH parsing: attempt to extract boundary paths
          if (entity.edges && entity.edges.length > 0) {
            entity.edges.forEach((edgeList: any[]) => {
               if (edgeList && edgeList.length > 0) {
                 const points: {x:number, y:number}[] = [];
                 edgeList.forEach(edge => {
                   if (edge.type === 'line') {
                      points.push(this.snap({ x: edge.start.x + insertionPoint.x, y: edge.start.y + insertionPoint.y }));
                      points.push(this.snap({ x: edge.end.x + insertionPoint.x, y: edge.end.y + insertionPoint.y }));
                   } else if (edge.type === 'arc') {
                      const center = { x: edge.center.x + insertionPoint.x, y: edge.center.y + insertionPoint.y };
                      points.push(...this.arcToPoints({ ...edge, center }).map(p => this.snap(p)));
                   } else if (edge.type === 'ellipse') {
                      const center = { x: edge.center.x + insertionPoint.x, y: edge.center.y + insertionPoint.y };
                      points.push(...this.ellipseToPoints({ ...edge, center }).map(p => this.snap(p)));
                   } else if (edge.type === 'spline') {
                      const transformedControlPoints = edge.controlPoints.map((cp: any) => ({
                          x: cp.x + insertionPoint.x,
                          y: cp.y + insertionPoint.y
                      }));
                      points.push(...this.splineToPoints({ ...edge, controlPoints: transformedControlPoints }).map(p => this.snap(p)));
                   }
                 });
                 if (points.length >= 2) {
                   rawPaths.push({
                     points,
                     originalType: "HATCH_BOUNDARY",
                     color: entityColor,
                     layer: entityLayer,
                     linetype: currentLinetype,
                     linetypePattern: linetypeDefinitions.get(currentLinetype) || []
                   });
                 }
               }
            });
          }
          break;
        }
        case "LEADER": {
          if (entity.vertices && entity.vertices.length > 0) {
            let points = entity.vertices.map((v: any) => this.snap({
              x: v.x + insertionPoint.x,
              y: v.y + insertionPoint.y
            }));

            rawPaths.push({
              points,
              originalType: "LEADER",
              color: entityColor,
              layer: entityLayer,
              linetype: currentLinetype,
              linetypePattern: linetypeDefinitions.get(currentLinetype) || []
            });
          }
          break;
        }
      }
    };

    if (dxf.entities) {
      dxf.entities.forEach((entity: any) => processEntity(entity, null));
    }

    rawPaths.forEach((path, index) => {
      const isClosed = this.isClosedPath(path.points, tolerance);
      results.push({
        id: `ENT-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 4)}`,
        type: path.originalType,
        color: path.color,
        layer: path.layer,
        linetype: path.linetype,
        linetypePattern: path.linetypePattern,
        area: this.calculatePolygonArea(path.points),
        verticesCount: path.points.length,
        isClosed: isClosed,
        geometry: path.points
      });
    });

    console.log(`✨ Total entities returned after block expansion: ${results.length}`);

    return results;
  }
}
