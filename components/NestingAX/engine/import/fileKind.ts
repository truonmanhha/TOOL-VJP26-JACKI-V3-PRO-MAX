export type AXImportFileKind = 'dxf' | 'dwg' | 'svg' | 'unknown';

export function detectAXImportFileKind(fileName: string): AXImportFileKind {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.dxf')) return 'dxf';
  if (lower.endsWith('.dwg')) return 'dwg';
  if (lower.endsWith('.svg')) return 'svg';
  return 'unknown';
}
