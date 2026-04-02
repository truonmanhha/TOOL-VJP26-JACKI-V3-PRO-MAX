export function getCadAnnotationScale(pixelsPerUnit: number, worldHeight?: number) {
  const modelHeight = typeof worldHeight === 'number' && worldHeight > 0 ? worldHeight : 2.5;
  return modelHeight * pixelsPerUnit;
}

export function getCadDimensionText(value: unknown, unit?: string, explicitText?: string) {
  if (typeof explicitText === 'string' && explicitText.trim().length > 0) {
    return explicitText;
  }

  const safeUnit = unit || 'mm';
  return `${value ?? 0} ${safeUnit}`;
}

export function getCadTextWidthEstimate(text: string, fontPx: number) {
  return text.length * fontPx * 0.6;
}
