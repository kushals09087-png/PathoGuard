# Genome Firewall — Backend Integration Audit
**Date**: October 15, 2026  
**Auditor**: Senior Backend Architect & Bioinformatics Engineer  
**Scope**: Full inspection of existing frontend (`src/lib/api.ts`, `src/types/contracts.ts`, `src/app/**`) against Master Engineering Reference and Competitive Evaluation.

---

## 1. Executive Summary

The frontend application is an explainable resistance-evidence review platform with strict scientific invariants:
- **No treatment advice** (D-02)
- **No per-isolate numeric probabilities** (D-01)
- **Rules-based explainability** (D-03)
- **Discordance review is the headline differentiator** (D-04)
- **Absence of a marker is `INSUFFICIENT_EVIDENCE`, never susceptible** (D-10)
- **MVP organisms**: *Escherichia coli*, *Klebsiella pneumoniae*, *Staphylococcus aureus* (D-05)
- **Assembled FASTA input only** (D-06)
- **Mandatory Use Disclaimer**: `"For research and surveillance use only. Not for clinical diagnosis or treatment decisions."`

The frontend communicates through `api` (`src/lib/api.ts`) pointing to `NEXT_PUBLIC_API_BASE_URL` (default: `http://localhost:8000/api/v1`). It includes a dev mock mode toggle for offline demonstration, but expects a full-featured FastAPI REST API backend.

---

## 2. Comprehensive Frontend API Inventory

The frontend makes the following HTTP calls which the backend must service:

| # | Endpoint | HTTP Method | Frontend Caller | Request Payload / Params | Expected Response Schema | Auth & Scope Requirement |
|---|---|---|---|---|---|---|
| 1 | `/health` (or `/health/live`, `/health/ready`) | `GET` | System health check / `api.getHealth()` | None | `{ status: str, db: str, engine: str, time: str }` | Public |
| 2 | `/scope` | `GET` | Wizard / `api.getScope()` | None | `ScopeResponse`: `{ organisms: [{ name, amrfinderOrganismFlag, antibiotics, plausibleLengthMb }], maxUploadBytes, useStatement }` | Public |
| 3 | `/benchmarks` | `GET` | Overview, Drawer, Methodology / `api.getBenchmarks()` | Query: `organism?`, `antibiotic?` | `{ items: PairReliabilityBenchmark[] }` | Public |
| 4 | `/demo-datasets` | `GET` | Overview, Wizard / `api.getDemoDatasets()` | None | `{ items: DemoDataset[] }` | Public |
| 5 | `/auth/login` | `POST` | Login screen / `useAuth().login()` | `{ labId: str, accessKey: str }` | `{ token: str, lab: { labId, labName, facilityType, location } }` | Public (Rate-limited) |
| 6 | `/auth/me` | `GET` | Auth provider initialization | None | `{ labId: str, labName: str, facilityType: str, location: str }` | Authenticated |
| 7 | `/auth/logout` | `POST` | Sign out button | None | `{ status: "ok" }` | Authenticated |
| 8 | `/samples` | `POST` | Wizard Step 2 / `api.createSample()` | `{ label: str, organism: str, sourceType: str, isSynthetic: bool, collectionYear?: int, country?: str, state?: str, provenance?: str }` | `Sample`: `{ id, label, organism, sourceType, isSynthetic, createdAt, labId }` | Authenticated (Scoped to `labId`) |
| 9 | `/genome-files` | `POST` | Wizard Step 3 / `api.uploadGenomeFile()` | `multipart/form-data`: `sampleId: str`, `file: UploadFile` | `GenomeFile`: `{ id, sampleId, fileName, checksumSha256, sizeBytes, storageKey, uploadStatus, contigCount?, totalLength?, n50?, nFraction?, gcPercent?, createdAt }` | Authenticated (Scoped to `labId`) |
| 10 | `/analyses` | `POST` | Wizard Step 5 / `api.createAnalysis()` | `{ sampleId?: str, fileId?: str, organism: str, demoId?: str }`, Header: `Idempotency-Key` | `Analysis`: `{ id, sampleId, fileId, organism, status: "QUEUED", resultOrigin, attempts, createdAt, labId }` | Authenticated (Scoped to `labId`) |
| 11 | `/analyses` | `GET` | History, Overview / `api.getAnalyses()` | Query: `limit?`, `cursor?`, `organism?`, `status?`, `search?` | `{ items: Analysis[], nextCursor?: str }` | Authenticated (Strictly filtered by `labId`) |
| 12 | `/analyses/{id}` | `GET` | Progress polling, Results / `api.getAnalysis()` | Path: `id` | `Analysis` aggregate with `status`, `stageProgress`, `qc`, `toolVersions`, `counts` | Authenticated (Ownership check) |
| 13 | `/analyses/{id}/cancel` | `POST` | Analysis view / `api.cancelAnalysis()` | Path: `id` | `{ success: bool }` | Authenticated (Must be `QUEUED`) |
| 14 | `/analyses/{id}/findings` | `GET` | Results dashboard / `api.getAnalysisFindings()` | Path: `id`, Query: `quality?`, `limit?` | `{ items: Finding[] }` (symbol, name, method, identity, coverage, contigId, start, stop, detectionQuality) | Authenticated (Must be `COMPLETED`) |
| 15 | `/analyses/{id}/assessments` | `GET` | Matrix & Drawer / `api.getAnalysisAssessments()` | Path: `id` | `{ items: AntibioticAssessment[] }` (organism, antibiotic, resultCategory, evidenceTier, ruleIds, findingIds, capped, explanation, limitations, hasDiscordance) | Authenticated (Must be `COMPLETED`) |
| 16 | `/analyses/{id}/evidence` | `GET` | Drawer / `api.getAnalysisEvidence()` | Path: `id`, Query: `assessmentId?` | `{ items: EvidenceLink[] }` | Authenticated (Must be `COMPLETED`) |
| 17 | `/analyses/{id}/ast-results` | `GET` | Results & Discordance view / `api.getAnalysisAst()` | Path: `id` | `{ items: AstResultItem[] }` | Authenticated |
| 18 | `/analyses/{id}/ast-results` | `POST` | AstEntryForm / `api.submitAstResults()` | `{ items: [{ antibiotic, category: "S"|"I"|"R", method, mic?, micUnit?, zoneDiameterMm?, standard?, standardVersion? }] }` | `{ items: AstResultItem[], discordance: DiscordanceEvent[] }` | Authenticated (Generates `discordance_events`) |
| 19 | `/analyses/{id}/discordance` | `GET` | Isolate Discordance / `api.getAnalysisDiscordance()` | Path: `id`, Query: `reviewStatus?` | `{ items: DiscordanceEvent[] }` | Authenticated |
| 20 | `/discordance/{eventId}` | `PATCH` | DiscordanceCard / `api.updateDiscordanceEvent()` | Path: `eventId`, Body: `{ reviewStatus: "REVIEWED_CONFIRMED"|"REVIEWED_DISMISSED", reviewNote?: str }` | `DiscordanceEvent` updated | Authenticated |
| 21 | `/discordances` | `GET` | Global Queue / `api.getDiscordanceQueue()` | Query: `organism?`, `priority?`, `reviewStatus?`, `search?` | `{ items: DiscordanceEvent[] }` | Authenticated (Scoped to `labId`) |
| 22 | `/analyses/{id}/report` | `GET` | Report page / `api.getReport()` | Path: `id`, Query: `format=html` | `text/html` or JSON report with complete audit provenance | Authenticated |

---

## 3. Data Integrity & Scientific Consistency Checks

1. **Identifiers**:
   - Prefix scheme: `smp_` (samples), `fil_` (genome_files), `ana_` (analyses), `fnd_` (findings), `ass_` (assessments), `lnk_` (evidence_links), `ast_` (ast_results), `dis_` (discordance_events), `dem_` (demo_datasets), `aud_` (audit_events), `lab_` (labs).
   - Generated by backend using ULID (Crockford base32, 26 chars).
2. **Quality Capping**:
   - `EXACT` and `STRICT` matches can yield `RESISTANCE_EVIDENCE_STRONG`.
   - `PARTIAL` matches cap at `RESISTANCE_EVIDENCE_MODERATE`.
   - `LOOSE`, `LOW_QUALITY`, and `UNKNOWN` matches cap at `RESISTANCE_EVIDENCE_WEAK`.
3. **Discordance Independence**:
   - `discordance_events` is an independent collection pointing at an immutable assessment and AST record.
   - AST entry never mutates the underlying `antibiotic_assessments` record.

---

## 4. Required Implementation Strategy

1. **FastAPI Application (`apps/api`)**:
   - Structured routers: `auth.py`, `scope.py`, `samples.py`, `analyses.py`, `ast.py`, `discordance.py`, `benchmarks.py`, `reports.py`, `health.py`.
   - Middleware: Request ID tracking, CORS, JSON exception handling into standard `{ error: { code, message, requestId, timestamp, details } }` envelope.
2. **Persistent Document Repository (`db/`)**:
   - Async MongoDB repository interface with PyMongo/Motor support.
   - Dual-mode data layer: Supports live MongoDB Atlas (`MONGODB_URI`) with resilient automatic fallback to memory/file persistent store when MongoDB daemon is not running locally.
3. **Scientific Engine (`engine/`)**:
   - Pure Python deterministic modules: `qc.py`, `normalize.py`, `interpret.py`, `discordance.py`, `rules_provider.py`.
   - `AMRFinderRunner`: Subprocess execution when binary is installed; robust simulated golden-file runner for reproducible offline tests.
4. **Worker Process (`apps/worker`)**:
   - Polling loop claiming `QUEUED` jobs with atomic leases (`lockedBy`, `lockedAt`, `heartbeatAt`).
   - Sweeper detecting lost leases (>120s) and requeuing or marking `FAILED`.
   - Stage progress updater: `VALIDATING` -> `ANALYZING` -> `INTERPRETING` -> `COMPLETED`.
