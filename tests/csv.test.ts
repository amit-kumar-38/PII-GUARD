import { describe, expect, it } from 'vitest';
import { CsvParseError, parseCsvContent } from '../src/modules/csv/csvParser.ts';
import { sanitizeCsvDocument } from '../src/modules/csv/csvSanitizer.ts';
import { createPseudonymSession } from '../src/modules/redaction/pseudonymization.ts';

describe('CSV parser and sanitizer', () => {
  it('handles UTF-8 BOM, CRLF, quoted commas, escaped quotes, embedded newlines, empty cells, and leading zeros', () => {
    const csv =
      '\uFEFFid,email,notes\r\n' +
      '00123,amit@example.com,"Quoted, ""escaped""\nmultiline cell"\r\n' +
      '00456,,\r\n';

    const doc = parseCsvContent(csv, { hasHeader: true });
    expect(doc.hasBom).toBe(true);
    expect(doc.lineEnding).toBe('\r\n');
    expect(doc.headers).toEqual(['id', 'email', 'notes']);
    expect(doc.rows).toHaveLength(2);
    expect(doc.rows[0]?.[0]).toBe('00123');

    const session = createPseudonymSession();
    const sanitized = sanitizeCsvDocument(doc, 'PSEUDONYM', session);
    expect(sanitized.sanitizedRows[0]?.[0]).toBe('00123');
    expect(sanitized.sanitizedRows[0]?.[1]).toBe('EMAIL_001');
    expect(sanitized.sanitizedRows[0]?.[2]).toBe('Quoted, "escaped"\nmultiline cell');

    // Round-trip re-parse verification
    const reparsed = parseCsvContent(sanitized.sanitizedCsvText, { hasHeader: true });
    expect(reparsed.headers).toEqual(['id', 'email', 'notes']);
    expect(reparsed.rows).toHaveLength(2);
    expect(reparsed.rows[0]?.[0]).toBe('00123');
    expect(reparsed.rows[0]?.[1]).toBe('EMAIL_001');
    expect(reparsed.rows[1]).toEqual(['00456', '', '']);
  });

  it('supports semicolon-delimited CSV and Unicode surrounding PII', () => {
    const csv = 'user;contact\nJosé 🚀;amit@example.com';
    const doc = parseCsvContent(csv, { hasHeader: true });
    expect(doc.delimiter).toBe(';');

    const sanitized = sanitizeCsvDocument(doc, 'FULL');
    expect(sanitized.sanitizedRows[0]).toEqual(['José 🚀', '[REDACTED]']);
  });

  it('sanitizes PII inside CSV header rows while leaving ordinary headers intact', () => {
    const csv =
      'ticket_id,amit@example.com,ABCDE1234F,notes\n' +
      '00007,amit@example.com,1234 5678 9012,normal note\n' +
      '00008,sara@test.org';

    const doc = parseCsvContent(csv, { hasHeader: true });
    expect(doc.rows).toHaveLength(2);
    expect(doc.rows[0]).toHaveLength(4);
    expect(doc.rows[1]).toHaveLength(2); // varying row length preserved

    const session = createPseudonymSession();
    const sanitized = sanitizeCsvDocument(doc, 'PSEUDONYM', session);

    expect(sanitized.sanitizedHeaders).toEqual([
      'ticket_id',
      'EMAIL_001',
      'PAN_001',
      'notes',
    ]);
    expect(sanitized.sanitizedRows[0]).toEqual([
      '00007',
      'EMAIL_001',
      'AADHAAR_001',
      'normal note',
    ]);
    expect(sanitized.sanitizedRows[1]).toEqual(['00008', 'EMAIL_002']);

    const reparsed = parseCsvContent(sanitized.sanitizedCsvText, { hasHeader: true });
    expect(reparsed.headers).toEqual(['ticket_id', 'EMAIL_001', 'PAN_001', 'notes']);
    expect(reparsed.rows[0]?.[0]).toBe('00007');
    expect(reparsed.rows[1]).toEqual(['00008', 'EMAIL_002']);
  });

  it('throws CsvParseError for empty or malformed unclosed-quote CSV', () => {
    expect(() => parseCsvContent('   ')).toThrow(CsvParseError);
    expect(() => parseCsvContent('a,b\n"unclosed,quote')).toThrow(CsvParseError);
  });
});
