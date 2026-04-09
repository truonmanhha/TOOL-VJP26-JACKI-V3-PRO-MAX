import { AXValidationRunResult } from './resultStore';

export interface AXValidationRunRegistry {
  runs: AXValidationRunResult[];
}

export function createAXValidationRunRegistry(runs: AXValidationRunResult[] = []): AXValidationRunRegistry {
  return { runs };
}
