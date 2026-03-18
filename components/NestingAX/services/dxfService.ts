// ============================================================
// DXF & SVG Import/Export Service — NestingAX
// "VinaCAD Style" — Auto-Unit Detection & Fidelity Boost
// ============================================================

import DxfParser from 'dxf-parser';
import { jsPDF } from 'jspdf';
import { LibreDwg } from '@mlightcad/libredwg-web';
import { CadEntity } from './db';

import { uploadDxf } from '../../../services/dxfApiClient';
import { DxfImportEntity } from '../../../services/dxfApiTypes';

const DWG_FILE_TYPE = 0;

const ACI_COLORS: Record<number, string> = {
  1: "#FF0000", 2: "#FFFF00", 3: "#00FF00", 4: "#00FFFF", 5: "#0000FF",
  6: "#FF00FF", 7: "#FFFFFF", 8: "#808080", 9: "#C0C0C0", 10: "#FF0000",
  250: "#333333", 251: "#555555", 252: "#777777", 253: "#999999", 254: "#BBBBBB", 255: "#FFFFFF"
};

export class DxfService {
  private parser: DxfParser;
  private libredwg: any = null;

  constructor() {
    this.parser = new DxfParser();
  }

  private _getColor(ent: any, dxf?: any): string {
    let index = ent.color !== undefined ? ent.color : 256; 
    if (index === 256 && dxf?.tables?.layers && ent.layer) {
      const layerData = dxf.tables.layers[ent.layer];
      if (layerData && layerData.color !== undefined) index = layerData.color;
    }
    if (index === 0) return "#FFFFFF";
    if (ACI_COLORS[index]) return ACI_COLORS[index];
    if (ent.rgbColor !== undefined) return `#${ent.rgbColor.toString(16).padStart(6, '0')}`;
    return "#FFFFFF";
  }

  private _cleanText(text: string): string {
    if (!text) return "";
    return text.replace(/\\P/g, " ").replace(/\\f[^;]+;/g, "").replace(/\\H[^;]+;/g, "").replace(/\\S[^;]+;/g, "").replace(/\\T[^;]+;/g, "").replace(/\\Q[^;]+;/g, "").replace(/\\W[^;]+;/g, "").replace(/\\A[^;]+;/g, "").replace(/\\C[^;]+;/g, "").replace(/\\L|\\l|\\O|\\o/g, "").replace(/[{}]/g, "").trim();
  }

  async parseDxfFile(file: File, layerId?: string): Promise<CadEntity[]> {
    /* 
    // TEMPORARILY DISABLED BACKEND TO FORCE CLIENT-SIDE UPGRADES
    try {
      const apiResponse = await uploadDxf(file);
      if (apiResponse.success && apiResponse.entities.length > 0) {
        return apiResponse.entities.map(e => this._apiToCadEntity(e, layerId));
      }
    } catch (e) {}
    */
    console.log("🚀 FORCING CLIENT-SIDE PARSER FOR FIDELITY");
    return this._parseDxfFileFallback(file, layerId);
  }

  private _apiToCadEntity(e: DxfImportEntity, layerId?: string): CadEntity {
    return {
      id: e.id,
      type: e.type,
      points: e.points.map(([x, y]) => ({ x, y })),
      properties: { ...e.properties, closed: e.is_closed, area: e.area },
      layerId: e.layer || layerId,
    };
  }

  private async _parseDxfFileFallback(file: File, layerId?: string): Promise<CadEntity[]> {
    const content = await file.text();
    try {
      const dxf = this.parser.parseSync(content);
      const entities: CadEntity[] = [];
      
      // --- UNIT DETECTION (mm conversion) ---
      // $INSUNITS: 1 = Inches, 4 = Millimeters, 5 = Feet, 6 = Meters
      const insUnits = dxf.header?.$INSUNITS || 0;
      let globalScale = 1.0;
      if (insUnits === 1) globalScale = 25.4; 
      else if (insUnits === 6) globalScale = 1000.0; 
      else if (insUnits === 5) globalScale = 304.8;
      else if (insUnits === 0) {
        // SMART HEURISTIC: If no units, and drawing is very small (< 100 units), assume Meters
        const extents = dxf.header?.$EXTMAX;
        if (extents && Math.abs(extents.x) < 100) globalScale = 1000.0;
      }
      
      console.log(`📐 ENGINE BOOST: Unit=${insUnits}, Applying x${globalScale} scale to match mm workspace`);

      const processEntities = (ents: any[], matrix: number[] = [globalScale, 0, 0, globalScale, 0, 0]) => {
        if (!ents) return;
        ents.forEach((ent: any) => {
          const color = this._getColor(ent, dxf);
          const layer = ent.layer || layerId;

          switch (ent.type?.toUpperCase()) {
            case 'INSERT': {
              const block = dxf.blocks?.[ent.name];
              if (block && block.entities) {
                const rotation = (ent.rotation || 0) * Math.PI / 180;
                const scale = ent.scale || { x: 1, y: 1, z: 1 };
                const pos = ent.insertionPoint || { x: 0, y: 0 };
                const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
                
                // Nest the matrix: Current * (Translate * Rotate * Scale)
                const mInsert = [
                  cosR * scale.x, sinR * scale.x,
                  -sinR * scale.y, cosR * scale.y,
                  pos.x, pos.y
                ];
                processEntities(block.entities, this._multiplyMatrices(matrix, mInsert));
              }
              break;
            }
            case 'DIMENSION': {
              const blockName = ent.block;
              if (blockName) {
                const block = dxf.blocks?.[blockName];
                if (block && block.entities) {
                  const pos = ent.insertionPoint || { x: 0, y: 0 };
                  const mDim = [1, 0, 0, 1, pos.x, pos.y];
                  processEntities(block.entities, this._multiplyMatrices(matrix, mDim));
                }
              }
              break;
            }
            case 'LINE': {
              const p1 = ent.start || { x: 0, y: 0 };
              const p2 = ent.end || { x: 0, y: 0 };
              entities.push({
                id: crypto.randomUUID(), type: 'line',
                points: [this._applyMatrix(p1, matrix), this._applyMatrix(p2, matrix)],
                properties: { color }, layerId: layer
              });
              break;
            }
            case 'CIRCLE': {
              const center = this._applyMatrix(ent.center || {x:0, y:0}, matrix);
              const radius = (ent.radius || 0) * Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
              entities.push({
                id: crypto.randomUUID(), type: 'circle',
                points: [center], properties: { radius, color }, layerId: layer
              });
              break;
            }
            case 'ARC': {
              const r = (ent.radius || 0) * Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
              const center = this._applyMatrix(ent.center || {x:0, y:0}, matrix);
              const sa = ent.startAngle || 0, ea = ent.endAngle || 0;
              const matRot = Math.atan2(matrix[1], matrix[0]);
              const p1 = { x: center.x + r * Math.cos(sa + matRot), y: center.y + r * Math.sin(sa + matRot) };
              const p2 = { x: center.x + r * Math.cos(ea + matRot), y: center.y + r * Math.sin(ea + matRot) };
              const midA = sa + (ea < sa ? (ea + 2 * Math.PI - sa) : (ea - sa)) / 2;
              const p3 = { x: center.x + r * Math.cos(midA + matRot), y: center.y + r * Math.sin(midA + matRot) };
              entities.push({
                id: crypto.randomUUID(), type: 'arc',
                points: [p1, p3, p2], properties: { radius: r, centerX: center.x, centerY: center.y, color }, layerId: layer
              });
              break;
            }
            case 'LWPOLYLINE':
            case 'POLYLINE': {
              const polyPts = (ent.vertices || []).map((v: any) => this._applyMatrix(v, matrix));
              if (polyPts.length >= 2) {
                const isClosed = ent.shape === 1 || ent.closed || ent.is_closed;
                entities.push({
                  id: crypto.randomUUID(), type: 'polyline',
                  points: isClosed ? [...polyPts, polyPts[0]] : polyPts,
                  properties: { closed: isClosed, color }, layerId: layer
                });
              }
              break;
            }
            case 'TEXT':
            case 'MTEXT': {
              const text = this._cleanText(ent.text || '');
              if (text) {
                const basePt = ent.insertionPoint || ent.startPoint || { x: 0, y: 0 };
                const p = this._applyMatrix(basePt, matrix);
                const rot = (ent.rotation || 0) + (Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI);
                const scaleY = Math.sqrt(matrix[2]**2 + matrix[3]**2);
                
                let fs = (ent.nominalHeight || ent.textHeight || ent.height || 2.5) * scaleY;
                
                const attachment = ent.attachmentPoint || ent.horizontalJustification || 0;
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'text',
                  points: [p],
                  properties: { text, fontSize: fs, rotation: rot, color, attachment },
                  layerId: layer
                });
              }
              break;
            }
            case 'HATCH': {
              (ent.edges || []).forEach((edge: any) => {
                if (edge.type === 'poly') {
                  const pts = (edge.vertices || []).map((v: any) => this._applyMatrix(v, matrix));
                  if (pts.length >= 2) {
                    entities.push({
                      id: crypto.randomUUID(), type: 'polyline',
                      points: [...pts, pts[0]],
                      properties: { closed: true, filled: true, pattern: ent.patternName, color }, layerId: layer
                    });
                  }
                } else if (edge.type === 'line') {
                  entities.push({
                    id: crypto.randomUUID(), type: 'line',
                    points: [this._applyMatrix(edge.start, matrix), this._applyMatrix(edge.end, matrix)],
                    properties: { color }, layerId: layer
                  });
                }
              });
              break;
            }
          }
        });
      };

      if (dxf.entities) processEntities(dxf.entities);
      return entities;
    } catch (err) {
      console.error('❌ DXF Parse Error:', err);
      return [];
    }
  }

  private _multiplyMatrices(a: number[], b: number[]) {
    return [
      a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]
    ];
  }

  private _applyMatrix(p: { x: number, y: number }, m: number[]) {
    return {
      x: p.x * m[0] + p.y * m[2] + m[4],
      y: p.x * m[1] + p.y * m[3] + m[5]
    };
  }

  async parseDwgFile(fileContent: Uint8Array, layerId?: string): Promise<CadEntity[]> {
    try {
      if (!this.libredwg) this.libredwg = await LibreDwg.create();
      const libredwg = this.libredwg;
      const dwgPtr = libredwg.dwg_read_data(fileContent, DWG_FILE_TYPE);
      if (!dwgPtr || dwgPtr === 0) throw new Error('DWG read failed');
      const db = libredwg.convert(dwgPtr);
      const entities: CadEntity[] = [];
      if (db?.entities) {
        db.entities.forEach((ent: any) => {
          const color = this._getColor(ent);
          if (ent.type === 'LINE' && ent.startPoint && ent.endPoint) {
            entities.push({ id: crypto.randomUUID(), type: 'line', points: [ent.startPoint, ent.endPoint], properties: { color }, layerId });
          } else if (ent.type === 'CIRCLE' && ent.center) {
            entities.push({ id: crypto.randomUUID(), type: 'circle', points: [ent.center], properties: { radius: ent.radius, color }, layerId });
          } else if ((ent.type === 'TEXT' || ent.type === 'MTEXT') && ent.text) {
            entities.push({ id: crypto.randomUUID(), type: 'text', points: [ent.insertionPoint || ent.startPoint || {x:0,y:0}], properties: { text: this._cleanText(ent.text), fontSize: ent.height || 2.5, rotation: ent.rotation || 0, color }, layerId });
          }
        });
      }
      libredwg.dwg_free(dwgPtr);
      return entities;
    } catch (err) {
      console.error('❌ DWG Parse Error:', err);
      return [];
    }
  }

  async parseImportFile(file: File, layerId?: string): Promise<{ entities: CadEntity[]; fileType: 'dxf' | 'svg' | 'dwg' | 'unknown'; fileName: string }> {
    const name = file.name.toLowerCase();
    if (name.endsWith('.dxf')) return { entities: await this.parseDxfFile(file, layerId), fileType: 'dxf', fileName: file.name };
    if (name.endsWith('.dwg')) {
      /*
      try {
        const apiRes = await uploadDxf(file);
        if (apiRes.success) return { entities: apiRes.entities.map(e => this._apiToCadEntity(e, layerId)), fileType: 'dwg', fileName: file.name };
      } catch(e) {}
      */
      const buffer = await file.arrayBuffer();
      return { entities: await this.parseDwgFile(new Uint8Array(buffer), layerId), fileType: 'dwg', fileName: file.name };
    }
    return { entities: [], fileType: 'unknown', fileName: file.name };
  }

  exportToDxf(entities: CadEntity[], width?: number, height?: number): string {
    let dxf = "0\nSECTION\n2\nENTITIES\n";
    entities.forEach(ent => {
      if (ent.type === 'line' && ent.points && ent.points.length === 2) dxf += `0\nLINE\n8\n0\n10\n${ent.points[0].x}\n20\n${ent.points[0].y}\n11\n${ent.points[1].x}\n21\n${ent.points[1].y}\n`;
    });
    dxf += "0\nENDSEC\n0\nEOF";
    return dxf;
  }

  exportToSvg(entities: CadEntity[], width: number, height: number): string {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`;
    entities.forEach(ent => {
      if (ent.type === 'line' && ent.points && ent.points.length === 2) {
        svg += `<line x1="${ent.points[0].x}" y1="${height - ent.points[0].y}" x2="${ent.points[1].x}" y2="${height - ent.points[1].y}" stroke="${ent.properties?.color || 'black'}" />`;
      } else if ((ent.type === 'polyline' || ent.type === 'rect') && ent.points && ent.points.length > 0) {
        let d = `M ${ent.points[0].x} ${height - ent.points[0].y} `;
        for (let i = 1; i < ent.points.length; i++) {
          d += `L ${ent.points[i].x} ${height - ent.points[i].y} `;
        }
        if (ent.properties?.closed) d += "Z";
        svg += `<path d="${d}" fill="none" stroke="${ent.properties?.color || 'black'}" />`;
      }
    });
    svg += "</svg>";
    return svg;
  }

  exportToPdf(entities: CadEntity[], width: number, height: number): Blob {
    return new Blob(['PDF Export not fully implemented. Use SVG or DXF.'], { type: 'application/pdf' });
  }

  downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    this.downloadBlob(blob, filename);
  }

  downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const dxfService = new DxfService();
