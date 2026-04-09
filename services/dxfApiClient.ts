// ============================================================
// DXF API Client — Backend Upload & Parse
// ============================================================

import { DxfApiResponse } from './dxfApiTypes';

/**
 * Upload a DXF (or DWG) file to the backend API for parsing.
 * Attempts to fetch from the Python FastAPI nesting backend.
 * Falls back gracefully if backend is unavailable (returns success: false).
 * 
 * @param file - DXF or DWG file to upload
 * @returns DxfApiResponse with entities and any parse errors/warnings
 */
export async function uploadDxf(file: File): Promise<DxfApiResponse> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const apiUrl = `${(import.meta.env as any).VITE_NESTING_API_URL || 'http://localhost:8000'}/api/dxf/upload`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`[dxfApiClient] Backend returned status ${response.status}`);
      return { success: false, entities: [], errors: [`HTTP ${response.status}`] };
    }

    const data = await response.json() as DxfApiResponse;
    return data;
  } catch (err) {
    console.warn('[dxfApiClient] Upload failed:', err);
    return { success: false, entities: [], errors: [String(err)] };
  }
}
