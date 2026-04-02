export interface AXGroupRecord {
  id: string;
  name: string;
  memberIds: string[];
}

export interface AXGroupStore {
  byId: Map<string, AXGroupRecord>;
  allIds: string[];
}

export function createAXGroupRecord(id: string, name: string, memberIds: string[] = []): AXGroupRecord {
  return { id, name, memberIds };
}

export function createAXGroupStore(groups: AXGroupRecord[] = []): AXGroupStore {
  const byId = new Map<string, AXGroupRecord>();
  for (const group of groups) {
    byId.set(group.id, group);
  }
  return {
    byId,
    allIds: groups.map(group => group.id),
  };
}
