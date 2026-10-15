# Genome Firewall — Automated Test Plan & Verification Report

## 1. Overview & Verification Strategy

The Genome Firewall test suite ensures scientific validity, application security, laboratory isolation, and execution recovery across the full stack.

Test executions:
- **Backend Tests**: `pytest` + `pytest-asyncio` + `httpx` (26 automated test cases, 100% pass)
- **Frontend Tests**: `vitest` + React Testing Library (14 automated test cases, 100% pass)
- **Total Tests**: 40 automated test cases

---

## 2. Test Suites & Coverage Breakdown

### 2.1 Scientific Engine Tests (`tests/test_engine.py`)
- **`test_classify_detection_quality`**: Tests detection quality classification (`EXACT`, `STRICT`, `PARTIAL`, `LOOSE`, `LOW_QUALITY`) based on identity and coverage thresholds.
- **`test_qc_empty_file`**: Validates immediate rejection of empty FASTA inputs.
- **`test_qc_invalid_header`**: Validates rejection of non-FASTA formatted inputs (missing `>`).
- **`test_qc_high_ambiguous_n`**: Validates assembly failure when ambiguous base fraction (`N` fraction) exceeds 0.05 (5%).
- **`test_qc_invalid_characters`**: Validates rejection of protein FASTA and non-nucleotide sequences.
- **`test_interpretation_qc_failure_yields_not_assessable`**: Validates that any assembly failing QC automatically results in `NOT_ASSESSABLE` with confidence 0.0, preventing manufactured interpretations from corrupted data.
- **`test_interpretation_absence_never_susceptible`**: Strict verification of **Decision D-10**: Absence of resistance markers produces `INSUFFICIENT_EVIDENCE`, **never susceptibility**.
- **`test_detection_quality_capping_loose`**: Strict verification of **Decision D-03**: A `LOOSE` detection quality hit cannot elevate an assessment above `RESISTANCE_EVIDENCE_WEAK`, even for a strong resistance determinant like `blaNDM-1`.
- **`test_discordance_matrix_signature_case`**: Validates generation of `GENOMIC_RESISTANT_AST_SUSCEPTIBLE` when strong genomic resistance meets phenotypic susceptibility, with priority score >= 85 and explanatory rationale.
- **`test_discordance_matrix_concordant`**: Validates that concordant results do not trigger discordance events.

### 2.2 Upload Security & Integrity Tests (`tests/test_upload_security.py`)
- **`test_storage_path_traversal_prevention`**: Confirms that directory traversal sequences (`../../etc/passwd`) in storage keys trigger immediate exceptions.
- **`test_storage_checksum_verification`**: Confirms streaming SHA-256 calculation and detects byte-level file tampering on disk.
- **`test_storage_max_upload_size`**: Validates upload rejection when content exceeds maximum configured byte limits (HTTP 413).
- **`test_qc_rejects_protein_fasta`**: Validates rejection of translated amino-acid FASTA files disguised as nucleotide sequences.

### 2.3 API Contract & Laboratory Isolation Tests (`tests/test_api_contract.py`)
- **`test_health_endpoints`**: Confirms `/health/live` (200 UP) and `/health/ready` (200 READY).
- **`test_auth_login_and_me`**: Tests Argon2id password verification, session token issuance (`gf_<labId>_<timestamp>_<sig>`), and profile retrieval.
- **`test_scope_endpoint`**: Verifies `/api/v1/scope` returns the complete 3-organism MVP matrix.
- **`test_laboratory_isolation`**: Enforces multi-tenant laboratory isolation: confirms Lab B (`LAB-SURV-NCDC`) cannot upload to, read, or modify samples belonging to Lab A (`LAB-REF-AIIMS`), returning HTTP 404 without disclosing resource existence.
- **`test_benchmarks_endpoint`**: Validates `/api/v1/benchmarks` returns 13 pairs with sample counts and Wilson 95% confidence intervals.
- **`test_demo_datasets_listing`**: Verifies seeded demo datasets are accurately labeled with origin provenance (`CACHED_REAL_ANALYSIS`, `SYNTHETIC_FIXTURE`).

### 2.4 Worker Lifecycle & Resiliency Tests (`tests/test_worker_recovery.py`)
- **`test_worker_sweeper_requeues_stale_job`**: Validates that when a worker process terminates abruptly, the lease sweeper detects heartbeats older than 120s and atomically returns the job to `QUEUED` for another worker to resume.
- **`test_worker_sweeper_fails_job_after_max_attempts`**: Validates that repeated worker crashes reaching the attempt threshold (3 retries) result in terminal `FAILED` status with code `LEASE_EXPIRED_MAX_RETRIES`.
- **`test_worker_detects_tampered_file`**: Validates that pre-analysis checksum verification halts processing and transitions the job to `FAILED` with code `FILE_TAMPERED` if the file on disk was modified post-upload.

### 2.5 Multi-Organism Scientific Matrix Tests (`tests/test_multi_organism_matrix.py`)
- **`test_klebsiella_pneumoniae_matrix`**: Tests *K. pneumoniae* across Meropenem (blaNDM-1), Ceftriaxone (blaCTX-M-15), Gentamicin (aac(3)-IIa), and Ciprofloxacin (oqxA baseline).
- **`test_staphylococcus_aureus_matrix`**: Tests *S. aureus* across Cefoxitin (mecA -> MRSA), Erythromycin (ermA), and Vancomycin (absence of vanA produces `INSUFFICIENT_EVIDENCE` with documented VISA limitations).

### 2.6 End-to-End User Acceptance Test (`tests/test_e2e_workflow.py`)
- Executes the full 12-step user journey:
  1. Login with Lab ID `LAB-REF-AIIMS`
  2. Create clinical sample metadata
  3. Upload FASTA assembly with streaming SHA-256
  4. Create analysis job (QUEUED)
  5. Process asynchronously through worker
  6. Confirm status transitions to COMPLETED
  7. Retrieve results; verify absence of marker is never susceptible
  8. Enter laboratory AST susceptible result for Ciprofloxacin
  9. Confirm automatic generation of high-priority discordance event (`GENOMIC_RESISTANT_AST_SUSCEPTIBLE`)
  10. Record reviewer disposition (`REVIEWED_CONFIRMED`) and audit event
  11. Generate report in JSON and print-ready HTML
  12. Retrieve persistent history from database

---

## 3. Execution Results

```text
============================= test session starts ==============================
platform darwin -- Python 3.13.9, pytest-9.1.1, pluggy-1.7.0
rootdir: /Users/kushals/Desktop/Fearless
plugins: asyncio-1.4.0, anyio-4.15.1
collected 26 items                                                             

tests/test_api_contract.py ......                                        [ 23%]
tests/test_e2e_workflow.py .                                             [ 26%]
tests/test_engine.py ..........                                          [ 65%]
tests/test_multi_organism_matrix.py ..                                   [ 73%]
tests/test_upload_security.py ....                                       [ 88%]
tests/test_worker_recovery.py ...                                        [100%]

============================== 26 passed in 1.45s ==============================
```
