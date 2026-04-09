const ACI_COLORS: Record<number, string> = {
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF', 5: '#0000FF',
  6: '#FF00FF', 7: '#FFFFFF', 8: '#808080', 9: '#C0C0C0', 10: '#FF0000',
  250: '#333333', 251: '#555555', 252: '#777777', 253: '#999999', 254: '#BBBBBB', 255: '#FFFFFF',
};

export function resolveCadImportColor(ent: any, dxf?: any): string {
  let index = ent.color !== undefined ? ent.color : 256;
  if (index === 256 && dxf?.tables?.layers && ent.layer) {
    const layerData = dxf.tables.layers[ent.layer];
    if (layerData && layerData.color !== undefined) index = layerData.color;
  }
  if (index === 0) return '#FFFFFF';
  if (ACI_COLORS[index]) return ACI_COLORS[index];
  if (ent.rgbColor !== undefined) return `#${ent.rgbColor.toString(16).padStart(6, '0')}`;
  return '#FFFFFF';
}
