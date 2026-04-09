import { AX_VALIDATION_SAMPLE_MATRIX } from './sampleMatrix';
export { runAXValidationSample } from './runner';

export function getAXValidationSamples() {
  return AX_VALIDATION_SAMPLE_MATRIX;
}

export function getAXValidationSamplesByDomain(domain: string) {
  return AX_VALIDATION_SAMPLE_MATRIX.filter(sample => sample.domain === domain);
}
