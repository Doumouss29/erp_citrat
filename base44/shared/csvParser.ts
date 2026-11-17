// Simple CSV parser handling quoted fields, embedded commas, and escaped quotes.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        row.push(field);
        field = "";
        i++;
      } else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i++;
        row.push(field);
        field = "";
        if (row.some((f) => f !== "")) rows.push(row);
        row = [];
        i++;
      } else {
        field += char;
        i++;
      }
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f !== "")) rows.push(row);
  }

  return rows;
}

export function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (row[i] !== undefined ? row[i] : "").trim();
    });
    return obj;
  });
}

export function parseJSON(value: string): any {
  if (!value || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function toBool(value: string): boolean {
  return value === "true" || value === "True" || value === "TRUE" || value === "1";
}

export function toNum(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}

export function cleanStr(value: string | undefined): string | undefined {
  if (!value || value.trim() === "") return undefined;
  return value.trim();
}

export function enumVal(value: string, validValues: string[], defaultVal?: string): string | undefined {
  if (!value || value.trim() === "") return undefined;
  const v = value.trim();
  return validValues.includes(v) ? v : defaultVal;
}