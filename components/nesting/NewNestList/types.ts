// ============================================================
// NEW NEST LIST TYPES
// Type definitions for nesting parts and sheets
// ============================================================

export interface NestingPart {
  id: string;
  name: string;
  size: { width: number; height: number };
  quantity: number;
  priority: number; // 1 (highest) - 5 (lowest)
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
  rotation: 'none' | '90' | '180' | 'any';
  isSmallPart: boolean;
  kitNumber?: string;
  nestedQuantity?: number;
  geometry?: any; // Vector data from canvas
  thumbnail?: string; // Base64 image preview
}

export interface NestingSheet {
  id: string;
  materialName: string;
  size: { width: number; height: number };
  thickness: number;
  quantity: number;
  geometry?: any; // Vector data from canvas
  thumbnail?: string;
}

export interface PartParameters {
  name: string;
  quantity: number;
  maxPossible: boolean;
  customQty?: number;
  priority: number;
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
  rotation: 'none' | '90' | '180' | 'any';
  isSmallPart: boolean;
  kitNumber?: string;
}

export interface SheetParameters {
  materialName: string;
  size: { width: number; height: number };
  thickness: number;
  quantity: number;
}

export interface NestingResult {
  sheetId: string;
  placements: Array<{
    partId: string;
    position: { x: number; y: number };
    rotation: number;
  }>;
  utilization: number; // Percentage
}
