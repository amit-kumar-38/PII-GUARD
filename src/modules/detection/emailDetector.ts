import type { PiiDetection } from '../../types/pii.ts';

// Bounded regex preventing catastrophic backtracking while permitting trailing sentence punctuation.
const EMAIL_CANDIDATE_REGEX =
  /(?<![\p{L}\p{N}_%+-]|\d\.)([A-Za-z0-9](?:[A-Za-z0-9._%+-]{0,62}[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24})(?![\p{L}\p{N}_%+-]|\.[A-Za-z0-9])/gu;

export function isValidEmailCandidate(email: string): boolean {
  if (email.length > 254) {
    return false;
  }
  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@')) {
    return false;
  }
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (local.length > 64 || local.includes('..') || domain.includes('..')) {
    return false;
  }
  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }
  const tld = labels[labels.length - 1] ?? '';
  return /^[A-Za-z]{2,24}$/.test(tld);
}

export function detectEmails(text: string): PiiDetection[] {
  const detections: PiiDetection[] = [];
  EMAIL_CANDIDATE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = EMAIL_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = match[1];
    if (!value || !isValidEmailCandidate(value)) {
      continue;
    }
    const start = match.index;
    const end = start + value.length;
    detections.push({
      id: `EMAIL:${start}:${end}`,
      category: 'EMAIL',
      value,
      normalizedValue: value.toLowerCase(),
      start,
      end,
      validationStatus: 'VALID_FORMAT',
      validationNote: 'RFC-style email format validated locally',
    });
  }

  return detections;
}
