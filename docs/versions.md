# Genome Firewall — Pinned Toolchain & Dependency Versions

## 1. Core Services & Runtime

| Component | Pinned Version | Purpose |
|---|---|---|
| **Python** | 3.12+ (Tested on 3.13.9) | Backend API, worker, and scientific engine |
| **FastAPI** | 0.143.1 | Asynchronous HTTP REST API and OpenAPI generation |
| **Pydantic** | 2.14.1 | Schema validation and serialization (Pydantic V2) |
| **Pydantic Settings** | 2.16.0 | Typed environment configuration |
| **PyMongo** | 4.19.0 | MongoDB database driver with async thread executor |
| **Uvicorn** | 0.54.0 | ASGI web server |
| **Argon2-cffi** | 25.1.0 | Argon2id cryptographic password hashing |
| **HTTPX** | 0.28.1 | Asynchronous HTTP client for API contract tests |
| **pytest** | 9.1.1 | Automated test runner |
| **pytest-asyncio** | 1.4.0 | Asynchronous test execution plugin |
| **PyYAML** | 6.0.3 | Curated rule parsing and scope configuration |
| **Node.js** | 20+ | Frontend Next.js runtime |
| **Next.js** | 14.2.35 | App Router frontend framework |

## 2. Scientific & Bioinformatics Toolchain

| Tool | Version | Database Version / Source |
|---|---|---|
| **NCBI AMRFinderPlus** | v3.12.8 | NCBI Reference Gene Catalog (version `2024-05-02.1`) |
| **Organism Flags** | `Escherichia`, `Klebsiella_pneumoniae`, `Staphylococcus_aureus` | Validated against AMRFinderPlus v3.12.8 organism list |
| **Rule Provider** | `SeedYamlProvider v1.0.0` | CLSI M100 34th Ed (2024), EUCAST 2023, NCBI curated gene catalog |
| **QC Spec** | `v1.0.0` | Max contigs: 500, Max ambiguous N fraction: 0.05, Organism-specific length bounds |
| **AST Standards** | `CLSI M100-ED34 (2024)` / `EUCAST v14.0` | Breakpoint definitions and interpretive criteria |

## 3. Database & Storage Architecture

| Layer | Implementation | Redundancy / Fallback Mode |
|---|---|---|
| **Database** | MongoDB 7.0 / PyMongo 4.19.0 | Automatic fallback to `DurableJSONDatabase` (file-persisted `data/db/db_store.json`) when local mongod is absent |
| **Storage** | Private Local Volume | SHA-256 streaming verification; `FILE_TAMPERED` pre-analysis safety check |
| **Queue** | MongoDB Leases & Atomic Claims | `find_one_and_update` FIFO claim with >120s heartbeat sweeper recovery |
