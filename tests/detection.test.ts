import { describe, expect, it } from 'vitest';
import { detectPii } from '../src/modules/detection/detectionEngine.ts';
import { isValidLuhn } from '../src/modules/validation/luhn.ts';
import { isValidIPv4, isValidIPv6, normalizeIPv6 } from '../src/modules/validation/ipValidation.ts';

describe('Luhn algorithm & credit card detection', () => {
  it('validates Luhn-passing 13-19 digit numbers and rejects invalid ones', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
    expect(isValidLuhn('378282246310005')).toBe(true); // 15-digit Amex test
    expect(isValidLuhn('4111111111111112')).toBe(false);
    expect(isValidLuhn('0000000000000000')).toBe(false);
    expect(isValidLuhn('123456789012')).toBe(false); // 12 digits too short
  });

  it('detects Luhn-valid cards with spaces/hyphens and rejects Luhn-invalid 16-digit numbers', () => {
    const input =
      'Valid card: 4111 1111 1111 1111, hyphenated: 4111-1111-1111-1111, invalid: 4111 1111 1111 1112, date: 2026-11-27';
    const result = detectPii(input);

    expect(result.categoryCounts.CREDIT_CARD).toBe(2);
    expect(result.uniqueCounts.CREDIT_CARD).toBe(1);
    expect(result.rejectedCardCandidates).toBe(1);
    expect(result.detections.every((d) => d.validationStatus === 'LUHN_VERIFIED')).toBe(true);
  });

  it('supports 13-digit and 19-digit Luhn-valid synthetic numbers without matching longer sequences', () => {
    const input = 'Card13: 4000000000006 Card19: 4000000000000000006 TooLong: 41111111111111110000';
    const result = detectPii(input);
    expect(result.categoryCounts.CREDIT_CARD).toBe(2);
    expect(result.detections[0]?.value).toBe('4000000000006');
    expect(result.detections[1]?.value).toBe('4000000000000000006');
  });
});

describe('Email, Phone, IP, PAN, Aadhaar detection & overlap resolution', () => {
  it('detects mixed-case and subdomain emails while ignoring malformed ones', () => {
    const input = 'Reach Amit@Sub.Example.COM or ops+billing@test.co.in; ignore user@@bad..com and plain@';
    const result = detectPii(input);
    expect(result.categoryCounts.EMAIL).toBe(2);
    expect(result.detections[0]?.normalizedValue).toBe('amit@sub.example.com');
  });

  it('detects Indian and international phones while avoiding dates and IPs', () => {
    const input =
      'IN mobile: +91 98765 43210, domestic: 09876543210, US: +1 (555) 234-5678, date: 2026-11-27, IP: 192.168.1.10';
    const result = detectPii(input);
    expect(result.categoryCounts.PHONE).toBe(3);
    expect(result.categoryCounts.IP).toBe(1);
    // +91 98765 43210 and 09876543210 normalize to same E.164
    expect(result.uniqueCounts.PHONE).toBe(2);
  });

  it('validates IPv4 octets and compressed/uncompressed IPv6 representations', () => {
    expect(isValidIPv4('192.168.1.1')).toBe(true);
    expect(isValidIPv4('192.168.1.256')).toBe(false);
    expect(isValidIPv4('192.168.01.1')).toBe(false);

    expect(isValidIPv6('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(isValidIPv6('2001:db8::1')).toBe(true);
    expect(isValidIPv6('::ffff:192.0.2.1')).toBe(true);
    expect(isValidIPv6('::1')).toBe(true);
    expect(isValidIPv6('12:34:56')).toBe(false);
    expect(isValidIPv6('2001:::1')).toBe(false);
    expect(normalizeIPv6('2001:0DB8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');

    const result = detectPii('Valid: 10.0.0.1 and 2001:db8::1; Bad: 999.10.10.10 and std::vector');
    expect(result.categoryCounts.IP).toBe(2);
    expect(result.rejectedIpCandidates).toBe(1);
  });

  it('detects PAN with strict word boundaries and normalizes case', () => {
    const input = 'PAN: ABCDE1234F, lower: abcde1234f, invalid embedded: COMPANY1234Z';
    const result = detectPii(input);
    expect(result.categoryCounts.PAN).toBe(2);
    expect(result.uniqueCounts.PAN).toBe(1);
  });

  it('detects 12-digit Aadhaar with spaces/hyphens and rejects longer/shorter sequences', () => {
    const input = 'Aadhaar: 1234 5678 9012 and 1234-5678-9012; ignore 1234567890123 and 1234 5678';
    const result = detectPii(input);
    expect(result.categoryCounts.AADHAAR).toBe(2);
    expect(result.uniqueCounts.AADHAAR).toBe(1);
  });

  it('resolves overlaps deterministically without double-counting', () => {
    const input = 'Email with digits: 9876543210@example.com and Aadhaar 1234 5678 9012';
    const result = detectPii(input);
    expect(result.categoryCounts.EMAIL).toBe(1);
    expect(result.categoryCounts.AADHAAR).toBe(1);
    expect(result.categoryCounts.PHONE).toBe(0);
    expect(result.totalOccurrences).toBe(2);
  });

  it('returns zero detections for empty and whitespace-only input', () => {
    expect(detectPii('').totalOccurrences).toBe(0);
    expect(detectPii('   \n\t  ').totalOccurrences).toBe(0);
  });

  it('maintains exact offset invariant originalText.slice(start, end) === value across emojis, punctuation, adjacent PII, and long inputs', () => {
    const assertInvariant = (input: string) => {
      const res = detectPii(input);
      let prevEnd = 0;
      for (const det of res.detections) {
        expect(input.slice(det.start, det.end)).toBe(det.value);
        expect(det.start).toBeGreaterThanOrEqual(prevEnd);
        prevEnd = det.end;
      }
      return res;
    };

    // Sentence-ending periods & emojis directly preceding PII
    const sentence =
      '🔒amit@example.com. 📱+91 98765 43210. 🌐192.168.1.1. 🛰️::1. 🪪ABCDE1234F. 🆔1234 5678 9012. 💳4111-1111-1111-1111.';
    const sRes = assertInvariant(sentence);
    expect(sRes.categoryCounts.EMAIL).toBe(1);
    expect(sRes.categoryCounts.PHONE).toBe(1);
    expect(sRes.categoryCounts.IP).toBe(2);
    expect(sRes.categoryCounts.PAN).toBe(1);
    expect(sRes.categoryCounts.AADHAAR).toBe(1);
    expect(sRes.categoryCounts.CREDIT_CARD).toBe(1);

    // Adjacent detections & embedded PAN false-positive rejection & IP/numeric collision
    const adjacent =
      'amit@example.com,9876543210,10.0.0.1,ABCDE1234F,1234 5678 9012,3782 822463 10005|BAD:XYZABCDE1234F|ABCDE1234FZ|1.2.3.4.5';
    const aRes = assertInvariant(adjacent);
    expect(aRes.categoryCounts).toEqual({
      EMAIL: 1,
      PHONE: 1,
      IP: 1,
      PAN: 1,
      AADHAAR: 1,
      CREDIT_CARD: 1,
    });

    // Long input performance & offset accuracy (>50k chars)
    const block = 'Log entry clean text without sensitive fields; date 2026-11-27. ';
    const longInput = `${block.repeat(800)}End: amit@example.com and 4111 1111 1111 1111.`;
    const lRes = assertInvariant(longInput);
    expect(lRes.totalOccurrences).toBe(2);
  });
});
