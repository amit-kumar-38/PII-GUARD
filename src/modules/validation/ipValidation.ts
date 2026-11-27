/**
 * Validates strict dotted-quad IPv4 format: exactly 4 octets, 0..255, no leading zeros.
 */
export function isValidIPv4(candidate: string): boolean {
  const parts = candidate.split('.');
  if (parts.length !== 4) {
    return false;
  }

  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return false;
    }
    if (part.length > 1 && part.startsWith('0')) {
      return false;
    }
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return false;
    }
  }

  return true;
}

/**
 * Validates RFC 4291 IPv6 representations (full, compressed with `::`, and IPv4-mapped).
 * Requires at least one hexadecimal digit so bare `::` operators in prose are ignored.
 */
export function isValidIPv6(candidate: string): boolean {
  if (!candidate.includes(':') || !/[0-9a-fA-F]/.test(candidate)) {
    return false;
  }
  if (candidate.includes(':::')) {
    return false;
  }

  const doubleColonParts = candidate.split('::');
  if (doubleColonParts.length > 2) {
    return false;
  }

  const hasCompression = doubleColonParts.length === 2;
  const leftRaw = doubleColonParts[0] ?? '';
  const rightRaw = doubleColonParts[1] ?? '';

  // Reject single leading or trailing colon when not part of `::`
  if (!hasCompression && (candidate.startsWith(':') || candidate.endsWith(':'))) {
    return false;
  }

  const leftSegments = leftRaw === '' ? [] : leftRaw.split(':');
  const rightSegments = rightRaw === '' ? [] : rightRaw.split(':');

  if (!hasCompression) {
    if (leftSegments.some((seg) => seg === '')) {
      return false;
    }
    return validateUncompressedIPv6(leftSegments);
  }

  // Ensure no empty internal segments caused by `::` split leftovers
  if (leftSegments.some((seg) => seg === '') || rightSegments.some((seg) => seg === '')) {
    return false;
  }

  let totalHextets = 0;

  // In compressed IPv6, leftSegments precedes `::`, so embedded IPv4 can only appear in rightSegments
  for (const seg of leftSegments) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(seg)) {
      return false;
    }
    totalHextets += 1;
  }

  for (let i = 0; i < rightSegments.length; i += 1) {
    const seg = rightSegments[i]!;
    const isLast = i === rightSegments.length - 1;
    if (isLast && seg.includes('.')) {
      if (!isValidIPv4(seg)) {
        return false;
      }
      totalHextets += 2;
    } else if (/^[0-9a-fA-F]{1,4}$/.test(seg)) {
      totalHextets += 1;
    } else {
      return false;
    }
  }

  return totalHextets < 8;
}

function validateUncompressedIPv6(segments: string[]): boolean {
  if (segments.length === 0) {
    return false;
  }
  let hextets = 0;
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const isLast = i === segments.length - 1;
    if (isLast && seg.includes('.')) {
      if (!isValidIPv4(seg)) {
        return false;
      }
      hextets += 2;
    } else if (/^[0-9a-fA-F]{1,4}$/.test(seg)) {
      hextets += 1;
    } else {
      return false;
    }
  }
  return hextets === 8;
}

/**
 * Expands and lowercases an IPv6 address to canonical 8-group 4-hex-digit form
 * for consistent pseudonymization across compressed/expanded variants.
 */
export function normalizeIPv6(candidate: string): string {
  const lower = candidate.toLowerCase();
  const [leftRaw = '', rightRaw] = lower.split('::');

  const expandSegmentGroup = (segments: string[]): string[] => {
    const out: string[] = [];
    for (let i = 0; i < segments.length; i += 1) {
      const seg = segments[i]!;
      if (seg === '') continue;
      if (i === segments.length - 1 && seg.includes('.')) {
        const octets = seg.split('.').map(Number);
        const hi = (((octets[0] ?? 0) << 8) | (octets[1] ?? 0)).toString(16).padStart(4, '0');
        const lo = (((octets[2] ?? 0) << 8) | (octets[3] ?? 0)).toString(16).padStart(4, '0');
        out.push(hi, lo);
      } else {
        out.push(seg.padStart(4, '0'));
      }
    }
    return out;
  };

  if (rightRaw === undefined) {
    return expandSegmentGroup(leftRaw.split(':')).join(':');
  }

  const left = leftRaw === '' ? [] : expandSegmentGroup(leftRaw.split(':'));
  const right = rightRaw === '' ? [] : expandSegmentGroup(rightRaw.split(':'));
  const missing = Math.max(0, 8 - (left.length + right.length));
  const zeros = Array.from({ length: missing }, () => '0000');
  return [...left, ...zeros, ...right].join(':');
}
