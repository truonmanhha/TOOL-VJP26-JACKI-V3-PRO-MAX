import { CadEntity } from '../../services/db';
import { buildAXDocumentFromCadEntities } from '../../services/axImportAdapter';
import { AXEngineDocument } from '../scene/types';

function toEngineEntity(entity: any) {
  return {
    ...entity,
    kind: entity.type,
  };
}

export function buildAXEngineDocumentFromCadEntities(entities: CadEntity[], sourceFileName: string): AXEngineDocument {
  const document = buildAXDocumentFromCadEntities(entities, sourceFileName);
  const referencedBlockNames = new Set(
    entities
      .filter(entity => entity.type === 'insert' && entity.properties?.blockName)
      .map(entity => String(entity.properties?.blockName))
  );

  const inferredBlocks = Array.from(referencedBlockNames).map(name => ({
    name,
    entities: [],
  }));

  return {
    version: 1,
    sourceFileName: document.sourceFileName,
    sourceKind: document.sourceKind,
    layers: document.layers,
    blocks: [...document.blocks, ...inferredBlocks].filter((block, index, all) => index === all.findIndex(candidate => candidate.name === block.name)).map(block => ({
      ...block,
      entities: block.entities.map(toEngineEntity),
    })) as AXEngineDocument['blocks'],
    entities: document.entities.map(toEngineEntity) as AXEngineDocument['entities'],
    diagnostics: document.diagnostics,
  };
}
