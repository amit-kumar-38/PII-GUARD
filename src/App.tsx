import { Lock, ShieldCheck, ArrowRight } from 'lucide-react';
import { ActivityLog } from './components/ActivityLog/ActivityLog.tsx';
import { AegisPrivacyCore } from './components/AegisPrivacyCore/AegisPrivacyCore.tsx';
import { ComparisonView } from './components/ComparisonView/ComparisonView.tsx';
import { DetectionSummary } from './components/DetectionSummary/DetectionSummary.tsx';
import { Header } from './components/Header/Header.tsx';
import { InputPanel } from './components/InputPanel/InputPanel.tsx';
import { PiiInspector } from './components/PiiInspector/PiiInspector.tsx';
import { ProtectionTimeline } from './components/ProtectionTimeline/ProtectionTimeline.tsx';
import { RedactionControls } from './components/RedactionControls/RedactionControls.tsx';
import { usePiiGuard } from './hooks/usePiiGuard.ts';

export function App() {
  const {
    rawInput,
    isScanning,
    sourceType,
    uploadedFilename,
    csvHasHeader,
    mode,
    scanMode,
    activeProfile,
    policySummaryLabel,
    categoryPolicies,
    categoryFilter,
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
  } = usePiiGuard();

  const hasDocument = rawInput.trim().length > 0;

  return (
    <div className="pg-app">
      <a href="#main-workspace" className="pg-skip-link">
        Skip to sanitization workspace
      </a>

      <Header
        totalOccurrences={detectionSummary.totalOccurrences}
        sourceType={sourceType}
        scanMode={scanMode}
        shieldState={shieldVisualState}
      />

      <section className="pg-hero-split" aria-labelledby="hero-heading">
        <div className="pg-hero-copy">
          <p className="pg-eyebrow">PII GUARD — PRIVACY COCKPIT</p>
          <h2 id="hero-heading" className="pg-hero-heading">
            Sensitive data out. Useful context stays.
          </h2>
          <p className="pg-hero-sub">
            Detect, inspect, configure and sanitize sensitive PII locally in your browser before sharing logs, CSVs, or AI prompts.
          </p>

          <div className="pg-arch-flow" role="group" aria-label="Local privacy architecture">
            <span className="pg-arch-node">User Input</span>
            <ArrowRight size={15} aria-hidden="true" />
            <span className="pg-arch-node">Local Detection</span>
            <ArrowRight size={15} aria-hidden="true" />
            <span className="pg-arch-node">Local Transformation</span>
            <ArrowRight size={15} aria-hidden="true" />
            <span className="pg-arch-node pg-arch-node--safe">Protected Output</span>
          </div>

          <div className="pg-trust-pills">
            <span className="pg-trust-pill">
              <ShieldCheck size={14} aria-hidden="true" />
              LOCAL PROCESSING
            </span>
            <span className="pg-trust-pill">
              <Lock size={14} aria-hidden="true" />
              BROWSER MEMORY
            </span>
            <span className="pg-trust-pill">
              <Lock size={14} aria-hidden="true" />
              NO SERVER UPLOAD
            </span>
          </div>
        </div>

        <AegisPrivacyCore
          shieldState={shieldVisualState}
          totalOccurrences={detectionSummary.totalOccurrences}
          uniqueEntities={detectionSummary.totalUnique}
          mode={mode}
          scanMode={scanMode}
          activeProfile={activeProfile}
          policyLabel={policySummaryLabel}
          sourceType={sourceType}
        />
      </section>

      <main id="main-workspace" className="pg-main">
        <div className="pg-sr-only" role="status" aria-live="polite">
          {statusAnnouncement}
        </div>

        <InputPanel
          rawInput={rawInput}
          sourceType={sourceType}
          uploadedFilename={uploadedFilename}
          csvHasHeader={csvHasHeader}
          activeSampleId={activeSampleId}
          isScanning={isScanning}
          errorMessage={activeError}
          onTextChange={handleTextChange}
          onScanNow={handleScanNow}
          onFileSelect={handleFileUpload}
          onToggleCsvHeader={handleToggleCsvHeader}
          onLoadSample={handleLoadSample}
          onReset={handleReset}
        />

        <div className="pg-workbench-band">
          <RedactionControls
            mode={mode}
            scanMode={scanMode}
            activeProfile={activeProfile}
            categoryPolicies={categoryPolicies}
            onModeChange={handleModeChange}
            onScanModeChange={handleScanModeChange}
            onProfileChange={handleProfileChange}
            onCategoryPolicyChange={handleCategoryPolicyChange}
          />
          <DetectionSummary
            summary={detectionSummary}
            hasInput={hasDocument}
            scanMode={scanMode}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            exposureStats={exposureStats}
          />
        </div>

        <PiiInspector
          findings={filteredFindings}
          selectedFinding={selectedFinding}
          selectedIndex={selectedFindingIndex}
          categoryFilter={categoryFilter}
          sourceType={sourceType}
          scanMode={scanMode}
          onSelectFinding={handleSelectFinding}
          onPrevFinding={handlePrevFinding}
          onNextFinding={handleNextFinding}
          onOverrideFinding={handleFindingOverride}
        />

        <ComparisonView
          rawInput={rawInput}
          sourceType={sourceType}
          mode={mode}
          scanMode={scanMode}
          activeError={activeError}
          detectionSummary={detectionSummary}
          sanitizedSegments={textRedactionResult.segments}
          sanitizedOutputText={sanitizedOutputText}
          csvSanitizationResult={csvSanitizationResult}
          csvColumnProfiles={csvColumnProfiles}
          selectedFinding={selectedFinding}
          categoryFilter={categoryFilter}
          onSelectDetection={handleSelectFinding}
          onDownload={handleDownload}
        />

        <ProtectionTimeline steps={timelineSteps} />

        <ActivityLog
          events={auditEvents}
          mode={mode}
          scanMode={scanMode}
          activeProfile={activeProfile}
          transformedCount={exposureStats.transformedCount}
          summary={detectionSummary}
          onClearLog={handleClearLog}
        />
      </main>

      <footer className="pg-footer">
        <p>
          PII GUARD • Privacy Cockpit • Deterministic local regex + Luhn mod-10 + offline libphonenumber-js.
          Pattern matching does not guarantee 100% detection or legal compliance.
        </p>
        <p>
          Browser-memory isolation prevents server egress; always operate on trusted devices free of malicious extensions.
        </p>
      </footer>
    </div>
  );
}

export default App;
