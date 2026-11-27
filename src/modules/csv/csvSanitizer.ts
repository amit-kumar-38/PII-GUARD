import type {
  CategoryPolicyMap,
  CsvCellScan,
  CsvColumnProfile,
  CsvDocument,
  CsvSanitizationResult,
  PiiDetection,
  PseudonymSession,
  RedactionMode,
} from '../../types/pii.ts';
import { createEmptyCounts, detectPii, summarizeDetections } from '../detection/detectionEngine.ts';
import { createPseudonymSession } from '../redaction/pseudonymization.ts';
import { redactText } from '../redaction/redactionEngine.ts';
import { serializeCsvDocument } from './csvParser.ts';

/**
 * Scans and sanitizes every cell (including headers) in a parsed CSV document while
 * preserving column/row counts, delimiters, line endings, leading zeros, and valid CSV quoting.
 */
export function sanitizeCsvDocument(
  document: CsvDocument,
  mode: RedactionMode,
  session: PseudonymSession = createPseudonymSession(),
  categoryPolicies?: CategoryPolicyMap,
): CsvSanitizationResult {
  const headerScans: CsvCellScan[] = [];
  const cellScans: CsvCellScan[] = [];
  const allDetections: PiiDetection[] = [];
  let rejectedCards = 0;
  let rejectedIps = 0;

  const sanitizedHeaders: string[] | null = document.headers
    ? document.headers.map((headerValue, colIndex) => {
        const scan = detectPii(headerValue);
        rejectedCards += scan.rejectedCardCandidates;
        rejectedIps += scan.rejectedIpCandidates;
        allDetections.push(...scan.detections);

        const redacted = redactText(
          headerValue,
          scan.detections,
          mode,
          session,
          categoryPolicies,
        );
        headerScans.push({
          rowIndex: -1,
          colIndex,
          original: headerValue,
          sanitized: redacted.sanitizedText,
          detections: scan.detections,
        });

        return redacted.sanitizedText;
      })
    : null;

  const sanitizedRows: string[][] = document.rows.map((row, rowIndex) =>
    row.map((cellValue, colIndex) => {
      const scan = detectPii(cellValue);
      rejectedCards += scan.rejectedCardCandidates;
      rejectedIps += scan.rejectedIpCandidates;
      allDetections.push(...scan.detections);

      const redacted = redactText(
        cellValue,
        scan.detections,
        mode,
        session,
        categoryPolicies,
      );
      cellScans.push({
        rowIndex,
        colIndex,
        original: cellValue,
        sanitized: redacted.sanitizedText,
        detections: scan.detections,
      });

      return redacted.sanitizedText;
    }),
  );

  const sanitizedCsvText = serializeCsvDocument(
    sanitizedHeaders,
    sanitizedRows,
    document.delimiter,
    document.lineEnding,
    document.hasBom,
  );

  const summary = summarizeDetections(allDetections, rejectedCards, rejectedIps);

  return {
    document,
    sanitizedRows,
    sanitizedHeaders,
    sanitizedCsvText,
    headerScans,
    cellScans,
    summary,
  };
}

/**
 * Derives privacy-safe column-level detection statistics directly from scanned CSV cells.
 * Uses sanitized header labels so PII inside headers is never echoed unmasked.
 */
export function buildCsvColumnProfiles(
  result: CsvSanitizationResult,
): CsvColumnProfile[] {
  const maxCols = Math.max(
    result.sanitizedHeaders?.length ?? 0,
    ...result.document.rows.map((r) => r.length),
  );

  const profiles: CsvColumnProfile[] = [];
  for (let col = 0; col < maxCols; col += 1) {
    const headerName =
      result.sanitizedHeaders?.[col] || `Column ${col + 1}`;
    const counts = createEmptyCounts();
    let total = 0;

    const headerScan = result.headerScans[col];
    if (headerScan) {
      for (const det of headerScan.detections) {
        counts[det.category] += 1;
        total += 1;
      }
    }

    for (const scan of result.cellScans) {
      if (scan.colIndex === col) {
        for (const det of scan.detections) {
          counts[det.category] += 1;
          total += 1;
        }
      }
    }

    profiles.push({
      colIndex: col,
      headerName,
      rowCount: result.document.rows.length,
      detectionCount: total,
      categoryCounts: counts,
    });
  }

  return profiles;
}
