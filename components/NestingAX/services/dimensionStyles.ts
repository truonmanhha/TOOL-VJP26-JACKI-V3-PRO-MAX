export interface DimensionStyleDefinition {
  name: string;
  textHeightFactor: number;
  arrowSize: number;
  gap: number;
  textPlacement: 'inside' | 'outside-auto';
  lineColorMode: 'entity' | 'bylayer';
  extOvershoot: number;
  textRotationMode: 'aligned' | 'horizontal';
  textVerticalPlacement: 'centered' | 'above';
  fitMode: 'keep-inside' | 'move-text-first';
  centerMark: boolean;
  textOffsetWorld: number;
}

export type DimensionStyleOverrides = Record<string, Partial<DimensionStyleDefinition>>;

const DEFAULT_DIMENSION_STYLE: DimensionStyleDefinition = {
  name: 'Standard',
  textHeightFactor: 48,
  arrowSize: 10,
  gap: 8,
  textPlacement: 'outside-auto',
  lineColorMode: 'entity',
  extOvershoot: 10,
  textRotationMode: 'aligned',
  textVerticalPlacement: 'centered',
  fitMode: 'move-text-first',
  centerMark: false,
  textOffsetWorld: 1.5,
};

const DIMENSION_STYLE_PRESETS: Record<string, Partial<DimensionStyleDefinition>> = {
  standard: {},
  'iso-25': {
    textHeightFactor: 44,
    arrowSize: 10,
    gap: 8,
    textRotationMode: 'aligned',
    fitMode: 'move-text-first',
  },
  dimmatbang: {
    textHeightFactor: 56,
    arrowSize: 11,
    gap: 10,
    textPlacement: 'outside-auto',
    extOvershoot: 12,
    textRotationMode: 'horizontal',
    textVerticalPlacement: 'above',
    fitMode: 'move-text-first',
    textOffsetWorld: 2.0,
  },
};

export function resolveDimensionStyle(styleName?: string | null): DimensionStyleDefinition {
  const normalized = String(styleName || 'Standard').toLowerCase();
  return {
    ...DEFAULT_DIMENSION_STYLE,
    ...(DIMENSION_STYLE_PRESETS[normalized] || {}),
    name: styleName || 'Standard',
  };
}

export function resolveDimensionStyleWithOverrides(styleName?: string | null, overrides?: DimensionStyleOverrides): DimensionStyleDefinition {
  const base = resolveDimensionStyle(styleName);
  const normalized = String(styleName || 'Standard').toLowerCase();
  return {
    ...base,
    ...(overrides?.[normalized] || {}),
    name: styleName || 'Standard',
  };
}
