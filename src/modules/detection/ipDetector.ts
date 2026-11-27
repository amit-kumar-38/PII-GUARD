import type { PiiDetection } from '../../types/pii.ts';
import { isValidIPv4, isValidIPv6, normalizeIPv6 } from '../validation/ipValidation.ts';

const IPV4_CANDIDATE_REGEX =
  /(?<!\d\.)(?<![\d\p{L}])(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?![\d\p{L}]|\.\d)/gu;

const IPV6_CANDIDATE_REGEX =
  /(?<![\p{L}\p{N}:]|[0-9a-fA-F]\.)([0-9a-fA-F:]{2,39}(?:\.\d{1,3}\.\d{1,3}\.\d{1,3})?)(?![\p{L}\p{N}:]|\.[0-9a-fA-F])/gu;

export interface IpDetectionOutcome {
  detections: PiiDetection[];
  rejectedCandidates: number;
}

export function detectIps(text: string): IpDetectionOutcome {
  const detections: PiiDetection[] = [];
  let rejectedCandidates = 0;

  // Detect IPv6 first so IPv4-mapped IPv6 addresses (e.g., ::ffff:192.0.2.1) aren't split
  const ipv6Ranges: Array<{ start: number; end: number }> = [];
  IPV6_CANDIDATE_REGEX.lastIndex = 0;
  let v6Match: RegExpExecArray | null;
  while ((v6Match = IPV6_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = v6Match[1];
    if (!value || !value.includes(':')) {
      continue;
    }
    const colonCount = (value.match(/:/g) ?? []).length;
    if (colonCount < 2) {
      continue;
    }
    const start = v6Match.index;
    const end = start + value.length;
    if (isValidIPv6(value)) {
      ipv6Ranges.push({ start, end });
      detections.push({
        id: `IP:${start}:${end}`,
        category: 'IP',
        value,
        normalizedValue: normalizeIPv6(value),
        start,
        end,
        validationStatus: 'VALID_FORMAT',
        validationNote: 'RFC 4291 IPv6 format validated locally',
        subtype: 'IPv6',
      });
    } else if (colonCount >= 2 && (value.includes('::') || colonCount >= 4)) {
      rejectedCandidates += 1;
    }
  }

  IPV4_CANDIDATE_REGEX.lastIndex = 0;
  let v4Match: RegExpExecArray | null;
  while ((v4Match = IPV4_CANDIDATE_REGEX.exec(text)) !== null) {
    const value = v4Match[1];
    if (!value) continue;
    const start = v4Match.index;
    const end = start + value.length;

    const insideIpv6 = ipv6Ranges.some((r) => start >= r.start && end <= r.end);
    if (insideIpv6) {
      continue;
    }

    if (isValidIPv4(value)) {
      detections.push({
        id: `IP:${start}:${end}`,
        category: 'IP',
        value,
        normalizedValue: value,
        start,
        end,
        validationStatus: 'VALID_FORMAT',
        validationNote: 'IPv4 4-octet (0-255) format validated locally',
        subtype: 'IPv4',
      });
    } else {
      rejectedCandidates += 1;
    }
  }

  return { detections, rejectedCandidates };
}
