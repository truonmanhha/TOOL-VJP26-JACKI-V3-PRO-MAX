export interface AXKnownDegradation {
  domain: string;
  issue: string;
}

export const AX_KNOWN_DEGRADATIONS: AXKnownDegradation[] = [
  { domain: 'text', issue: 'MTEXT is preserved semantically but not yet rendered with full paragraph/formatting behavior.' },
  { domain: 'block', issue: 'Block registry exists, but nested block behavior is not yet complete.' },
  { domain: 'hatch', issue: 'Hatch renderer is active, but hatch domain fidelity is not yet complete.' },
  { domain: 'xref', issue: 'XREF engine scaffolding exists, but functional xref support is not yet implemented.' },
  { domain: 'group', issue: 'GROUP scaffolding exists, but group semantics are not yet active in runtime behavior.' },
];
