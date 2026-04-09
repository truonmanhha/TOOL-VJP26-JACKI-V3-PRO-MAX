import { CadEntity } from './db';

export function getCadStrokeColor(entity: CadEntity, isSelected: boolean, isActive: boolean, layerColor?: string) {
  if (isActive) return '#22d3ee';
  if (isSelected) return '#00ff00';

  const rawColor = entity.properties?.color;
  const byBlockColor = entity.properties?.byBlockColor;
  const normalizedColor = String(rawColor || '').trim().toLowerCase();

  if (!rawColor || normalizedColor === 'bylayer') {
    return layerColor || '#ffffff';
  }

  if (normalizedColor === 'byblock') {
    return byBlockColor || layerColor || '#ffffff';
  }

  return rawColor;
}

export function getCadStrokeWidth(entity: CadEntity, isSelected: boolean, isActive: boolean) {
  if (isActive) return 4;
  if (isSelected) return 2;

  const lineWeight = entity.properties?.lineWeight || entity.properties?.lineweight;
  if (typeof lineWeight === 'number' && Number.isFinite(lineWeight)) {
    if (lineWeight >= 0.7) return 2.5;
    if (lineWeight >= 0.35) return 1.5;
  }

  return 1;
}

export function getCadStrokeDasharray(entity: CadEntity) {
  const lineType = String(entity.properties?.lineType || entity.properties?.linetype || '').toLowerCase();
  if (lineType.includes('dashdot')) return '10 4 2 4';
  if (lineType.includes('dash')) return '10 6';
  if (lineType.includes('dot')) return '2 4';
  if (lineType.includes('center')) return '12 4 2 4';
  return undefined;
}
