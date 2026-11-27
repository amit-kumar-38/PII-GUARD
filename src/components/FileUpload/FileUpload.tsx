import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { FileUp, FileSpreadsheet, FileText } from 'lucide-react';

interface FileUploadProps {
  uploadedFilename: string | null;
  sourceType: 'text' | 'txt' | 'csv';
  csvHasHeader: boolean;
  onToggleCsvHeader: (hasHeader: boolean) => void;
  onFileSelect: (file: File) => void;
}

export function FileUpload({
  uploadedFilename,
  sourceType,
  csvHasHeader,
  onToggleCsvHeader,
  onFileSelect,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="pg-upload-group">
      <div
        className={`pg-dropzone ${isDragging ? 'pg-dropzone--active' : ''} ${
          uploadedFilename ? 'pg-dropzone--has-file' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          id="pii-file-upload"
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          onChange={handleChange}
          className="pg-sr-only"
          aria-label="Upload a .txt or .csv file for local sanitization"
        />

        <div className="pg-dropzone-content">
          <div className="pg-dropzone-main">
            <div className="pg-dropzone-tile" aria-hidden="true">
              <FileUp size={24} />
            </div>
            <div className="pg-dropzone-copy">
              <span className="pg-dropzone-eyebrow">
                DROP FILE / PROCESSED IN BROWSER
              </span>
              <span className="pg-dropzone-title">
                {uploadedFilename
                  ? `Active File: ${uploadedFilename}`
                  : 'Drop a .txt or .csv file here, or choose from disk'}
              </span>
              <div className="pg-dropzone-meta">
                <span className="pg-format-chip">
                  <FileText size={13} aria-hidden="true" /> .TXT
                </span>
                <span className="pg-format-chip">
                  <FileSpreadsheet size={13} aria-hidden="true" /> .CSV
                </span>
                <span>UTF-8 · Max 5 MB · Zero server upload</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="pg-btn pg-btn--secondary"
            onClick={() => inputRef.current?.click()}
          >
            Choose File
          </button>
        </div>
      </div>

      {sourceType === 'csv' && (
        <label className="pg-checkbox-label">
          <input
            type="checkbox"
            checked={csvHasHeader}
            onChange={(e) => onToggleCsvHeader(e.target.checked)}
          />
          <span>Preserve first row as CSV column headers</span>
        </label>
      )}
    </div>
  );
}
