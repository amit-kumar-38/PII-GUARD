import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../src/App.tsx';
import { buildCsvColumnProfiles, sanitizeCsvDocument } from '../src/modules/csv/csvSanitizer.ts';
import { parseCsvContent } from '../src/modules/csv/csvParser.ts';
import { detectPii } from '../src/modules/detection/detectionEngine.ts';
import { redactText } from '../src/modules/redaction/redactionEngine.ts';
import { createPseudonymSession } from '../src/modules/redaction/pseudonymization.ts';
import { PRIVACY_PROFILES } from '../src/types/pii.ts';

describe('Privacy Cockpit engine & UI features', () => {
  it('applies Privacy Profiles and per-category operators (LABEL, REMOVE, KEEP) to actual output', () => {
    const input = 'Email: amit@example.com, Aadhaar: 1234 5678 9012, Card: 4111-1111-1111-1111';
    const scan = detectPii(input);

    const balanced = redactText(
      input,
      scan.detections,
      'PARTIAL',
      createPseudonymSession(),
      PRIVACY_PROFILES.BALANCED.policies,
    );
    expect(balanced.sanitizedText).toBe(
      'Email: a***@e***.com, Aadhaar: [REDACTED], Card: [REDACTED]',
    );

    const strict = redactText(
      input,
      scan.detections,
      'FULL',
      createPseudonymSession(),
      PRIVACY_PROFILES.STRICT.policies,
    );
    expect(strict.sanitizedText).toBe(
      'Email: [REDACTED], Aadhaar: [REDACTED], Card: [REDACTED]',
    );

    const custom = redactText(
      input,
      scan.detections,
      'PARTIAL',
      createPseudonymSession(),
      {
        ...PRIVACY_PROFILES.BALANCED.policies,
        EMAIL: 'LABEL',
        AADHAAR: 'REMOVE',
      },
    );
    expect(custom.sanitizedText).toBe(
      'Email: [EMAIL], Aadhaar: , Card: [REDACTED]',
    );
  });

  it('builds accurate CSV column profiles using sanitized header names', () => {
    const csv = 'id,hdr.pii@example.com,notes\n001,a@b.com,ok\n002,c@d.org,clean';
    const doc = parseCsvContent(csv, { hasHeader: true });
    const result = sanitizeCsvDocument(doc, 'PSEUDONYM', createPseudonymSession());
    const profiles = buildCsvColumnProfiles(result);

    expect(profiles).toHaveLength(3);
    expect(profiles[0]?.detectionCount).toBe(0);
    expect(profiles[1]?.headerName).toBe('EMAIL_001');
    expect(profiles[1]?.detectionCount).toBe(3); // 1 header + 2 data cells
    expect(profiles[2]?.detectionCount).toBe(0);
  });

  it('supports Detection-Only mode, Privacy Profiles, Category Filters, Inspector Navigation, and per-finding override in UI', async () => {
    render(<App />);

    // Load Banking synthetic scenario
    fireEvent.click(screen.getByRole('button', { name: /Banking & KYC/i }));
    await waitFor(() => {
      expect(Number(screen.getByTestId('total-occurrences').textContent)).toBeGreaterThan(0);
    });

    // Apply Balanced profile -> Aadhaar & Card become [REDACTED], Email stays masked
    fireEvent.click(screen.getByRole('button', { name: /Balanced/i }));
    const protectedPreview = screen.getByLabelText(/Sanitized output preview/i);
    expect(protectedPreview.textContent).toContain('k***@f***.example');
    expect(protectedPreview.textContent).toContain('[REDACTED]');

    // Per-category Email dropdown -> LABEL ([EMAIL])
    fireEvent.change(screen.getByLabelText(/Email transformation operator/i), {
      target: { value: 'LABEL' },
    });
    expect(protectedPreview.textContent).toContain('[EMAIL]');

    // Interactive PII Inspector Prev/Next navigation
    expect(screen.getByTestId('inspector-index').textContent).toMatch(/^1 \/ \d+/);
    fireEvent.click(screen.getByRole('button', { name: /^Next$/i }));
    expect(screen.getByTestId('inspector-index').textContent).toMatch(/^2 \/ \d+/);
    fireEvent.click(screen.getByRole('button', { name: /^Prev$/i }));
    expect(screen.getByTestId('inspector-index').textContent).toMatch(/^1 \/ \d+/);

    // Filter findings by Email category
    const filterGroup = screen.getByRole('group', { name: /Filter findings by PII category/i });
    const emailFilterBtn = filterGroup.querySelector('button:nth-of-type(2)')!;
    fireEvent.click(emailFilterBtn);
    expect(screen.getByTestId('inspector-index').textContent).toBe('1 / 1');

    // Per-finding Ignore (False Positive) override restores original email in protected output
    fireEvent.click(screen.getByRole('button', { name: /Ignore \(FP\)/i }));
    expect(protectedPreview.textContent).toContain('kyc.desk@fictional-bank.example');

    // Switch to Detection-Only mode -> disables export & displays detection-only notice
    fireEvent.click(screen.getByRole('button', { name: /Detection Only/i }));
    expect(protectedPreview.textContent).toMatch(/Detection-Only Mode Active/i);
    expect(screen.getByRole('button', { name: /Download Sanitized/i })).toBeDisabled();

    // Switch back to Detection & Protection and verify CSV Column Profiler & Protection Timeline
    fireEvent.click(screen.getByRole('button', { name: /Detection & Protection/i }));
    fireEvent.click(screen.getByRole('button', { name: /Load Sample CSV/i }));
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /CSV column profiling/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Input received/i)).toBeInTheDocument();
    expect(screen.getByText(/Protected output ready/i)).toBeInTheDocument();
  });
});
