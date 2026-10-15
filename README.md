# Genome Firewall — Frontend

> **Explainable resistance-evidence review for clinical microbiology and public-health surveillance.**  
> *"For research and surveillance use only. Not for clinical diagnosis or treatment decisions."*

Genome Firewall is an explainable research web application that interprets bacterial genomic resistance evidence for configured organism–antibiotic pairs, separates detection from prediction, and makes disagreement between genomic determinants and laboratory antimicrobial susceptibility testing (AST) results immediately visible.

---

## 1. Core Principles & Scientific Invariants

- **Decision Register Alignment**:
  - **D-01**: No numeric probabilities or confidence scores for individual isolates.
  - **D-02**: No individual-patient treatment recommendations, ever.
  - **D-03**: Rules-first explainability; strictly evidence-based, not marketed as "AI".
  - **D-04**: **Discordance review is the primary differentiator.**
  - **D-05**: MVP organisms: *Escherichia coli*, *Klebsiella pneumoniae*, and *Staphylococcus aureus*.
  - **D-06**: Input: Assembled FASTA only (`.fa`, `.fasta`, `.fna`, `.gz`) with client-side nucleotide validation.
  - **D-07**: `DISCORDANT_WITH_AST` is a separate associated review event (`discordance_events`), not a mutation of the immutable genomic call.
  - **D-10**: `SUSCEPTIBILITY_EVIDENCE_LIMITED` is disabled; absence of a detected resistance marker is `INSUFFICIENT_EVIDENCE`, never proof of susceptibility.
- **Color Semantics**: **No green "safe" color anywhere.** Absence of evidence is neutral grey. Strong evidence is Red, Moderate is Orange, Weak is Amber, Inconclusive is Violet, and Discordance flags are Magenta/Rose.

---

## 2. Technology Stack

- **Framework**: Next.js 14 App Router (React 18, TypeScript)
- **Styling & Design System**: Tailwind CSS with custom scientific tokens matching Master Engineering Reference (`#0B1020` hero dark theme and `#F8FAFC` light theme)
- **Data & Server State**: TanStack Query (v5) with polling and optimistic cache updates
- **Icons**: Lucide React
- **Forms & Validation**: React Hook Form with Zod schemas
- **Testing**: Vitest with `@testing-library/react` and `jsdom`

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- Node.js `v18.18+` or `v20+` / `v24+`
- npm `v9+` or `v11+`

### Installation
```bash
npm install
```

### Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configuration parameters:
- `NEXT_PUBLIC_API_BASE_URL`: URL to backend FastAPI service (default: `http://localhost:8000/api/v1`)
- `NEXT_PUBLIC_USE_MOCK_API`: Set to `true` to use the built-in development simulator with realistic pipeline transitions, or `false` to connect to live FastAPI.
- `NEXT_PUBLIC_DEMO_ACCESS_KEY`: Access key for authenticated requests (`X-Access-Key` header).

### Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Automated Tests
```bash
npm test
```
Executes all 14 unit and integration tests, including component tests, API adapter tests, and the **SW-LINT-01** scientific claim compliance linter.

### Compile Production Build
```bash
npm run build
```

---

## 4. Complete Application Tour & Workflows

### 1. Lab ID Login (`/login`)
- Authenticate with assigned Lab ID (e.g. `LAB-REF-AIIMS`, `LAB-SURV-NCDC`, `LAB-RES-PGIMER`) and access key.
- Quick one-click preconfigured demo profiles for hackathon evaluation.
- Laboratory-scoped session storage.

### 2. Workspace Overview (`/`)
- Laboratory-scoped workspace statistics.
- Direct quick links to pre-validated demonstration datasets:
  - **Demo A**: Concordant Multidrug-Resistant *K. pneumoniae* (`blaKPC-2`, `blaSHV-182`, `gyrA`/`parC`).
  - **Demo B**: *E. coli* Genotype vs. AST Discordance showcase (`blaNDM-5` detected vs AST Susceptible; Gentamicin discrepancy).
  - **Demo C**: Synthetic *S. aureus* with fragmented contigs, QC warnings, and capped evidence.

### 3. New Analysis Intake Wizard (`/analyses/new`)
- **Step 1**: Select Analysis Mode (Upload Genome vs. Explore Labelled Demo Dataset).
- **Step 2**: Enter Isolate Metadata (Accession label, organism selection from `/scope`, collection year, provenance notes, strict prohibition of patient identifiers).
- **Step 3**: Drag-and-drop FASTA upload with client-side IUPAC nucleotide checks, size cap verification (25 MB), and contig preview.
- **Step 4**: Optional laboratory AST phenotype entry (S, I, R category, testing method, MIC or inhibition zone diameter, standard & version).
- **Step 5**: Pre-submission verification and idempotent pipeline dispatch.

### 4. Real-Time Pipeline Progress Tracking (`/analyses/[id]`)
- Driven strictly by server `stageProgress` and lifecycle states: `QUEUED` → `VALIDATING` → `ANALYZING` → `INTERPRETING` → `COMPLETED`.
- No fake progress bars or arbitrary spinners.

### 5. Scientific Results Dashboard (`/analyses/[id]`)
- **Provenance Origin Banner**: Real Analysis vs. Cached Real Analysis vs. Synthetic Demonstration Data.
- **Assembly QC Strip**: PASS / WARN / FAIL status, contig count, total span (Mb), N50.
- **Antibiotic-Wise Evidence Matrix**: Rows for each supported drug displaying result category badge, evidence tier, hit counts, laboratory AST comparator, and discrepancy indicators.
- **Interactive SVG Genome Track**: Displays contig segments and physical tick marks for detected determinants at exact nucleotide coordinates.

### 6. Genomic Evidence Explorer Drawer
- Click any antibiotic row to open the slide-over evidence drawer.
- Displays:
  - Human-readable interpretation and scientific rationale.
  - Quality capping notes (e.g., partial contig coverage capping Tier A to Moderate).
  - Driving AMRFinderPlus findings with 5-step detection quality glyphs (●●●● to ○), % identity, % coverage, and method.
  - Triggered rule IDs and citable literature sources (EUCAST / CLSI / NCBI).
  - Documented biological blind spots.
  - **Pair Reliability Benchmark Panel** showing calibrated concordance %, Wilson confidence intervals, and isolate sample size on held-out datasets.

### 7. Discordance Review Center (`/analyses/[id]/discordance` & `/discordance`)
- **Primary Product Differentiator**.
- Side-by-side comparison cards: Genomic evidence findings vs. Laboratory phenotypic AST results.
- Categorized discrepancy types:
  - `GENOMIC_RESISTANT_AST_SUSCEPTIBLE` (Priority: High)
  - `GENOMIC_NO_EVIDENCE_AST_RESISTANT` (Priority: Medium)
  - `GENOMIC_INCONCLUSIVE_AST_RESISTANT` (Priority: Medium)
  - `LOW_QUALITY_CONFLICT` (Priority: Medium)
  - `UNSUPPORTED_COMPARISON` (Priority: Info)
- Allows laboratory reviewers to record investigation notes and update review status (`REVIEWED_CONFIRMED` / `REVIEWED_DISMISSED`).
- Global filterable review queue across all laboratory isolates.

### 8. Laboratory-Scoped Analysis History (`/analyses`)
- Retrieved from backend database via authenticated API requests.
- Filterable by organism, status, date, and search query (isolate label or Analysis ID).
- Click any past isolate to retrieve its persisted result immediately without re-running the pipeline.

### 9. Printable Report Generation (`/analyses/[id]/report`)
- Print-optimized layout for standard 8.5x11 / A4 printing and PDF export.
- Structured JSON report export.
- Complete audit trail: software versions (`amrfinderplus`, `database`, `ruleSet`, `appCommit`), isolate metadata, matrix, findings, discordance events, biological limitations, and the mandatory use statement.

### 10. Methodology & Reference Scope (`/methodology`)
- Comprehensive scientific documentation explaining detection vs. interpretation, result categories, and biological blind spots (promoter changes, porin loss, efflux, heteroresistance).
- Full table of Calibrated Pair Reliability Benchmarks across supported organisms and antibiotics.

---

## 5. Backend Integration Handoff

Refer to [`docs/API_CONTRACT_CHECKLIST.md`](docs/API_CONTRACT_CHECKLIST.md) for the complete endpoint schema definitions and integration specifications.
# PathoGuard
