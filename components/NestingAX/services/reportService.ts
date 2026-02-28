import { Part, Sheet } from './db';

export interface NestingStats {
  totalSheets: number;
  totalParts: number;
  nestedParts: number;
  unnestedParts: number;
  totalSheetArea: number; // mm2
  totalPartArea: number; // mm2 (nested parts only)
  utilization: number; // %
  scrapArea: number; // mm2
  scrapPercentage: number; // %
  totalCuttingLength: number; // mm (estimated)
}

export const reportService = {
  calculateStats: (parts: Part[], sheets: Sheet[]): NestingStats => {
    const nestedParts = parts.filter(p => p.isNested && p.sheetId);
    
    // Helper to parse dimensions like "3000x1500"
    const parseDim = (dim: string) => {
      const parts = dim.toLowerCase().split('x');
      return {
        w: parseFloat(parts[0]) || 0,
        h: parseFloat(parts[1]) || 0
      };
    };

    let totalSheetArea = 0;
    const usedSheetIds = new Set(nestedParts.map(p => p.sheetId));
    
    // We only count area of sheets that actually have parts on them
    sheets.forEach(s => {
      if (usedSheetIds.has(s.id)) {
        const { w, h } = parseDim(s.dimensions);
        totalSheetArea += w * h;
      }
    });

    let totalPartArea = 0;
    let totalLength = 0;
    nestedParts.forEach(p => {
      const { w, h } = parseDim(p.dimensions);
      totalPartArea += w * h;
      totalLength += (w + h) * 2; // Rough estimation for rect parts
    });

    const scrapArea = Math.max(0, totalSheetArea - totalPartArea);
    const utilization = totalSheetArea > 0 ? (totalPartArea / totalSheetArea) * 100 : 0;
    const scrapPercentage = 100 - utilization;

    return {
      totalSheets: usedSheetIds.size,
      totalParts: parts.length,
      nestedParts: nestedParts.length,
      unnestedParts: parts.length - nestedParts.length,
      totalSheetArea,
      totalPartArea,
      utilization,
      scrapArea,
      scrapPercentage,
      totalCuttingLength: totalLength
    };
  },

  generateReportText: (stats: NestingStats): string => {
    return `
NESTING AX - PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}
------------------------------------------
SUMMARY:
- Total Sheets Used: ${stats.totalSheets}
- Total Parts in Project: ${stats.totalParts}
- Nested Parts: ${stats.nestedParts}
- Unnested Parts: ${stats.unnestedParts}

EFFICIENCY:
- Material Utilization: ${stats.utilization.toFixed(2)}%
- Scrap Percentage: ${stats.scrapPercentage.toFixed(2)}%
- Total Sheet Area: ${(stats.totalSheetArea / 1000000).toFixed(3)} m2
- Total Part Area: ${(stats.totalPartArea / 1000000).toFixed(3)} m2
- Total Scrap Area: ${(stats.scrapArea / 1000000).toFixed(3)} m2

PRODUCTION ESTIMATES:
- Total Cutting Length: ${(stats.totalCuttingLength / 1000).toFixed(2)} meters
------------------------------------------
    `.trim();
  }
};
