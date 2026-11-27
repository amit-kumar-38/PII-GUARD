import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App.tsx';

describe('PII GUARD UI integration workflow', () => {
  it('loads synthetic sample, updates counters and comparison, switches modes, downloads, and resets', async () => {
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock, writable: true });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);

    // Load synthetic sample
    fireEvent.click(screen.getByRole('button', { name: /Load Synthetic Sample/i }));

    // Check counters reflect detections
    await waitFor(() => {
      expect(Number(screen.getByTestId('total-occurrences').textContent)).toBeGreaterThan(0);
    });

    // Switch to Consistent Pseudonymization via keyboard arrow navigation
    const partialRadio = screen.getByRole('radio', { name: /Partial Mask/i });
    partialRadio.focus();
    fireEvent.keyDown(partialRadio, { key: 'ArrowRight' });
    expect(screen.getByLabelText(/Sanitized output preview/i).textContent).toContain('EMAIL_001');

    // Switch to Full Mask via ArrowRight wrap-around
    const pseudoRadio = screen.getByRole('radio', { name: /Consistent Pseudonymization/i });
    fireEvent.keyDown(pseudoRadio, { key: 'ArrowRight' });
    expect(screen.getByLabelText(/Sanitized output preview/i).textContent).toContain('[REDACTED]');

    // Download sanitized output
    fireEvent.click(screen.getByRole('button', { name: /Download Sanitized/i }));
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    // Clear / Reset
    fireEvent.click(screen.getByRole('button', { name: /Clear \/ Reset/i }));
    expect(screen.getByTestId('total-occurrences').textContent).toBe('0');
    expect((screen.getByLabelText(/Raw Text \/ Document Buffer/i) as HTMLTextAreaElement).value).toBe('');

    clickSpy.mockRestore();
  });

  it('handles .txt and .csv file uploads and rejects unsupported extensions', async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Upload a \.txt or \.csv file/i) as HTMLInputElement;

    // Unsupported extension
    const badFile = new File(['hello'], 'secret.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/Unsupported file type/i);
    });

    // Valid CSV upload
    const csvFile = new File(['id,email\n1,test@example.com'], 'users.csv', { type: 'text/csv' });
    fireEvent.change(fileInput, { target: { files: [csvFile] } });
    await waitFor(() => {
      expect(screen.getByTestId('counter-EMAIL').textContent).toContain('1');
    });

    // Valid TXT upload
    const txtFile = new File(['PAN: ABCDE1234F'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [txtFile] } });
    await waitFor(() => {
      expect(screen.getByTestId('counter-PAN').textContent).toContain('1');
    });
  });

  it('loads sample CSV, toggles raw CSV preview, and exports safe audit summary without PII', async () => {
    const blobs: Blob[] = [];
    const createObjectURLMock = vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:audit-url';
    });
    const revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURLMock, writable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURLMock, writable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Load Sample CSV/i }));

    await waitFor(() => {
      expect(screen.getByTestId('counter-CREDIT_CARD').textContent).toContain('2');
    });

    // Toggle Raw CSV Preview
    fireEvent.click(screen.getByRole('button', { name: /Raw CSV Preview/i }));
    expect(screen.getByLabelText(/Sanitized output preview/i).textContent).toContain('TKT-101');

    // Export Audit Summary
    fireEvent.click(screen.getByRole('button', { name: /Export Audit Summary/i }));
    expect(blobs.length).toBeGreaterThanOrEqual(1);
    const exportedBlob = blobs[blobs.length - 1]!;
    const exportedJson = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to read exported blob'));
      reader.readAsText(exportedBlob);
    });
    expect(exportedJson).not.toContain('aarav.test@example.com');
    expect(exportedJson).not.toContain('ABCDE1234F');
    expect(exportedJson).not.toContain('4111 1111 1111 1111');
    expect(exportedJson).toContain('"totalOccurrences"');

    clickSpy.mockRestore();
  });

  it('sanitizes PII inside uploaded CSV headers in the side-by-side table', async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Upload a \.txt or \.csv file/i) as HTMLInputElement;
    const csvWithPiiHeader = new File(
      ['id,header.pii@example.com\n001,row.pii@example.com'],
      'header-pii.csv',
      { type: 'text/csv' },
    );
    fireEvent.change(fileInput, { target: { files: [csvWithPiiHeader] } });

    await waitFor(() => {
      expect(screen.getByTestId('counter-EMAIL').textContent).toContain('2');
    });

    const sanitizedTable = screen.getByRole('table', { name: /Sanitized CSV table preview/i });
    expect(sanitizedTable.textContent).not.toContain('header.pii@example.com');
    expect(sanitizedTable.textContent).toContain('h***@e***.com');
    expect(sanitizedTable.textContent).toContain('r***@e***.com');
  });
});
