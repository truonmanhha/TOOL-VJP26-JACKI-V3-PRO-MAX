export interface AXPointerState {
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
}

export interface AXSelectionState {
  selectedIds: Set<string>;
  hoveredId: string | null;
}

export interface AXViewportState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}
