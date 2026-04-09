export interface AXValidationCheckResult {
  check: string;
  passed: boolean;
  note?: string;
}

export interface AXValidationRunResult {
  sampleId: string;
  passed: boolean;
  checks: AXValidationCheckResult[];
}

export function buildValidationRunResult(sampleId: string, checks: AXValidationCheckResult[]): AXValidationRunResult {
  return {
    sampleId,
    passed: checks.every(check => check.passed),
    checks,
  };
}
