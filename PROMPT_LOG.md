# PROMPT_LOG.md — PII GUARD Engineering & Sanitization Rule Log

## 1. Local Architecture & Zero-LLM Policy

PII GUARD intentionally avoids sending document text, CSV cells, or detected entities to any external LLM, cloud DLP service, or backend server. All detection, validation, redaction, CSV column profiling, and policy evaluation run deterministically inside the browser via local TypeScript modules.

## 2. Deterministic Detection & Validation Rules

| Category | Pattern & Validation Strategy | Normalization Key (Pseudonymization) |
|---|---|---|
| **EMAIL** | Bounded RFC-style regex + local/domain length & consecutive-dot checks (`src/modules/detection/emailDetector.ts`) | Lowercased address (`value.toLowerCase()`) |
| **PHONE** | Bounded candidate regex + offline `libphonenumber-js` validation for Indian (`IN`) and international formats (`src/modules/validation/phoneValidation.ts`) | E.164 canonical number (e.g., `+919876543210`) |
| **IP** | Strict IPv4 4-octet (`0–255`, no leading-zero ambiguity) and RFC 4291 IPv6 (`::` compression + embedded IPv4) checks (`src/modules/validation/ipValidation.ts`) | Canonical IPv4 or expanded lowercase 8-group IPv6 |
| **PAN** | `^[A-Za-z]{5}\d{4}[A-Za-z]$` with strict Unicode alphanumeric word boundaries (`src/modules/detection/panDetector.ts`) | Uppercased 10-char token (`value.toUpperCase()`) |
| **AADHAAR** | 12 digits in `4-4-4` (` ` or `-`) or contiguous form with `+` and longer-sequence boundary guards (`src/modules/detection/aadhaarDetector.ts`) | 12 stripped digits |
| **CREDIT_CARD** | 13–19 digit card-group candidates verified with Luhn mod-10 checksum and all-zero rejection (`src/modules/validation/luhn.ts`) | Stripped 13–19 digits |

## 3. Deterministic Overlap Resolution

Overlapping detections are resolved by `resolveOverlaps` (`src/modules/detection/detectionEngine.ts`) using:
1. Category specificity priority (`EMAIL > IP > CREDIT_CARD > AADHAAR > PAN > PHONE`).
2. Longer span length.
3. Earlier start offset.

Accepted detections are sorted ascending by start offset so characters are never redacted twice and surrounding punctuation/whitespace remain intact.

## 4. Redaction Modes, Policy Matrix & Per-Finding Overrides

- **Three Core Modes:** `FULL` (`[REDACTED]`), `PARTIAL` (category-specific masking in `src/modules/redaction/partialMask.ts`), and `PSEUDONYM` (`EMAIL_001`, `PHONE_001`, `IP_001`, `PAN_001`, `AADHAAR_001`, `CARD_001` via in-memory `PseudonymSession` in `src/modules/redaction/pseudonymization.ts`).
- **Six Transformation Operators (`TransformationOperator` in `src/types/pii.ts`):** `FULL`, `PARTIAL`, `PSEUDONYM`, `LABEL` (`[EMAIL]`, etc.), `REMOVE` (`""`), and `KEEP` (preserve original token).
- **Precedence (`src/modules/redaction/redactionEngine.ts`):** For text documents when Auto-Sanitize is active (`scanMode === 'AUTO_SANITIZE'`), `redactText` resolves each span using `findingOverrides[entity.id]` -> `categoryPolicies[entity.type]` -> global `mode`. Under `DETECT_ONLY`, original text is kept intact while inspection remains active.
- **Policy Profiles (`PRIVACY_PROFILES` in `src/types/pii.ts`):** `BALANCED` (uniform `PARTIAL`), `STRICT` (uniform `FULL`), `UTILITY` (uniform `PSEUDONYM`), plus `CUSTOM` when per-category matrix controls differ. `policySummaryLabel` in `usePiiGuard.ts` ensures AEGIS displays active uniform mode labels clearly rather than showing `CUSTOM` during standard mode switches.
- **CSV Sanitization & Column Profiling (`src/modules/csv/csvSanitizer.ts`):** Applies `categoryPolicies` per header and cell and computes `buildCsvColumnProfiles` using sanitized header strings so PII detected inside CSV headers is never leaked in column profiler cards.

## 5. Build, Accessibility & Verification Decisions Log

- **PowerShell Shim Handling:** Used `npm.cmd` and `npx.cmd` due to Windows PowerShell execution policy restricting `npm.ps1`.
- **Production CSP Meta Injection:** Configured `vite.config.ts` to inject a strict `<meta http-equiv="Content-Security-Policy">` (`connect-src 'none'`, `script-src 'self'`, `style-src 'self'`) during production builds (`apply: 'build'`) alongside `preview.headers` and `firebase.json`.
- **No Unwanted Scroll-on-Load (`HighlightedText.tsx`):** Replaced element `scrollIntoView` (which scrolled the outer browser window vertically down to the Verification workbench on initial load) with inner-container-only `container.scrollTo(...)` calculation.
- **ARIA & Contrast Compliance:** Added explicit `role="group"` / `role="region"` landmarks for `.pg-arch-flow`, `.pg-policy-matrix`, `.pg-exposure-strip`, and `.pg-csv-profiler`, roving `tabIndex` + arrow-key navigation in `RedactionControls`, and scrollable `tabIndex={0}` on `[role="log"]` in `ActivityLog`.
- **No-CDN Asset Policy & Typography Hierarchy:** All UI visuals (including the 7-layer AEGIS 3D CSS+SVG shield, icons via `lucide-react`, system UI + monospace stacks, and sample scenarios) are bundled locally with zero external fonts, scripts, or network calls. Root base font size was upgraded to `16px` (`clamp(2.25rem, 3.65vw, 3.35rem)` hero display heading, `clamp(1.55rem, 2.2vw, 1.95rem)` section headings, `1rem` buttons/inputs, `2.125rem` category statistics) while maintaining single-row header layout on `1440px`, single-row architecture pipeline on `1280px`, and zero horizontal overflow down to `360px`.
