import { RotateCcw, AlertTriangle, ScanSearch } from 'lucide-react';
import type { SampleScenarioId } from '../../modules/sample/sampleData.ts';
import { FileUpload } from '../FileUpload/FileUpload.tsx';
import { SampleLoader } from '../SampleLoader/SampleLoader.tsx';

interface InputPanelProps {
  rawInput: string;
  sourceType: 'text' | 'txt' | 'csv';
  uploadedFilename: string | null;
  csvHasHeader: boolean;
  activeSampleId: SampleScenarioId;
  isScanning: boolean;
  errorMessage: string | null;
  onTextChange: (value: string) => void;
  onScanNow: () => void;
  onFileSelect: (file: File) => void;
  onToggleCsvHeader: (hasHeader: boolean) => void;
  onLoadSample: (kind: 'text' | 'csv', scenarioId?: SampleScenarioId) => void;
  onReset: () => void;
}

export function InputPanel({
  rawInput,
  sourceType,
  uploadedFilename,
  csvHasHeader,
  activeSampleId,
  isScanning,
  errorMessage,
  onTextChange,
  onScanNow,
  onFileSelect,
  onToggleCsvHeader,
  onLoadSample,
  onReset,
}: InputPanelProps) {
  return (
    <section className="pg-section" aria-labelledby="input-heading">
      <div className="pg-section-head">
        <div>
          <span className="pg-step-tag">01 / INPUT</span>
          <h2 id="input-heading" className="pg-section-title">
            Bring your data into the protected workspace
          </h2>
          <p className="pg-section-subtitle">
            Paste text, select a synthetic scenario, or import a local <code>.txt</code> or <code>.csv</code> document.
          </p>
        </div>

        <button
          type="button"
          className="pg-btn pg-btn--ghost-danger"
          onClick={onReset}
          disabled={!rawInput && !uploadedFilename && !errorMessage}
        >
          <RotateCcw size={17} aria-hidden="true" />
          Clear / Reset
        </button>
      </div>

      <SampleLoader
        activeSampleId={activeSampleId}
        onLoadSample={onLoadSample}
      />

      <FileUpload
        uploadedFilename={uploadedFilename}
        sourceType={sourceType}
        csvHasHeader={csvHasHeader}
        onToggleCsvHeader={onToggleCsvHeader}
        onFileSelect={onFileSelect}
      />

      {errorMessage && (
        <div className="pg-alert pg-alert--error" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pg-editor-shell">
        <div className="pg-editor-header">
          <div className="pg-editor-title-group">
            <span className="pg-editor-badge">RAW DOCUMENT</span>
            <label htmlFor="pii-raw-input" className="pg-label">
              Raw Text / Document Buffer
            </label>
          </div>
          <div className="pg-editor-meta">
            <span>{isScanning ? 'Scanning…' : 'Local memory'}</span>
            <span>{sourceType.toUpperCase()}</span>
            <span>{rawInput.length.toLocaleString()} chars</span>
            <button
              type="button"
              className="pg-btn pg-btn--secondary pg-btn--compact"
              onClick={onScanNow}
              disabled={!rawInput.trim()}
            >
              <ScanSearch size={16} aria-hidden="true" />
              Scan Now
            </button>
          </div>
        </div>

        <textarea
          id="pii-raw-input"
          className="pg-textarea"
          value={rawInput}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste raw text here (emails, +91 phone numbers, IPv4/IPv6, PAN ABCDE1234F, Aadhaar 1234 5678 9012, or Luhn-valid test cards) — or select a synthetic scenario above."
          rows={7}
          spellCheck={false}
        />
      </div>
    </section>
  );
}
