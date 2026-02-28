// ============================================================
// VJP26 NESTING - FILE PARSERS (DXF, SVG)
// Import parts from CAD files
// ============================================================

import { Point2D, Polygon, getBounds, absPolygonArea, normalizePolygon } from './geometry';

// ============ TYPES ==============

export interface ParsedPart {
    id: string;
    name: string;
    polygon: Polygon;
    width: number;
    height: number;
    area: number;
    sourceFile: string;
    layerName?: string;
    color?: string;
}

export interface ParseResult {
    success: boolean;
    parts: ParsedPart[];
    errors: string[];
    warnings: string[];
    metadata: {
        fileName: string;
        fileType: 'DXF' | 'SVG' | 'UNKNOWN';
        totalEntities: number;
        parsedEntities: number;
    };
}

// ============ DXF PARSER ==============

/**
 * Simple DXF parser for common entities
 * Supports: LINE, POLYLINE, LWPOLYLINE, CIRCLE, ARC, ELLIPSE
 */
export class DXFParser {

    parse(content: string, fileName: string): ParseResult {
        const result: ParseResult = {
            success: false,
            parts: [],
            errors: [],
            warnings: [],
            metadata: {
                fileName,
                fileType: 'DXF',
                totalEntities: 0,
                parsedEntities: 0
            }
        };

        try {
            const sections = this.parseSections(content);
            const entities = sections.ENTITIES || [];

            result.metadata.totalEntities = entities.length;

            // Group entities into closed shapes (parts)
            const closedShapes = this.extractClosedShapes(entities);

            for (let i = 0; i < closedShapes.length; i++) {
                const shape = closedShapes[i];
                const normalized = normalizePolygon(shape.polygon);
                const bounds = getBounds(normalized);

                result.parts.push({
                    id: `dxf_part_${i + 1}`,
                    name: shape.name || `Part ${i + 1}`,
                    polygon: normalized,
                    width: bounds.width,
                    height: bounds.height,
                    area: absPolygonArea(normalized),
                    sourceFile: fileName,
                    layerName: shape.layer,
                    color: shape.color
                });

                result.metadata.parsedEntities++;
            }

            result.success = result.parts.length > 0;

        } catch (e) {
            result.errors.push(`Parse error: ${e}`);
        }

        return result;
    }

    private parseSections(content: string): Record<string, any[]> {
        const sections: Record<string, any[]> = {};
        const lines = content.split(/\r?\n/);

        let currentSection = '';
        let currentEntity: Record<string, any> | null = null;
        let entities: any[] = [];

        for (let i = 0; i < lines.length; i += 2) {
            const code = parseInt(lines[i]?.trim() || '0');
            const value = lines[i + 1]?.trim() || '';

            if (code === 0) {
                if (value === 'SECTION') {
                    // New section starting
                } else if (value === 'ENDSEC') {
                    if (currentSection) {
                        sections[currentSection] = entities;
                        entities = [];
                    }
                    currentSection = '';
                } else if (currentSection === 'ENTITIES') {
                    if (currentEntity) {
                        entities.push(currentEntity);
                    }
                    currentEntity = { type: value };
                }
            } else if (code === 2 && !currentSection) {
                currentSection = value;
            } else if (currentEntity) {
                this.setEntityProperty(currentEntity, code, value);
            }
        }

        return sections;
    }

    private setEntityProperty(entity: Record<string, any>, code: number, value: string): void {
        switch (code) {
            case 8: entity.layer = value; break;
            case 10: entity.x = parseFloat(value); break;
            case 20: entity.y = parseFloat(value); break;
            case 11: entity.x2 = parseFloat(value); break;
            case 21: entity.y2 = parseFloat(value); break;
            case 40: entity.radius = parseFloat(value); break;
            case 50: entity.startAngle = parseFloat(value); break;
            case 51: entity.endAngle = parseFloat(value); break;
            case 62: entity.color = parseInt(value); break;
            case 90: entity.vertexCount = parseInt(value); break;
            default:
                // Store vertices for polylines
                if (code >= 10 && code < 20) {
                    if (!entity.vertices) entity.vertices = [];
                    const idx = code - 10;
                    if (!entity.vertices[entity._vidx || 0]) {
                        entity.vertices[entity._vidx || 0] = {};
                    }
                    entity.vertices[entity._vidx || 0].x = parseFloat(value);
                } else if (code >= 20 && code < 30) {
                    if (!entity.vertices) entity.vertices = [];
                    const idx = code - 20;
                    if (!entity.vertices[entity._vidx || 0]) {
                        entity.vertices[entity._vidx || 0] = {};
                    }
                    entity.vertices[entity._vidx || 0].y = parseFloat(value);
                    entity._vidx = (entity._vidx || 0) + 1;
                }
        }
    }

    private extractClosedShapes(entities: any[]): Array<{
        polygon: Polygon;
        name?: string;
        layer?: string;
        color?: string;
    }> {
        const shapes: Array<{ polygon: Polygon; name?: string; layer?: string; color?: string }> = [];

        for (const entity of entities) {
            let polygon: Polygon | null = null;

            switch (entity.type) {
                case 'CIRCLE':
                    polygon = this.circleToPolygon(entity.x, entity.y, entity.radius, 32);
                    break;

                case 'LWPOLYLINE':
                case 'POLYLINE':
                    if (entity.vertices && entity.vertices.length >= 3) {
                        polygon = entity.vertices.filter((v: any) => v && typeof v.x === 'number');
                    }
                    break;

                case 'LINE':
                    // Lines alone don't form closed shapes
                    break;

                case 'ELLIPSE':
                    polygon = this.ellipseToPolygon(
                        entity.x, entity.y,
                        entity.majorAxisX || entity.radius || 50,
                        entity.majorAxisY || entity.radius || 30,
                        32
                    );
                    break;
            }

            if (polygon && polygon.length >= 3) {
                shapes.push({
                    polygon,
                    layer: entity.layer,
                    color: this.dxfColorToHex(entity.color)
                });
            }
        }

        return shapes;
    }

    private circleToPolygon(cx: number, cy: number, radius: number, segments: number): Polygon {
        const points: Polygon = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * radius,
                y: cy + Math.sin(angle) * radius
            });
        }
        return points;
    }

    private ellipseToPolygon(cx: number, cy: number, rx: number, ry: number, segments: number): Polygon {
        const points: Polygon = [];
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry
            });
        }
        return points;
    }

    private dxfColorToHex(colorIndex: number | undefined): string {
        if (!colorIndex) return '#3b82f6';

        // AutoCAD color index to approximate hex
        const colors: Record<number, string> = {
            1: '#ff0000', 2: '#ffff00', 3: '#00ff00', 4: '#00ffff',
            5: '#0000ff', 6: '#ff00ff', 7: '#ffffff', 8: '#808080',
            9: '#c0c0c0'
        };

        return colors[colorIndex] || '#3b82f6';
    }
}

// ============ SVG PARSER ==============

/**
 * SVG parser for vector graphics
 * Supports: rect, circle, ellipse, polygon, polyline, path (basic)
 */
export class SVGParser {

    parse(content: string, fileName: string): ParseResult {
        const result: ParseResult = {
            success: false,
            parts: [],
            errors: [],
            warnings: [],
            metadata: {
                fileName,
                fileType: 'SVG',
                totalEntities: 0,
                parsedEntities: 0
            }
        };

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'image/svg+xml');

            // Check for parse errors
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                result.errors.push('Invalid SVG format');
                return result;
            }

            // Find all shape elements
            const shapes = doc.querySelectorAll('rect, circle, ellipse, polygon, polyline, path');
            result.metadata.totalEntities = shapes.length;

            shapes.forEach((shape, index) => {
                const polygon = this.shapeToPolygon(shape);

                if (polygon && polygon.length >= 3) {
                    const normalized = normalizePolygon(polygon);
                    const bounds = getBounds(normalized);

                    result.parts.push({
                        id: shape.id || `svg_part_${index + 1}`,
                        name: shape.id || `Part ${index + 1}`,
                        polygon: normalized,
                        width: bounds.width,
                        height: bounds.height,
                        area: absPolygonArea(normalized),
                        sourceFile: fileName,
                        color: this.getShapeColor(shape)
                    });

                    result.metadata.parsedEntities++;
                }
            });

            result.success = result.parts.length > 0;

        } catch (e) {
            result.errors.push(`Parse error: ${e}`);
        }

        return result;
    }

    private shapeToPolygon(shape: Element): Polygon | null {
        const tagName = shape.tagName.toLowerCase();

        switch (tagName) {
            case 'rect':
                return this.rectToPolygon(shape);
            case 'circle':
                return this.circleToPolygon(shape);
            case 'ellipse':
                return this.ellipseToPolygon(shape);
            case 'polygon':
            case 'polyline':
                return this.pointsToPolygon(shape);
            case 'path':
                return this.pathToPolygon(shape);
            default:
                return null;
        }
    }

    private rectToPolygon(rect: Element): Polygon {
        const x = parseFloat(rect.getAttribute('x') || '0');
        const y = parseFloat(rect.getAttribute('y') || '0');
        const width = parseFloat(rect.getAttribute('width') || '0');
        const height = parseFloat(rect.getAttribute('height') || '0');

        return [
            { x, y },
            { x: x + width, y },
            { x: x + width, y: y + height },
            { x, y: y + height }
        ];
    }

    private circleToPolygon(circle: Element): Polygon {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        const r = parseFloat(circle.getAttribute('r') || '0');

        const points: Polygon = [];
        const segments = 32;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * r,
                y: cy + Math.sin(angle) * r
            });
        }

        return points;
    }

    private ellipseToPolygon(ellipse: Element): Polygon {
        const cx = parseFloat(ellipse.getAttribute('cx') || '0');
        const cy = parseFloat(ellipse.getAttribute('cy') || '0');
        const rx = parseFloat(ellipse.getAttribute('rx') || '0');
        const ry = parseFloat(ellipse.getAttribute('ry') || '0');

        const points: Polygon = [];
        const segments = 32;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            points.push({
                x: cx + Math.cos(angle) * rx,
                y: cy + Math.sin(angle) * ry
            });
        }

        return points;
    }

    private pointsToPolygon(shape: Element): Polygon | null {
        const pointsAttr = shape.getAttribute('points');
        if (!pointsAttr) return null;

        const points: Polygon = [];
        const pairs = pointsAttr.trim().split(/[\s,]+/);

        for (let i = 0; i < pairs.length; i += 2) {
            const x = parseFloat(pairs[i]);
            const y = parseFloat(pairs[i + 1]);
            if (!isNaN(x) && !isNaN(y)) {
                points.push({ x, y });
            }
        }

        return points.length >= 3 ? points : null;
    }

    private pathToPolygon(path: Element): Polygon | null {
        const d = path.getAttribute('d');
        if (!d) return null;

        // Simple path parser - handles M, L, H, V, Z commands
        const points: Polygon = [];
        let currentX = 0, currentY = 0;

        const commands = d.match(/[MLHVCSQTAZ][^MLHVCSQTAZ]*/gi) || [];

        for (const cmd of commands) {
            const type = cmd[0].toUpperCase();
            const isRelative = cmd[0] === cmd[0].toLowerCase();
            const args = cmd.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            switch (type) {
                case 'M':
                case 'L':
                    for (let i = 0; i < args.length; i += 2) {
                        currentX = isRelative ? currentX + args[i] : args[i];
                        currentY = isRelative ? currentY + args[i + 1] : args[i + 1];
                        points.push({ x: currentX, y: currentY });
                    }
                    break;
                case 'H':
                    currentX = isRelative ? currentX + args[0] : args[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'V':
                    currentY = isRelative ? currentY + args[0] : args[0];
                    points.push({ x: currentX, y: currentY });
                    break;
                case 'Z':
                    // Close path - already handled by returning to first point
                    break;
                // C, S, Q, T, A curves - approximate with line
                default:
                    if (args.length >= 2) {
                        currentX = args[args.length - 2];
                        currentY = args[args.length - 1];
                        points.push({ x: currentX, y: currentY });
                    }
            }
        }

        return points.length >= 3 ? points : null;
    }

    private getShapeColor(shape: Element): string {
        const fill = shape.getAttribute('fill');
        const stroke = shape.getAttribute('stroke');
        const style = shape.getAttribute('style');

        if (fill && fill !== 'none') return fill;
        if (stroke && stroke !== 'none') return stroke;

        // Parse from style attribute
        if (style) {
            const fillMatch = style.match(/fill:\s*([^;]+)/);
            if (fillMatch && fillMatch[1] !== 'none') return fillMatch[1];

            const strokeMatch = style.match(/stroke:\s*([^;]+)/);
            if (strokeMatch && strokeMatch[1] !== 'none') return strokeMatch[1];
        }

        return '#3b82f6';
    }
}

// ============ UNIFIED FILE PARSER ==============

export class FileParser {
    private dxfParser = new DXFParser();
    private svgParser = new SVGParser();

    /**
     * Parse file content based on extension or content detection
     */
    parse(content: string, fileName: string): ParseResult {
        const ext = fileName.toLowerCase().split('.').pop();

        if (ext === 'dxf') {
            return this.dxfParser.parse(content, fileName);
        } else if (ext === 'svg') {
            return this.svgParser.parse(content, fileName);
        } else {
            // Try to detect format
            if (content.trim().startsWith('<?xml') || content.trim().startsWith('<svg')) {
                return this.svgParser.parse(content, fileName);
            } else if (content.includes('SECTION') && content.includes('ENTITIES')) {
                return this.dxfParser.parse(content, fileName);
            }
        }

        return {
            success: false,
            parts: [],
            errors: ['Unsupported file format'],
            warnings: [],
            metadata: {
                fileName,
                fileType: 'UNKNOWN',
                totalEntities: 0,
                parsedEntities: 0
            }
        };
    }

    /**
     * Parse from File object (for drag-drop)
     */
    async parseFile(file: File): Promise<ParseResult> {
        return new Promise((resolve) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const content = e.target?.result as string;
                resolve(this.parse(content, file.name));
            };

            reader.onerror = () => {
                resolve({
                    success: false,
                    parts: [],
                    errors: ['Failed to read file'],
                    warnings: [],
                    metadata: {
                        fileName: file.name,
                        fileType: 'UNKNOWN',
                        totalEntities: 0,
                        parsedEntities: 0
                    }
                });
            };

            reader.readAsText(file);
        });
    }
}

// ============ SINGLETON INSTANCE ==============

export const fileParser = new FileParser();

export default FileParser;
