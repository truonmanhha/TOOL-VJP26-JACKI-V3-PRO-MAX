export function cleanCadImportText(text: string) {
  if (!text) return '';
  return text
    .replace(/\\P/g, ' ')
    .replace(/\\f[^;]+;/g, '')
    .replace(/\\H[^;]+;/g, '')
    .replace(/\\S[^;]+;/g, '')
    .replace(/\\T[^;]+;/g, '')
    .replace(/\\Q[^;]+;/g, '')
    .replace(/\\W[^;]+;/g, '')
    .replace(/\\A[^;]+;/g, '')
    .replace(/\\C[^;]+;/g, '')
    .replace(/\\L|\\l|\\O|\\o/g, '')
    .replace(/[{}]/g, '')
    .trim();
}
