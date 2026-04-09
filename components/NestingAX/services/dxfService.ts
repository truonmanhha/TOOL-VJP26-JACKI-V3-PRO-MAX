// ============================================================
// DXF & SVG Import/Export Service — NestingAX
// "VinaCAD Style" — Auto-Unit Detection & Fidelity Boost
// ============================================================

import DxfParser from 'dxf-parser';
import { jsPDF } from 'jspdf';
import { LibreDwg } from '@mlightcad/libredwg-web';
import { CadEntity } from './db';
import { AXDrawingDocument } from './axSceneModel';
import { buildAXDocumentFromCadEntities } from './axImportAdapter';
import { AXDxfDiagnostics, AXStrategyResult, buildDxfStrategyResult } from '../engine/import/dxfStrategy';
import { AXDwgDiagnostics, buildDwgStrategyResult } from '../engine/import/dwgStrategy';
import { detectAXImportFileKind } from '../engine/import/fileKind';
import { buildUnknownStrategyResult } from '../engine/import/unknownStrategy';
import { applyAffine2D, multiplyAffine2D } from '../engine/import/mathUtils';
import { resolveCadImportColor } from '../engine/import/colorResolver';
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

  private async _getLibreDwg() {
    if (!this.libredwg) {
      this.libredwg = await LibreDwg.create();
    }
    return this.libredwg;
  }

  private _getColor(ent: any, dxf?: any): string {
    let index = ent.color !== undefined ? ent.color : 256; 
    if (index === 256 && dxf?.tables?.layers && ent.layer) {
      const layerData = dxf.tables.layers[ent.layer];
      if (layerData && layerData.color !== undefined) index = layerData.color;
    }
    return resolveCadImportColor(ent, dxf);
  }

  private _cleanText(text: string): string {
    if (!text) return "";
    return text.replace(/\\\\P/g, " ").replace(/\\\\f[^;]+;/g, "").replace(/\\\\H[^;]+;/g, "").replace(/\\\\S[^;]+;/g, "").replace(/\\\\T[^;]+;/g, "").replace(/\\\\Q[^;]+;/g, "").replace(/\\\\W[^;]+;/g, "").replace(/\\\\A[^;]+;/g, "").replace(/\\\\C[^;]+;/g, "").replace(/\\\\L|\\\\l|\\\\O|\\\\o/g, "").replace(/[{}]/g, "").trim();
  }

  async parseDxfFile(file: File, layerId?: string): Promise<CadEntity[]> {
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
      
      const insUnits = dxf.header?.$INSUNITS || 0;
      let globalScale = 1.0;
      if (insUnits === 1) globalScale = 25.4; 
      else if (insUnits === 6) globalScale = 1000.0; 
      else if (insUnits === 5) globalScale = 304.8;
      else if (insUnits === 0) {
        const extents = dxf.header?.$EXTMAX;
        if (extents && typeof extents === 'object' && 'x' in extents && typeof extents.x === 'number' && Math.abs(extents.x) < 100) {
          globalScale = 1000.0;
        }
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
              const pos = ent.insertionPoint || { x: 0, y: 0 };
              const scale = ent.scale || { x: 1, y: 1, z: 1 };
              entities.push({
                id: crypto.randomUUID(),
                type: 'insert',
                points: [this._applyMatrix(pos, matrix)],
                properties: {
                  blockName: ent.name,
                  rotation: ent.rotation || 0,
                  scaleX: scale.x || 1,
                  scaleY: scale.y || 1,
                  explodeFallback: Boolean(block && block.entities),
                  byBlockColor: color,
                  color,
                },
                layerId: layer,
              });
              if (block && block.entities) {
                const rotation = (ent.rotation || 0) * Math.PI / 180;
                const cosR = Math.cos(rotation), sinR = Math.sin(rotation);
                
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
              const dimText = this._cleanText(ent.text || ent.mtext || '');
              const textPosRaw = ent.textPosition || ent.middleOfText || ent.textMidpoint;
              const ext1Raw = ent.extLine1Point || ent.xLine1Point || ent.defPoint || ent.startPoint;
              const ext2Raw = ent.extLine2Point || ent.xLine2Point || ent.defPoint2 || ent.endPoint;

              if (textPosRaw && ext1Raw && ext2Raw) {
                const textPos = this._applyMatrix(textPosRaw, matrix);
                const p1 = this._applyMatrix(ext1Raw, matrix);
                const p2 = this._applyMatrix(ext2Raw, matrix);
                const hasActualMeasurement = ent.actualMeasurement !== undefined;
                const hasMeasurement = ent.measurement !== undefined;
                const measuredValue = ent.actualMeasurement ?? ent.measurement ?? this._distance(p1, p2);
                const rawDimText = this._cleanText(ent.text || ent.mtext || '');
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'dimension',
                  points: [p1, p2, textPos],
                  properties: {
                    color,
                    value: measuredValue,
                    unit: 'mm',
                    text: rawDimText,
                    dimensionType: ent.dimensionType,
                    textHeight: ent.textHeight || ent.dimTextHeight || 2.5,
                    rotation: ent.textRotation || ent.rotation || 0,
                    dimensionStyle: ent.styleName || ent.dimstyle,
                    textStyle: ent.textStyle,
                    textAttachment: ent.attachmentPoint,
                    extLine1: p1,
                    extLine2: p2,
                    arrowheadType: ent.arrowheadType || ent.arrowType,
                    arrowSize: ent.arrowSize || ent.dimasz,
                    textGap: ent.textGap || ent.dimgap,
                    fitMode: ent.fitMode || ent.dimfit,
                    isTextOverride: rawDimText.length > 0,
                    measurementSource: hasActualMeasurement ? 'actualMeasurement' : hasMeasurement ? 'measurement' : 'derived',
                  },
                  layerId: layer,
                });
              }

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
            case 'ELLIPSE': {
              const center = this._applyMatrix(ent.center || { x: 0, y: 0 }, matrix);
              const major = ent.majorAxisEndPoint || ent.majorAxis || { x: ent.radiusX || 0, y: 0 };
              const ratio = typeof ent.axisRatio === 'number' ? ent.axisRatio : (typeof ent.ratio === 'number' ? ent.ratio : 1);
              const majorLen = Math.sqrt((major.x || 0) ** 2 + (major.y || 0) ** 2);
              const scale = Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2]));
              const rx = majorLen * scale;
              const ry = rx * ratio;
              const rotation = Math.atan2(major.y || 0, major.x || 0) * 180 / Math.PI;
              entities.push({
                id: crypto.randomUUID(),
                type: 'ellipse',
                points: [center],
                properties: { rx, ry, rotation, color },
                layerId: layer,
              });
              break;
            }
            case 'LWPOLYLINE':
            case 'POLYLINE': {
              const polyPts = (ent.vertices || []).map((v: any) => this._applyMatrix(v, matrix));
              if (polyPts.length >= 2) {
                const isClosed = ent.shape === 1 || ent.closed || ent.is_closed;
                const bulges = (ent.vertices || []).map((v: any) => Number(v?.bulge || 0));
                entities.push({
                  id: crypto.randomUUID(), type: 'polyline',
                  points: isClosed ? [...polyPts, polyPts[0]] : polyPts,
                  properties: { closed: isClosed, bulges, color }, layerId: layer
                });
              }
              break;
            }
            case 'SPLINE': {
              const splinePts = (ent.controlPoints || ent.fitPoints || ent.points || []).map((p: any) => this._applyMatrix(p, matrix));
              if (splinePts.length >= 2) {
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'spline',
                  points: splinePts,
                  properties: { closed: Boolean(ent.closed), color },
                  layerId: layer,
                });
              }
              break;
            }
            case 'TEXT':
            case 'MTEXT': {
              const text = this._cleanText(ent.text || ent.mtext || '');
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
                  properties: { text, rawText: ent.text || ent.mtext || '', isMText: ent.type?.toUpperCase() === 'MTEXT', fontSize: fs, textHeight: fs, rotation: rot, color, attachment, textStyle: ent.styleName },
                  layerId: layer
                });
              }
              break;
            }
            case 'ATTDEF':
            case 'ATTRIB': {
              const text = this._cleanText(ent.text || ent.mtext || ent.value || '');
              if (text) {
                const basePt = ent.insertionPoint || ent.startPoint || { x: 0, y: 0 };
                const p = this._applyMatrix(basePt, matrix);
                const rot = (ent.rotation || 0) + (Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI);
                const scaleY = Math.sqrt(matrix[2]**2 + matrix[3]**2);
                const fs = (ent.nominalHeight || ent.textHeight || ent.height || 2.5) * scaleY;
                const attachment = ent.attachmentPoint || ent.horizontalJustification || 0;
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'text',
                  points: [p],
                  properties: {
                    text,
                    rawText: ent.text || ent.mtext || ent.value || '',
                    isMText: false,
                    isAttributeText: true,
                    attributeTag: ent.tag || ent.tagString,
                    fontSize: fs,
                    textHeight: fs,
                    rotation: rot,
                    color,
                    attachment,
                    textStyle: ent.styleName,
                  },
                  layerId: layer,
                });
              }
              break;
            }
            case 'IMAGE':
            case 'UNDERLAY':
            case 'WIPEOUT':
            case '3DFACE':
            case 'SOLID':
            case 'TRACE':
            case 'RAY':
            case 'XLINE': {
              const basePt = ent.insertionPoint || ent.position || ent.startPoint || ent.center || { x: 0, y: 0 };
              const p = this._applyMatrix(basePt, matrix);
              entities.push({
                id: crypto.randomUUID(),
                type: 'unsupportedVisual',
                points: [p],
                properties: {
                  originalType: ent.type?.toUpperCase() || 'UNKNOWN',
                  color,
                },
                layerId: layer,
              });
              break;
            }
            case 'LEADER':
            case 'MLEADER': {
              const vertices = ent.vertices || ent.points || ent.leaderVertices || [];
              if (Array.isArray(vertices) && vertices.length >= 2) {
                entities.push({
                  id: crypto.randomUUID(),
                  type: 'leader',
                  points: vertices.map((vertex: any) => this._applyMatrix(vertex, matrix)),
                  properties: {
                    text: this._cleanText(ent.text || ent.mtext || ''),
                    color,
                  },
                  layerId: layer,
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
    return multiplyAffine2D(a, b);
  }

  private _applyMatrix(p: { x: number, y: number }, m: number[]) {
    return applyAffine2D(p, m);
  }

  async parseDwgFile(fileContent: Uint8Array, layerId?: string): Promise<{ entities: CadEntity[]; diagnostics?: AXDwgDiagnostics }> {
    try {
      const libredwg = await this._getLibreDwg();
      const dwgPtr = libredwg.dwg_read_data(fileContent, DWG_FILE_TYPE);
      if (!dwgPtr || dwgPtr === 0) throw new Error('DWG read failed');
      const db = libredwg.convert(dwgPtr);
      const entities: CadEntity[] = [];
      let rawDimensionLikeCount = 0;
      let emittedDimensionCount = 0;
      let sampledDimensionLogs = 0;
      const rawDimensionTypeCounts: Record<string, number> = {};
      const rawDimensionFieldPresence = { p1: 0, p2: 0, textPos: 0, anyText: 0, anyMeasurement: 0, anyBlock: 0 };
      
      const offsetPoint = (p: any, insert: any) => ({
        x: (p?.x || 0) + (insert?.insertionPoint?.x || insert?.position?.x || 0),
        y: (p?.y || 0) + (insert?.insertionPoint?.y || insert?.position?.y || 0),
      });

      const pushDimensionEntity = (ent: any, color: string, insert?: any) => {
        const p1 = ent.subDefinitionPoint1 || ent.extLine1Point || ent.xLine1Point || ent.defPoint || ent.definitionPoint || ent.def_pt || ent.startPoint || ent.xline1_pt;
        const p2 = ent.subDefinitionPoint2 || ent.extLine2Point || ent.xLine2Point || ent.defPoint2 || ent.insertionPoint || ent.def_pt2 || ent.endPoint || ent.xline2_pt;
        const textPos = ent.textPoint || ent.textPosition || ent.middleOfText || ent.textMidpoint || ent.text_midpt || ent.text_midpoint || ent.clone_ins_pt || ent.insertionPoint;
        if (p1 && p2 && textPos) {
          const hasActualMeasurement = ent.actualMeasurement !== undefined || ent.act_measurement !== undefined;
          const hasMeasurement = ent.measurement !== undefined;
          const textValue = this._cleanText(ent.user_text || ent.text || ent.mtext || '');
          entities.push({
            id: crypto.randomUUID(),
            type: 'dimension',
            points: [offsetPoint(p1, insert), offsetPoint(p2, insert), offsetPoint(textPos, insert)],
            properties: {
              color,
              value: ent.actualMeasurement ?? ent.act_measurement ?? ent.measurement ?? this._distance(p1, p2),
              unit: 'mm',
              text: textValue,
              textHeight: ent.textHeight || ent.dimTextHeight || ent.height || ent.dimtxt || ent.text_size || ent.textScale || 2.5,
              rotation: ent.textRotation || ent.rotationAngle || ent.dim_rotation || ent.rotation || 0,
              dimensionType: ent.dimensionType || ent.dimtype,
              dimensionStyle: ent.styleName || ent.dimstyle,
              textStyle: ent.textStyle,
              textAttachment: ent.attachmentPoint || ent.text_attachment,
              extLine1: offsetPoint(p1, insert),
              extLine2: offsetPoint(p2, insert),
              arrowheadType: ent.arrowheadType || ent.arrowType,
              arrowSize: ent.arrowSize || ent.dimasz,
              textGap: ent.textGap || ent.dimgap,
              fitMode: ent.fitMode || ent.dimfit,
              isTextOverride: textValue.length > 0,
              measurementSource: hasActualMeasurement ? 'actualMeasurement' : hasMeasurement ? 'measurement' : 'derived',
            },
            layerId,
          });
          emittedDimensionCount += 1;
          return true;
        }
        return false;
      };

      const pushEntity = (ent: any, color: string, insert?: any) => {
        const type = String(ent?.type || '').toUpperCase();

        if (type === 'DIMENSION' || type === 'ACDBDIMENSION' || ent.dimtype !== undefined || ent.dimensionType !== undefined) {
          return pushDimensionEntity(ent, color, insert);
        }

        if (type === 'LINE') {
          const start = ent.start || ent.startPoint || ent.p1;
          const end = ent.end || ent.endPoint || ent.p2;
          if (start && end) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'line',
              points: [offsetPoint(start, insert), offsetPoint(end, insert)],
              properties: { color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'CIRCLE') {
          const center = ent.center || ent.insertionPoint || ent.position;
          const radius = ent.radius;
          if (center && typeof radius === 'number') {
            entities.push({
              id: crypto.randomUUID(),
              type: 'circle',
              points: [offsetPoint(center, insert)],
              properties: { radius, color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'ARC') {
          const center = ent.center;
          const radius = ent.radius;
          const startAngle = ent.startAngle || 0;
          const endAngle = ent.endAngle || 0;
          if (center && typeof radius === 'number') {
            const c = offsetPoint(center, insert);
            const p1 = { x: c.x + radius * Math.cos(startAngle), y: c.y + radius * Math.sin(startAngle) };
            const p2 = { x: c.x + radius * Math.cos(endAngle), y: c.y + radius * Math.sin(endAngle) };
            const midAngle = startAngle + (((endAngle < startAngle ? endAngle + 2 * Math.PI : endAngle) - startAngle) / 2);
            const pMid = { x: c.x + radius * Math.cos(midAngle), y: c.y + radius * Math.sin(midAngle) };
            entities.push({
              id: crypto.randomUUID(),
              type: 'arc',
              points: [p1, pMid, p2],
              properties: { radius, centerX: c.x, centerY: c.y, color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'ELLIPSE') {
          const center = ent.center || ent.position;
          const major = ent.majorAxisEndPoint || ent.majorAxis || { x: ent.radiusX || 0, y: 0 };
          const ratio = typeof ent.axisRatio === 'number' ? ent.axisRatio : (typeof ent.ratio === 'number' ? ent.ratio : 1);
          if (center) {
            const majorLen = Math.sqrt((major.x || 0) ** 2 + (major.y || 0) ** 2);
            const rx = majorLen;
            const ry = rx * ratio;
            const rotation = Math.atan2(major.y || 0, major.x || 0) * 180 / Math.PI;
            entities.push({
              id: crypto.randomUUID(),
              type: 'ellipse',
              points: [offsetPoint(center, insert)],
              properties: { rx, ry, rotation, color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'LWPOLYLINE' || type === 'POLYLINE') {
          const vertices = ent.vertices || ent.points || [];
          if (Array.isArray(vertices) && vertices.length >= 2) {
            const points = vertices.map((vertex: any) => offsetPoint(vertex, insert));
            const closed = Boolean(ent.closed || ent.is_closed || ent.shape === 1);
            const bulges = vertices.map((vertex: any) => Number(vertex?.bulge || 0));
            entities.push({
              id: crypto.randomUUID(),
              type: 'polyline',
              points,
              properties: { closed, bulges, color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'SPLINE') {
          const splinePts = ent.controlPoints || ent.fitPoints || ent.points || [];
          if (Array.isArray(splinePts) && splinePts.length >= 2) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'spline',
              points: splinePts.map((point: any) => offsetPoint(point, insert)),
              properties: { closed: Boolean(ent.closed), color },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'TEXT' || type === 'MTEXT') {
          const position = ent.insertionPoint || ent.position || ent.startPoint;
          const text = this._cleanText(ent.text || ent.mtext || ent.user_text || '');
          if (position && text) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'text',
              points: [offsetPoint(position, insert)],
              properties: {
                text,
                rawText: ent.text || ent.mtext || ent.user_text || '',
                isMText: type === 'MTEXT',
                fontSize: ent.textHeight || ent.dimTextHeight || ent.height || 2.5,
                textHeight: ent.textHeight || ent.dimTextHeight || ent.height || 2.5,
                rotation: ent.rotation || ent.textRotation || 0,
                textStyle: ent.textStyle || ent.styleName,
                color,
              },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'ATTDEF' || type === 'ATTRIB') {
          const position = ent.insertionPoint || ent.position || ent.startPoint;
          const text = this._cleanText(ent.text || ent.mtext || ent.value || ent.user_text || '');
          if (position && text) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'text',
              points: [offsetPoint(position, insert)],
              properties: {
                text,
                rawText: ent.text || ent.mtext || ent.value || ent.user_text || '',
                isMText: false,
                isAttributeText: true,
                attributeTag: ent.tag || ent.tagString,
                fontSize: ent.textHeight || ent.dimTextHeight || ent.height || 2.5,
                textHeight: ent.textHeight || ent.dimTextHeight || ent.height || 2.5,
                rotation: ent.rotation || ent.textRotation || 0,
                textStyle: ent.textStyle || ent.styleName,
                color,
                attachment: ent.attachmentPoint || ent.text_attachment || 0,
              },
              layerId: layerId,
            });
            return true;
          }
        }

        if (type === 'IMAGE' || type === 'UNDERLAY' || type === 'WIPEOUT' || type === '3DFACE' || type === 'SOLID' || type === 'TRACE' || type === 'RAY' || type === 'XLINE') {
          const position = ent.insertionPoint || ent.position || ent.startPoint || ent.center || { x: 0, y: 0 };
          entities.push({
            id: crypto.randomUUID(),
            type: 'unsupportedVisual',
            points: [offsetPoint(position, insert)],
            properties: {
              originalType: type,
              color,
            },
            layerId: layerId,
          });
          return true;
        }

        if (type === 'LEADER' || type === 'MLEADER') {
          const vertices = ent.vertices || ent.points || ent.leaderVertices || [];
          if (Array.isArray(vertices) && vertices.length >= 2) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'leader',
              points: vertices.map((vertex: any) => offsetPoint(vertex, insert)),
              properties: {
                text: this._cleanText(ent.text || ent.mtext || ent.user_text || ''),
                color,
              },
              layerId: layerId,
            });
            return true;
          }
        }

        return false;
      };

      if (db?.entities) {
        db.entities.forEach((ent: any) => {
          const color = this._getColor(ent);
          if (ent.type === 'DIMENSION' || ent.type === 'AcDbDimension' || ent.dimtype !== undefined || ent.dimensionType !== undefined || ent.block) {
            rawDimensionLikeCount += 1;
            rawDimensionTypeCounts[String(ent.type || 'UNKNOWN')] = (rawDimensionTypeCounts[String(ent.type || 'UNKNOWN')] || 0) + 1;
            const p1 = ent.subDefinitionPoint1 || ent.extLine1Point || ent.xLine1Point || ent.defPoint || ent.definitionPoint || ent.def_pt || ent.startPoint || ent.xline1_pt;
            const p2 = ent.subDefinitionPoint2 || ent.extLine2Point || ent.xLine2Point || ent.defPoint2 || ent.insertionPoint || ent.def_pt2 || ent.endPoint || ent.xline2_pt;
            const textPos = ent.textPoint || ent.textPosition || ent.middleOfText || ent.textMidpoint || ent.text_midpt || ent.text_midpoint || ent.clone_ins_pt || ent.insertionPoint;
            if (p1) rawDimensionFieldPresence.p1 += 1;
            if (p2) rawDimensionFieldPresence.p2 += 1;
            if (textPos) rawDimensionFieldPresence.textPos += 1;
            if (ent.user_text || ent.text || ent.mtext) rawDimensionFieldPresence.anyText += 1;
            if (ent.actualMeasurement || ent.act_measurement || ent.measurement) rawDimensionFieldPresence.anyMeasurement += 1;
            if (ent.block) rawDimensionFieldPresence.anyBlock += 1;
            if (sampledDimensionLogs < 5) {
              sampledDimensionLogs += 1;
              console.log('[DxfService] Sample raw DWG dimension-like entity fields JSON:', JSON.stringify({
                type: ent.type, block: ent.block, keys: Object.keys(ent).slice(0, 60), defPoint: ent.defPoint, def_pt: ent.def_pt,
                xLine1Point: ent.xLine1Point, xline1_pt: ent.xline1_pt, xLine2Point: ent.xLine2Point, xline2_pt: ent.xline2_pt,
                textPosition: ent.textPosition, text_midpt: ent.text_midpt, clone_ins_pt: ent.clone_ins_pt,
                measurement: ent.measurement, act_measurement: ent.act_measurement, text: ent.text, user_text: ent.user_text,
                textHeight: ent.textHeight, dimTextHeight: ent.dimTextHeight, height: ent.height, dimtxt: ent.dimtxt, textScale: ent.textScale,
                text_size: ent.text_size, styleName: ent.styleName, dimensionType: ent.dimensionType, dimtype: ent.dimtype,
              }));
            }
          }
          if (String(ent.type || '').toUpperCase() === 'INSERT' && ent.block) {
            entities.push({
              id: crypto.randomUUID(),
              type: 'insert',
              points: [offsetPoint(ent.insertionPoint || ent.position || { x: 0, y: 0 }, undefined)],
              properties: {
                blockName: ent.block,
                rotation: ent.rotation || 0,
                scaleX: ent.scaleX || ent.xscale || 1,
                scaleY: ent.scaleY || ent.yscale || 1,
                explodeFallback: Array.isArray(db?.blocks?.[ent.block]?.entities),
                byBlockColor: color,
                color,
              },
              layerId,
            });
          }
          if (pushEntity(ent, color)) return;
          if (ent.type === 'INSERT' && ent.block && Array.isArray(db?.blocks?.[ent.block]?.entities)) {
            db.blocks[ent.block].entities.forEach((blockEnt: any) => {
              const blockColor = this._getColor(blockEnt);
              pushEntity(blockEnt, blockColor, ent);
            });
          }
        });
      }
      libredwg.dwg_free(dwgPtr);
      console.log(`[DxfService] DWG fallback dimension diagnostics: rawDimensionLike=${rawDimensionLikeCount}, emittedDimension=${emittedDimensionCount}`);
      console.log('[DxfService] DWG fallback dimension type counts JSON:', JSON.stringify(rawDimensionTypeCounts));
      console.log('[DxfService] DWG fallback dimension field presence JSON:', JSON.stringify(rawDimensionFieldPresence));
      return {
        entities,
        diagnostics: {
          rawDimensionLike: rawDimensionLikeCount,
          emittedDimension: emittedDimensionCount,
          typeCounts: rawDimensionTypeCounts,
          fieldPresence: rawDimensionFieldPresence,
        },
      };
    } catch (err) {
      console.error('❌ DWG Parse Error:', err);
      return {
        entities: [],
        diagnostics: {
          rawDimensionLike: 0,
          emittedDimension: 0,
          typeCounts: {},
          fieldPresence: {},
          warnings: [err instanceof Error ? err.message : 'Unknown DWG parse error'],
        },
      };
    }
  }

  async parseImportFile(file: File, layerId?: string): Promise<AXStrategyResult | { entities: CadEntity[]; document: AXDrawingDocument; fileType: 'unknown'; fileName: string; importSource?: 'local'; diagnostics?: any }> {
    const kind = detectAXImportFileKind(file.name);
    if (kind === 'dxf') {
      const entities = await this.parseDxfFile(file, layerId);
      const document = buildAXDocumentFromCadEntities(entities, file.name);
      const diagnostics: AXDxfDiagnostics = {
        unsupportedTypes: document.diagnostics.unsupportedTypes,
        unsupportedByDomain: document.diagnostics.unsupportedByDomain,
        degradedBySubtype: document.diagnostics.degradedBySubtype,
        warnings: document.diagnostics.warnings,
      };
      return buildDxfStrategyResult(file.name, entities, diagnostics);
    }
    if (kind === 'dwg') {
      try {
        const apiRes = await uploadDxf(file);
        if (apiRes.success && apiRes.entities.length > 0) {
          const entities = apiRes.entities.map(e => this._apiToCadEntity(e, layerId));
          return buildDwgStrategyResult(file.name, entities, 'backend');
        }
      } catch (e) {
        console.warn('[DxfService] Backend DWG parse failed, falling back to local LibreDWG parser:', e);
      }

      const buffer = await file.arrayBuffer();
      const localResult = await this.parseDwgFile(new Uint8Array(buffer), layerId);
      return buildDwgStrategyResult(file.name, localResult.entities, 'local', localResult.diagnostics);
    }
    return buildUnknownStrategyResult(file.name);
  }

  exportToDxf(entities: CadEntity[], width?: number, height?: number): string {
    let dxf = "0\\nSECTION\\n2\\nENTITIES\\n";
    entities.forEach(ent => {
      if (ent.type === 'line' && ent.points && ent.points.length === 2) dxf += `0\\nLINE\\n8\\n0\\n10\\n${ent.points[0].x}\\n20\\n${ent.points[0].y}\\n11\\n${ent.points[1].x}\\n21\\n${ent.points[1].y}\\n`;
    });
    dxf += "0\\nENDSEC\\n0\\nEOF";
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

  private _distance(p1: {x:number, y:number}, p2: {x:number, y:number}) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
}

export const dxfService = new DxfService();
