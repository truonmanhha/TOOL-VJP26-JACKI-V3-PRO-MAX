import { CadEntity } from '../../services/db';
import { AXDrawingDocument } from '../../services/axSceneModel';
import { buildAXDocumentFromCadEntities } from '../../services/axImportAdapter';

export interface AXUnknownStrategyResult {
  entities: CadEntity[];
  document: AXDrawingDocument;
  fileType: 'unknown';
  fileName: string;
  importSource?: 'local';
  diagnostics?: unknown;
}

export function buildUnknownStrategyResult(fileName: string): AXUnknownStrategyResult {
  return {
    entities: [],
    document: buildAXDocumentFromCadEntities([], fileName),
    fileType: 'unknown',
    fileName,
    importSource: 'local',
  };
}
