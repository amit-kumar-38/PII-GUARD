import Papa from 'papaparse';
import type { CsvDocument } from '../../types/pii.ts';

export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvParseError';
  }
}

export interface CsvParseOptions {
  hasHeader?: boolean;
  delimiter?: string;
}

const SUPPORTED_DELIMITERS = [',', ';', '\t', '|'] as const;

export function stripUtf8Bom(raw: string): { text: string; hasBom: boolean } {
  if (raw.startsWith('\uFEFF')) {
    return { text: raw.slice(1), hasBom: true };
  }
  return { text: raw, hasBom: false };
}

export function detectLineEnding(text: string): '\r\n' | '\n' {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/**
 * Parses CSV locally using Papa Parse without numeric coercion (preserving leading zeros).
 */
export function parseCsvContent(
  rawInput: string,
  options: CsvParseOptions = {},
): CsvDocument {
  const { hasHeader = true, delimiter } = options;
  const { text, hasBom } = stripUtf8Bom(rawInput);

  if (!text || text.trim().length === 0) {
    throw new CsvParseError('The CSV input is empty.');
  }

  const lineEnding = detectLineEnding(text);
  // Strip single trailing newline so skipEmptyLines: false doesn't invent a phantom trailing empty row,
  // while preserving intentional internal empty rows/cells.
  const normalizedInput = text.endsWith('\r\n')
    ? text.slice(0, -2)
    : text.endsWith('\n')
      ? text.slice(0, -1)
      : text;

  const result = Papa.parse<string[]>(normalizedInput, {
    header: false,
    delimiter: delimiter ?? '',
    delimitersToGuess: [...SUPPORTED_DELIMITERS],
    dynamicTyping: false,
    skipEmptyLines: false,
  });

  // Surface structural quote/syntax errors; ignore UndetectableDelimiter (normal for single-column CSVs).
  const fatalErrors = result.errors.filter((err) => err.type === 'Quotes');
  if (fatalErrors.length > 0) {
    const first = fatalErrors[0]!;
    const rowLabel = typeof first.row === 'number' ? ` at row ${first.row + 1}` : '';
    throw new CsvParseError(`Malformed CSV${rowLabel}: ${first.message}`);
  }

  const allRows = result.data;
  if (allRows.length === 0) {
    throw new CsvParseError('No rows could be parsed from the CSV input.');
  }

  const resolvedDelimiter = result.meta.delimiter || delimiter || ',';

  let headers: string[] | null = null;
  let dataRows: string[][];
  if (hasHeader) {
    headers = allRows[0] ?? [];
    dataRows = allRows.slice(1);
  } else {
    dataRows = allRows;
  }

  const totalCells = dataRows.reduce((acc, row) => acc + row.length, 0);

  return {
    headers,
    rows: dataRows,
    delimiter: resolvedDelimiter,
    hasBom,
    lineEnding,
    totalCells,
  };
}

export function serializeCsvDocument(
  headers: string[] | null,
  rows: string[][],
  delimiter: string,
  lineEnding: '\r\n' | '\n',
  includeBom = false,
): string {
  const combinedRows = headers ? [headers, ...rows] : rows;
  const serialized = Papa.unparse(combinedRows, {
    delimiter,
    newline: lineEnding,
    quoteChar: '"',
    escapeChar: '"',
  });
  return includeBom ? `\uFEFF${serialized}` : serialized;
}
