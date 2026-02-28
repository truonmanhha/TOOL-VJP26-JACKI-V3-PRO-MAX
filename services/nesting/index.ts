// ============================================================
// VJP26 ADVANCED NESTING ENGINE
// Main entry point combining all nesting algorithms
// ============================================================

// Geometry utilities
export * from './geometry';

// NFP and placement
export * from './nfpGenerator';

// Genetic algorithm
export * from './geneticNesting';

// Remnant/Offcut management
export * from './remnantManager';

// File parsers (DXF, SVG)
export * from './fileParser';

// ============ MAIN ENGINE CLASS ==============

import {
    Point2D, Polygon, BoundingBox,
    getBounds, rotatePolygon, translatePolygon, absPolygonArea, createRectangle
} from './geometry';

import {
    greedyNesting, NestingPiece, PlacedPiece, NestingSheet as NFPSheet, GreedyNestingResult
} from './nfpGenerator';

import {
    geneticNesting, hybridNesting, GeneticNesting, GeneticResult, GeneticConfig, DEFAULT_GENETIC_CONFIG
} from './geneticNesting';

export type NestingStrategy = 'FAST' | 'BALANCED' | 'MAXIMUM_EFFICIENCY';
export type SortStrategy = 'AREA_DESC' | 'HEIGHT_DESC' | 'WIDTH_DESC' | 'PERIMETER_DESC';

export interface NestingConfig {
    strategy: NestingStrategy;
    sortStrategy: SortStrategy;
    partGap: number;              // mm between parts
    edgeMargin: number;           // mm from sheet edge
    rotationSteps: number[];      // Allowed rotations
    allowMirror: boolean;
    grainDirection: boolean;      // Respect grain direction
    geneticConfig?: Partial<GeneticConfig>;
}

export interface NestingInput {
    parts: PartInput[];
    sheets: SheetInput[];
    config: Partial<NestingConfig>;
}

export interface PartInput {
    id: string;
    name: string;
    width: number;
    height: number;
    quantity: number;
    priority: number;
    allowRotation: boolean;
    polygon?: Polygon;           // Custom shape, or rectangle if omitted
}

export interface SheetInput {
    id: string;
    name: string;
    width: number;
    height: number;
    material: string;
    quantity: number;
}

export interface NestingOutput {
    sheets: SheetOutput[];
    totalUtilization: number;
    totalPartsPlaced: number;
    totalPartsRemaining: number;
    computeTime: number;
    strategy: NestingStrategy;
}

export interface SheetOutput {
    sheetId: string;
    sheetIndex: number;
    material: string;
    width: number;
    height: number;
    placedParts: PlacedPartOutput[];
    utilization: number;
}

export interface PlacedPartOutput {
    partId: string;
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    color: string;
}

export const DEFAULT_NESTING_CONFIG: NestingConfig = {
    strategy: 'BALANCED',
    sortStrategy: 'AREA_DESC',
    partGap: 2,
    edgeMargin: 10,
    rotationSteps: [0, 90, 180, 270],
    allowMirror: false,
    grainDirection: false
};

// ============ MAIN ENGINE ==============

export class AdvancedNestingEngine {
    private config: NestingConfig;

    constructor(config: Partial<NestingConfig> = {}) {
        this.config = { ...DEFAULT_NESTING_CONFIG, ...config };
    }

    /**
     * Run nesting with automatic algorithm selection
     */
    nest(input: NestingInput): NestingOutput {
        const startTime = performance.now();
        const config = { ...this.config, ...input.config };

        // Convert parts to nesting pieces
        const pieces = this.convertParts(input.parts, config);

        // Process each sheet type
        const sheetOutputs: SheetOutput[] = [];
        let remainingPieces = [...pieces];
        let sheetIndex = 0;

        for (const sheet of input.sheets) {
            for (let q = 0; q < sheet.quantity && remainingPieces.length > 0; q++) {
                const nfpSheet: NFPSheet = {
                    width: sheet.width,
                    height: sheet.height,
                    margin: config.edgeMargin,
                    gap: config.partGap
                };

                let result: GreedyNestingResult | GeneticResult;

                // Select algorithm based on strategy
                switch (config.strategy) {
                    case 'FAST':
                        result = greedyNesting(remainingPieces, nfpSheet, config.sortStrategy as any);
                        break;

                    case 'MAXIMUM_EFFICIENCY':
                        result = geneticNesting(remainingPieces, nfpSheet, {
                            ...DEFAULT_GENETIC_CONFIG,
                            ...config.geneticConfig,
                            generations: 200,
                            populationSize: 30
                        });
                        break;

                    case 'BALANCED':
                    default:
                        result = hybridNesting(remainingPieces, nfpSheet, {
                            ...DEFAULT_GENETIC_CONFIG,
                            ...config.geneticConfig,
                            generations: 50,
                            populationSize: 15
                        });
                        break;
                }

                if (result.placedPieces.length > 0) {
                    // Convert placed pieces to output format
                    const placedParts: PlacedPartOutput[] = result.placedPieces.map(p => {
                        const originalPart = input.parts.find(part => part.id === p.id);
                        const bounds = getBounds(p.polygon);

                        return {
                            partId: p.id,
                            name: originalPart?.name || p.id,
                            x: p.x,
                            y: p.y,
                            width: bounds.width,
                            height: bounds.height,
                            rotation: p.rotation,
                            color: this.getPartColor(p.id, input.parts)
                        };
                    });

                    sheetOutputs.push({
                        sheetId: sheet.id,
                        sheetIndex: sheetIndex++,
                        material: sheet.material,
                        width: sheet.width,
                        height: sheet.height,
                        placedParts,
                        utilization: result.utilization
                    });

                    // Update remaining pieces
                    const placedIds = new Set(result.placedPieces.map(p => `${p.id}_${p.instanceIndex}`));
                    remainingPieces = remainingPieces.filter(p => {
                        for (let i = 0; i < p.quantity; i++) {
                            if (!placedIds.has(`${p.id}_${i}`)) {
                                return true;
                            }
                        }
                        return false;
                    });
                }
            }
        }

        // Calculate totals
        const totalPlaced = sheetOutputs.reduce((sum, s) => sum + s.placedParts.length, 0);
        const totalRemaining = remainingPieces.reduce((sum, p) => sum + p.quantity, 0);
        const totalUtilization = sheetOutputs.length > 0
            ? sheetOutputs.reduce((sum, s) => sum + s.utilization, 0) / sheetOutputs.length
            : 0;

        return {
            sheets: sheetOutputs,
            totalUtilization,
            totalPartsPlaced: totalPlaced,
            totalPartsRemaining: totalRemaining,
            computeTime: performance.now() - startTime,
            strategy: config.strategy
        };
    }

    /**
     * Convert input parts to nesting pieces
     */
    private convertParts(parts: PartInput[], config: NestingConfig): NestingPiece[] {
        return parts.map(part => ({
            id: part.id,
            polygon: part.polygon || createRectangle(part.width, part.height),
            quantity: part.quantity,
            priority: part.priority,
            allowRotation: part.allowRotation,
            rotationSteps: part.allowRotation ? config.rotationSteps : [0]
        }));
    }

    /**
     * Generate color for part visualization
     */
    private getPartColor(partId: string, parts: PartInput[]): string {
        const colors = [
            '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
            '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
        ];

        const idx = parts.findIndex(p => p.id === partId);
        return colors[idx % colors.length];
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<NestingConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

// ============ CONVENIENCE EXPORTS ==============

/**
 * Quick nesting function
 */
export function quickNest(
    parts: PartInput[],
    sheets: SheetInput[],
    strategy: NestingStrategy = 'BALANCED'
): NestingOutput {
    const engine = new AdvancedNestingEngine({ strategy });
    return engine.nest({ parts, sheets, config: {} });
}

export default AdvancedNestingEngine;
