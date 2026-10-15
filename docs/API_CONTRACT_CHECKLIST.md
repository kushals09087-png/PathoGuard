# Genome Firewall — Frontend / Backend API Integration Contract & Handoff Checklist

**Reference**: Master Engineering Reference v0.1.0 & Competitive Evaluation  
**Status**: Frontend Fully Implemented & Verified with Typed Client and Mock/Live Adapter

---

## 1. Authentication & Security Boundary
- **Lab ID Session Authentication**:
  - Frontend passes `X-Access-Key: <accessKey>` and `X-Lab-Id: <labId>` on all API calls.
  - Security Principle: Lab ID is an identifier, not an authorization proof. The backend enforces Lab ID scoping on MongoDB queries (`sample.labId == authorizedLabId`).
  - Frontend never contains database credentials, MongoDB URIs, or private keys.

---

## 2. API Endpoints Matrix

| # | Endpoint | Method | Request Schema | Response Schema | Frontend Integration Status | Notes for Backend Developer |
|---|---|---|---|---|---|---|
| 1 | `/health` | `GET` | None | `{ status, db, engine, time }` | **Implemented** | Health probe for deployment and DB ping. |
| 2 | `/scope` | `GET` | None | `{ organisms: [...], maxUploadBytes, useStatement }` | **Implemented** | Returns supported organisms (*E. coli*, *K. pneumoniae*, *S. aureus*) and their configured antibiotics. |
| 3 | `/benchmarks` | `GET` | None | `{ items: PairReliabilityBenchmark[] }` | **Implemented** | Calibrated held-out concordance, Wilson CI, abstention rate per pair. |
| 4 | `/demo-datasets` | `GET` | None | `{ items: DemoDataset[] }` | **Implemented** | Pre-labelled public isolates with expected findings for hackathon demonstration. |
| 5 | `/samples` | `POST` | `{ label, organism, sourceType, isSynthetic, collectionYear?, country?, provenance? }` | `Sample` object (201 Created) | **Implemented** | Free text label validated against regex patterns for patient IDs. |
| 6 | `/genome-files` | `POST` | `multipart/form-data`: `sampleId`, `file` | `{ id, sampleId, fileName, checksumSha256, sizeBytes, storageKey, uploadStatus }` | **Implemented** | Server verifies nucleotide FASTA structure, rejects non-DNA, caps at 25 MB. |
| 7 | `/analyses` | `POST` | `{ sampleId?, fileId?, organism, demoId? }` | `Analysis` object in `QUEUED` or `COMPLETED` (202 Accepted) | **Implemented** | Client passes optional `Idempotency-Key` header to prevent duplicate submissions. |
| 8 | `/analyses` | `GET` | Query params: `limit`, `cursor`, `organism?`, `status?` | `{ items: Analysis[], nextCursor? }` | **Implemented** | Results must be filtered by authenticated laboratory identity. |
| 9 | `/analyses/{id}` | `GET` | None | `Analysis` object with `status`, `stageProgress`, `qc`, `toolVersions`, `counts` | **Implemented** | Polled by frontend every 2 seconds during active processing. |
| 10 | `/analyses/{id}/cancel` | `POST` | None | `{ success: true }` | **Implemented** | Allows cancelling while `QUEUED`. |
| 11 | `/analyses/{id}/findings` | `GET` | Query params: `quality?`, `limit` | `{ items: Finding[] }` | **Implemented** | AMRFinderPlus normalized hits with `detectionQuality`, % identity, % coverage, contig coordinates. |
| 12 | `/analyses/{id}/assessments` | `GET` | None | `{ items: AntibioticAssessment[] }` | **Implemented** | One per supported matrix pair. Emits exact categories (STRONG, MODERATE, WEAK, INSUFFICIENT_EVIDENCE, INCONCLUSIVE, NOT_ASSESSABLE). |
| 13 | `/analyses/{id}/evidence` | `GET` | Query param: `assessmentId?` | `{ items: EvidenceLink[] }` | **Implemented** | Edges connecting detected findings to antibiotic assessments with rule IDs. |
| 14 | `/analyses/{id}/ast-results` | `POST` | `{ items: [{ antibiotic, category, method, mic?, micUnit?, zoneDiameterMm?, standard?, standardVersion? }] }` | `{ items: AstResultItem[], discordance: DiscordanceEvent[] }` | **Implemented** | Adds or updates laboratory AST; triggers discordance evaluation without modifying genomic assessment. |
| 15 | `/analyses/{id}/discordance` | `GET` | Query param: `reviewStatus?` | `{ items: DiscordanceEvent[] }` | **Implemented** | Discrepancies flagged for laboratory review. |
| 16 | `/discordance/{eventId}` | `PATCH` | `{ reviewStatus: "REVIEWED_CONFIRMED" \| "REVIEWED_DISMISSED", reviewNote?: string }` | `DiscordanceEvent` (200 OK) | **Implemented** | Records QA review notes and updates status. |
| 17 | `/analyses/{id}/report` | `GET` | Query param: `format=html` | `text/html` print-ready report | **Implemented** | Frontend also provides client-side printable report view and JSON export. |

---

## 3. Scientific Invariants to Preserve in Backend Engine
1. **Absence is not susceptibility**: Never emit `SUSCEPTIBLE` from the genomic engine. Absence of a known marker is `INSUFFICIENT_EVIDENCE`.
2. **Quality Capping**: `PARTIAL` hits cap base rule tier at `MODERATE`. `LOOSE` (<90% identity) or `LOW_QUALITY` hits cap at `WEAK`.
3. **No Per-Isolate Probabilities**: Do not output "95% probability of resistance" (forbidden by Decision D-01).
4. **No Treatment Recommendations**: Do not output "Use Ceftazidime, Avoid Meropenem" (forbidden by Decision D-02).
5. **Mandatory Disclaimer**: Must appear on all printed reports:
   *"For research and surveillance use only. Not for clinical diagnosis or treatment decisions."*
