// ============================================================
// DXF API Types — Backend Response Format
// ============================================================

/**
 * Represents a DXF entity returned from the backend API.
 * Maps directly to CAD geometry (points, geometry, layer info).
 */
export interface DxfImportEntity {
  id: string;
  type: string;
  points: [number, number][];
  properties: any;
  is_closed: boolean;
  area: number;
  layer?: string;
}

/**
 * Response from backend DXF upload/parse API.
 * success = true indicates entities were parsed successfully.
 * errors array contains warnings/issues during parsing (non-fatal).
 */
export interface DxfApiResponse {
  success: boolean;
  entities: DxfImportEntity[];
  errors: string[];
}
