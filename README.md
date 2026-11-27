LIVE:- https://piiguard-3ubfm0s3n-cloud-coders2.vercel.app/
# PII GUARD — Privacy Cockpit (Client-Side Data Sanitization Platform)

**Tagline:** *Your Data. Your Browser. Your Privacy.*

PII GUARD is a zero-egress, browser-only Personally Identifiable Information (PII) detection, inspection, policy configuration, and redaction workbench built for the Prompt War Hackathon. Users can paste raw text, choose from 7 synthetic sample scenarios, or upload `.txt` and `.csv` files to detect, classify, inspect, customize per-category or per-finding protection rules, and sanitize sensitive entities entirely in browser memory without transmitting document content or pseudonym mappings to external servers.

---

## Key Capabilities

1. **Privacy Cockpit Interface & AEGIS Privacy Core**
   - **AEGIS Privacy Core (`src/components/AegisPrivacyCore/AegisPrivacyCore.tsx`):** Interactive CSS 3D + SVG 7-layer shield reflecting live workspace telemetry across six states (`IDLE`, `SCANNING`, `PII_DETECTED`, `PROTECTED`, `CLEAN`, `ERROR`), supporting `prefers-reduced-motion` and touch/mobile fallbacks.
   - **Workflow Navigation & Privacy Boundary Banner (`src/components/Header/Header.tsx`):** Quick section links (`Source`, `Protect`, `Inspector`, `Verify`, `Audit`) alongside live in-memory status indicators.
   - **Protection Timeline (`src/components/ProtectionTimeline/ProtectionTimeline.tsx`):** Live 5-stage processing status (`Input received`, `Scan completed`, `Findings identified`, `Transformation applied`, `Protected output ready`) backed by actual workspace operations.

2. **Six Mandatory PII Categories (Deterministic Local Detection)**
   - **Email Addresses** (`emailDetector.ts`) — RFC-style bounded detection supporting mixed case, subdomains, and multi-label TLDs; case-normalized for pseudonymization.
   - **Phone Numbers** (`phoneDetector.ts` + `phoneValidation.ts`) — Indian (`+91`, `0`-prefixed, 10-digit mobile, landlines) and international formats validated offline via locally bundled `libphonenumber-js`.
   - **IP Addresses** (`ipDetector.ts` + `ipValidation.ts`) — Strict IPv4 (`0–255`, no leading-zero ambiguity) and RFC 4291 IPv6 (full, `::`-compressed, and IPv4-mapped) validation and canonical normalization.
   - **Indian PAN** (`panDetector.ts`) — Standard 10-character alphanumeric structure (`ABCDE1234F`) with strict Unicode alphanumeric boundaries and uppercase normalization.
   - **Indian Aadhaar** (`aadhaarDetector.ts`) — 12-digit grouped (`1234 5678 9012`, `1234-5678-9012`) and contiguous formats with boundary guards preventing partial matches in longer numbers.
   - **Credit Card Numbers (Luhn Verified)** (`creditCardDetector.ts` + `luhn.ts`) — Supports 13–19 digit candidates with spaces or hyphens; applies Luhn mod-10 validation and rejects invalid or all-zero candidates.

3. **Protection Policy Studio, Profiles & Inspector (`RedactionControls`, `DetectionSummary`, `PiiInspector`)**
   - **Scan Mode Switcher:** Toggle between **Detection Only** (inspect findings without masking) and **Auto-Sanitize** (apply transformations live in browser memory).
   - **Three Core Redaction Modes + Six Transformation Operators:** Supports **Full Mask** (`[REDACTED]`), **Partial Mask** (format-preserving), **Pseudonymize** (`EMAIL_001`, `PHONE_001`, `IP_001`, `PAN_001`, `AADHAAR_001`, `CARD_001`), plus per-category/per-finding **Category Label** (`[EMAIL]`), **Remove** (`""`), and **Keep Visible** operators.
   - **Policy Profiles:** One-click presets (`Balanced Default`, `Strict Compliance`, `Data Utility`, `Custom Policy`) and a per-category Transformation Policy Matrix (`6` categories x `6` operators).
   - **Interactive PII Inspector & Exposure Breakdown:** Category filter pills (`ALL` + 6 types), risk exposure strip, searchable/navigable findings list (`Previous` / `Next` finding controls), original-to-transformed preview, and per-finding operator overrides.

4. **7 Synthetic Test Scenarios & Structured CSV / TXT Processing**
   - **Synthetic Sample Library (`src/modules/sample/sampleData.ts`):** `Customer Support`, `Banking & KYC`, `Healthcare Triage`, `Employee Directory`, `E-Commerce Order`, `Developer Logs`, `AI Prompt Check`, plus **Load Sample CSV**. All samples use strictly fictional synthetic data.
   - **CSV Engine (`src/modules/csv/csvParser.ts`, `csvSanitizer.ts`):** Uses locally bundled **Papa Parse** with `dynamicTyping: false` to preserve leading zeros, quoted commas, escaped quotes, embedded newlines, empty cells, varying row lengths, UTF-8 BOM, CRLF/LF endings, and delimiters (`,`, `;`, `\t`, `|`). Scans and redacts both data cells and CSV headers, generates **CSV Column Profiling** cards using sanitized column labels, and exports `.sanitized.csv` / `.sanitized.txt` locally.

5. **Privacy, Security & Auditability**
   - **Zero-Egress Processing:** No backend API, no external LLM calls, no cloud DLP, and no analytics telemetry.
   - **No Persistent Sensitive Storage:** Raw documents and entity-to-pseudonym maps remain strictly in React/browser memory (never written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies).
   - **XSS-Safe Rendering:** User-supplied text and CSV cells render exclusively as escaped React text nodes (`dangerouslySetInnerHTML` is never used).
   - **Safe Activity & Policy Audit Log:** Logs processing actions, category totals, and mode/profile changes without ever recording raw PII values; exports safe `.json` audit summaries without raw PII.

---

## Validation & Privacy Reality Check

- **Luhn Checksum:** Luhn mod-10 validation is a format-level mathematical checksum; passing Luhn does **not** prove a credit card is genuine, active, or issued.
- **PAN / Aadhaar / Phone:** Detection validates syntactic patterns and offline numbering plans (`libphonenumber-js`); it does **not** verify official government records or active telecom subscribers.
- **Browser Privacy Boundary:** Processing in browser memory prevents server egress and persistent disk storage by this app, but cannot protect against compromised devices, malicious browser extensions, OS-level malware, or screenshots.

---

## Technology Stack

- **UI Framework:** React 19 + TypeScript 5.8
- **Build Tool & Test Runner:** Vite 6 + Vitest 3 + React Testing Library + jsdom
- **CSV Engine:** `papaparse` (bundled locally)
- **Offline Phone Validation:** `libphonenumber-js` (bundled locally)
- **Icons:** `lucide-react` (bundled locally, zero CDN assets)

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Run typecheck, unit/integration/security tests, and production build
npm run typecheck
npm test
npm run build

# 3. Start local development server
npm run dev
```

On Windows PowerShell environments where script execution policy restricts `npm.ps1`, invoke `npm.cmd` (e.g., `npm.cmd run dev`, `npm.cmd test`, `npm.cmd run build`).

---

## Google Services & Optional Firebase Hosting

To honor the strict client-side-only privacy boundary, **no runtime cloud services** (such as Firestore, Firebase Functions, Firebase Analytics, Gemini API, or Cloud DLP) receive or process uploaded documents.

Static deployment configuration is provided in [firebase.json](firebase.json) for **Firebase Hosting** (`public: "dist"`), including strict response security headers (`Content-Security-Policy` with `connect-src 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, and `Permissions-Policy`).

To deploy static assets with Firebase CLI (if desired):
```bash
npm run build
firebase deploy --only hosting
```
*(Note: `firebase.json` is configured in the repository; live cloud deployment requires an authenticated Firebase project and is not pre-deployed.)*
