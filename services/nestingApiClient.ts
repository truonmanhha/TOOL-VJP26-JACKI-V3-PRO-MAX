// ============================================================
// NESTING API CLIENT
// Frontend service to communicate with Python backend
// ============================================================

import { NestingPart, NestingSheet, NestingResult } from '../components/nesting/NewNestList/types';
import { NestingSettings } from '../components/nesting/NewNestList/AdvancedSettingsDialog';

const API_BASE_URL = import.meta.env.VITE_NESTING_API_URL || 'http://localhost:8000';

// ============================================================
// TYPE CONVERSIONS
// ============================================================

interface Point {
  x: number;
  y: number;
}

interface Polygon {
  points: Point[];
}

interface ApiPart {
  id: string;
  name: string;
  polygon: Polygon;
  quantity: number;
  priority: number;
  rotation_allowed: boolean;
  symmetry: 'none' | 'horizontal' | 'vertical' | 'both';
}

interface ApiSheet {
  id: string;
  name: string;
  polygon: Polygon;
  thickness: number;
  quantity: number;
}

interface ApiSettings {
  algorithm: 'rectangular' | 'true-shape' | 'vero';
  spacing: number;
  margin: number;
  start_corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  allow_rotation: boolean;
}

interface ApiNestingRequest {
  parts: ApiPart[];
  sheets: ApiSheet[];
  settings: ApiSettings;
}

interface ApiPlacement {
  part_id: string;
  position: Point;
  rotation: number;
  sheet_id: string;
}

interface ApiNestingResult {
  job_id: string;
  placements: ApiPlacement[];
  utilization: number;
  processing_time: number;
  sheets_used: number;
}

// ============================================================
// CONVERSION HELPERS
// ============================================================

/**
 * Convert frontend Part to API Part format
 */
function convertPartToApi(part: NestingPart): ApiPart {
  // Extract polygon from geometry
  // TODO: Implement actual geometry extraction from Fabric.js objects
  const polygon: Polygon = {
    points: [
      { x: 0, y: 0 },
      { x: part.size.width, y: 0 },
      { x: part.size.width, y: part.size.height },
      { x: 0, y: part.size.height }
    ]
  };

  return {
    id: part.id,
    name: part.name,
    polygon,
    quantity: part.quantity,
    priority: part.priority,
    rotation_allowed: part.rotation !== 'none',
    symmetry: part.symmetry
  };
}

/**
 * Convert frontend Sheet to API Sheet format
 */
function convertSheetToApi(sheet: NestingSheet): ApiSheet {
  // Extract polygon from geometry
  const polygon: Polygon = {
    points: [
      { x: 0, y: 0 },
      { x: sheet.size.width, y: 0 },
      { x: sheet.size.width, y: sheet.size.height },
      { x: 0, y: sheet.size.height }
    ]
  };

  return {
    id: sheet.id,
    name: sheet.materialName,
    polygon,
    thickness: sheet.thickness,
    quantity: sheet.quantity
  };
}

/**
 * Convert frontend Settings to API Settings format
 */
function convertSettingsToApi(settings: NestingSettings): ApiSettings {
  return {
    algorithm: settings.algorithm,
    spacing: settings.spacing,
    margin: settings.margin,
    start_corner: settings.startCorner,
    allow_rotation: settings.allowRotation
  };
}

/**
 * Convert API result to frontend result format
 */
function convertResultFromApi(apiResult: ApiNestingResult): NestingResult {
  return {
    sheetId: apiResult.placements[0]?.sheet_id || '',
    placements: apiResult.placements.map(p => ({
      partId: p.part_id,
      position: { x: p.position.x, y: p.position.y },
      rotation: p.rotation
    })),
    utilization: apiResult.utilization
  };
}

// ============================================================
// API FUNCTIONS
// ============================================================

/**
 * Calculate nesting layout
 */
export async function calculateNesting(
  parts: NestingPart[],
  sheets: NestingSheet[],
  settings: NestingSettings
): Promise<NestingResult> {
  try {
    const request: ApiNestingRequest = {
      parts: parts.map(convertPartToApi),
      sheets: sheets.map(convertSheetToApi),
      settings: convertSettingsToApi(settings)
    };

    const response = await fetch(`${API_BASE_URL}/api/nesting/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Nesting calculation failed');
    }

    const apiResult: ApiNestingResult = await response.json();
    return convertResultFromApi(apiResult);

  } catch (error) {
    console.error('Nesting API error:', error);
    throw error;
  }
}

/**
 * Get quick preview (faster but less optimal)
 */
export async function previewNesting(
  parts: NestingPart[],
  sheets: NestingSheet[],
  settings: NestingSettings
): Promise<NestingResult> {
  try {
    const request: ApiNestingRequest = {
      parts: parts.map(convertPartToApi),
      sheets: sheets.map(convertSheetToApi),
      settings: convertSettingsToApi(settings)
    };

    const response = await fetch(`${API_BASE_URL}/api/nesting/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Preview failed');
    }

    const apiResult: ApiNestingResult = await response.json();
    return convertResultFromApi(apiResult);

  } catch (error) {
    console.error('Preview API error:', error);
    throw error;
  }
}

/**
 * Check if backend API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET'
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default {
  calculateNesting,
  previewNesting,
  checkApiHealth
};
