import type { PiiDetection } from '../../types/pii.ts';

// Standard Indian PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F).
const PAN_CANDIDATE_REGEX =
  /(?<![\p{L}\p{N}_])([A-Za-z]{5}\d{4}[A-Za-z])(?![\p{L}\p{N}_])/gu;

export function detectPans(text: string): PiiDetection[] {
  const detections: PiiDetection[] = [];
  PAN_CANDIDATE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PAN_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = match[1];
    if (!value) continue;
    const start = match.index;
    const end = start + value.length;
    detections.push({
      id: `PAN:${start}:${end}`,
      category: 'PAN',
      value,
      normalizedValue: value.toUpperCase(),
      start,
      end,
      validationStatus: 'VALID_FORMAT',
      validationNote: 'Format match only (5 letters + 4 digits + 1 letter); not a government verification',
    });
  }

  return detections;
}
