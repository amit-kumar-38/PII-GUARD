import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App.tsx';

describe('Security and privacy guarantees', () => {
  it('renders HTML/script payloads harmlessly as text nodes without executing scripts', async () => {
    const { container } = render(<App />);
    const textarea = screen.getByLabelText(/Raw Text \/ Document Buffer/i);

    const payload = '<img src=x onerror=alert(1)> <script>window.__xss=true</script> amit@example.com';
    fireEvent.change(textarea, { target: { value: payload } });

    await waitFor(() => {
      expect(screen.getByTestId('counter-EMAIL').textContent).toContain('1');
    });

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
    expect(
      screen.getByLabelText(/Original input preview with highlighted PII detections/i).textContent,
    ).toContain('<script>window.__xss=true</script>');
  });

  it('never stores raw PII in audit logs, never writes to persistent storage, and makes zero network requests', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Load Synthetic Sample/i }));

    const logRegion = screen.getByRole('log', { name: /Local processing events/i });
    const logText = logRegion.textContent ?? '';

    expect(logText).not.toContain('aarav.test@example.com');
    expect(logText).not.toContain('98765');
    expect(logText).not.toContain('ABCDE1234F');
    expect(logText).not.toContain('4111');
    expect(logText).not.toContain('1234 5678 9012');

    expect(setItemSpy).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
    setItemSpy.mockRestore();
  });
});
