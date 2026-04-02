import { AXEngineDocument } from '../scene/types';

export interface AXInsertRelation {
  entityId: string;
  blockName: string;
  nestedInsertCount?: number;
  hasResolvedBlock: boolean;
}

export interface AXAnnotationRelation {
  entityId: string;
  styleName?: string;
  textStyle?: string;
}

export interface AXObjectGraph {
  insertRelations: AXInsertRelation[];
  annotationRelations: AXAnnotationRelation[];
}

export function buildAXObjectGraph(document: AXEngineDocument): AXObjectGraph {
  const insertRelations: AXInsertRelation[] = [];
  const annotationRelations: AXAnnotationRelation[] = [];

  for (const entity of document.entities) {
    if (entity.kind === 'insert') {
      const block = document.blocks.find(candidate => candidate.name === entity.blockName);
      const nestedInsertCount = block
        ? block.entities.filter(child => child.kind === 'insert').length
        : 0;
      insertRelations.push({
        entityId: entity.id,
        blockName: entity.blockName,
        nestedInsertCount,
        hasResolvedBlock: Boolean(block),
      });
    }

    if (entity.kind === 'text') {
      annotationRelations.push({
        entityId: entity.id,
        textStyle: entity.style.textStyle,
      });
    }

    if (entity.kind === 'dimension') {
      annotationRelations.push({
        entityId: entity.id,
        styleName: entity.dimensionStyle,
        textStyle: entity.textStyle,
      });
    }
  }

  return {
    insertRelations,
    annotationRelations,
  };
}
