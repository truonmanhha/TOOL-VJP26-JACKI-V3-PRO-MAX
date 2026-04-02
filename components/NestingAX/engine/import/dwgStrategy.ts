import { CadEntity } from '../../services/db';
import { AXDrawingDocument } from '../../services/axSceneModel';
import { buildAXDocumentFromCadEntities } from '../../services/axImportAdapter';
import { buildDwgWarnings } from './diagnostics';

export interface AXDwgStrategyResult {
  entities: CadEntity[];
  document: AXDrawingDocument;
  fileType: 'dwg';
  fileName: string;
  importSource: 'backend' | 'local';
  diagnostics?: AXDwgDiagnostics;
}

export interface AXDwgDiagnostics {
  rawDimensionLike?: number;
  emittedDimension?: number;
  typeCounts?: Record<string, number>;
  fieldPresence?: Record<string, number>;
  warnings?: string[];
}

export function buildDwgStrategyResult(
  fileName: string,
  entities: CadEntity[],
  importSource: 'backend' | 'local',
  diagnostics?: AXDwgDiagnostics
): AXDwgStrategyResult {
  const warningSummary = buildDwgWarnings(diagnostics);
  return {
    entities,
    document: buildAXDocumentFromCadEntities(
      entities,
      fileName,
      1,
      diagnostics ? [`DWG diagnostics: ${JSON.stringify(diagnostics)}`, ...warningSummary] : []
    ),
    fileType: 'dwg',
    fileName,
    importSource,
    diagnostics,
  };
}
