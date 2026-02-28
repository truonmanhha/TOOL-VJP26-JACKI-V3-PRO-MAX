// ============================================================
// VJP26 NESTING - GENETIC ALGORITHM OPTIMIZER
// Based on SVGNest approach (Burke et al. 2006)
// For maximum nesting efficiency
// ============================================================

import {
    Point2D, Polygon,
    getBounds, rotatePolygon, translatePolygon, absPolygonArea, polygonsIntersect
} from './geometry';
import { greedyNesting, NestingPiece, PlacedPiece, NestingSheet, GreedyNestingResult } from './nfpGenerator';

// ============ TYPES ==============

export interface Chromosome {
    genes: Gene[];
    fitness: number;
}

export interface Gene {
    partId: string;
    rotation: number;
    instanceIndex: number;
}

export interface GeneticConfig {
    populationSize: number;         // Number of individuals
    generations: number;            // Max generations
    mutationRate: number;           // 0-1
    elitismRate: number;            // Percentage of best to keep
    crossoverRate: number;          // 0-1
    rotationSteps: number[];        // Allowed rotations
    stagnationLimit: number;        // Stop if no improvement
    timeLimit: number;              // Max time in ms
}

export interface GeneticResult {
    bestChromosome: Chromosome;
    placedPieces: PlacedPiece[];
    unplacedPieces: { id: string; remaining: number }[];
    utilization: number;
    generations: number;
    computeTime: number;
    convergenceHistory: number[];
}

export const DEFAULT_GENETIC_CONFIG: GeneticConfig = {
    populationSize: 20,
    generations: 100,
    mutationRate: 0.05,
    elitismRate: 0.1,
    crossoverRate: 0.7,
    rotationSteps: [0, 90, 180, 270],
    stagnationLimit: 20,
    timeLimit: 30000  // 30 seconds
};

// ============ GENETIC ALGORITHM ==============

export class GeneticNesting {
    private config: GeneticConfig;
    private pieces: Map<string, NestingPiece>;
    private sheet: NestingSheet;
    private population: Chromosome[];
    private bestFitness: number;
    private stagnationCounter: number;
    private convergenceHistory: number[];

    constructor(config: Partial<GeneticConfig> = {}) {
        this.config = { ...DEFAULT_GENETIC_CONFIG, ...config };
        this.pieces = new Map();
        this.sheet = { width: 0, height: 0, margin: 0, gap: 0 };
        this.population = [];
        this.bestFitness = 0;
        this.stagnationCounter = 0;
        this.convergenceHistory = [];
    }

    /**
     * Run genetic algorithm optimization
     */
    evolve(pieces: NestingPiece[], sheet: NestingSheet, onProgress?: (gen: number, fitness: number) => void): GeneticResult {
        const startTime = performance.now();

        this.sheet = sheet;
        this.pieces = new Map(pieces.map(p => [p.id, p]));
        this.convergenceHistory = [];
        this.bestFitness = 0;
        this.stagnationCounter = 0;

        // Initialize population
        this.population = this.initializePopulation(pieces);

        // Evaluate initial population
        for (const individual of this.population) {
            individual.fitness = this.evaluateFitness(individual);
        }

        let generation = 0;

        while (generation < this.config.generations) {
            // Check time limit
            if (performance.now() - startTime > this.config.timeLimit) {
                break;
            }

            // Sort by fitness (descending)
            this.population.sort((a, b) => b.fitness - a.fitness);

            const currentBest = this.population[0].fitness;
            this.convergenceHistory.push(currentBest);

            // Check for improvement
            if (currentBest > this.bestFitness) {
                this.bestFitness = currentBest;
                this.stagnationCounter = 0;
            } else {
                this.stagnationCounter++;
                if (this.stagnationCounter >= this.config.stagnationLimit) {
                    break; // Early termination
                }
            }

            // Progress callback
            if (onProgress) {
                onProgress(generation, currentBest);
            }

            // Create next generation
            const nextPopulation: Chromosome[] = [];

            // Elitism: keep best individuals
            const eliteCount = Math.floor(this.config.populationSize * this.config.elitismRate);
            for (let i = 0; i < eliteCount; i++) {
                nextPopulation.push(this.cloneChromosome(this.population[i]));
            }

            // Fill rest with offspring
            while (nextPopulation.length < this.config.populationSize) {
                // Selection
                const parent1 = this.tournamentSelection();
                const parent2 = this.tournamentSelection();

                // Crossover
                let offspring: Chromosome;
                if (Math.random() < this.config.crossoverRate) {
                    offspring = this.crossover(parent1, parent2);
                } else {
                    offspring = this.cloneChromosome(parent1);
                }

                // Mutation
                if (Math.random() < this.config.mutationRate) {
                    this.mutate(offspring);
                }

                // Evaluate fitness
                offspring.fitness = this.evaluateFitness(offspring);

                nextPopulation.push(offspring);
            }

            this.population = nextPopulation;
            generation++;
        }

        // Get best result
        this.population.sort((a, b) => b.fitness - a.fitness);
        const best = this.population[0];

        // Convert to placement result
        const placementResult = this.decodeChromosome(best);

        return {
            bestChromosome: best,
            placedPieces: placementResult.placedPieces,
            unplacedPieces: placementResult.unplacedPieces,
            utilization: placementResult.utilization,
            generations: generation,
            computeTime: performance.now() - startTime,
            convergenceHistory: this.convergenceHistory
        };
    }

    /**
     * Initialize random population
     */
    private initializePopulation(pieces: NestingPiece[]): Chromosome[] {
        const population: Chromosome[] = [];

        // Create list of all instances
        const allInstances: Gene[] = [];
        for (const piece of pieces) {
            for (let i = 0; i < piece.quantity; i++) {
                allInstances.push({
                    partId: piece.id,
                    rotation: this.randomRotation(piece),
                    instanceIndex: i
                });
            }
        }

        for (let i = 0; i < this.config.populationSize; i++) {
            // Random shuffle of instances
            const genes = this.shuffleArray([...allInstances]).map(g => ({
                ...g,
                rotation: this.randomRotation(this.pieces.get(g.partId)!)
            }));

            population.push({ genes, fitness: 0 });
        }

        return population;
    }

    /**
     * Evaluate fitness of a chromosome
     * Higher fitness = better packing
     */
    private evaluateFitness(chromosome: Chromosome): number {
        const result = this.decodeChromosome(chromosome);

        // Primary: utilization percentage
        let fitness = result.utilization;

        // Penalty for unplaced parts
        const totalParts = chromosome.genes.length;
        const placedParts = result.placedPieces.length;
        const placementRate = placedParts / totalParts;

        fitness *= placementRate;

        // Bonus for compactness (parts closer together)
        if (result.placedPieces.length > 1) {
            const bounds = this.getPlacedBounds(result.placedPieces);
            const usedArea = bounds.width * bounds.height;
            const sheetArea = this.sheet.width * this.sheet.height;
            const compactness = 1 - (usedArea / sheetArea);
            fitness += compactness * 10; // Bonus up to 10 points
        }

        return fitness;
    }

    /**
     * Decode chromosome to actual placement
     */
    private decodeChromosome(chromosome: Chromosome): GreedyNestingResult {
        // Convert genes to pieces in order
        const orderedPieces: NestingPiece[] = [];

        for (const gene of chromosome.genes) {
            const original = this.pieces.get(gene.partId);
            if (!original) continue;

            // Create a single-instance piece with specified rotation
            orderedPieces.push({
                ...original,
                quantity: 1,
                rotationSteps: [gene.rotation]
            });
        }

        // Use greedy nesting with the specific order
        return greedyNesting(orderedPieces, this.sheet, 'AREA_DESC');
    }

    /**
     * Tournament selection
     */
    private tournamentSelection(tournamentSize: number = 3): Chromosome {
        let best: Chromosome | null = null;

        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * this.population.length);
            const candidate = this.population[idx];

            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }

        return best!;
    }

    /**
     * Order crossover (OX1)
     */
    private crossover(parent1: Chromosome, parent2: Chromosome): Chromosome {
        const len = parent1.genes.length;

        // Select crossover points
        const start = Math.floor(Math.random() * len);
        const end = start + Math.floor(Math.random() * (len - start));

        // Copy segment from parent1
        const childGenes: (Gene | null)[] = new Array(len).fill(null);

        for (let i = start; i <= end; i++) {
            childGenes[i] = { ...parent1.genes[i] };
        }

        // Fill remaining from parent2 (maintaining order)
        let p2Idx = 0;
        for (let i = 0; i < len; i++) {
            if (childGenes[i] !== null) continue;

            // Find next gene from parent2 not already in child
            while (p2Idx < len) {
                const p2Gene = parent2.genes[p2Idx];
                const alreadyUsed = childGenes.some(g =>
                    g !== null &&
                    g.partId === p2Gene.partId &&
                    g.instanceIndex === p2Gene.instanceIndex
                );

                if (!alreadyUsed) {
                    childGenes[i] = { ...p2Gene };
                    p2Idx++;
                    break;
                }
                p2Idx++;
            }
        }

        return {
            genes: childGenes as Gene[],
            fitness: 0
        };
    }

    /**
     * Mutation operators
     */
    private mutate(chromosome: Chromosome): void {
        const mutationType = Math.random();

        if (mutationType < 0.5) {
            // Swap mutation
            this.swapMutation(chromosome);
        } else {
            // Rotation mutation
            this.rotationMutation(chromosome);
        }
    }

    private swapMutation(chromosome: Chromosome): void {
        const len = chromosome.genes.length;
        const i = Math.floor(Math.random() * len);
        const j = Math.floor(Math.random() * len);

        [chromosome.genes[i], chromosome.genes[j]] = [chromosome.genes[j], chromosome.genes[i]];
    }

    private rotationMutation(chromosome: Chromosome): void {
        const idx = Math.floor(Math.random() * chromosome.genes.length);
        const gene = chromosome.genes[idx];
        const piece = this.pieces.get(gene.partId);

        if (piece && piece.allowRotation) {
            gene.rotation = this.randomRotation(piece);
        }
    }

    /**
     * Helper: get random allowed rotation
     */
    private randomRotation(piece: NestingPiece): number {
        if (!piece.allowRotation) return 0;

        const steps = piece.rotationSteps.length > 0 ? piece.rotationSteps : this.config.rotationSteps;
        return steps[Math.floor(Math.random() * steps.length)];
    }

    /**
     * Helper: shuffle array (Fisher-Yates)
     */
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Helper: clone chromosome
     */
    private cloneChromosome(chromosome: Chromosome): Chromosome {
        return {
            genes: chromosome.genes.map(g => ({ ...g })),
            fitness: chromosome.fitness
        };
    }

    /**
     * Helper: get bounding box of placed pieces
     */
    private getPlacedBounds(placedPieces: PlacedPiece[]): { width: number; height: number } {
        let maxX = 0, maxY = 0;

        for (const piece of placedPieces) {
            const bounds = getBounds(piece.polygon);
            maxX = Math.max(maxX, bounds.maxX);
            maxY = Math.max(maxY, bounds.maxY);
        }

        return { width: maxX, height: maxY };
    }
}

// ============ CONVENIENCE FUNCTIONS ==============

/**
 * Quick nesting with genetic algorithm
 */
export function geneticNesting(
    pieces: NestingPiece[],
    sheet: NestingSheet,
    config?: Partial<GeneticConfig>,
    onProgress?: (gen: number, fitness: number) => void
): GeneticResult {
    const ga = new GeneticNesting(config);
    return ga.evolve(pieces, sheet, onProgress);
}

/**
 * Hybrid nesting: greedy first, then optimize with GA
 */
export function hybridNesting(
    pieces: NestingPiece[],
    sheet: NestingSheet,
    config?: Partial<GeneticConfig>
): GeneticResult {
    // Start with greedy solution
    const greedyResult = greedyNesting(pieces, sheet, 'AREA_DESC');

    // If greedy is good enough (>85%), return it
    if (greedyResult.utilization >= 85 && greedyResult.unplacedPieces.length === 0) {
        return {
            bestChromosome: { genes: [], fitness: greedyResult.utilization },
            placedPieces: greedyResult.placedPieces,
            unplacedPieces: greedyResult.unplacedPieces,
            utilization: greedyResult.utilization,
            generations: 0,
            computeTime: greedyResult.computeTime,
            convergenceHistory: [greedyResult.utilization]
        };
    }

    // Otherwise, optimize with GA
    return geneticNesting(pieces, sheet, config);
}

export default {
    GeneticNesting,
    geneticNesting,
    hybridNesting,
    DEFAULT_GENETIC_CONFIG
};
