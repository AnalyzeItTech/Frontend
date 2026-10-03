/** Save a Blob as a file from the browser. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** CSV with a UTF-8 BOM so Excel opens non-ASCII text correctly. */
export function downloadCsv(csv: string, filename: string): void {
  downloadBlob(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }), filename);
}
