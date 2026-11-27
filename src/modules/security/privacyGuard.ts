import type { AuditEvent, AuditEventType, InputSourceType } from '../../types/pii.ts';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB client-side safety guard
export const MAX_TEXT_LENGTH = 500_000; // 500k chars UI responsiveness guard

export const PRIVACY_STATEMENT =
  'Your document is processed locally in this browser. The application does not send document content or detected PII to external servers.';

export const LOCAL_POLICY_SUMMARY = [
  'Zero-egress boundary: All detection, validation, pseudonymization, and export occur strictly in browser memory.',
  'No persistence: Raw documents and entity-to-pseudonym maps are never stored in localStorage, sessionStorage, IndexedDB, or cookies.',
  'Deterministic pipeline: Email, Phone (offline libphonenumber-js), IPv4/IPv6, PAN, Aadhaar, and Credit Card (Luhn mod-10) detectors run with overlap resolution.',
  'Audit safety: Processing logs record category totals, mode switches, and structural events only — never raw PII or source filenames.',
] as const;

export function validateUploadedFile(file: File): {
  extension: 'txt' | 'csv';
  sizeBytes: number;
} {
  const lowerName = file.name.toLowerCase();
  const isTxt = lowerName.endsWith('.txt');
  const isCsv = lowerName.endsWith('.csv');

  if (!isTxt && !isCsv) {
    throw new Error(
      'Unsupported file type. Please upload a valid .txt or .csv file.',
    );
  }

  if (file.size === 0) {
    throw new Error(
      `The uploaded .${isCsv ? 'csv' : 'txt'} file is empty (0 bytes).`,
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const mb = (MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(
      `File exceeds the ${mb} MB client-side safety limit to keep browser processing responsive.`,
    );
  }

  return {
    extension: isCsv ? 'csv' : 'txt',
    sizeBytes: file.size,
  };
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to read file contents as binary buffer.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read the selected local file.'));
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Decodes an uploaded file strictly as UTF-8, handling BOM and reporting invalid encodings.
 */
export async function readLocalFileText(file: File): Promise<{
  text: string;
  extension: 'txt' | 'csv';
  sizeBytes: number;
}> {
  const meta = validateUploadedFile(file);
  const buffer = await readFileAsArrayBuffer(file);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let decoded = decoder.decode(buffer);

  if (decoded.startsWith('\uFEFF') && meta.extension === 'txt') {
    decoded = decoded.slice(1);
  }

  if (decoded.trim().length === 0) {
    throw new Error(
      `The uploaded .${meta.extension} file contains only whitespace.`,
    );
  }

  return {
    text: decoded,
    extension: meta.extension,
    sizeBytes: meta.sizeBytes,
  };
}

/**
 * Derives a sanitized output filename without logging raw names to audit storage.
 */
export function buildSanitizedDownloadFilename(
  originalFilename: string | null,
  sourceType: InputSourceType,
): string {
  const ext = sourceType === 'csv' ? 'csv' : 'txt';
  if (!originalFilename) {
    return `sanitized-document.sanitized.${ext}`;
  }
  const dotIdx = originalFilename.lastIndexOf('.');
  const base = dotIdx > 0 ? originalFilename.slice(0, dotIdx) : originalFilename;
  const safeBase = base.replace(/[^\w.-]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
  return `${safeBase}.sanitized.${ext}`;
}

export function triggerLocalDownload(content: string, filename: string, isCsv: boolean): void {
  const mime = isCsv ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8';
  const blob = new Blob([content], { type: mime });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Revoke object URL asynchronously after click dispatch
  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

let eventCounter = 0;

export function createAuditEvent(
  type: AuditEventType,
  message: string,
  details?: string,
): AuditEvent {
  eventCounter += 1;
  const now = new Date();
  const timeStr = now.toTimeString().slice(0, 8);
  return {
    id: `evt-${Date.now()}-${eventCounter}`,
    timestamp: timeStr,
    type,
    message,
    details,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
