import { describe, expect, it } from 'vitest';
import { detectPii } from '../src/modules/detection/detectionEngine.ts';
import { createPseudonymSession } from '../src/modules/redaction/pseudonymization.ts';
import { redactText } from '../src/modules/redaction/redactionEngine.ts';

const SAMPLE_LINE =
  'Email: amit@example.com, Phone: 9876543210, Card: 4111-1111-1111-1111, Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, IP: 192.168.1.42';

describe('Redaction engine — Full, Partial, and Consistent Pseudonymization', () => {
  it('applies Full Mask without revealing any character of original PII', () => {
    const scan = detectPii(SAMPLE_LINE);
    const out = redactText(SAMPLE_LINE, scan.detections, 'FULL');
    expect(out.sanitizedText).not.toContain('amit');
    expect(out.sanitizedText).not.toContain('9876543210');
    expect(out.sanitizedText).not.toContain('4111');
    expect(out.sanitizedText).not.toContain('9012');
    expect(out.sanitizedText).not.toContain('ABCDE');
    expect(out.sanitizedText).not.toContain('192.168');
    expect(out.sanitizedText.match(/\[REDACTED\]/g)?.length).toBe(6);
  });

  it('applies entity-aware Partial Mask matching specification examples', () => {
    const scan = detectPii(SAMPLE_LINE);
    const out = redactText(SAMPLE_LINE, scan.detections, 'PARTIAL');
    expect(out.sanitizedText).toContain('a***@e***.com');
    expect(out.sanitizedText).toContain('XXXXXX3210');
    expect(out.sanitizedText).toContain('XXXX-XXXX-XXXX-1111');
    expect(out.sanitizedText).toContain('XXXX XXXX 9012');
    expect(out.sanitizedText).toContain('A*******4F');
    expect(out.sanitizedText).toContain('192.168.XXX.XXX');
  });

  it('maintains consistent pseudonymization across repeated and normalized values and mode switches', () => {
    const text =
      'Primary: amit@example.com, Upper: AMIT@EXAMPLE.COM, Other: sara@test.org, Phone1: +91 98765 43210, Phone2: 09876543210, Card: 4111 1111 1111 1111, Card2: 4111-1111-1111-1111';
    const scan = detectPii(text);
    const session = createPseudonymSession();

    const pseudo1 = redactText(text, scan.detections, 'PSEUDONYM', session);
    expect(pseudo1.sanitizedText).toContain('Primary: EMAIL_001, Upper: EMAIL_001, Other: EMAIL_002');
    expect(pseudo1.sanitizedText).toContain('Phone1: PHONE_001, Phone2: PHONE_001');
    expect(pseudo1.sanitizedText).toContain('Card: CARD_001, Card2: CARD_001');

    // Switch to FULL and back to PSEUDONYM using same session -> mappings stay identical
    redactText(text, scan.detections, 'FULL', session);
    const pseudo2 = redactText(text, scan.detections, 'PSEUDONYM', session);
    expect(pseudo2.sanitizedText).toBe(pseudo1.sanitizedText);

    // Fresh session resets counters back to _001
    const freshOut = redactText('New: sara@test.org', detectPii('New: sara@test.org').detections, 'PSEUDONYM', createPseudonymSession());
    expect(freshOut.sanitizedText).toBe('New: EMAIL_001');
  });
});
