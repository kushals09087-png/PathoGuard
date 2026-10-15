# Genome Firewall — Backend API Contract Specification
**Version**: 1.0.0  
**Base Path**: `/api/v1`  
**Protocol**: HTTPS / JSON & Multipart  
**Error Envelope**: Standardized `{ error: { code, message, requestId, timestamp, details } }`

---

## 1. Authentication & Security Headers

### Request Headers
- `X-Access-Key`: Access credential string gating write and protected endpoints (e.g., `gf_demo_key_2026`).
- `X-Lab-Id`: Laboratory Identifier scoping queries and mutations to the authenticated facility (e.g., `LAB-REF-AIIMS`, `LAB-SURV-NCDC`).
- `Authorization`: `Bearer <token>` (alternative token authentication supported by `/api/v1/auth/login`).
- `Idempotency-Key`: Optional client-provided unique string on creation endpoints (`POST /samples`, `POST /analyses`) preventing duplicate job submission on network retry.

### Error Envelope
HTTP Non-2xx responses strictly conform to:
```json
{
  "error": {
    "code": "UNSUPPORTED_ORGANISM",
    "message": "Species 'Pseudomonas aeruginosa' is not supported in the MVP matrix.",
    "details": {
      "supportedOrganisms": [
        "Escherichia coli",
        "Klebsiella pneumoniae",
        "Staphylococcus aureus"
      ]
    },
    "requestId": "req_01JBX3M8Q2N7V4K9R6T0YHE5ZC",
    "timestamp": "2026-10-15T10:00:00.000Z"
  }
}
```

---

## 2. API Endpoints Specification

### 2.1 System & Scope
- **`GET /health`** (and `/health/live`, `/health/ready`)
  - **Description**: Probes service status, database connectivity, and AMRFinder engine status.
  - **Response 200**:
    ```json
    { "status": "healthy", "db": "connected", "engine": "ready", "time": "2026-10-15T10:00:00.000Z" }
    ```

- **`GET /api/v1/scope`**
  - **Description**: Exposes supported organisms, antibiotic matrix, and genome assembly length plausibility thresholds.
  - **Response 200**:
    ```json
    {
      "useStatement": "For research and surveillance use only. Not for clinical diagnosis or treatment decisions.",
      "maxUploadBytes": 26214400,
      "organisms": [
        {
          "name": "Escherichia coli",
          "amrfinderOrganismFlag": "Escherichia",
          "antibiotics": ["ciprofloxacin", "ceftriaxone", "meropenem", "gentamicin", "tetracycline"],
          "plausibleLengthMb": { "min": 4.5, "max": 5.8 }
        },
        {
          "name": "Klebsiella pneumoniae",
          "amrfinderOrganismFlag": "Klebsiella_pneumoniae",
          "antibiotics": ["ciprofloxacin", "ceftriaxone", "meropenem", "gentamicin"],
          "plausibleLengthMb": { "min": 5.0, "max": 6.0 }
        },
        {
          "name": "Staphylococcus aureus",
          "amrfinderOrganismFlag": "Staphylococcus_aureus",
          "antibiotics": ["cefoxitin", "vancomycin", "erythromycin", "ciprofloxacin"],
          "plausibleLengthMb": { "min": 2.6, "max": 3.2 }
        }
      ]
    }
    ```

- **`GET /api/v1/benchmarks`**
  - **Description**: Returns empirical pair-reliability metrics derived from held-out public benchmark evaluations.
  - **Response 200**:
    ```json
    {
      "items": [
        {
          "organism": "Escherichia coli",
          "antibiotic": "meropenem",
          "evaluatedIsolatesCount": 450,
          "datasetName": "BV-BRC Public WGS + Phenotypic AST Collection",
          "splitMethod": "lineage_aware",
          "concordancePercent": 98.4,
          "wilsonIntervalLower": 96.8,
          "wilsonIntervalUpper": 99.2,
          "abstentionRatePercent": 0.9,
          "backgroundDiscordancePercent": 0.7,
          "toolVersion": "AMRFinderPlus v4.2.7 (DB 2024-05-02.1)",
          "ruleSetVersion": "0.1.0-seed",
          "limitations": "Evaluated on assembled genomes. Low-level carbapenemase expression may show discrepancies."
        }
      ]
    }
    ```

- **`GET /api/v1/demo-datasets`**
  - **Description**: Returns pre-packaged demonstration isolates labelled as `CACHED_REAL_ANALYSIS` or `SYNTHETIC_FIXTURE`.

---

### 2.2 Authentication & Lab Identity
- **`POST /api/v1/auth/login`**
  - **Body**: `{ "labId": "LAB-REF-AIIMS", "accessKey": "gf_demo_key_2026" }`
  - **Response 200**:
    ```json
    {
      "token": "gf_tok_...",
      "lab": {
        "labId": "LAB-REF-AIIMS",
        "labName": "AIIMS Reference Microbiology Lab",
        "facilityType": "National Reference & Tertiary Care",
        "location": "New Delhi, India"
      }
    }
    ```

- **`GET /api/v1/auth/me`**
  - **Response 200**: Authenticated lab profile.

- **`POST /api/v1/auth/logout`**
  - **Response 200**: `{ "status": "ok" }`

---

### 2.3 Samples & Genome Files
- **`POST /api/v1/samples`**
  - **Body**:
    ```json
    {
      "label": "EC-SURV-2024-001",
      "organism": "Escherichia coli",
      "sourceType": "Blood culture",
      "isSynthetic": false,
      "collectionYear": 2024,
      "provenance": "ICMR-AMRSN tertiary surveillance node"
    }
    ```
  - **Validation**: Rejects patient names or national identity patterns (SEC-03).
  - **Response 201**: `Sample` object with `id` (`smp_<ULID>`), `createdAt`, and `labId`.

- **`POST /api/v1/genome-files`**
  - **Form Data**: `sampleId=smp_...`, `file=@assembly.fasta`
  - **Validation**:
    - Extension must be `.fasta`, `.fna`, `.fa`, or `.gz`.
    - First non-empty line must start with `>`.
    - Nucleotide sequence only (rejects protein FASTA).
    - Max size 25 MB.
    - Checksum SHA-256 computed while streaming.
  - **Response 201**: `GenomeFile` with `id` (`fil_<ULID>`), `checksumSha256`, `contigCount`, `totalLength`, `n50`, `nFraction`, `uploadStatus`.

---

### 2.4 Analyses Lifecycle
- **`POST /api/v1/analyses`**
  - **Body**: `{ "sampleId": "smp_...", "fileId": "fil_...", "organism": "Escherichia coli" }` OR `{ "demoId": "dem_..." }`
  - **Response 202**: `Analysis` object with status `QUEUED` (or `COMPLETED` for cached demo).

- **`GET /api/v1/analyses`**
  - **Query**: `limit=25`, `cursor=...`, `organism=...`, `status=...`, `search=...`
  - **Response 200**: `{ "items": [Analysis], "nextCursor": "..." }` (strictly scoped to caller's `labId`).

- **`GET /api/v1/analyses/{id}`**
  - **Response 200**: Full aggregate with `status`, `stageProgress`, `qc`, `toolVersions`, `counts`.

- **`POST /api/v1/analyses/{id}/cancel`**
  - **Response 200**: `{ "success": true }` (only valid when status is `QUEUED`).

---

### 2.5 Scientific Findings & Assessments
- **`GET /api/v1/analyses/{id}/findings`**
  - **Response 200**: `{ "items": [Finding] }` with `symbol`, `name`, `klass`, `subclass`, `method`, `identity`, `coverage`, `contigId`, `start`, `stop`, `detectionQuality`.

- **`GET /api/v1/analyses/{id}/assessments`**
  - **Response 200**: `{ "items": [AntibioticAssessment] }` with one assessment per supported matrix pair.

- **`GET /api/v1/analyses/{id}/evidence`**
  - **Response 200**: `{ "items": [EvidenceLink] }` linking finding determinants to rules and assessments.

---

### 2.6 AST Entry & Discordance Review
- **`POST /api/v1/analyses/{id}/ast-results`**
  - **Body**: `{ "items": [{ "antibiotic": "meropenem", "category": "S", "method": "DISK_DIFFUSION", "zoneDiameterMm": 24, "standard": "EUCAST", "standardVersion": "v14.0 (2024)" }] }`
  - **Response 201**: `{ "items": [AstResultItem], "discordance": [DiscordanceEvent] }`
  - **Invariants**: Upserts AST and regenerates `discordance_events`. Never alters the immutable genomic assessment.

- **`GET /api/v1/analyses/{id}/discordance`**
  - **Response 200**: `{ "items": [DiscordanceEvent] }`

- **`GET /api/v1/discordances`**
  - **Description**: Global discordance review queue across all laboratory analyses.
  - **Query**: `organism`, `priority`, `reviewStatus`, `search`
  - **Response 200**: `{ "items": [DiscordanceEvent] }`

- **`PATCH /api/v1/discordance/{eventId}`**
  - **Body**: `{ "reviewStatus": "REVIEWED_CONFIRMED" | "REVIEWED_DISMISSED", "reviewNote": "Repeat AST confirmed." }`
  - **Response 200**: Updated `DiscordanceEvent`.

---

### 2.7 Reports
- **`GET /api/v1/analyses/{id}/report`**
  - **Query**: `format=html` or `format=json`
  - **Response 200**: Standalone HTML document or structured JSON report with mandatory disclaimer and versions.
