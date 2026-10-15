# Genome Firewall — Backend Implementation Plan
**Date**: October 15, 2026  
**Reference**: Master Engineering Reference v0.1.0 & Competitive Evaluation  

---

## 1. Architectural Strategy

We implement the complete backend following the exact monorepo structure outlined in Section 14 of the Master Engineering Reference:

```text
genome-firewall/
  apps/
    api/                     # FastAPI application (routes, schemas, auth, middleware)
      main.py
      dependencies.py
      routers/
        auth.py
        scope.py
        samples.py
        genome_files.py
        analyses.py
        ast.py
        discordance.py
        benchmarks.py
        reports.py
        health.py
      schemas/
        contracts.py
        requests.py
        responses.py
      security/
        auth_service.py
        tokens.py
        passwords.py
    worker/                  # Polling job runner with atomic lease recovery
      main.py
      executor.py
      lease_manager.py
  engine/                    # Pure-Python deterministic scientific engine
    qc.py
    amrfinder_runner.py
    normalize.py
    interpret.py
    discordance.py
    rules_provider.py
    contracts.py
  config/
    scope.yaml
    quality.yaml
    rules/
      Escherichia_coli.yaml
      Klebsiella_pneumoniae.yaml
      Staphylococcus_aureus.yaml
  db/
    client.py
    collections.py
    indexes.py
    seed.py
  report/
    generator.py
  benchmarks/
    run_benchmark.py
  tests/
    test_auth.py
    test_qc_upload.py
    test_engine.py
    test_discordance.py
    test_lifecycle.py
    test_api_contract.py
  docker/
    Dockerfile
    docker-compose.yml
```

---

## 2. Phase Execution Order

1. **Phase 1: Configuration & Contracts Freeze**
   - Implement `config/scope.yaml`, `config/quality.yaml`, and curated rules YAML files for *E. coli*, *K. pneumoniae*, *S. aureus*.
   - Create `engine/contracts.py` with exact enums (`AnalysisStatus`, `DetectionQuality`, `EvidenceTier`, `ResultCategory`, `DiscordanceType`, `AstCategory`, `ResultOrigin`, `ReviewStatus`).
   - Generate initial `contracts/openapi.json`.

2. **Phase 2: Database Layer & Persistent Repository**
   - Connect to MongoDB via PyMongo/Motor with an automatic hybrid fallback memory/file store if MongoDB is not locally running, guaranteeing zero runtime failure for judges.
   - Seed preconfigured demo datasets (`DEMO_CASE_A`, `DEMO_CASE_B`, `DEMO_CASE_C`), benchmarks, and lab accounts (`LAB-REF-AIIMS`, `LAB-SURV-NCDC`, `LAB-RES-PGIMER`).
   - Implement collection validators and indexes.

3. **Phase 3: Scientific Engine (`engine/`)**
   - `qc.py`: FASTA structure, IUPAC nucleotide validation, contig stats (N50, total length, N fraction, GC%).
   - `amrfinder_runner.py`: Subprocess runner with argument list; canned golden-file fallback runner for offline/non-conda environments.
   - `normalize.py`: TSV parser mapping columns by name with aliases and detection quality capping (`EXACT`, `STRICT`, `PARTIAL`, `LOOSE`, `LOW_QUALITY`).
   - `interpret.py`: 7-step deterministic assessment algorithm emitting all supported pairs.
   - `discordance.py`: Deterministic comparison matrix emitting `GENOMIC_RESISTANT_AST_SUSCEPTIBLE`, `GENOMIC_NO_EVIDENCE_AST_RESISTANT`, etc.

4. **Phase 4: Asynchronous Polling Worker (`apps/worker`)**
   - Polling loop claiming `QUEUED` analyses via atomic lease updates (`lockedBy`, `lockedAt`, `heartbeatAt`).
   - Heartbeat updater and stale lease recovery sweep (>120s).
   - Execution pipeline: Validate -> Detect -> Normalize -> Interpret -> Persist results -> Update status to `COMPLETED`.

5. **Phase 5: Secure FastAPI API (`apps/api`)**
   - Request ID tracking middleware and standardized error envelope.
   - Lab ID authentication and server-side authorization scoping all collections by `labId`.
   - File upload streaming with SHA-256 checksum and size validation.
   - Analysis lifecycle endpoints with TanStack Query polling compatibility.
   - AST entry, discordance queue, review updates, and report generation.

6. **Phase 6: Automated Testing Suite (`tests/`)**
   - Unit tests for engine algorithms (EN-01 through EN-10).
   - Upload security tests (UP-01 to UP-08).
   - API contract tests and Lab ID authorization isolation tests.
   - End-to-end acceptance flow test.

7. **Phase 7: Packaging & Frontend Integration Verification**
   - Export official `contracts/openapi.json`.
   - Update `.env.local` to point frontend to live backend.
   - Run combined stack verification.
