import { AXValidationSample } from './sampleMatrix';
import { AXValidationCheckResult, AXValidationRunResult, buildValidationRunResult } from './resultStore';

export function runAXValidationSample(
  sample: AXValidationSample,
  answers: Partial<Record<string, boolean>>,
  notes: Partial<Record<string, string>> = {}
): AXValidationRunResult {
  const checks: AXValidationCheckResult[] = sample.requiredChecks.map(check => ({
    check,
    passed: Boolean(answers[check]),
    note: notes[check],
  }));

  return buildValidationRunResult(sample.id, checks);
}
