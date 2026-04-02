export interface AXXrefRecord {
  id: string;
  name: string;
  path?: string;
  supported: boolean;
  note?: string;
}

export interface AXXrefStore {
  byId: Map<string, AXXrefRecord>;
  allIds: string[];
}

export function createAXXrefRecord(id: string, name: string, path?: string, supported = false, note?: string): AXXrefRecord {
  return { id, name, path, supported, note };
}

export function createAXXrefStore(xrefs: AXXrefRecord[] = []): AXXrefStore {
  const byId = new Map<string, AXXrefRecord>();
  for (const xref of xrefs) {
    byId.set(xref.id, xref);
  }
  return {
    byId,
    allIds: xrefs.map(xref => xref.id),
  };
}
