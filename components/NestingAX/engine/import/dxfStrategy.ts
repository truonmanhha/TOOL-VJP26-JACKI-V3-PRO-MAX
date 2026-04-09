import { CadEntity } from '../../services/db';
import { AXDrawingDocument } from '../../services/axSceneModel';
import { buildAXDocumentFromCadEntities } from '../../services/axImportAdapter';

export interface AXStrategyResult {
  entities: CadEntity[];
  document: AXDrawingDocument;
  fileType: 'dxf' | 'dwg' | 'svg' | 'unknown';
  fileName: string;
  importSource?: 'backend' | 'local';
  diagnostics?: AXDxfDiagnostics;
}

export interface AXDxfDiagnostics {
  unsupportedTypes?: Record<string, number>;
  unsupportedByDomain?: Record<string, number>;
  degradedBySubtype?: Record<string, number>;
  warnings?: string[];
}

export function buildDxfStrategyResult(fileName: string, entities: CadEntity[], diagnostics?: AXDxfDiagnostics): AXStrategyResult {
  return {
    entities,
    document: buildAXDocumentFromCadEntities(entities, fileName, 1, diagnostics?.warnings || []),
    fileType: 'dxf',
    fileName,
    importSource: 'local',
    diagnostics,
  };
}
