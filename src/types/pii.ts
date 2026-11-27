export type PiiCategory =
  | 'EMAIL'
  | 'PHONE'
  | 'IP'
  | 'PAN'
  | 'AADHAAR'
  | 'CREDIT_CARD';

export type RedactionMode = 'FULL' | 'PARTIAL' | 'PSEUDONYM';

export type TransformationOperator =
  | 'FULL'
  | 'PARTIAL'
  | 'PSEUDONYM'
  | 'LABEL'
  | 'REMOVE'
  | 'KEEP';

export type CategoryPolicyMap = Record<PiiCategory, TransformationOperator>;

export type PrivacyProfileId = 'STRICT' | 'BALANCED' | 'UTILITY' | 'CUSTOM';

export type ScanMode = 'PROTECT' | 'DETECT_ONLY';

export type ShieldVisualState =
  | 'IDLE'
  | 'SCANNING'
  | 'PII_DETECTED'
  | 'PROTECTED'
  | 'CLEAN'
  | 'ERROR';

export type ValidationStatus =
  | 'VALID_FORMAT'
  | 'LUHN_VERIFIED'
  | 'LIBRARY_VERIFIED';

export interface PiiDetection {
  id: string;
  category: PiiCategory;
  value: string;
  normalizedValue: string;
  start: number;
  end: number;
  validationStatus: ValidationStatus;
  validationNote: string;
  subtype?: string;
}

export interface InspectorFinding {
  key: string;
  detection: PiiDetection;
  locationLabel: string;
  rowIndex?: number;
  colIndex?: number;
  columnName?: string;
  appliedOperator: TransformationOperator;
  transformedValue: string;
  isOverridden: boolean;
  severity: 'HIGH' | 'MEDIUM' | 'CONTEXTUAL';
}

export type CategoryCounts = Record<PiiCategory, number>;

export interface DetectionResult {
  detections: PiiDetection[];
  categoryCounts: CategoryCounts;
  uniqueCounts: CategoryCounts;
  totalOccurrences: number;
  totalUnique: number;
  rejectedCardCandidates: number;
  rejectedIpCandidates: number;
}

export interface PseudonymSession {
  maps: Record<PiiCategory, Map<string, string>>;
  counters: Record<PiiCategory, number>;
}

export type AuditEventType =
  | 'SYSTEM'
  | 'SCAN'
  | 'MODE_CHANGE'
  | 'FILE_IMPORT'
  | 'FILE_EXPORT'
  | 'SAMPLE_LOAD'
  | 'RESET'
  | 'ERROR';

export interface AuditEvent {
  id: string;
  timestamp: string;
  type: AuditEventType;
  message: string;
  details?: string;
}

export interface TimelineStep {
  id: string;
  label: string;
  status: 'completed' | 'active' | 'pending' | 'error';
  timestamp?: string;
  detail: string;
}

export type InputSourceType = 'text' | 'txt' | 'csv';

export interface CsvDocument {
  headers: string[] | null;
  rows: string[][];
  delimiter: string;
  hasBom: boolean;
  lineEnding: '\r\n' | '\n';
  totalCells: number;
}

export interface CsvCellScan {
  rowIndex: number;
  colIndex: number;
  original: string;
  sanitized: string;
  detections: PiiDetection[];
}

export interface CsvColumnProfile {
  colIndex: number;
  headerName: string;
  rowCount: number;
  detectionCount: number;
  categoryCounts: CategoryCounts;
}

export interface CsvSanitizationResult {
  document: CsvDocument;
  sanitizedRows: string[][];
  sanitizedHeaders: string[] | null;
  sanitizedCsvText: string;
  headerScans: CsvCellScan[];
  cellScans: CsvCellScan[];
  summary: DetectionResult;
}

export const PII_CATEGORIES: readonly PiiCategory[] = [
  'EMAIL',
  'PHONE',
  'IP',
  'PAN',
  'AADHAAR',
  'CREDIT_CARD',
] as const;

export const CATEGORY_LABELS: Record<PiiCategory, string> = {
  EMAIL: 'Email Addresses',
  PHONE: 'Phone Numbers',
  IP: 'IP Addresses',
  PAN: 'Indian PAN',
  AADHAAR: 'Indian Aadhaar',
  CREDIT_CARD: 'Credit Cards',
};

export const CATEGORY_SHORT_LABELS: Record<PiiCategory, string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  IP: 'IP',
  PAN: 'PAN',
  AADHAAR: 'Aadhaar',
  CREDIT_CARD: 'Card',
};

export const PSEUDONYM_PREFIXES: Record<PiiCategory, string> = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
  IP: 'IP',
  PAN: 'PAN',
  AADHAAR: 'AADHAAR',
  CREDIT_CARD: 'CARD',
};

export const CATEGORY_SEVERITY: Record<PiiCategory, 'HIGH' | 'MEDIUM' | 'CONTEXTUAL'> = {
  CREDIT_CARD: 'HIGH',
  AADHAAR: 'HIGH',
  PAN: 'HIGH',
  PHONE: 'MEDIUM',
  EMAIL: 'MEDIUM',
  IP: 'CONTEXTUAL',
};

export const OPERATOR_LABELS: Record<TransformationOperator, string> = {
  FULL: 'Full Mask ([REDACTED])',
  PARTIAL: 'Partial Mask',
  PSEUDONYM: 'Pseudonymize',
  LABEL: 'Entity Label ([TYPE])',
  REMOVE: 'Remove Value',
  KEEP: 'Keep Original (Ignore)',
};

export function createUniformPolicies(
  operator: TransformationOperator,
): CategoryPolicyMap {
  return {
    EMAIL: operator,
    PHONE: operator,
    IP: operator,
    PAN: operator,
    AADHAAR: operator,
    CREDIT_CARD: operator,
  };
}

export const PRIVACY_PROFILES: Record<
  Exclude<PrivacyProfileId, 'CUSTOM'>,
  {
    id: Exclude<PrivacyProfileId, 'CUSTOM'>;
    name: string;
    summary: string;
    policies: CategoryPolicyMap;
  }
> = {
  STRICT: {
    id: 'STRICT',
    name: 'Strict Privacy',
    summary: 'Full [REDACTED] masking across all six PII categories.',
    policies: createUniformPolicies('FULL'),
  },
  BALANCED: {
    id: 'BALANCED',
    name: 'Balanced',
    summary: 'Full mask on Aadhaar & Cards; partial verification context on Email, Phone, IP & PAN.',
    policies: {
      EMAIL: 'PARTIAL',
      PHONE: 'PARTIAL',
      IP: 'PARTIAL',
      PAN: 'PARTIAL',
      AADHAAR: 'FULL',
      CREDIT_CARD: 'FULL',
    },
  },
  UTILITY: {
    id: 'UTILITY',
    name: 'Data Utility',
    summary: 'Consistent in-memory pseudonyms across all categories to preserve cross-record joins.',
    policies: createUniformPolicies('PSEUDONYM'),
  },
};
