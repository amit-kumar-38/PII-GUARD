import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CsvParseError, parseCsvContent } from '../modules/csv/csvParser.ts';
import {
  buildCsvColumnProfiles,
  sanitizeCsvDocument,
} from '../modules/csv/csvSanitizer.ts';
import { createEmptyCounts, detectPii } from '../modules/detection/detectionEngine.ts';
import { createPseudonymSession } from '../modules/redaction/pseudonymization.ts';
import {
  redactText,
  resolveOperatorForDetection,
  type RedactedSegment,
} from '../modules/redaction/redactionEngine.ts';
import {
  SYNTHETIC_SAMPLE_CSV,
  SYNTHETIC_SAMPLE_LIBRARY,
  SYNTHETIC_SAMPLE_TEXT,
  type SampleScenarioId,
} from '../modules/sample/sampleData.ts';
import {
  MAX_TEXT_LENGTH,
  buildSanitizedDownloadFilename,
  createAuditEvent,
  formatBytes,
  readLocalFileText,
  triggerLocalDownload,
} from '../modules/security/privacyGuard.ts';
import {
  CATEGORY_SEVERITY,
  PRIVACY_PROFILES,
  createUniformPolicies,
  type AuditEvent,
  type CategoryPolicyMap,
  type CsvColumnProfile,
  type CsvDocument,
  type CsvSanitizationResult,
  type DetectionResult,
  type InputSourceType,
  type InspectorFinding,
  type PiiCategory,
  type PrivacyProfileId,
  type PseudonymSession,
  type RedactionMode,
  type ScanMode,
  type ShieldVisualState,
  type TimelineStep,
  type TransformationOperator,
} from '../types/pii.ts';

const DEBOUNCE_MS = 150;

const EMPTY_DETECTION_RESULT: DetectionResult = {
  detections: [],
  categoryCounts: createEmptyCounts(),
  uniqueCounts: createEmptyCounts(),
  totalOccurrences: 0,
  totalUnique: 0,
  rejectedCardCandidates: 0,
  rejectedIpCandidates: 0,
};

const MODE_LABELS: Record<RedactionMode, string> = {
  FULL: 'Full Mask ([REDACTED])',
  PARTIAL: 'Partial Mask (Format-Preserving)',
  PSEUDONYM: 'Consistent Pseudonymization',
};

function nowTimeStr(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function usePiiGuard() {
  const [rawInput, setRawInput] = useState<string>('');
  const [debouncedInput, setDebouncedInput] = useState<string>('');
  const [sourceType, setSourceType] = useState<InputSourceType>('text');
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [csvHasHeader, setCsvHasHeader] = useState<boolean>(true);
  const [mode, setMode] = useState<RedactionMode>('PARTIAL');
  const [scanMode, setScanMode] = useState<ScanMode>('PROTECT');
  const [activeProfile, setActiveProfile] = useState<PrivacyProfileId>('CUSTOM');
  const [categoryPolicies, setCategoryPolicies] = useState<CategoryPolicyMap>(() =>
    createUniformPolicies('PARTIAL'),
  );
  const [findingOverrides, setFindingOverrides] = useState<
    Record<string, TransformationOperator>
  >({});
  const [categoryFilter, setCategoryFilter] = useState<PiiCategory | 'ALL'>('ALL');
  const [selectedFindingKey, setSelectedFindingKey] = useState<string | null>(null);
  const [activeSampleId, setActiveSampleId] = useState<SampleScenarioId>('support');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');
  const [stepTimestamps, setStepTimestamps] = useState<{
    inputAt?: string;
    scanAt?: string;
    transformAt?: string;
    exportAt?: string;
  }>({});
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => [
    createAuditEvent(
      'SYSTEM',
      'PII GUARD Privacy Cockpit initialized in local browser memory',
      'Zero-egress mode active. No external network calls or persistent storage.',
    ),
  ]);

  const pseudonymSessionRef = useRef<PseudonymSession>(createPseudonymSession());
  const skipNextDebounceRef = useRef<boolean>(false);
  const lastLoggedScanKeyRef = useRef<string>('');

  const pushAuditEvent = useCallback(
    (type: AuditEvent['type'], message: string, details?: string) => {
      setAuditEvents((prev) =>
        [createAuditEvent(type, message, details), ...prev].slice(0, 100),
      );
    },
    [],
  );

  // Debounce typed text changes to keep rapid editing responsive.
  useEffect(() => {
    if (skipNextDebounceRef.current) {
      skipNextDebounceRef.current = false;
      setDebouncedInput(rawInput);
      return;
    }

    const timer = window.setTimeout(() => {
      setDebouncedInput(rawInput);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [rawInput]);

  const isMixedMatrix = useMemo(() => {
    const first = categoryPolicies.EMAIL;
    return Object.values(categoryPolicies).some((op) => op !== first);
  }, [categoryPolicies]);

  const policySummaryLabel = useMemo(() => {
    if (activeProfile !== 'CUSTOM') {
      return PRIVACY_PROFILES[activeProfile].name;
    }
    return isMixedMatrix ? 'Custom Matrix' : MODE_LABELS[mode];
  }, [activeProfile, isMixedMatrix, mode]);

  const isScanning = rawInput !== debouncedInput;

  const parsedCsv = useMemo<{ doc: CsvDocument | null; error: string | null }>(() => {
    if (sourceType !== 'csv' || debouncedInput.trim().length === 0) {
      return { doc: null, error: null };
    }
    try {
      const doc = parseCsvContent(debouncedInput, { hasHeader: csvHasHeader });
      return { doc, error: null };
    } catch (err) {
      const msg =
        err instanceof CsvParseError
          ? err.message
          : 'Unable to parse CSV structure safely.';
      return { doc: null, error: msg };
    }
  }, [sourceType, debouncedInput, csvHasHeader]);

  const activeError = errorMessage ?? parsedCsv.error;

  const textDetectionResult = useMemo<DetectionResult>(() => {
    if (sourceType === 'csv') {
      return EMPTY_DETECTION_RESULT;
    }
    if (!debouncedInput || debouncedInput.trim().length === 0) {
      return EMPTY_DETECTION_RESULT;
    }
    return detectPii(debouncedInput);
  }, [sourceType, debouncedInput]);

  const textRedactionResult = useMemo<{
    sanitizedText: string;
    segments: RedactedSegment[];
    replacements: Map<string, string>;
  }>(() => {
    if (sourceType === 'csv' || !debouncedInput) {
      return { sanitizedText: '', segments: [], replacements: new Map() };
    }
    const output = redactText(
      debouncedInput,
      textDetectionResult.detections,
      mode,
      pseudonymSessionRef.current,
      categoryPolicies,
      findingOverrides,
    );
    return {
      sanitizedText: output.sanitizedText,
      segments: output.segments,
      replacements: output.replacements,
    };
  }, [
    sourceType,
    debouncedInput,
    textDetectionResult,
    mode,
    categoryPolicies,
    findingOverrides,
  ]);

  const csvSanitizationResult = useMemo<CsvSanitizationResult | null>(() => {
    if (sourceType !== 'csv' || !parsedCsv.doc) {
      return null;
    }
    return sanitizeCsvDocument(
      parsedCsv.doc,
      mode,
      pseudonymSessionRef.current,
      categoryPolicies,
    );
  }, [sourceType, parsedCsv.doc, mode, categoryPolicies]);

  const csvColumnProfiles = useMemo<CsvColumnProfile[]>(() => {
    if (sourceType !== 'csv' || !csvSanitizationResult) {
      return [];
    }
    return buildCsvColumnProfiles(csvSanitizationResult);
  }, [sourceType, csvSanitizationResult]);

  const detectionSummary: DetectionResult =
    sourceType === 'csv'
      ? (csvSanitizationResult?.summary ?? EMPTY_DETECTION_RESULT)
      : textDetectionResult;

  const sanitizedOutputText =
    scanMode === 'DETECT_ONLY'
      ? ''
      : sourceType === 'csv'
        ? (csvSanitizationResult?.sanitizedCsvText ?? '')
        : textRedactionResult.sanitizedText;

  // Build unified findings list for the Interactive PII Inspector (Text + CSV).
  const allFindings = useMemo<InspectorFinding[]>(() => {
    if (activeError || !debouncedInput.trim()) {
      return [];
    }

    if (sourceType === 'csv' && csvSanitizationResult) {
      const items: InspectorFinding[] = [];
      for (const hScan of csvSanitizationResult.headerScans) {
        const colName =
          csvSanitizationResult.sanitizedHeaders?.[hScan.colIndex] ||
          `Column ${hScan.colIndex + 1}`;
        for (const det of hScan.detections) {
          const op = categoryPolicies[det.category];
          items.push({
            key: `csv:h:${hScan.colIndex}:${det.id}`,
            detection: det,
            locationLabel: `Header col ${hScan.colIndex + 1} (${det.start}–${det.end})`,
            rowIndex: -1,
            colIndex: hScan.colIndex,
            columnName: colName,
            appliedOperator: op,
            transformedValue:
              scanMode === 'DETECT_ONLY' ? det.value : hScan.sanitized,
            isOverridden: false,
            severity: CATEGORY_SEVERITY[det.category],
          });
        }
      }
      for (const cScan of csvSanitizationResult.cellScans) {
        const colName =
          csvSanitizationResult.sanitizedHeaders?.[cScan.colIndex] ||
          `Column ${cScan.colIndex + 1}`;
        for (const det of cScan.detections) {
          const op = categoryPolicies[det.category];
          items.push({
            key: `csv:r${cScan.rowIndex}:c${cScan.colIndex}:${det.id}`,
            detection: det,
            locationLabel: `Row ${cScan.rowIndex + 1}, Col ${cScan.colIndex + 1} (${det.start}–${det.end})`,
            rowIndex: cScan.rowIndex,
            colIndex: cScan.colIndex,
            columnName: colName,
            appliedOperator: op,
            transformedValue:
              scanMode === 'DETECT_ONLY' ? det.value : cScan.sanitized,
            isOverridden: false,
            severity: CATEGORY_SEVERITY[det.category],
          });
        }
      }
      return items;
    }

    return textDetectionResult.detections.map((det) => {
      const op = resolveOperatorForDetection(
        det,
        mode,
        categoryPolicies,
        findingOverrides,
      );
      const transformed =
        scanMode === 'DETECT_ONLY'
          ? det.value
          : (textRedactionResult.replacements.get(det.id) ?? det.value);
      return {
        key: det.id,
        detection: det,
        locationLabel: `Chars ${det.start}–${det.end}`,
        appliedOperator: op,
        transformedValue: transformed,
        isOverridden: Boolean(findingOverrides[det.id]),
        severity: CATEGORY_SEVERITY[det.category],
      };
    });
  }, [
    activeError,
    debouncedInput,
    sourceType,
    csvSanitizationResult,
    textDetectionResult,
    textRedactionResult.replacements,
    mode,
    categoryPolicies,
    findingOverrides,
    scanMode,
  ]);

  const filteredFindings = useMemo<InspectorFinding[]>(() => {
    if (categoryFilter === 'ALL') {
      return allFindings;
    }
    return allFindings.filter((f) => f.detection.category === categoryFilter);
  }, [allFindings, categoryFilter]);

  const selectedFindingIndex = useMemo(() => {
    if (filteredFindings.length === 0) return -1;
    const idx = filteredFindings.findIndex((f) => f.key === selectedFindingKey);
    return idx >= 0 ? idx : 0;
  }, [filteredFindings, selectedFindingKey]);

  const selectedFinding: InspectorFinding | null =
    selectedFindingIndex >= 0 ? (filteredFindings[selectedFindingIndex] ?? null) : null;

  // Keep selectedFindingKey synchronized when findings list updates.
  useEffect(() => {
    if (filteredFindings.length === 0) {
      if (selectedFindingKey !== null) {
        setSelectedFindingKey(null);
      }
      return;
    }
    if (!filteredFindings.some((f) => f.key === selectedFindingKey)) {
      setSelectedFindingKey(filteredFindings[0]?.key ?? null);
    }
  }, [filteredFindings, selectedFindingKey]);

  // Record real scan timestamps & safe audit totals when scan output updates.
  useEffect(() => {
    if (!debouncedInput.trim() || activeError) {
      return;
    }

    const time = nowTimeStr();
    setStepTimestamps((prev) => ({
      inputAt: prev.inputAt ?? time,
      scanAt: time,
      transformAt: scanMode === 'PROTECT' ? time : prev.transformAt,
      exportAt: prev.exportAt,
    }));

    const counts = detectionSummary.categoryCounts;
    const scanKey = `${sourceType}|${debouncedInput.length}|${detectionSummary.totalOccurrences}|${counts.EMAIL},${counts.PHONE},${counts.IP},${counts.PAN},${counts.AADHAAR},${counts.CREDIT_CARD}|${detectionSummary.rejectedCardCandidates}`;
    if (scanKey === lastLoggedScanKeyRef.current) {
      return;
    }
    lastLoggedScanKeyRef.current = scanKey;

    const summaryParts = [
      `Email:${counts.EMAIL}`,
      `Phone:${counts.PHONE}`,
      `IP:${counts.IP}`,
      `PAN:${counts.PAN}`,
      `Aadhaar:${counts.AADHAAR}`,
      `Card:${counts.CREDIT_CARD}`,
    ].join(' · ');

    const rejectedNote =
      detectionSummary.rejectedCardCandidates > 0
        ? ` | Rejected non-Luhn cards: ${detectionSummary.rejectedCardCandidates}`
        : '';

    pushAuditEvent(
      'SCAN',
      `Scanned ${sourceType.toUpperCase()} (${detectionSummary.totalOccurrences} detections across ${detectionSummary.totalUnique} unique entities)`,
      `${summaryParts}${rejectedNote}`,
    );
  }, [
    debouncedInput,
    activeError,
    detectionSummary,
    sourceType,
    scanMode,
    pushAuditEvent,
  ]);

  const shieldVisualState: ShieldVisualState = useMemo(() => {
    if (activeError) return 'ERROR';
    if (!rawInput.trim()) return 'IDLE';
    if (isScanning) return 'SCANNING';
    if (detectionSummary.totalOccurrences === 0) return 'CLEAN';
    if (scanMode === 'DETECT_ONLY') return 'PII_DETECTED';
    return 'PROTECTED';
  }, [activeError, rawInput, isScanning, detectionSummary.totalOccurrences, scanMode]);

  const timelineSteps: TimelineStep[] = useMemo(() => {
    const hasDoc = rawInput.trim().length > 0;
    const scanned = hasDoc && !isScanning && !activeError;
    const hasFindings = scanned && detectionSummary.totalOccurrences > 0;
    const transformed = scanned && scanMode === 'PROTECT';

    return [
      {
        id: 'input',
        label: 'Input received',
        status: activeError && !hasDoc ? 'error' : hasDoc ? 'completed' : 'pending',
        timestamp: hasDoc ? stepTimestamps.inputAt : undefined,
        detail: hasDoc
          ? `${sourceType.toUpperCase()} buffer (${rawInput.length.toLocaleString()} chars)`
          : 'Awaiting pasted text or local file',
      },
      {
        id: 'scan',
        label: 'Scan completed',
        status: activeError
          ? 'error'
          : isScanning
            ? 'active'
            : scanned
              ? 'completed'
              : 'pending',
        timestamp: scanned ? stepTimestamps.scanAt : undefined,
        detail: isScanning
          ? 'Running local deterministic detectors'
          : scanned
            ? '6 local detectors + Luhn + overlap resolution'
            : 'Not scanned yet',
      },
      {
        id: 'findings',
        label: 'Findings identified',
        status: activeError
          ? 'error'
          : scanned
            ? 'completed'
            : 'pending',
        timestamp: scanned ? stepTimestamps.scanAt : undefined,
        detail: scanned
          ? hasFindings
            ? `${detectionSummary.totalOccurrences} entities (${detectionSummary.totalUnique} unique)`
            : '0 PII entities detected'
          : 'Pending scan',
      },
      {
        id: 'transform',
        label: 'Transformation applied',
        status: activeError
          ? 'error'
          : transformed
            ? 'completed'
            : scanned && scanMode === 'DETECT_ONLY'
              ? 'active'
              : 'pending',
        timestamp: transformed ? stepTimestamps.transformAt : undefined,
        detail:
          scanMode === 'DETECT_ONLY'
            ? 'Paused in Detection-Only mode'
            : transformed
              ? `Policy: ${policySummaryLabel}`
              : 'Awaiting protection run',
      },
      {
        id: 'ready',
        label: 'Protected output ready',
        status: activeError
          ? 'error'
          : transformed && Boolean(sanitizedOutputText)
            ? 'completed'
            : 'pending',
        timestamp: stepTimestamps.exportAt ?? (transformed ? stepTimestamps.transformAt : undefined),
        detail: stepTimestamps.exportAt
          ? 'Exported locally to device'
          : transformed
            ? 'Ready for review, copy, or local download'
            : 'Available when protection is active',
      },
    ];
  }, [
    rawInput,
    sourceType,
    isScanning,
    activeError,
    detectionSummary,
    scanMode,
    activeProfile,
    sanitizedOutputText,
    stepTimestamps,
  ]);

  const exposureStats = useMemo(() => {
    const counts = detectionSummary.categoryCounts;
    const financialCount = counts.CREDIT_CARD;
    const governmentCount = counts.PAN + counts.AADHAAR;
    const contactCount = counts.EMAIL + counts.PHONE;
    const networkCount = counts.IP;
    const highSensitivityCount = counts.CREDIT_CARD + counts.AADHAAR + counts.PAN;

    let transformedCount = 0;
    let excludedCount = 0;
    let unmaskedCount = 0;

    for (const f of allFindings) {
      if (scanMode === 'DETECT_ONLY') {
        unmaskedCount += 1;
      } else if (f.appliedOperator === 'KEEP') {
        excludedCount += 1;
        unmaskedCount += 1;
      } else {
        transformedCount += 1;
      }
    }

    return {
      financialCount,
      governmentCount,
      contactCount,
      networkCount,
      highSensitivityCount,
      transformedCount,
      excludedCount,
      unmaskedCount,
    };
  }, [detectionSummary.categoryCounts, allFindings, scanMode]);

  const handleTextChange = useCallback(
    (nextText: string) => {
      if (nextText.length > MAX_TEXT_LENGTH) {
        setErrorMessage(
          `Input exceeds ${MAX_TEXT_LENGTH.toLocaleString()} character safety limit.`,
        );
        pushAuditEvent('ERROR', 'Text input rejected: exceeded character safety limit');
        return;
      }
      setErrorMessage(null);
      if (sourceType !== 'text') {
        setSourceType('text');
        setUploadedFilename(null);
      }
      setFindingOverrides({});
      setStepTimestamps((prev) => ({
        ...prev,
        inputAt: prev.inputAt ?? nowTimeStr(),
      }));
      setRawInput(nextText);
    },
    [sourceType, pushAuditEvent],
  );

  const handleScanNow = useCallback(() => {
    skipNextDebounceRef.current = true;
    setDebouncedInput(rawInput);
    setStatusAnnouncement('Manual local scan completed');
  }, [rawInput]);

  const handleModeChange = useCallback(
    (nextMode: RedactionMode) => {
      setMode(nextMode);
      setCategoryPolicies(createUniformPolicies(nextMode));
      setActiveProfile(
        nextMode === 'FULL'
          ? 'STRICT'
          : nextMode === 'PSEUDONYM'
            ? 'UTILITY'
            : 'CUSTOM',
      );
      setStatusAnnouncement(`Redaction mode switched to ${MODE_LABELS[nextMode]}`);
      pushAuditEvent('MODE_CHANGE', `Switched redaction mode to ${MODE_LABELS[nextMode]}`);
    },
    [pushAuditEvent],
  );

  const handleProfileChange = useCallback(
    (profileId: Exclude<PrivacyProfileId, 'CUSTOM'>) => {
      const profile = PRIVACY_PROFILES[profileId];
      setActiveProfile(profileId);
      setCategoryPolicies({ ...profile.policies });
      if (profileId === 'STRICT') setMode('FULL');
      else if (profileId === 'UTILITY') setMode('PSEUDONYM');
      else setMode('PARTIAL');

      if (scanMode === 'DETECT_ONLY') {
        setScanMode('PROTECT');
      }
      setStatusAnnouncement(`Applied ${profile.name} privacy profile`);
      pushAuditEvent('MODE_CHANGE', `Applied privacy profile: ${profile.name}`, profile.summary);
    },
    [scanMode, pushAuditEvent],
  );

  const handleCategoryPolicyChange = useCallback(
    (category: PiiCategory, operator: TransformationOperator) => {
      setCategoryPolicies((prev) => ({
        ...prev,
        [category]: operator,
      }));
      setActiveProfile('CUSTOM');
      if (scanMode === 'DETECT_ONLY') {
        setScanMode('PROTECT');
      }
      setStatusAnnouncement(`Updated ${category} transformation operator to ${operator}`);
      pushAuditEvent('MODE_CHANGE', `Updated ${category} policy to ${operator}`);
    },
    [scanMode, pushAuditEvent],
  );

  const handleScanModeChange = useCallback(
    (nextScanMode: ScanMode) => {
      if (nextScanMode === scanMode) return;
      setScanMode(nextScanMode);
      const label =
        nextScanMode === 'DETECT_ONLY'
          ? 'Detection Only (no redaction applied)'
          : 'Detection & Protection';
      setStatusAnnouncement(`Switched cockpit mode to ${label}`);
      pushAuditEvent('MODE_CHANGE', `Switched scan mode to ${label}`);
    },
    [scanMode, pushAuditEvent],
  );

  const handleFindingOverride = useCallback(
    (findingId: string, operator: TransformationOperator | null) => {
      setFindingOverrides((prev) => {
        const next = { ...prev };
        if (operator === null) {
          delete next[findingId];
        } else {
          next[findingId] = operator;
        }
        return next;
      });
      setStatusAnnouncement(
        operator === null
          ? 'Cleared per-finding transformation override'
          : `Applied ${operator} override to selected finding`,
      );
    },
    [],
  );

  const handleSelectFinding = useCallback((key: string) => {
    setSelectedFindingKey(key);
  }, []);

  const handlePrevFinding = useCallback(() => {
    if (filteredFindings.length === 0) return;
    const prevIdx =
      selectedFindingIndex <= 0
        ? filteredFindings.length - 1
        : selectedFindingIndex - 1;
    const target = filteredFindings[prevIdx];
    if (target) setSelectedFindingKey(target.key);
  }, [filteredFindings, selectedFindingIndex]);

  const handleNextFinding = useCallback(() => {
    if (filteredFindings.length === 0) return;
    const nextIdx = (selectedFindingIndex + 1) % filteredFindings.length;
    const target = filteredFindings[nextIdx];
    if (target) setSelectedFindingKey(target.key);
  }, [filteredFindings, selectedFindingIndex]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        setErrorMessage(null);
        const loaded = await readLocalFileText(file);
        if (loaded.text.length > MAX_TEXT_LENGTH) {
          throw new Error(
            `File content exceeds ${MAX_TEXT_LENGTH.toLocaleString()} character safety limit.`,
          );
        }

        if (loaded.extension === 'csv') {
          parseCsvContent(loaded.text, { hasHeader: csvHasHeader });
        }

        pseudonymSessionRef.current = createPseudonymSession();
        lastLoggedScanKeyRef.current = '';
        skipNextDebounceRef.current = true;
        setFindingOverrides({});
        setCategoryFilter('ALL');
        setStepTimestamps({ inputAt: nowTimeStr() });

        setSourceType(loaded.extension);
        setUploadedFilename(file.name);
        setRawInput(loaded.text);
        setDebouncedInput(loaded.text);

        const sizeText = formatBytes(loaded.sizeBytes);
        setStatusAnnouncement(
          `Loaded .${loaded.extension} file locally (${sizeText})`,
        );
        pushAuditEvent(
          'FILE_IMPORT',
          `Imported local .${loaded.extension} document (${sizeText})`,
          'Processed in browser memory; filename withheld from audit log for privacy.',
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Unable to read the selected file.';
        setErrorMessage(msg);
        setStatusAnnouncement(`File import error: ${msg}`);
        pushAuditEvent('ERROR', 'Local file import failed', msg);
      }
    },
    [csvHasHeader, pushAuditEvent],
  );

  const handleLoadSample = useCallback(
    (sampleKind: 'text' | 'csv' = 'text', scenarioId: SampleScenarioId = 'support') => {
      pseudonymSessionRef.current = createPseudonymSession();
      lastLoggedScanKeyRef.current = '';
      skipNextDebounceRef.current = true;
      setFindingOverrides({});
      setCategoryFilter('ALL');
      setErrorMessage(null);
      setStepTimestamps({ inputAt: nowTimeStr() });

      if (sampleKind === 'csv') {
        setSourceType('csv');
        setUploadedFilename('synthetic-sample.csv');
        setRawInput(SYNTHETIC_SAMPLE_CSV);
        setDebouncedInput(SYNTHETIC_SAMPLE_CSV);
        setStatusAnnouncement('Loaded synthetic sample CSV dataset');
        pushAuditEvent(
          'SAMPLE_LOAD',
          'Loaded synthetic sample CSV dataset (fictional test data only)',
        );
      } else {
        const chosen =
          SYNTHETIC_SAMPLE_LIBRARY.find((s) => s.id === scenarioId) ??
          SYNTHETIC_SAMPLE_LIBRARY[0]!;
        const content =
          scenarioId === 'support' ? SYNTHETIC_SAMPLE_TEXT : chosen.content;
        setActiveSampleId(chosen.id);
        setSourceType('text');
        setUploadedFilename(null);
        setRawInput(content);
        setDebouncedInput(content);
        setStatusAnnouncement(`Loaded synthetic ${chosen.label} sample`);
        pushAuditEvent(
          'SAMPLE_LOAD',
          `Loaded synthetic ${chosen.label} sample (fictional test data only)`,
        );
      }
    },
    [pushAuditEvent],
  );

  const handleReset = useCallback(() => {
    pseudonymSessionRef.current = createPseudonymSession();
    lastLoggedScanKeyRef.current = '';
    skipNextDebounceRef.current = true;

    setRawInput('');
    setDebouncedInput('');
    setSourceType('text');
    setUploadedFilename(null);
    setFindingOverrides({});
    setCategoryFilter('ALL');
    setSelectedFindingKey(null);
    setStepTimestamps({});
    setErrorMessage(null);
    setStatusAnnouncement('Workspace cleared and in-memory pseudonym mappings reset');
    pushAuditEvent(
      'RESET',
      'Cleared workspace and wiped in-memory pseudonymization maps',
    );
  }, [pushAuditEvent]);

  const handleDownload = useCallback(() => {
    if (!sanitizedOutputText || activeError || scanMode === 'DETECT_ONLY') {
      return;
    }
    const filename = buildSanitizedDownloadFilename(uploadedFilename, sourceType);
    triggerLocalDownload(sanitizedOutputText, filename, sourceType === 'csv');
    setStepTimestamps((prev) => ({
      ...prev,
      exportAt: nowTimeStr(),
    }));
    setStatusAnnouncement(
      `Downloaded sanitized .${sourceType === 'csv' ? 'csv' : 'txt'} file`,
    );
    pushAuditEvent(
      'FILE_EXPORT',
      `Exported sanitized .${sourceType === 'csv' ? 'csv' : 'txt'} file locally`,
      `Profile: ${activeProfile} | Mode: ${MODE_LABELS[mode]}`,
    );
  }, [
    sanitizedOutputText,
    activeError,
    scanMode,
    uploadedFilename,
    sourceType,
    activeProfile,
    mode,
    pushAuditEvent,
  ]);

  const handleClearLog = useCallback(() => {
    setAuditEvents([
      createAuditEvent('SYSTEM', 'Audit log cleared by user (local memory only)'),
    ]);
    setStatusAnnouncement('Processing log cleared');
  }, []);

  const handleToggleCsvHeader = useCallback(
    (hasHeader: boolean) => {
      setCsvHasHeader(hasHeader);
      pushAuditEvent(
        'SYSTEM',
        `CSV header-row preservation ${hasHeader ? 'enabled' : 'disabled'}`,
      );
    },
    [pushAuditEvent],
  );

  return {
    rawInput,
    debouncedInput,
    isScanning,
    sourceType,
    uploadedFilename,
    csvHasHeader,
    mode,
    scanMode,
    activeProfile,
    policySummaryLabel,
    categoryPolicies,
    findingOverrides,
    categoryFilter,
    allFindings,
    filteredFindings,
    selectedFinding,
    selectedFindingIndex,
    activeSampleId,
    activeError,
    statusAnnouncement,
    auditEvents,
    detectionSummary,
    exposureStats,
    shieldVisualState,
    timelineSteps,
    textRedactionResult,
    csvSanitizationResult,
    csvColumnProfiles,
    sanitizedOutputText,
    handleTextChange,
    handleScanNow,
    handleModeChange,
    handleProfileChange,
    handleCategoryPolicyChange,
    handleScanModeChange,
    handleFindingOverride,
    setCategoryFilter,
    handleSelectFinding,
    handlePrevFinding,
    handleNextFinding,
    handleFileUpload,
    handleLoadSample,
    handleReset,
    handleDownload,
    handleClearLog,
    handleToggleCsvHeader,
    pushAuditEvent,
  };
}
