/** Escape a cell for CSV (quotes and commas) */
function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV string from rows (array of objects) and optional headers. */
export function buildCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCell(row[c.key])).join(",")
  ).join("\n");
  return `${header}\n${body}`;
}

/** Trigger download of a blob as a file. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export rows to CSV and download. */
export function exportToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
  filename: string
) {
  const csv = buildCSV(rows, columns);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, filename);
}
