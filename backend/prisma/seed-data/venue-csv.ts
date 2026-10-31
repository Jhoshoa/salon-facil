import { readFileSync } from 'fs';

// Reading of the researched venues CSV, shared by the script that imports it
// (seed-bolivia-venues.ts) and the one that undoes that import (delete-imported-venues.ts).

// Venues whose own website we found while researching (docs/research -- see the yellow-highlighted
// rows in the companion locales_bolivia.html viewer) are deliberately excluded: those get
// contacted separately, not auto-created with placeholder data that would undersell a local that
// already has a real page.
const SITIOS_PROPIOS = [
  'ledome.com.bo',
  'losjardines.com',
  'emperador.com.bo',
  'curichidelcocodrilo',
];

export interface VenueRow {
  nombre_local: string;
  departamento: string;
  ciudad: string;
  telefono: string;
  facebook: string;
  tiktok: string;
  otra_referencia: string;
  fuente: string;
  notas: string;
}

/** Small RFC4180-aware CSV parser (quoted fields, embedded commas/newlines, "" as an escaped
 * quote) -- the file was written by Python's csv module with QUOTE_MINIMAL, so this only needs
 * to handle that shape, not a general-purpose CSV dialect. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (char === '\r') {
      i += 1;
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += char;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== '');
}

export function readVenueRows(csvPath: string): VenueRow[] {
  const raw = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');
  const rows = parseCsv(raw);
  const [header, ...dataRows] = rows;

  return dataRows.map((cols) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cols[index] ?? '').trim();
    });
    return record as unknown as VenueRow;
  });
}

export function tieneWebPropia(row: VenueRow): boolean {
  const texto = [row.facebook, row.tiktok, row.otra_referencia, row.fuente].join(' ').toLowerCase();
  return SITIOS_PROPIOS.some((dominio) => texto.includes(dominio));
}
