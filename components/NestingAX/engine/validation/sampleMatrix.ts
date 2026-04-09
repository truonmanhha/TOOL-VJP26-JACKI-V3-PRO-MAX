export interface AXValidationSample {
  id: string;
  domain: 'dim' | 'text' | 'block' | 'hatch' | 'style' | 'curves' | 'unsupportedVisual' | 'leader';
  fileType: 'dxf' | 'dwg';
  description: string;
  requiredChecks: string[];
}

export const AX_VALIDATION_SAMPLE_MATRIX: AXValidationSample[] = [
  {
    id: 'dim-linear-basic',
    domain: 'dim',
    fileType: 'dxf',
    description: 'Linear dimensions with text override, dimstyle, and measured values',
    requiredChecks: ['entity imported', 'dimension text shown', 'dimstyle applied', 'diagnostics clear'],
  },
  {
    id: 'text-mtext-style',
    domain: 'text',
    fileType: 'dwg',
    description: 'Mixed TEXT and MTEXT with different styles and attachments',
    requiredChecks: ['text imported', 'mtext flagged', 'attachment preserved', 'style visible'],
  },
  {
    id: 'block-nested-insert',
    domain: 'block',
    fileType: 'dwg',
    description: 'Block definitions with nested inserts',
    requiredChecks: ['insert imported', 'block registry populated', 'nested insert counted', 'canvas shows inserts'],
  },
  {
    id: 'hatch-pattern-loop',
    domain: 'hatch',
    fileType: 'dxf',
    description: 'Hatch with loops and explicit pattern metadata',
    requiredChecks: ['hatch imported', 'loops preserved', 'pattern rendered', 'diagnostics clear'],
  },
  {
    id: 'style-layer-block',
    domain: 'style',
    fileType: 'dwg',
    description: 'By-layer, by-block, lineweight, and linetype inheritance',
    requiredChecks: ['layer color respected', 'by-block fallback respected', 'linetype visible', 'lineweight visible'],
  },
  {
    id: 'curves-arc-bulge-ellipse-spline',
    domain: 'curves',
    fileType: 'dwg',
    description: 'Arc, bulge polyline, ellipse, and spline fidelity',
    requiredChecks: ['arc shown', 'bulge shown as curve', 'ellipse shown', 'spline imported'],
  },
  {
    id: 'leader-basic',
    domain: 'leader',
    fileType: 'dwg',
    description: 'Leader/MLeader import and display',
    requiredChecks: ['leader imported', 'leader text preserved', 'leader displayed'],
  },
  {
    id: 'unsupported-visuals',
    domain: 'unsupportedVisual',
    fileType: 'dwg',
    description: 'Image/underlay/wipeout/solid style unsupported visual entities',
    requiredChecks: ['unsupported visual placeholder created', 'diagnostics report subtype'],
  },
];
