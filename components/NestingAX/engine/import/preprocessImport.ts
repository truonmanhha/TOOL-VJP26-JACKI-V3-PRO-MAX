import { CadEntity } from '../../services/db';
import { AXEngineDocument } from '../scene/types';
import { buildAXEngineDocumentFromCadEntities } from './buildDocument';
import { axEngineDocumentToLegacyCad } from '../render/toLegacyCad';

export interface AXPreprocessedImport {
  engineDocument: AXEngineDocument;
  legacyEntities: CadEntity[];
}

export function preprocessImportedEntities(entities: CadEntity[], sourceFileName: string): AXPreprocessedImport {
  const engineDocument = buildAXEngineDocumentFromCadEntities(entities, sourceFileName);
  const legacyEntities = axEngineDocumentToLegacyCad(engineDocument);

  return {
    engineDocument,
    legacyEntities,
  };
}
