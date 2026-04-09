// ============================================================
// VJP26 NESTING AX - NESTING SERVICE
// Professional MaxRects Algorithm like AlphaCAM
// ============================================================

import {
  NestingPart,
  PlacedPart,
  NestingResult,
  NestingSheet,
  NestingSettings,
  MultiSheetResult,
  CuttingReport,
  Rect,
  DEFAULT_NESTING_SETTINGS
} from '../types';

// ============ HELPER FUNCTIONS ============

const generateUUID = (): string => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============ NESTING SERVICE CLASS ============

export class NestingService {
  private settings: NestingSettings;

  constructor(settings: Partial<NestingSettings> = {}) {
    this.settings = { ...DEFAULT_NESTING_SETTINGS, ...settings };
  }

  // ============ MAIN NESTING METHODS ============

  /**
   * Multi-sheet nesting using MaxRects bin packing algorithm
   */
  public calculateMultiSheetNesting(
    sheets: NestingSheet[],
    parts: NestingPart[],
    customSettings?: Partial<NestingSettings>
  ): MultiSheetResult {
    const config = { ...this.settings, ...customSettings };
    
    // 1. Explode parts into individual instances
    const instances = this.explodeParts(parts, config);
    
    // 2. Sort by strategy
    this.sortInstances(instances, config.sortStrategy);
    
    // 3. Place parts across multiple sheets
    const usedSheets: MultiSheetResult['sheets'] = [];
    const unplacedParts: MultiSheetResult['unplacedParts'] = [];
    
    let remainingInstances = [...instances];
    let sheetIndex = 0;
    const maxSheets = 50; // Safety limit
    
    while (remainingInstances.length > 0 && sheetIndex < maxSheets) {
      const template = sheets[0]; // Use first sheet as template
      if (!template) break;
      
      const sheetInstance: NestingSheet = {
        ...template,
        id: `${template.id}-${sheetIndex}`
      };
      
      const { placed, remaining, usedArea } = this.fillSheetMaxRects(
        sheetInstance,
        remainingInstances,
        config
      );
      
      if (placed.length > 0) {
        const sheetArea = sheetInstance.width * sheetInstance.height;
        usedSheets.push({
          sheetId: sheetInstance.id,
          sheetIndex,
          material: sheetInstance.material,
          width: sheetInstance.width,
          height: sheetInstance.height,
          placedParts: placed,
          efficiency: (usedArea / sheetArea) * 100,
          utilization: (usedArea / sheetArea) * 100,
          usedArea
        });
        sheetIndex++;
        remainingInstances = remaining;
      } else {
        // Cannot place remaining parts
        break;
      }
    }
    
    // Track unplaced parts
    remainingInstances.forEach(inst => {
      const existing = unplacedParts.find(u => u.partId === inst.id);
      if (existing) {
        existing.quantity++;
      } else {
        unplacedParts.push({ partId: inst.id, name: inst.label, quantity: 1 });
      }
    });
    
    // Calculate totals
    const totalSheetArea = usedSheets.reduce((sum, s) => sum + s.width * s.height, 0);
    const totalUsedArea = usedSheets.reduce((sum, s) => sum + s.usedArea, 0);
    const wasteArea = totalSheetArea - totalUsedArea;
    const partsPlaced = instances.length - remainingInstances.length;
    
    return {
      sheets: usedSheets,
      totalEfficiency: totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0,
      utilization: totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0,
      totalUsedArea,
      totalSheetArea,
      unplacedParts,
      sheetsUsed: usedSheets.length,
      partsPlaced,
      partsRemaining: remainingInstances.length,
      wasteArea,
      wastePercentage: totalSheetArea > 0 ? (wasteArea / totalSheetArea) * 100 : 0
    };
  }

  /**
   * Single sheet nesting (backward compatible)
   */
  public calculateNesting(
    sheet: NestingSheet,
    parts: NestingPart[],
    gap: number = 5,
    allowRotation: boolean = true
  ): NestingResult {
    const result = this.calculateMultiSheetNesting([sheet], parts, {
      gap,
      allowRotation,
      rotationSteps: allowRotation ? [0, 90] : [0]
    });
    
    return {
      efficiency: result.sheets[0]?.efficiency || 0,
      usedArea: result.totalUsedArea,
      totalArea: sheet.width * sheet.height,
      sheets: result.sheets.map(s => ({
        sheetId: s.sheetId,
        placedParts: s.placedParts
      })),
      unplacedParts: result.unplacedParts.map(u => ({
        partId: u.partId,
        quantity: u.quantity
      }))
    };
  }

  /**
   * Generate cutting report
   */
  public generateCuttingReport(
    parts: NestingPart[],
    result: MultiSheetResult,
    customSettings?: Partial<NestingSettings>
  ): CuttingReport {
    const config = { ...this.settings, ...customSettings };
    
    const partsBreakdown = parts.map(part => {
      const placedCount = result.sheets.reduce(
        (sum, sheet) => sum + sheet.placedParts.filter(p => p.partId === part.id).length,
        0
      );
      return {
        name: part.name || part.label,
        dimensions: `${part.width} x ${part.height}`,
        requested: part.quantity,
        placed: placedCount,
        unplaced: part.quantity - placedCount
      };
    });
    
    return {
      generatedAt: new Date().toISOString(),
      settings: config,
      summary: {
        totalParts: parts.length,
        totalPartInstances: parts.reduce((sum, p) => sum + p.quantity, 0),
        placedInstances: result.sheets.reduce((sum, s) => sum + s.placedParts.length, 0),
        unplacedInstances: result.unplacedParts.reduce((sum, u) => sum + u.quantity, 0),
        sheetsUsed: result.sheetsUsed,
        totalSheetArea: result.totalSheetArea,
        totalUsedArea: result.totalUsedArea,
        wasteArea: result.wasteArea,
        efficiency: result.totalEfficiency
      },
      sheets: result.sheets.map((sheet, idx) => ({
        index: idx + 1,
        sheetId: sheet.sheetId,
        material: sheet.material,
        dimensions: `${sheet.width} x ${sheet.height}`,
        partsCount: sheet.placedParts.length,
        efficiency: sheet.efficiency,
        parts: sheet.placedParts.map(p => ({
          name: p.label,
          dimensions: `${p.width} x ${p.height}`,
          position: `(${Math.round(p.x)}, ${Math.round(p.y)})`,
          rotation: p.rotation,
          mirrored: p.flipped || false
        }))
      })),
      partsBreakdown
    };
  }

  // ============ EXPORT/IMPORT METHODS ============

  public exportNestList(parts: NestingPart[]): string {
    return JSON.stringify({
      version: '2.0',
      exportedAt: new Date().toISOString(),
      parts: parts.map(p => ({
        id: p.id,
        name: p.name,
        label: p.label,
        width: p.width,
        height: p.height,
        quantity: p.quantity,
        priority: p.priority,
        rotationAllowed: p.rotationAllowed,
        rotationStep: p.rotationStep,
        mirror: p.mirror,
        material: p.material,
        thickness: p.thickness
      }))
    }, null, 2);
  }

  public importNestList(jsonString: string): NestingPart[] {
    try {
      const data = JSON.parse(jsonString);
      if (!data.parts || !Array.isArray(data.parts)) {
        throw new Error('Invalid format');
      }
      
      const COLORS = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
        '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'
      ];
      
      return data.parts.map((p: Record<string, unknown>, idx: number) => ({
        id: (p.id as string) || `import-${Date.now()}-${idx}`,
        name: (p.name as string) || `Part ${idx + 1}`,
        label: (p.label as string) || (p.name as string) || `Part ${idx + 1}`,
        width: (p.width as number) || 100,
        height: (p.height as number) || 100,
        quantity: (p.quantity as number) || 1,
        color: COLORS[idx % COLORS.length],
        priority: (p.priority as number) || 3,
        rotationAllowed: p.rotationAllowed !== false,
        enabled: true,
        rotationStep: (p.rotationStep as string) || 'Free',
        mirror: (p.mirror as boolean) || false,
        material: p.material as string,
        thickness: p.thickness as number
      }));
    } catch {
      throw new Error('Invalid JSON format');
    }
  }

  public exportReportToCSV(report: CuttingReport): string {
    const lines: string[] = [];
    
    lines.push('CUTTING LIST REPORT');
    lines.push(`Generated:,${report.generatedAt}`);
    lines.push('');
    lines.push('SUMMARY');
    lines.push(`Total Parts,${report.summary.totalParts}`);
    lines.push(`Total Instances,${report.summary.totalPartInstances}`);
    lines.push(`Placed,${report.summary.placedInstances}`);
    lines.push(`Unplaced,${report.summary.unplacedInstances}`);
    lines.push(`Sheets Used,${report.summary.sheetsUsed}`);
    lines.push(`Efficiency,${report.summary.efficiency.toFixed(2)}%`);
    lines.push(`Waste Area,${report.summary.wasteArea} mm²`);
    lines.push('');
    lines.push('PARTS BREAKDOWN');
    lines.push('Name,Dimensions,Requested,Placed,Unplaced');
    report.partsBreakdown.forEach(p => {
      lines.push(`${p.name},${p.dimensions},${p.requested},${p.placed},${p.unplaced}`);
    });
    
    return lines.join('\n');
  }

  // ============ PRIVATE HELPER METHODS ============

  private explodeParts(parts: NestingPart[], config: NestingSettings) {
    const instances: Array<{
      id: string;
      w: number;
      h: number;
      label: string;
      color: string;
      area: number;
      allowRot: boolean;
      priority: number;
    }> = [];
    
    parts.forEach(part => {
      if (!part.enabled) return;
      
      for (let i = 0; i < part.quantity; i++) {
        instances.push({
          id: part.id,
          w: part.width,
          h: part.height,
          label: part.label || part.name,
          color: part.color,
          area: part.width * part.height,
          allowRot: part.rotationAllowed && config.allowRotation,
          priority: part.priority || 3
        });
      }
    });
    
    return instances;
  }

  private sortInstances(
    instances: Array<{ w: number; h: number; area: number; priority: number }>,
    strategy: NestingSettings['sortStrategy']
  ) {
    instances.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Then by strategy
      switch (strategy) {
        case 'AREA_DESC':
          return b.area - a.area;
        case 'HEIGHT_DESC':
          return Math.max(b.h, b.w) - Math.max(a.h, a.w);
        case 'WIDTH_DESC':
          return Math.max(b.w, b.h) - Math.max(a.w, a.h);
        case 'PERIMETER_DESC':
          return (2 * b.w + 2 * b.h) - (2 * a.w + 2 * a.h);
        case 'ASPECT_RATIO':
          return Math.max(b.w / b.h, b.h / b.w) - Math.max(a.w / a.h, a.h / a.w);
        default:
          return b.area - a.area;
      }
    });
  }

  private fillSheetMaxRects(
    sheet: NestingSheet,
    instances: Array<{
      id: string;
      w: number;
      h: number;
      label: string;
      color: string;
      area: number;
      allowRot: boolean;
      priority: number;
    }>,
    config: NestingSettings
  ): { placed: PlacedPart[]; remaining: typeof instances; usedArea: number } {
    const placed: PlacedPart[] = [];
    const remaining: typeof instances = [];
    let usedArea = 0;
    
    // Initialize free rectangles
    let freeRects: Rect[] = [{
      x: sheet.margin,
      y: sheet.margin,
      w: sheet.width - sheet.margin * 2,
      h: sheet.height - sheet.margin * 2
    }];
    
    for (const item of instances) {
      const placement = this.findBestPlacement(freeRects, item, config);
      
      if (placement) {
        const { rectIndex, rotated, x, y, width, height } = placement;
        
        placed.push({
          uuid: generateUUID(),
          partId: item.id,
          x,
          y,
          width,
          height,
          rotation: rotated ? 90 : 0,
          label: item.label,
          color: item.color
        });
        
        usedArea += item.w * item.h;
        
        // Split free rect and remove used space
        freeRects = this.splitFreeRects(freeRects, rectIndex, {
          x,
          y,
          w: width + config.gap,
          h: height + config.gap
        });
        
        // Prune small free rects
        const minPartSize = Math.min(...instances.map(i => Math.min(i.w, i.h)));
        freeRects = freeRects.filter(r => r.w >= minPartSize && r.h >= minPartSize);
      } else {
        remaining.push(item);
      }
    }
    
    return { placed, remaining, usedArea };
  }

  private findBestPlacement(
    freeRects: Rect[],
    item: { w: number; h: number; allowRot: boolean },
    config: NestingSettings
  ): { rectIndex: number; rotated: boolean; x: number; y: number; width: number; height: number } | null {
    let bestScore = Number.MAX_VALUE;
    let bestResult: ReturnType<typeof this.findBestPlacement> = null;
    
    for (let i = 0; i < freeRects.length; i++) {
      const fr = freeRects[i];
      
      // Try normal orientation
      if (item.w + config.gap <= fr.w && item.h + config.gap <= fr.h) {
        const score = this.calculatePlacementScore(fr, item.w, item.h, config.placementStrategy);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { rectIndex: i, rotated: false, x: fr.x, y: fr.y, width: item.w, height: item.h };
        }
      }
      
      // Try rotated orientation
      if (item.allowRot && item.h + config.gap <= fr.w && item.w + config.gap <= fr.h) {
        const score = this.calculatePlacementScore(fr, item.h, item.w, config.placementStrategy);
        if (score < bestScore) {
          bestScore = score;
          bestResult = { rectIndex: i, rotated: true, x: fr.x, y: fr.y, width: item.h, height: item.w };
        }
      }
    }
    
    return bestResult;
  }

  private calculatePlacementScore(
    freeRect: Rect,
    itemW: number,
    itemH: number,
    strategy: NestingSettings['placementStrategy']
  ): number {
    const leftoverH = freeRect.w - itemW;
    const leftoverV = freeRect.h - itemH;
    
    switch (strategy) {
      case 'BOTTOM_LEFT':
        return freeRect.y * 10000 + freeRect.x;
      case 'BEST_SHORT_SIDE':
        return Math.min(leftoverH, leftoverV);
      case 'BEST_LONG_SIDE':
        return Math.max(leftoverH, leftoverV);
      case 'BEST_AREA':
        return freeRect.w * freeRect.h - itemW * itemH;
      case 'BEST_FIT':
        return leftoverH * leftoverV;
      default:
        return Math.min(leftoverH, leftoverV);
    }
  }

  private splitFreeRects(freeRects: Rect[], usedIndex: number, placedRect: Rect): Rect[] {
    const rect = freeRects[usedIndex];
    const newRects: Rect[] = [];
    
    // Remove the used rect
    const result = freeRects.filter((_, i) => i !== usedIndex);
    
    // Right remainder
    if (rect.x + rect.w > placedRect.x + placedRect.w) {
      newRects.push({
        x: placedRect.x + placedRect.w,
        y: rect.y,
        w: rect.x + rect.w - (placedRect.x + placedRect.w),
        h: rect.h
      });
    }
    
    // Top remainder
    if (rect.y + rect.h > placedRect.y + placedRect.h) {
      newRects.push({
        x: rect.x,
        y: placedRect.y + placedRect.h,
        w: rect.w,
        h: rect.y + rect.h - (placedRect.y + placedRect.h)
      });
    }
    
    return [...result, ...newRects.filter(r => r.w > 10 && r.h > 10)];
  }

  // ============ COLLISION DETECTION ============

  public checkCollision(
    rect1: { x: number; y: number; w: number; h: number },
    rect2: { x: number; y: number; w: number; h: number },
    gap: number = 0
  ): boolean {
    return (
      rect1.x < rect2.x + rect2.w + gap &&
      rect1.x + rect1.w + gap > rect2.x &&
      rect1.y < rect2.y + rect2.h + gap &&
      rect1.y + rect1.h + gap > rect2.y
    );
  }

  public isInsideSheet(
    rect: { x: number; y: number; w: number; h: number },
    sheet: NestingSheet
  ): boolean {
    return (
      rect.x >= sheet.margin &&
      rect.y >= sheet.margin &&
      rect.x + rect.w <= sheet.width - sheet.margin &&
      rect.y + rect.h <= sheet.height - sheet.margin
    );
  }

  public validatePlacement(
    part: PlacedPart,
    allParts: PlacedPart[],
    sheet: NestingSheet,
    gap: number
  ): boolean {
    // Check sheet bounds
    if (!this.isInsideSheet({ x: part.x, y: part.y, w: part.width, h: part.height }, sheet)) {
      return false;
    }
    
    // Check collision with other parts
    for (const other of allParts) {
      if (other.uuid === part.uuid) continue;
      if (this.checkCollision(
        { x: part.x, y: part.y, w: part.width, h: part.height },
        { x: other.x, y: other.y, w: other.width, h: other.height },
        gap
      )) {
        return false;
      }
    }
    
    return true;
  }
}

// Default export instance
export default new NestingService();
