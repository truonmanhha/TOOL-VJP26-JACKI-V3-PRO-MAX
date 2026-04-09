// ============================================================
// VJP26 NESTING - REMNANT (OFFCUT) MANAGER
// Manages leftover pieces from previous jobs
// Auto-suggests remnants for new jobs
// ============================================================

import { Point2D, Polygon, getBounds, absPolygonArea, createRectangle } from './geometry';

// ============ TYPES ==============

export interface Remnant {
    id: string;
    name: string;
    polygon: Polygon;              // Actual shape (may be irregular)
    width: number;                 // Bounding box width
    height: number;                // Bounding box height
    area: number;                  // Actual area
    material: string;
    thickness: number;
    createdAt: Date;
    sourceSheetId?: string;        // Original sheet
    sourceJobId?: string;          // Job that created this
    usageCount: number;            // Times used
    priority: number;              // Higher = use first (FIFO)
    location?: string;             // Storage location
    notes?: string;
}

export interface RemnantSuggestion {
    remnant: Remnant;
    score: number;                 // 0-100, higher = better fit
    reason: string;
    wasteIfUsed: number;           // Estimated waste percentage
}

export interface RemnantDatabase {
    remnants: Remnant[];
    settings: RemnantSettings;
}

export interface RemnantSettings {
    minArea: number;               // Min area to save (mm²)
    minDimension: number;          // Min width/height to save (mm)
    maxAge: number;                // Days before auto-archive
    prioritizeOldest: boolean;     // FIFO ordering
    autoSuggest: boolean;          // Suggest remnants for new jobs
}

export const DEFAULT_REMNANT_SETTINGS: RemnantSettings = {
    minArea: 10000,                // 100x100mm minimum
    minDimension: 50,              // 50mm minimum
    maxAge: 365,                   // 1 year
    prioritizeOldest: true,
    autoSuggest: true
};

// ============ REMNANT MANAGER CLASS ==============

export class RemnantManager {
    private database: RemnantDatabase;
    private storageKey = 'vjp26_remnants';

    constructor() {
        this.database = {
            remnants: [],
            settings: { ...DEFAULT_REMNANT_SETTINGS }
        };
        this.loadFromStorage();
    }

    // ============ CRUD OPERATIONS ==============

    /**
     * Add a new remnant to database
     */
    addRemnant(remnant: Omit<Remnant, 'id' | 'createdAt' | 'usageCount' | 'priority'>): Remnant {
        const bounds = getBounds(remnant.polygon);

        const newRemnant: Remnant = {
            ...remnant,
            id: `remnant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            width: bounds.width,
            height: bounds.height,
            area: absPolygonArea(remnant.polygon),
            createdAt: new Date(),
            usageCount: 0,
            priority: this.database.remnants.length + 1
        };

        // Check if meets minimum requirements
        if (!this.meetsMinimumRequirements(newRemnant)) {
            console.log('Remnant too small, not saving:', newRemnant.name);
            return newRemnant; // Return but don't save
        }

        this.database.remnants.push(newRemnant);
        this.saveToStorage();

        return newRemnant;
    }

    /**
     * Create rectangular remnant (most common case)
     */
    addRectangularRemnant(
        width: number,
        height: number,
        material: string,
        thickness: number,
        name?: string
    ): Remnant {
        return this.addRemnant({
            name: name || `Remnant ${width}x${height}`,
            polygon: createRectangle(width, height),
            width,
            height,
            area: width * height,
            material,
            thickness
        });
    }

    /**
     * Update remnant
     */
    updateRemnant(id: string, updates: Partial<Remnant>): Remnant | null {
        const index = this.database.remnants.findIndex(r => r.id === id);
        if (index === -1) return null;

        this.database.remnants[index] = {
            ...this.database.remnants[index],
            ...updates
        };

        this.saveToStorage();
        return this.database.remnants[index];
    }

    /**
     * Delete remnant
     */
    deleteRemnant(id: string): boolean {
        const index = this.database.remnants.findIndex(r => r.id === id);
        if (index === -1) return false;

        this.database.remnants.splice(index, 1);
        this.saveToStorage();
        return true;
    }

    /**
     * Get all remnants
     */
    getAllRemnants(): Remnant[] {
        return [...this.database.remnants];
    }

    /**
     * Get remnants by material
     */
    getRemnantsByMaterial(material: string): Remnant[] {
        return this.database.remnants.filter(r =>
            r.material.toLowerCase() === material.toLowerCase()
        );
    }

    /**
     * Mark remnant as used (increment usage count)
     */
    markAsUsed(id: string): void {
        const remnant = this.database.remnants.find(r => r.id === id);
        if (remnant) {
            remnant.usageCount++;
            this.saveToStorage();
        }
    }

    // ============ AUTO-SUGGEST ==============

    /**
     * Suggest best remnants for a set of parts
     */
    suggestRemnants(
        totalPartArea: number,
        material: string,
        thickness: number,
        minWidth: number,
        minHeight: number
    ): RemnantSuggestion[] {
        const candidates = this.database.remnants.filter(r =>
            r.material.toLowerCase() === material.toLowerCase() &&
            r.thickness === thickness &&
            r.width >= minWidth &&
            r.height >= minHeight &&
            r.area >= totalPartArea * 0.8  // At least 80% of required area
        );

        const suggestions: RemnantSuggestion[] = candidates.map(remnant => {
            const score = this.calculateFitScore(remnant, totalPartArea, minWidth, minHeight);
            const wasteIfUsed = Math.max(0, ((remnant.area - totalPartArea) / remnant.area) * 100);

            let reason = '';
            if (score >= 80) reason = 'Excellent fit - minimal waste';
            else if (score >= 60) reason = 'Good fit';
            else if (score >= 40) reason = 'Acceptable fit';
            else reason = 'Marginal fit - consider standard sheet';

            return { remnant, score, reason, wasteIfUsed };
        });

        // Sort by score (highest first), then by age (oldest first if FIFO)
        suggestions.sort((a, b) => {
            if (Math.abs(a.score - b.score) > 5) {
                return b.score - a.score;
            }
            if (this.database.settings.prioritizeOldest) {
                return a.remnant.createdAt.getTime() - b.remnant.createdAt.getTime();
            }
            return b.score - a.score;
        });

        return suggestions.slice(0, 5); // Top 5 suggestions
    }

    /**
     * Calculate fit score (0-100)
     */
    private calculateFitScore(
        remnant: Remnant,
        requiredArea: number,
        minWidth: number,
        minHeight: number
    ): number {
        let score = 0;

        // Area efficiency (40 points max)
        const areaRatio = requiredArea / remnant.area;
        if (areaRatio >= 0.9) score += 40;
        else if (areaRatio >= 0.7) score += 30;
        else if (areaRatio >= 0.5) score += 20;
        else score += 10;

        // Size fit (30 points max)
        const widthFit = Math.min(remnant.width / minWidth, 2);
        const heightFit = Math.min(remnant.height / minHeight, 2);
        score += Math.min(30, (widthFit + heightFit) * 10);

        // Age bonus (FIFO - 20 points max)
        if (this.database.settings.prioritizeOldest) {
            const ageInDays = (Date.now() - remnant.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            const ageScore = Math.min(20, ageInDays / 10);
            score += ageScore;
        }

        // Usage bonus (rarely used = higher score, 10 points max)
        const usageScore = Math.max(0, 10 - remnant.usageCount);
        score += usageScore;

        return Math.min(100, Math.round(score));
    }

    // ============ EXTRACTION FROM NESTING RESULT ==============

    /**
     * Extract remnants from a completed nesting job
     */
    extractRemnantsFromJob(
        sheetWidth: number,
        sheetHeight: number,
        material: string,
        thickness: number,
        placedParts: Array<{ x: number; y: number; width: number; height: number }>,
        jobId?: string
    ): Remnant[] {
        const extractedRemnants: Remnant[] = [];

        // Find largest empty region using simple heuristic
        // For now, check for right strip and bottom strip

        // Calculate used bounds
        let maxUsedX = 0;
        let maxUsedY = 0;

        for (const part of placedParts) {
            maxUsedX = Math.max(maxUsedX, part.x + part.width);
            maxUsedY = Math.max(maxUsedY, part.y + part.height);
        }

        // Right strip remnant
        const rightStripWidth = sheetWidth - maxUsedX - 10; // 10mm margin
        if (rightStripWidth >= this.database.settings.minDimension) {
            const rightRemnant = this.addRemnant({
                name: `Right Strip ${Math.round(rightStripWidth)}x${sheetHeight}`,
                polygon: createRectangle(rightStripWidth, sheetHeight, maxUsedX + 5, 0),
                width: rightStripWidth,
                height: sheetHeight,
                area: rightStripWidth * sheetHeight,
                material,
                thickness,
                sourceJobId: jobId
            });
            extractedRemnants.push(rightRemnant);
        }

        // Bottom strip remnant (excluding right strip area)
        const bottomStripHeight = sheetHeight - maxUsedY - 10;
        if (bottomStripHeight >= this.database.settings.minDimension && maxUsedX > 0) {
            const bottomRemnant = this.addRemnant({
                name: `Bottom Strip ${Math.round(maxUsedX)}x${Math.round(bottomStripHeight)}`,
                polygon: createRectangle(maxUsedX, bottomStripHeight, 0, maxUsedY + 5),
                width: maxUsedX,
                height: bottomStripHeight,
                area: maxUsedX * bottomStripHeight,
                material,
                thickness,
                sourceJobId: jobId
            });
            extractedRemnants.push(bottomRemnant);
        }

        return extractedRemnants;
    }

    // ============ UTILITIES ==============

    /**
     * Check if remnant meets minimum requirements
     */
    private meetsMinimumRequirements(remnant: Remnant): boolean {
        const settings = this.database.settings;

        return (
            remnant.area >= settings.minArea &&
            remnant.width >= settings.minDimension &&
            remnant.height >= settings.minDimension
        );
    }

    /**
     * Clean up old remnants
     */
    cleanupOldRemnants(): number {
        const maxAge = this.database.settings.maxAge;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAge);

        const initialCount = this.database.remnants.length;

        this.database.remnants = this.database.remnants.filter(r =>
            r.createdAt >= cutoffDate
        );

        const removed = initialCount - this.database.remnants.length;
        if (removed > 0) {
            this.saveToStorage();
        }

        return removed;
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        totalCount: number;
        totalArea: number;
        byMaterial: Record<string, number>;
        averageAge: number;
    } {
        const remnants = this.database.remnants;

        const totalArea = remnants.reduce((sum, r) => sum + r.area, 0);

        const byMaterial: Record<string, number> = {};
        for (const r of remnants) {
            byMaterial[r.material] = (byMaterial[r.material] || 0) + 1;
        }

        const now = Date.now();
        const avgAge = remnants.length > 0
            ? remnants.reduce((sum, r) => sum + (now - r.createdAt.getTime()), 0) / remnants.length / (1000 * 60 * 60 * 24)
            : 0;

        return {
            totalCount: remnants.length,
            totalArea,
            byMaterial,
            averageAge: Math.round(avgAge)
        };
    }

    // ============ PERSISTENCE ==============

    /**
     * Save to localStorage
     */
    private saveToStorage(): void {
        try {
            const data = JSON.stringify({
                remnants: this.database.remnants.map(r => ({
                    ...r,
                    createdAt: r.createdAt.toISOString()
                })),
                settings: this.database.settings
            });
            localStorage.setItem(this.storageKey, data);
        } catch (e) {
            console.error('Failed to save remnants:', e);
        }
    }

    /**
     * Load from localStorage
     */
    private loadFromStorage(): void {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const parsed = JSON.parse(data);
                this.database = {
                    remnants: parsed.remnants.map((r: any) => ({
                        ...r,
                        createdAt: new Date(r.createdAt)
                    })),
                    settings: { ...DEFAULT_REMNANT_SETTINGS, ...parsed.settings }
                };
            }
        } catch (e) {
            console.error('Failed to load remnants:', e);
        }
    }

    /**
     * Export to JSON
     */
    exportToJSON(): string {
        return JSON.stringify(this.database, null, 2);
    }

    /**
     * Import from JSON
     */
    importFromJSON(json: string): boolean {
        try {
            const data = JSON.parse(json);
            if (data.remnants && Array.isArray(data.remnants)) {
                this.database = {
                    remnants: data.remnants.map((r: any) => ({
                        ...r,
                        createdAt: new Date(r.createdAt)
                    })),
                    settings: { ...DEFAULT_REMNANT_SETTINGS, ...data.settings }
                };
                this.saveToStorage();
                return true;
            }
        } catch (e) {
            console.error('Failed to import remnants:', e);
        }
        return false;
    }

    /**
     * Update settings
     */
    updateSettings(settings: Partial<RemnantSettings>): void {
        this.database.settings = { ...this.database.settings, ...settings };
        this.saveToStorage();
    }

    /**
     * Get settings
     */
    getSettings(): RemnantSettings {
        return { ...this.database.settings };
    }
}

// ============ SINGLETON INSTANCE ==============

export const remnantManager = new RemnantManager();

export default RemnantManager;
