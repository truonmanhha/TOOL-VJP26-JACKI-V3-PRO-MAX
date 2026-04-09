import { AXEngineDocument, AXEngineEntity, AXEngineLayer } from '../scene/types';

export interface AXEntityStore {
  byId: Map<string, AXEngineEntity>;
  allIds: string[];
}

export interface AXLayerStore {
  byId: Map<string, AXEngineLayer>;
  allIds: string[];
}

export interface AXDiagnosticStore {
  unsupportedTypes: Record<string, number>;
  warnings: string[];
  importedCount: number;
  skippedCount: number;
  importedBlockNames: string[];
}

export interface AXBlockRegistry {
  byName: Map<string, AXEngineDocument['blocks'][number]>;
  allNames: string[];
}

export interface AXDocumentStore {
  sourceFileName: string;
  sourceKind: AXEngineDocument['sourceKind'];
  entities: AXEntityStore;
  layers: AXLayerStore;
  blocks: AXBlockRegistry;
  diagnostics: AXDiagnosticStore;
}

export function buildAXDocumentStore(document: AXEngineDocument): AXDocumentStore {
  const entityMap = new Map<string, AXEngineEntity>();
  const layerMap = new Map<string, AXEngineLayer>();
  const blockMap = new Map<string, AXEngineDocument['blocks'][number]>();

  for (const entity of document.entities) {
    entityMap.set(entity.id, entity);
  }

  for (const layer of document.layers) {
    layerMap.set(layer.id, layer);
  }

  for (const block of document.blocks) {
    blockMap.set(block.name, block);
  }

  return {
    sourceFileName: document.sourceFileName,
    sourceKind: document.sourceKind,
    entities: {
      byId: entityMap,
      allIds: document.entities.map(entity => entity.id),
    },
    layers: {
      byId: layerMap,
      allIds: document.layers.map(layer => layer.id),
    },
    blocks: {
      byName: blockMap,
      allNames: document.blocks.map(block => block.name),
    },
    diagnostics: {
      unsupportedTypes: document.diagnostics.unsupportedTypes,
      warnings: document.diagnostics.warnings,
      importedCount: document.diagnostics.importedCount,
      skippedCount: document.diagnostics.skippedCount,
      importedBlockNames: document.blocks.map(block => block.name),
    },
  };
}
