import type { PiiDetection } from '../../types/pii.ts';
import { normalizeIPv6 } from '../validation/ipValidation.ts';

function maskEmail(value: string): string {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0) {
    return '***@***';
  }
  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);
  const maskedLocal = local.length <= 1 ? '*' : `${local[0]}***`;

  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return `${maskedLocal}@***`;
  }
  const firstLabel = domainParts[0] ?? '';
  const tld = domainParts[domainParts.length - 1] ?? '';
  const maskedFirst = firstLabel.length <= 1 ? '*' : `${firstLabel[0]}***`;

  if (domainParts.length === 2) {
    return `${maskedLocal}@${maskedFirst}.${tld}`;
  }

  const hiddenMiddle = domainParts.slice(1, -1).map(() => '***');
  return `${maskedLocal}@${[maskedFirst, ...hiddenMiddle, tld].join('.')}`;
}

/**
 * Masks all digits except the trailing `keepTrailing` digits while preserving
 * original separators (spaces, hyphens, parentheses, plus signs).
 */
function maskDigitsKeepTrailing(value: string, keepTrailing = 4): string {
  const digitIndices: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i]!;
    if (ch >= '0' && ch <= '9') {
      digitIndices.push(i);
    }
  }

  if (digitIndices.length <= keepTrailing) {
    return value.replace(/\d/g, 'X');
  }

  const maskCount = digitIndices.length - keepTrailing;
  const indicesToMask = new Set(digitIndices.slice(0, maskCount));

  let result = '';
  for (let i = 0; i < value.length; i += 1) {
    result += indicesToMask.has(i) ? 'X' : value[i];
  }
  return result;
}

function maskPan(value: string): string {
  if (value.length <= 3) {
    return '*'.repeat(value.length);
  }
  return `${value[0]}${'*'.repeat(value.length - 3)}${value.slice(-2)}`;
}

function maskIp(value: string, subtype?: string): string {
  if (subtype === 'IPv4' || (!value.includes(':') && value.split('.').length === 4)) {
    const octets = value.split('.');
    return `${octets[0] ?? 'XXX'}.${octets[1] ?? 'XXX'}.XXX.XXX`;
  }

  // IPv6: preserve at most first 2 non-empty leading groups; mask remaining groups.
  const expanded = normalizeIPv6(value).split(':');
  const firstTwoZero = expanded[0] === '0000' && expanded[1] === '0000';
  if (firstTwoZero) {
    return 'XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX';
  }
  const origGroups = value.split(':');
  const prefix0 = origGroups[0] && origGroups[0] !== '' ? origGroups[0] : expanded[0];
  const prefix1 =
    origGroups[1] && origGroups[1] !== '' && !origGroups[1].includes('.')
      ? origGroups[1]
      : 'XXXX';
  return `${prefix0}:${prefix1}:XXXX:XXXX:XXXX:XXXX:XXXX:XXXX`;
}

export function applyPartialMask(detection: PiiDetection): string {
  switch (detection.category) {
    case 'EMAIL':
      return maskEmail(detection.value);
    case 'PHONE':
      return maskDigitsKeepTrailing(detection.value, 4);
    case 'CREDIT_CARD':
      return maskDigitsKeepTrailing(detection.value, 4);
    case 'AADHAAR':
      return maskDigitsKeepTrailing(detection.value, 4);
    case 'PAN':
      return maskPan(detection.value);
    case 'IP':
      return maskIp(detection.value, detection.subtype);
  }
}
