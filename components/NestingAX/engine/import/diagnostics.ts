import { AXDxfDiagnostics } from './dxfStrategy';
import { AXDwgDiagnostics } from './dwgStrategy';

export function buildDxfWarnings(diagnostics?: AXDxfDiagnostics) {
  if (!diagnostics) return [];
  return [...(diagnostics.warnings || [])];
}

export function buildDwgWarnings(diagnostics?: AXDwgDiagnostics) {
  if (!diagnostics) return [];

  const warnings = [...(diagnostics.warnings || [])];

  if ((diagnostics.rawDimensionLike || 0) > 0 && (diagnostics.emittedDimension || 0) === 0) {
    warnings.push('DWG dimensions detected but none emitted into AX entities.');
  }

  return warnings;
}
