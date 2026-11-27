import { describe, expect, it } from 'vitest';
import { parseCsvContent } from '../src/modules/csv/csvParser.ts';
import { sanitizeCsvDocument } from '../src/modules/csv/csvSanitizer.ts';
import { detectPii } from '../src/modules/detection/detectionEngine.ts';
import { createPseudonymSession } from '../src/modules/redaction/pseudonymization.ts';
import { redactText } from '../src/modules/redaction/redactionEngine.ts';
import {
  MAX_FILE_SIZE_BYTES,
  buildSanitizedDownloadFilename,
  readLocalFileText,
  validateUploadedFile,
} from '../src/modules/security/privacyGuard.ts';

describe('File handling & edge-case resilience', () => {
  it('rejects empty files, oversized files, and unsupported extensions', () => {
    const emptyTxt = new File([''], 'empty.txt', { type: 'text/plain' });
    expect(() => validateUploadedFile(emptyTxt)).toThrow(/empty/i);

    const badExt = new File(['abc'], 'archive.zip', { type: 'application/zip' });
    expect(() => validateUploadedFile(badExt)).toThrow(/Unsupported file type/i);

    const oversized = {
      name: 'huge.csv',
      size: MAX_FILE_SIZE_BYTES + 1,
    } as File;
    expect(() => validateUploadedFile(oversized)).toThrow(/safety limit/i);
  });

  it('strips UTF-8 BOM from .txt uploads and rejects whitespace-only files', async () => {
    const bomTxt = new File(['\uFEFFEmail: user@example.com'], 'notes.txt', {
      type: 'text/plain',
    });
    const result = await readLocalFileText(bomTxt);
    expect(result.extension).toBe('txt');
    expect(result.text).toBe('Email: user@example.com');

    const wsTxt = new File(['   \r\n\t  '], 'blank.txt', { type: 'text/plain' });
    await expect(readLocalFileText(wsTxt)).rejects.toThrow(/only whitespace/i);
  });

  it('generates safe sanitized download filenames preserving .txt and .csv extensions', () => {
    expect(buildSanitizedDownloadFilename('support logs (final).txt', 'txt')).toBe(
      'support_logs_final.sanitized.txt',
    );
    expect(buildSanitizedDownloadFilename('users.csv', 'csv')).toBe(
      'users.sanitized.csv',
    );
    expect(buildSanitizedDownloadFilename(null, 'text')).toBe(
      'sanitized-document.sanitized.txt',
    );
  });

  it('handles tab/pipe delimited CSVs and varying row lengths safely', () => {
    const tsv = 'id\temail\tnote\n007\tdev@example.org\n008\tops@example.org\textra';
    const doc = parseCsvContent(tsv, { hasHeader: true });
    expect(doc.delimiter).toBe('\t');
    expect(doc.rows).toHaveLength(2);
    expect(doc.rows[0]).toHaveLength(2);
    expect(doc.rows[1]).toHaveLength(3);

    const out = sanitizeCsvDocument(doc, 'PSEUDONYM', createPseudonymSession());
    expect(out.sanitizedRows[0]?.[0]).toBe('007');
    expect(out.sanitizedRows[0]?.[1]).toBe('EMAIL_001');
    expect(out.sanitizedRows[1]?.[1]).toBe('EMAIL_002');
  });

  it('preserves Unicode and emojis surrounding PII without character drift', () => {
    const text = '🔒 Café Contact: user.test@example.com — PAN: ABCDE1234F ✅ IP: 10.20.30.40';
    const scan = detectPii(text);
    expect(scan.totalOccurrences).toBe(3);

    const redacted = redactText(text, scan.detections, 'FULL');
    expect(redacted.sanitizedText).toBe(
      '🔒 Café Contact: [REDACTED] — PAN: [REDACTED] ✅ IP: [REDACTED]',
    );
  });
});
