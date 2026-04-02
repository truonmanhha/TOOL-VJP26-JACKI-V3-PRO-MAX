export async function loadImportFileBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}
