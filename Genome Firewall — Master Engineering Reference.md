# Genome Firewall — Master Engineering Reference

Oct 15, 2026 · @kushal

This is the single source of truth for what Genome Firewall claims, what it builds, and how every module connects; decisions below are locked unless the Decision Register is amended.

## 1. Decision register

Your three inputs disagree in several places; each conflict is resolved here once, and every later section follows these rulings. Change a ruling only by amending this table and the sections named in its last column.

| ID | Conflict between inputs | Ruling | Why | Sections to update if reversed |
| --- | --- | --- | --- | --- |
| D-01 | Research report proposes "95% probability of resistance"; bridge document forbids numeric confidence without calibration | **No numeric probability or confidence anywhere in the MVP.** Evidence tiers and result categories only | No paired Indian WGS+AST dataset exists yet, so a probability could not be calibrated or defended | 4, 7, 10, 12 |
| D-02 | Research report: output "Use Ceftazidime-Avibactam, Avoid Meropenem"; bridge: no treatment advice | **No treatment recommendations, ever, at any level of the MVP** | Genotype does not predict clinical outcome; regulatory exposure (SaMD) | 2, 10, 15 |
| D-03 | Master prompt title says "AI-Powered"; bridge says rules-first, no ML in MVP | **MVP is rules-based and evidence-based. Not marketed as AI.** An ML tab is Level 2 and only with lineage-aware validation | Benchmarks show rule/gene-based tools outperform ML on divergent genomes; "AI" claim would be untrue | 2, 4, 12, 15 |
| D-04 | Report: strongest concept is discordance QA (Concept B); bridge: discordance-first | **Discordance review is the headline differentiator.** Detection and interpretation are the supporting pipeline | Highest feasibility, lowest regulatory risk, a gap neither CARD nor ResFinder fills | 2, 4, 10 |
| D-05 | Report targets Pseudomonas, Indian MDR broadly; bridge limits MVP organisms | **MVP organisms: *E. coli*, *K. pneumoniae*, *S. aureus*.** *Pseudomonas* is excluded: your own report says its regulatory resistance mechanisms give under 80% accuracy | A narrow matrix is testable; a broad one is not | 4, 8, 11 |
| D-06 | Report: ingest LIS data and draft assemblies or reads; bridge: assembled FASTA | **MVP accepts assembled FASTA only.** Manual AST entry (optional). No LIS, no raw reads, no metagenomes | Read assembly needs heavy compute and adds failure modes | 3, 9, 13 |
| D-07 | Bridge: `DISCORDANT_WITH_AST` is a `ResultCategory` | **Removed from `ResultCategory`.** Discordance is a separate object (`discordance_events`) pointing at an immutable assessment | If entering an AST result rewrote the genomic category, results would be non-reproducible and the genomic call would be contaminated by the comparator | 4, 7, 8, 9 |
| D-08 | Master prompt: Kubernetes-free, but background jobs "if justified" | **One FastAPI service + one worker process polling MongoDB. No Redis, no queue, no microservices** | A bacterial assembly analysis takes minutes, not hours; a polling worker is enough | 5, 6, 20 |
| D-09 | Two detection engines (AMRFinderPlus and CARD/RGI) | **AMRFinderPlus only in MVP.** CARD/RGI comparison is Level 2 | One engine gives one provenance trail and one normalisation to test | 5, 11 |
| D-10 | `SUSCEPTIBILITY_EVIDENCE_LIMITED` exists in bridge enum | **Enum retained but disabled by configuration; no MVP rule may emit it** | Absence of a marker is never susceptibility; no validated susceptibility rule exists yet | 4, 11 |
| D-11 | Name "Firewall" implies prevention (report section 17) | **Keep the name; tagline is "Explainable resistance-evidence review"**, not "protection" | Brand recognition for the hackathon, honest tagline | 2, 10, 15 |

### Source-quality warnings you must act on

Three things in your inputs should be checked before any number appears in a slide or UI string.

- **Citation mismatches in the bridge document.** Several superscript sources do not match the claim they sit next to: for example, a claim about CARD/RGI Perfect/Strict/Loose paradigms cites an Indian government (NCDC) PDF, and a claim about AMRFinderPlus not inferring phenotype cites an ICMR annual report. Re-verify each claim against its true primary source (NCBI AMRFinderPlus documentation, CARD documentation) before citing it.
- **Unverified numbers in the research report.** The carbapenem susceptibility figures (about 60% *E. coli*, about 40% *K. pneumoniae*), the ">99% sensitivity for *mecA*" statement, and the "7.6% survival decrease per hour" statistic are plausible but I have not verified them here. Open the original reports and record the exact page and wording in a `docs/sources.md` file. Until then, label them "reported, unverified".
- **Competitor facts.** Company statuses (for example OpGen) and turnaround times change quickly. Re-check each competitor row the week of the demo; do not present the competitor table as current without a verification date.

I have not independently re-verified the research documents' claims for this reference; I reconciled them against each other and against what I know of the tools.

## 2. Product definition

**One sentence.** Genome Firewall is an explainable research platform that interprets bacterial genomic resistance evidence for a small set of organism–antibiotic pairs, separates detection from prediction, and makes disagreement between genome and laboratory susceptibility results visible.

**Tagline (D-11).** Explainable resistance-evidence review.

**Central principle.** Genome Firewall does not predict whether an antibiotic will work. It reports what resistance evidence exists in a genome, how strong that evidence is for a specific drug, what it cannot see, and where it contradicts a laboratory result.

### Primary user and the job they hire the product for

The primary user is a **clinical microbiology or public-health research user** (reference laboratory, tertiary-hospital research lab, surveillance team) who has an assembled bacterial genome and optionally a laboratory AST result for the same isolate.

| Job to be done | Product answer |
| --- | --- |
| "I have 40 resistance hits; which ones matter for ciprofloxacin in this organism?" | Per-drug assessment with evidence tier and the exact findings that drive it |
| "The lab said susceptible but I see *bla*NDM. Which should I trust?" | Discordance event with both evidence sources side by side, flagged for review |
| "Can I trust this hit?" | Detection quality (exact, strict, partial, loose, low quality) with identity, coverage and method |
| "Will anyone question this report next year?" | Every result carries tool, database and rule versions |

**Secondary users:** bioinformatics students, infection-control researchers, hackathon judges. **Excluded:** clinicians choosing a treatment for an individual patient (D-02).

### Mandatory use statement

Every screen footer, report header, README and demo slide carries this exact text: **"For research and surveillance use only. Not for clinical diagnosis or treatment decisions."**

### Claims register

| Allowed | Forbidden |
| --- | --- |
| "Detects known resistance-associated genes and mutations using versioned reference tools" | "Predicts whether antibiotics will work" |
| "Provides organism- and antibiotic-specific evidence interpretation for supported pairs" | "Replaces AST" or "clinically validated" |
| "Flags genotype–phenotype discrepancies for laboratory review" | "AI-powered" (D-03) |
| "Shows insufficient evidence instead of guessing" | "No gene found, therefore susceptible" |
| "Built for research use; Indian validation is future work" | "Validated for India" or any accuracy, sensitivity or confidence figure we have not measured on a stated dataset |
| "Demo data is labelled synthetic" | Presenting a fixture result as a real analysis |

A CI test (section 12, test SW-LINT-01) greps the frontend strings and report templates for the forbidden phrases and fails the build.

### How we differ from alternatives

From your own competitor research: CARD/RGI, ResFinder and AMRFinderPlus return gene lists without drug-specific interpretation or comparison to a lab result; ARESdb and BV-BRC models give ML susceptibility predictions but are not designed around discordance review and may not be locally validated. Genome Firewall does not claim to be better than any of them at detection; it **builds on AMRFinderPlus** and competes on interpretation clarity and discordance review. Do not claim any feature is unique until the competitor table has a verification date (section 1 warnings).

## 3. Scope and numbered requirements

### Scope levels

| Level | Includes | Excludes | Done when |
| --- | --- | --- | --- |
| **1 — Hackathon MVP** | FASTA upload or labelled demo genome; 3 organisms; AMRFinderPlus detection; detection-quality classes; rules-based per-drug assessments for the configured matrix; optional manual AST entry; discordance review; evidence explorer; downloadable report; analysis history; methodology page | Treatment advice, ML, reads, metagenomes, LIS, login, 3D genome viewer, outbreak maps, patient identifiers | A fresh user finishes upload → results → evidence → discordance → report with no developer help, and acceptance tests AC-01 to AC-12 pass |
| **2 — Advanced prototype** | More pairs; assembly-quality report; CARD/RGI comparison; multi-isolate comparison; aggregate surveillance views; optional ML tab validated with lineage-aware splits; WHONET-style import | Clinical claims | Held-out benchmark per pair published in the app |
| **3 — Production direction** | Indian lab validation; LIS integration; regulatory assessment; institutional deployment |  | External validation dataset and regulatory pathway agreed |

### Functional requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-01 | Create a sample with organism, label, source type and `isSynthetic` flag; no patient identifiers | Must |
| FR-02 | Upload a FASTA assembly (`.fa`, `.fasta`, `.fna`, optionally `.gz`) up to the configured size limit; reject anything else | Must |
| FR-03 | Validate FASTA structure, characters, size, contig count, total length and N fraction before analysis | Must |
| FR-04 | User declares organism from the supported list; the system warns when genome length is implausible for that organism | Must |
| FR-05 | Run AMRFinderPlus with the organism flag, record command, version and database version | Must |
| FR-06 | Normalise each detected element into the `analysis_findings` schema with a `detectionQuality` class | Must |
| FR-07 | Produce one assessment per (organism, antibiotic) pair in the configured matrix, always, even when evidence is insufficient | Must |
| FR-08 | Each assessment lists the findings that drive it, the rule IDs applied, an explanation and its limitations | Must |
| FR-09 | Unsupported organism or drug never yields a resistance or susceptibility claim | Must |
| FR-10 | Accept optional AST results (S, I, R, with method, MIC or zone, standard and version) per drug | Must |
| FR-11 | Generate a discordance event when the comparison rules in section 4 apply | Must |
| FR-12 | Show analysis stage progress derived from real job state, not a timer | Must |
| FR-13 | Persist analyses and show a filterable history | Must |
| FR-14 | Produce a downloadable report (HTML print-to-PDF in MVP) built only from persisted results | Should |
| FR-15 | Provide labelled demo datasets with expected findings | Must |
| FR-16 | Show tool, database and rule versions on every results screen | Must |
| FR-17 | Provide a methodology and limitations page | Must |
| FR-18 | Allow cancelling a queued or running analysis | Could |

### Non-functional requirements

| ID | Requirement | Target |
| --- | --- | --- |
| NFR-01 | End-to-end analysis for one assembly | Under 5 minutes on the deployment tier; measure and record (do not promise before measuring) |
| NFR-02 | Upload size limit | 25 MB compressed or uncompressed (bacterial assemblies are about 3–6 MB); configurable |
| NFR-03 | Results screen first paint after analysis complete | Under 2 s on a typical connection |
| NFR-04 | Accessibility | WCAG 2.2 AA for colour contrast, keyboard operation, focus visibility; no information conveyed by colour alone |
| NFR-05 | Responsive | Usable at 360 px and 1280 px widths |
| NFR-06 | Reproducibility | Re-running the same file with the same recorded versions yields identical findings and assessments |
| NFR-07 | Reliability | A crashed worker never leaves an analysis permanently `ANALYZING`; stale jobs are recovered (section 6) |
| NFR-08 | Demo resilience | The demo works with no external network call at runtime |

### Security and scientific requirements

| ID | Requirement |
| --- | --- |
| SEC-01 | Uploaded files are untrusted: validated, size-limited, stored outside the web root, never executed |
| SEC-02 | No database credentials or secrets in frontend code or the repository |
| SEC-03 | No patient identifiers collected; sample labels are validated against an identifier-like pattern warning |
| SEC-04 | Rate limiting on upload and analysis creation |
| SCI-01 | No SUSCEPTIBLE standalone conclusion; absence of a marker is `INSUFFICIENT_EVIDENCE` |
| SCI-02 | No numeric probability or confidence score (D-01) |
| SCI-03 | Real, cached-real and synthetic results are visibly and structurally distinguished (`resultOrigin`) |
| SCI-04 | Loose or low-quality hits can never produce a `STRONG` category |
| SCI-05 | No accuracy figure appears in the product until measured on a stated, held-out dataset |

### User stories and acceptance criteria

| ID | Story | Acceptance criterion |
| --- | --- | --- |
| AC-01 | As a researcher I upload a valid *E. coli* FASTA and start an analysis | A completed analysis exists with status `COMPLETED` and all 5 *E. coli* matrix assessments present |
| AC-02 | I upload a text file renamed `.fasta` | Rejected with error `INVALID_FASTA`; no analysis created |
| AC-03 | I select an unsupported organism | Error `UNSUPPORTED_ORGANISM` listing supported ones |
| AC-04 | I open any assessment | I see driving findings, rule IDs, explanation, limitations and versions |
| AC-05 | A genome has no known marker for a drug | Assessment is `INSUFFICIENT_EVIDENCE`, never labelled susceptible, with the "absence is not susceptibility" note |
| AC-06 | A hit is classed `LOOSE` | It is displayed with a warning and cannot raise an assessment above `RESISTANCE_EVIDENCE_WEAK` |
| AC-07 | I add AST "susceptible" for a drug with strong carbapenemase evidence | A `GENOMIC_RESISTANT_AST_SUSCEPTIBLE` event appears in discordance review |
| AC-08 | I kill the worker mid-analysis | After the lease timeout the analysis is re-queued or marked `FAILED` with a reason |
| AC-09 | I open the demo | A banner states whether it is synthetic or a cached real analysis |
| AC-10 | I download the report | It contains only persisted data, versions, limitations and the use statement |
| AC-11 | I use the keyboard only | I can complete the whole flow |
| AC-12 | I search the UI for forbidden phrases | None found (SW-LINT-01) |

## 4. Scientific contract

This section defines what the analysis engine may conclude. The frontend, backend, reports and tests must all implement it identically.

### Terms

- **Detection**: finding a resistance-associated gene or point mutation in a genome. Reported by AMRFinderPlus; says nothing about phenotype.
- **Interpretation**: our rule-based statement about whether a detected element is relevant to a specific drug in a specific organism.
- **AST (antimicrobial susceptibility test)**: a laboratory phenotype, reported as S (susceptible), I (intermediate or increased exposure) or R (resistant).
- **Discordance**: genomic interpretation and AST disagree. It is a review flag, never proof of a new mechanism or a lab error.

### Supported matrix (MVP, configuration-driven)

Stored in `config/scope.yaml`, never hard-coded in UI or API. Final drug list must be confirmed against the pinned AMRFinderPlus release and your validation data (open item O-03).

| Organism | AMRFinderPlus `--organism` value (verify with `amrfinder --list_organisms`) | Antibiotics (MVP) |
| --- | --- | --- |
| *Escherichia coli* | `Escherichia` | ciprofloxacin, ceftriaxone, meropenem, gentamicin, tetracycline |
| *Klebsiella pneumoniae* | `Klebsiella_pneumoniae` | ciprofloxacin, ceftriaxone, meropenem, gentamicin |
| *Staphylococcus aureus* | `Staphylococcus_aureus` | cefoxitin (methicillin-resistance proxy), vancomycin, erythromycin, ciprofloxacin |

Decisions: one name per drug (ceftriaxone, not cefotaxime; meropenem, not imipenem) so the UI, rules and AST entry agree. Point-mutation screening is available only for taxa AMRFinderPlus curates; the organism flag must be passed or mutation findings are silently missing.

### Detection quality classes

AMRFinderPlus reports a `Method` per hit (for example exact, allele, BLAST, HMM, partial, internal stop, point mutation) with percent identity and coverage. Our normaliser maps these to `DetectionQuality`. The thresholds are **project decisions in `config/quality.yaml`, not tool facts**; the defaults are:

| Class | Rule (default) |
| --- | --- |
| `EXACT` | method is exact or allele match, or a curated point mutation (`POINT`) |
| `STRICT` | BLAST or HMM method with identity at least 90% and coverage at least 90% |
| `PARTIAL` | any partial method (hit truncated or at contig end), or coverage under 90% |
| `LOW_QUALITY` | internal stop codon or disrupted point mutation |
| `LOOSE` | BLAST or HMM with identity under 90% |
| `UNKNOWN` | method value not recognised (logged as a warning) |

The adapter must map by **column name**, not column position, and must fail loudly on an unrecognised header: output column names have changed between AMRFinderPlus major versions.

### Result categories (`ResultCategory`)

| Category | Meaning | Emitted when |
| --- | --- | --- |
| `RESISTANCE_EVIDENCE_STRONG` | Curated, well-established mechanism for this organism and drug | Tier A rule matched by an `EXACT` or `STRICT` finding |
| `RESISTANCE_EVIDENCE_MODERATE` | Relevant but incomplete or context-dependent | Tier B rule matched; or Tier A matched by a `PARTIAL` finding (capped) |
| `RESISTANCE_EVIDENCE_WEAK` | Possible association only | Tier C or D rule matched; or any tier matched only by `LOOSE`, `LOW_QUALITY` or `UNKNOWN` findings (capped, SCI-04) |
| `INCONCLUSIVE` | Evidence for the drug class exists but no drug-specific rule, or rules conflict | A finding's class matches the drug's class and no rule matches (reason code `NO_DRUG_SPECIFIC_RULE`) |
| `INSUFFICIENT_EVIDENCE` | No relevant known marker | No finding of the drug's class and no rule matched |
| `NOT_ASSESSABLE` | Input quality or scope prevents assessment | Genome fails hard QC, or pair outside the matrix |
| `SUSCEPTIBILITY_EVIDENCE_LIMITED` | Disabled in MVP (D-10) | Never emitted until a validated susceptibility rule exists |

`DISCORDANT_WITH_AST` is **not** a result category (D-07). An assessment is immutable once written.

### Evidence tiers (`EvidenceTier`) are properties of rules

`A_CURATED_STRONG`, `B_CURATED_MODERATE`, `C_INDIRECT`, `D_EXPLORATORY`, `INSUFFICIENT`. A tier says how well the *rule* is established; the category says what the *result* is after detection quality is considered.

### Rule file format

Rules live in `config/rules/<organism>.yaml`, are versioned, and every rule carries a source reference. **Never write a rule without a citable source.**

```yaml
rule_set_version: "0.1.0-seed"
rules:
  - id: SA-FOX-001
    organism: Staphylococcus aureus
    antibiotic: cefoxitin
    match:
      element_symbols: ["mecA", "mecC"]
    effect: resistance
    tier: A_CURATED_STRONG
    rationale: "mecA/mecC encode altered penicillin-binding proteins associated with methicillin resistance."
    limitations: "Phenotype (cefoxitin or oxacillin) remains the reference; borderline phenotypes exist."
    sources: ["<fill: EUCAST/CLSI/AMRFinderPlus reference with page or URL>"]
    reviewed_by: "<name>"
    reviewed_on: "<date>"
```

### Seed rule candidates (require curation before use)

These are widely described mechanisms, offered as a **starting list for your domain reviewer**, not validated rules. Each needs a primary source, an exact symbol list taken from the pinned AMRFinderPlus catalogue, and a tier decision.

| Organism | Drug | Candidate determinants | Candidate tier | Why it is not simply "same class means resistant" |
| --- | --- | --- | --- | --- |
| *S. aureus* | cefoxitin | *mecA*, *mecC* | A | Phenotype of record is still cefoxitin or oxacillin testing |
| *S. aureus* | vancomycin | *vanA* | A | Most real vancomycin non-susceptibility in *S. aureus* is chromosomal and has no gene marker, so absence is especially weak |
| *S. aureus* | erythromycin | *erm*(A/B/C), *msr*(A) | A or B | Inducible phenotypes complicate interpretation |
| *S. aureus* | ciprofloxacin | *gyrA*, *grlA* substitutions | B | Number and position of substitutions matter |
| *E. coli*, *K. pneumoniae* | ceftriaxone | *bla*CTX-M family, plasmid AmpC (for example *bla*CMY), ESBL variants of *bla*SHV/*bla*TEM | A | Wild-type *bla*TEM-1 and *bla*SHV-1 do **not** confer ceftriaxone resistance; the variant must be checked |
| *E. coli*, *K. pneumoniae* | meropenem | *bla*KPC, *bla*NDM, *bla*VIM, *bla*IMP | A |  |
| *E. coli*, *K. pneumoniae* | meropenem | *bla*OXA-48-like | B | Can give low-level carbapenem MICs; many isolates test susceptible |
| *E. coli*, *K. pneumoniae* | meropenem | ESBL or AmpC plus porin changes | C | Needs a combination rule; do not build in MVP unless curated |
| *E. coli*, *K. pneumoniae* | ciprofloxacin | *gyrA* + *parC* substitutions | A; single *gyrA* B; *qnr* C | Additive effects |
| *E. coli*, *K. pneumoniae* | gentamicin | *aac(3)*-II/IV, *ant(2'')*-Ia (confirm list) | A or B | *aac(6')*-Ib mainly affects other aminoglycosides; this is the textbook example of why drug-class matching is wrong |
| *E. coli* | tetracycline | *tet*(A), *tet*(B) and other *tet* efflux or ribosomal-protection genes | A |  |

### Assessment algorithm (deterministic)

1. If genome QC is `FAIL`, or organism is outside the matrix: every pair is `NOT_ASSESSABLE` with a reason code.
2. For each pair in the matrix, collect the findings whose element symbol matches any rule for that pair.
3. For each matched rule, derive a base category from the rule's tier (A → STRONG, B → MODERATE, C or D → WEAK).
4. Cap the category by the finding's `detectionQuality`: `PARTIAL` caps at MODERATE; `LOOSE`, `LOW_QUALITY`, `UNKNOWN` cap at WEAK.
5. The pair's category is the strongest capped result across matched rules. Record every rule ID and finding ID used (`evidence_links`).
6. If no rule matched but a finding's AMRFinderPlus class or subclass corresponds to the drug's class: `INCONCLUSIVE`, reason `NO_DRUG_SPECIFIC_RULE`.
7. Otherwise: `INSUFFICIENT_EVIDENCE`, with the fixed limitation text "No known marker detected by the pinned database. This is not evidence of susceptibility."

The algorithm uses no randomness and no learned weights, which is what makes NFR-06 (reproducibility) achievable.

### Discordance rules

A comparison runs only when all five conditions hold: pair in matrix; assessment exists; AST result for the same pair supplied; AST category is S, I or R; rule set version recorded. AST categories are entered by the user; **the MVP does not recompute S/I/R from MIC or zone** (it stores MIC or zone as entered, with the standard and version, and shows them).

| Genomic category | AST = S | AST = I | AST = R |
| --- | --- | --- | --- |
| STRONG | `GENOMIC_RESISTANT_AST_SUSCEPTIBLE` (priority high) | no event; shown as partial agreement | concordant, no event |
| MODERATE | `GENOMIC_RESISTANT_AST_SUSCEPTIBLE` (priority medium) | no event | concordant |
| WEAK | no event (note shown) | no event | no event (note shown) |
| INCONCLUSIVE | no event | no event | `GENOMIC_INCONCLUSIVE_AST_RESISTANT` (priority medium) |
| INSUFFICIENT\_EVIDENCE | no event | no event | `GENOMIC_NO_EVIDENCE_AST_RESISTANT` (priority medium) |
| NOT\_ASSESSABLE | `UNSUPPORTED_COMPARISON` (informational) | same | same |

If a STRONG or MODERATE assessment was capped because the only matching findings were `PARTIAL`, `LOOSE` or `LOW_QUALITY`, and AST is S, the event type is `LOW_QUALITY_CONFLICT` instead.

This amends the bridge enum (decision D-12): `GENOMIC_INCONCLUSIVE_AST_SUSCEPTIBLE` is dropped because inconclusive evidence versus a susceptible result is not a conflict, and `GENOMIC_NO_EVIDENCE_AST_RESISTANT` is added to cover the "resistant but no known marker" case that your research flags as a possible novel-mechanism signal. The UI text for that event must say "discrepancy requiring review", never "novel mechanism".

### What we deliberately do not model in the MVP

Gene expression, promoter mutations, porin loss, efflux regulation, heteroresistance, tolerance and persistence, plasmid context, co-trimoxazole and other drugs outside the matrix. The methodology page lists each as a known blind spot, because they are exactly the cases where genome and phenotype diverge.

## 5. Technology stack

One stack, chosen for speed of a student team, mature libraries and a single language per tier. **Pin every version in lockfiles at project start and record the pinned versions in `docs/versions.md`**; I have not verified current release numbers as of today, so do not copy versions from this document.

| Concern | Choice | Why | Rejected, and when to revisit |
| --- | --- | --- | --- |
| Frontend framework | **Next.js (App Router) + React + TypeScript** | Routing, layouts, easy Vercel deploy, huge ecosystem | Plain Vite SPA is also fine; revisit only if SSR is never used |
| Styling | **Tailwind CSS + shadcn/ui (Radix primitives)** | Accessible primitives (focus, keyboard, ARIA) you own as source; design tokens map to CSS variables | MUI/Chakra: heavier, harder to give a distinctive look |
| Animation | **Motion (Framer Motion successor) for UI transitions; CSS for micro-interactions** | Respects `prefers-reduced-motion` easily | GSAP/Three.js: only if a justified visual needs it |
| Charts and genome track | **visx (D3 primitives) in React** for the genome track, matrix and evidence graph | Full control, SVG, accessible labels | Plotly/ECharts: faster for plain charts but harder to make bespoke; a 3D genome viewer is deferred (section 3) |
| Client data | **TanStack Query** (server state, polling) + React state; no Redux | Polling a job status is its core use case | Redux/Zustand: not needed |
| Forms and validation | **React Hook Form + Zod**; Zod schemas generated or hand-mirrored from the API contract | One validation language on the client |  |
| Backend | **Python 3.12+ with FastAPI + Pydantic v2** | The analysis engine is Python and shells out to AMRFinderPlus; Pydantic gives request validation and OpenAPI for free | Node/Express: would force a second language for the engine |
| DB driver | **PyMongo Async (or Motor) with Pydantic models** | One driver, explicit schemas | Beanie/ODM: hides field names the contracts fix |
| Database | **MongoDB Atlas (free/shared tier for dev, a paid tier for the demo week)** | As required; metadata and results are document-shaped | No second database (D-08) |
| File storage | **Local volume (dev) and an S3-compatible bucket (deploy), accessed by `storageKey` only** | Genomes never go into MongoDB; swap target by config | GridFS: couples files to the database |
| Background work | **A `worker` process in the same repo that polls `analyses` for `QUEUED`** (leases, section 6) | Zero extra services | Celery/Redis/queues: revisit above about 1 concurrent analysis per minute or when you need retries across machines |
| Detection engine | **AMRFinderPlus (NCBI), run as a subprocess, installed via Bioconda in the backend image** | Official, versioned, outputs method/identity/coverage | CARD/RGI as second engine: Level 2 (D-09) |
| Auth | **None in MVP.** A single shared demo access key (env var) gates write endpoints | Removes account complexity; honest about deployment limits | Add OAuth/email login at Level 2 |
| Testing | **pytest (backend, engine), Vitest + Testing Library (components), Playwright (E2E + axe accessibility)** | Standard, free |  |
| API contract | **OpenAPI generated by FastAPI is the source of truth; frontend types generated from it (`openapi-typescript`)** | Prevents field-name drift | Hand-written types: drift |
| CI | **GitHub Actions**: lint, type-check, unit, contract, build on every pull request | Free for student repos |  |
| Deployment | **Frontend on Vercel; backend + worker in one Docker image on a single container host (Render, Railway or Fly.io); MongoDB Atlas** | Few moving parts | Kubernetes: not justified |
| Monitoring | **Structured JSON logs with `requestId`, `/health`, and an uptime ping** | Enough for a hackathon | Full APM: later |

### Upgrade triggers (when the simple choice stops being enough)

- More than a few concurrent analyses, or analysis over 10 minutes: move to a real queue and separate worker host.
- Real users with identifiable data: add authentication, per-user ownership, encryption review and an access-control audit before anyone uploads data.
- Multiple engines or an ML tab: introduce an `engine` interface (already implied by the adapter boundary in section 6).

## 6. Architecture

Three runtime pieces and two stores. The browser never touches MongoDB, the file store or AMRFinderPlus; it only calls the API.

```text
  Browser (Next.js on Vercel)
        |  HTTPS, JSON (+ multipart for FASTA)
        v
  API service (FastAPI)  --------------------+
   - validates requests (Pydantic)           |
   - saves file to Storage, metadata to Mongo|
   - creates analysis QUEUED                 |
        |                                    |
        v                                    v
  MongoDB Atlas  <---- polls / updates ---- Worker (same image, `python -m worker`)
   samples, genome_files, analyses,           1 validate FASTA + QC
   analysis_findings, antibiotic_assessments, 2 run AMRFinderPlus (subprocess)
   evidence_links, ast_results,               3 normalise -> findings
   discordance_events, reference_versions,    4 interpret -> assessments + links
   demo_datasets, audit_events                5 mark COMPLETED / FAILED
        ^                                    |
        |                                    v
        +------------------------ File store (volume / S3-compatible, keyed by storageKey)
```

### Connection table

| From | To | Data | Mechanism and format | Validation | Success | Failure and recovery |
| --- | --- | --- | --- | --- | --- | --- |
| Browser | API | Sample, file, analysis, AST requests | HTTPS, JSON camelCase; FASTA as `multipart/form-data` | Pydantic schemas; file checks (section 13) | 2xx + JSON body | Standard error envelope (section 7); client shows message and retry |
| API | File store | FASTA bytes | Stream to `storageKey` while hashing (SHA-256) | Size cap enforced while streaming | `uploadStatus: STORED` | Partial file deleted; `uploadStatus: FAILED`; user retries |
| API | MongoDB | Documents | PyMongo, schema-validated collections | Collection validators (section 8) | Acknowledged write | Request fails with `INTERNAL_ERROR`; no partial analysis (create sample/file/analysis in order, each idempotent by client key) |
| API to Worker | Analysis job | **No direct call.** The worker polls `analyses` where `status = QUEUED` | Atomic `find_one_and_update` claim | Lease fields | Analysis moves to `VALIDATING` | Lease expiry re-queues (below) |
| Worker | File store | Read FASTA | By `storageKey` | Checksum equals `genome_files.checksum` | Bytes read | Checksum mismatch: `FAILED`, code `FILE_TAMPERED` |
| Worker | AMRFinderPlus | FASTA path, organism flag | `subprocess.run([...], timeout=...)`, list arguments, **never a shell string** | Organism must be in `scope.yaml` | TSV file | Timeout or non-zero exit: `FAILED`, code `ENGINE_FAILED`, stderr tail stored |
| Worker | MongoDB | Findings, assessments, links, status | Bulk insert, then status update last | Validators | `COMPLETED` | Results written before status; a crash leaves status unchanged so a retry is safe (delete-then-insert by `analysisId`) |
| Browser | API | Poll `GET /analyses/{id}` every 2 s until terminal | TanStack Query `refetchInterval` |  | `status` and `stage` fields | Backoff on errors; stop on terminal status |

### Analysis job lifecycle

| Status | Meaning | Set by | Next |
| --- | --- | --- | --- |
| `CREATED` | Row exists, not yet queued (file still uploading) | API | `QUEUED` |
| `QUEUED` | Waiting for a worker | API | `VALIDATING` |
| `VALIDATING` | FASTA checks and QC | Worker | `ANALYZING` or `FAILED` |
| `ANALYZING` | AMRFinderPlus running | Worker | `INTERPRETING` or `FAILED` |
| `INTERPRETING` | Normalise, apply rules, persist assessments | Worker | `COMPLETED` or `FAILED` |
| `COMPLETED` | All assessments persisted | Worker | terminal |
| `FAILED` | `error.code` and `error.message` set | Worker or API | terminal (user may create a new analysis) |
| `CANCELLED` | User cancelled while `QUEUED` | API | terminal |

**Worker claim and lease.** The worker claims with a single atomic update: filter `{status: "QUEUED"}`, set `status: "VALIDATING"`, `lockedBy: <workerId>`, `lockedAt: now`, `heartbeatAt: now`. While running it updates `heartbeatAt` every 15 s. A recovery sweep (run at worker start and every minute) finds analyses in `VALIDATING`, `ANALYZING` or `INTERPRETING` whose `heartbeatAt` is older than the lease (default 120 s); if `attempts < 2` it deletes partial results, increments `attempts`, and sets `QUEUED`; otherwise it sets `FAILED` with code `WORKER_LOST`. This satisfies AC-08 and NFR-07 without a message broker.

**Idempotency.** Every create endpoint accepts an optional `Idempotency-Key` header; repeated requests with the same key return the original resource. This protects against double-clicks and retries.

**Stage reporting.** The API exposes `status` plus `stageProgress`, a list of `{stage, state, startedAt, completedAt}` the worker updates, so the progress screen (FR-12) shows real stages.

### Request flow for the main journey

1. `POST /api/v1/samples` → `smp_...`
2. `POST /api/v1/genome-files` (multipart, with `sampleId`) → `fil_...`, status `STORED`
3. `POST /api/v1/analyses` with `sampleId`, `fileId`, `organism` → `ana_...`, status `QUEUED`
4. Poll `GET /api/v1/analyses/{id}` → `COMPLETED`
5. `GET .../assessments`, `.../findings`, `.../evidence`
6. Optional: `POST .../ast-results`, then `GET .../discordance`
7. `GET .../report`

## 7. Shared contracts

These rules are frozen before any parallel work starts. A change needs a pull request that touches `packages/contracts`, the OpenAPI spec, the MongoDB validators and this document together.

### Conventions

| Topic | Rule |
| --- | --- |
| JSON field names | `camelCase` in API and MongoDB documents; `snake_case` only inside Python code and rule YAML |
| Identifiers | Prefixed, sortable strings stored as `_id`: `smp_`, `fil_`, `ana_`, `fnd_`, `ass_`, `lnk_`, `ast_`, `dis_`, `ver_`, `dem_`, `aud_`, each followed by a ULID (26 characters, Crockford base32). Example: `ana_01JBX3M8Q2N7V4K9R6T0YHE5ZC`. Generated by the API only; clients never invent IDs |
| Timestamps | ISO 8601 UTC with `Z`, millisecond precision, e.g. `2026-10-15T07:59:00.000Z`; stored as BSON Date, serialised as strings |
| Enums | UPPER\_SNAKE strings, defined once (below), never renamed, only added (with an API version note) |
| Organism names | Full binomial string from `scope.yaml`: `Escherichia coli`, `Klebsiella pneumoniae`, `Staphylococcus aureus` |
| Antibiotic names | Lowercase generic name from `scope.yaml`: `ciprofloxacin`, `ceftriaxone`, `meropenem`, `gentamicin`, `tetracycline`, `cefoxitin`, `vancomycin`, `erythromycin` |
| Percentages | Numbers 0–100 (not fractions), one decimal in display only |
| Result origin | Every analysis carries `resultOrigin`: `REAL_ANALYSIS`, `CACHED_REAL_ANALYSIS` or `SYNTHETIC_FIXTURE`; the UI banner and report header are driven by it (SCI-03) |
| Pagination | `?limit=` (default 25, max 100) and `?cursor=` (opaque); responses `{items, nextCursor}` |

### Enums (Python, tested)

Saved as `engine/contracts.py`; the TypeScript copy in `packages/contracts/src/enums.ts` must match value for value (CI test CT-01 compares them).

```python
from enum import Enum

class _S(str, Enum):
    def __str__(self) -> str:
        return self.value

class AnalysisStatus(_S):
    CREATED = "CREATED"; QUEUED = "QUEUED"; VALIDATING = "VALIDATING"
    ANALYZING = "ANALYZING"; INTERPRETING = "INTERPRETING"
    COMPLETED = "COMPLETED"; FAILED = "FAILED"; CANCELLED = "CANCELLED"

class DetectionQuality(_S):
    EXACT = "EXACT"; STRICT = "STRICT"; PARTIAL = "PARTIAL"
    LOOSE = "LOOSE"; LOW_QUALITY = "LOW_QUALITY"; UNKNOWN = "UNKNOWN"

class EvidenceTier(_S):
    A_CURATED_STRONG = "A_CURATED_STRONG"; B_CURATED_MODERATE = "B_CURATED_MODERATE"
    C_INDIRECT = "C_INDIRECT"; D_EXPLORATORY = "D_EXPLORATORY"; INSUFFICIENT = "INSUFFICIENT"

class ResultCategory(_S):
    RESISTANCE_EVIDENCE_STRONG = "RESISTANCE_EVIDENCE_STRONG"
    RESISTANCE_EVIDENCE_MODERATE = "RESISTANCE_EVIDENCE_MODERATE"
    RESISTANCE_EVIDENCE_WEAK = "RESISTANCE_EVIDENCE_WEAK"
    SUSCEPTIBILITY_EVIDENCE_LIMITED = "SUSCEPTIBILITY_EVIDENCE_LIMITED"  # disabled in MVP (D-10)
    INCONCLUSIVE = "INCONCLUSIVE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    NOT_ASSESSABLE = "NOT_ASSESSABLE"

class DiscordanceType(_S):
    GENOMIC_RESISTANT_AST_SUSCEPTIBLE = "GENOMIC_RESISTANT_AST_SUSCEPTIBLE"
    GENOMIC_NO_EVIDENCE_AST_RESISTANT = "GENOMIC_NO_EVIDENCE_AST_RESISTANT"
    GENOMIC_INCONCLUSIVE_AST_RESISTANT = "GENOMIC_INCONCLUSIVE_AST_RESISTANT"
    LOW_QUALITY_CONFLICT = "LOW_QUALITY_CONFLICT"
    UNSUPPORTED_COMPARISON = "UNSUPPORTED_COMPARISON"

class AstCategory(_S):
    S = "S"; I = "I"; R = "R"

class ResultOrigin(_S):
    REAL_ANALYSIS = "REAL_ANALYSIS"
    CACHED_REAL_ANALYSIS = "CACHED_REAL_ANALYSIS"
    SYNTHETIC_FIXTURE = "SYNTHETIC_FIXTURE"
```

`ReviewStatus` (for discordance events): `OPEN`, `REVIEWED_CONFIRMED`, `REVIEWED_DISMISSED`.

### Error envelope and codes

One shape for every non-2xx response, as in your bridge document, with `requestId` always present:

```json
{ "error": { "code": "UNSUPPORTED_ORGANISM", "message": "Human-readable sentence.",
  "details": { "organism": "Example species", "supportedOrganisms": ["Escherichia coli"] },
  "requestId": "req_01JBX...", "timestamp": "2026-10-15T07:59:00.000Z" } }
```

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 | Request body fails schema; `details.fields` lists each field |
| `INVALID_FASTA` | 422 | File is not valid nucleotide FASTA |
| `FILE_TOO_LARGE` | 413 | Above `MAX_UPLOAD_BYTES` |
| `UNSUPPORTED_FILE_TYPE` | 415 | Extension or content type not allowed |
| `UNSUPPORTED_ORGANISM` | 422 | Organism outside `scope.yaml` |
| `UNSUPPORTED_ANTIBIOTIC` | 422 | Antibiotic outside the organism's matrix |
| `NOT_FOUND` | 404 | Unknown ID |
| `CONFLICT` | 409 | Wrong state, for example adding AST to a non-completed analysis |
| `RATE_LIMITED` | 429 | Rate limit hit; `Retry-After` header set |
| `UNAUTHORIZED` | 401 | Missing or wrong demo access key |
| `FILE_TAMPERED` | (job error) | Stored checksum differs from the recorded one |
| `ENGINE_FAILED` | (job error) | AMRFinderPlus failed or timed out |
| `WORKER_LOST` | (job error) | Lease expired twice |
| `INTERNAL_ERROR` | 500 | Anything unexpected; details only in logs |

Job error codes appear in `analysis.error` rather than as an HTTP failure.

## 8. MongoDB data model

### Design rules

- **Files never go in MongoDB.** A genome is 3–6 MB of text; the 16 MB document limit and index cost make that a bad fit. MongoDB stores metadata and the `storageKey`.
- **Reference across aggregates, embed within them.** Findings, assessments and links are separate collections (they are queried independently and one analysis can have dozens to hundreds), but small value objects (`inputProfile`, `toolVersions`, `stageProgress`, `error`, `qc`) are embedded in `analyses`.
- **Derived results are immutable once `COMPLETED`.** Re-running creates a new analysis; it never edits old findings. AST and discordance are added later in their own collections (D-07).
- **One owner per collection.** Only the API writes `samples`, `genome_files`, `ast_results`, `discordance_events` and `audit_events`; only the worker writes `analysis_findings`, `antibiotic_assessments`, `evidence_links`; both update `analyses` (different fields: API sets `QUEUED`/`CANCELLED`, worker the rest).
- **No patient identifiers.** `samples.label` is free text but the API rejects labels matching common identifier patterns (long digit runs, email, phone) with a warning-level validation error (SEC-03).

### Collections

| Collection | Purpose | Required fields | Optional fields | Unique / key indexes |
| --- | --- | --- | --- | --- |
| `samples` | Isolate metadata | `_id`, `label`, `organism`, `sourceType`, `isSynthetic`, `createdAt` | `collectionYear`, `country`, `state`, `facilityType`, `provenance` (free text, max 500) | `{createdAt:-1}`; `{organism:1, createdAt:-1}` |
| `genome_files` | Uploaded file metadata | `_id`, `sampleId`, `fileName`, `checksumSha256`, `sizeBytes`, `storageKey`, `uploadStatus`, `createdAt` | `contigCount`, `totalLength`, `n50`, `nFraction`, `gcPercent` | unique `{checksumSha256:1, sampleId:1}`; `{sampleId:1}` |
| `analyses` | Lifecycle aggregate root | `_id`, `sampleId`, `fileId`, `organism`, `status`, `resultOrigin`, `createdAt`, `attempts` | `stageProgress[]`, `qc`, `toolVersions`, `ruleSetVersion`, `lockedBy`, `lockedAt`, `heartbeatAt`, `startedAt`, `completedAt`, `error`, `idempotencyKey` | `{status:1, createdAt:1}` (worker claim); `{createdAt:-1}`; `{sampleId:1}`; unique sparse `{idempotencyKey:1}` |
| `analysis_findings` | One document per detected element | `_id`, `analysisId`, `symbol`, `elementType`, `klass`, `method`, `detectionQuality` | `name`, `subtype`, `subclass`, `identity`, `coverage`, `contigId`, `start`, `stop` | `{analysisId:1, symbol:1}` |
| `antibiotic_assessments` | One per organism–drug pair | `_id`, `analysisId`, `organism`, `antibiotic`, `resultCategory`, `evidenceTier`, `ruleIds[]`, `limitations`, `capped` | `reasonCode`, `explanation` | unique `{analysisId:1, antibiotic:1}` |
| `evidence_links` | Finding → assessment edges | `_id`, `analysisId`, `findingId`, `assessmentId`, `ruleId`, `relationship` (`SUPPORTS`), `effectiveCategory` |  | `{analysisId:1, assessmentId:1}`; `{findingId:1}` |
| `ast_results` | Lab phenotype entered by user | `_id`, `analysisId`, `sampleId`, `organism`, `antibiotic`, `category` (`S`/`I`/`R`), `method`, `createdAt` | `mic`, `micUnit`, `zoneDiameterMm`, `standard`, `standardVersion` | unique `{analysisId:1, antibiotic:1}` |
| `discordance_events` | Genotype–AST conflicts | `_id`, `analysisId`, `assessmentId`, `astResultId`, `discordanceType`, `priority`, priorityRank, `reviewStatus`, `explanation`, `createdAt` | `reviewedAt`, `reviewNote` | `{analysisId:1}`; `{reviewStatus:1, priority:1}` |
| `reference_versions` | Tool, database and rule versions | `_id`, `tool`, `version`, `recordedAt` | `databaseVersion`, `checksum`, `documentationUrl` | unique `{tool:1, version:1, databaseVersion:1}` |
| `demo_datasets` | Labelled demo inputs | `_id`, `label`, `organism`, `resultOrigin`, `disclaimer`, `fileKey` | `expectedFindings[]`, `expectedDiscordance[]`, `sourceNote` | `{organism:1}` |
| `audit_events` | Minimal audit trail | `_id`, `action`, `resourceType`, `resourceId`, `timestamp`, `outcome` | `requestId`, `actorType` | `{resourceType:1, resourceId:1, timestamp:-1}`; TTL on `timestamp` (for example 180 days) |

`toolVersions` embedded in each analysis is a **snapshot**: `{amrfinderplus: "<version>", database: "<version>", ruleSet: "<version>", appCommit: "<git sha>"}`. The `reference_versions` collection lists what exists; the snapshot says what that analysis used. Never reference by "latest".

### Example documents

```json
// analyses
{ "_id": "ana_01JBX3M8Q2N7V4K9R6T0YHE5ZC", "sampleId": "smp_01JBX3K1...", "fileId": "fil_01JBX3L4...",
  "organism": "Klebsiella pneumoniae", "status": "COMPLETED", "resultOrigin": "REAL_ANALYSIS",
  "attempts": 1, "qc": { "result": "PASS", "warnings": [] },
  "toolVersions": { "amrfinderplus": "<pinned>", "database": "<pinned>", "ruleSet": "0.1.0-seed", "appCommit": "<sha>" },
  "stageProgress": [ { "stage": "VALIDATING", "state": "DONE", "startedAt": "2026-10-15T08:00:01.000Z", "completedAt": "2026-10-15T08:00:03.000Z" } ],
  "createdAt": "2026-10-15T08:00:00.000Z", "completedAt": "2026-10-15T08:03:10.000Z" }

// antibiotic_assessments
{ "_id": "ass_01JBX3P0...", "analysisId": "ana_01JBX3M8...", "organism": "Klebsiella pneumoniae",
  "antibiotic": "meropenem", "resultCategory": "RESISTANCE_EVIDENCE_STRONG", "evidenceTier": "A_CURATED_STRONG",
  "ruleIds": ["KP-MER-001"], "capped": false, "reasonCode": "",
  "limitations": "Genotype only; phenotype remains the reference." }
```

(Values above are format examples, not real results.)

### Schema validation (apply with `collMod` at startup)

Example for `antibiotic_assessments`; generate the others from the Pydantic models to keep one source of truth.

```json
{ "$jsonSchema": { "bsonType": "object",
  "required": ["_id","analysisId","organism","antibiotic","resultCategory","evidenceTier","ruleIds","capped"],
  "properties": {
    "_id": { "bsonType": "string", "pattern": "^ass_[0-9A-HJKMNP-TV-Z]{26}$" },
    "analysisId": { "bsonType": "string", "pattern": "^ana_[0-9A-HJKMNP-TV-Z]{26}$" },
    "resultCategory": { "enum": ["RESISTANCE_EVIDENCE_STRONG","RESISTANCE_EVIDENCE_MODERATE","RESISTANCE_EVIDENCE_WEAK","SUSCEPTIBILITY_EVIDENCE_LIMITED","INCONCLUSIVE","INSUFFICIENT_EVIDENCE","NOT_ASSESSABLE"] },
    "evidenceTier": { "enum": ["A_CURATED_STRONG","B_CURATED_MODERATE","C_INDIRECT","D_EXPLORATORY","INSUFFICIENT"] },
    "ruleIds": { "bsonType": "array", "items": { "bsonType": "string" } },
    "capped": { "bsonType": "bool" } } } }
```

### Typical queries

- History: `analyses.find({}).sort({createdAt:-1}).limit(25)`
- Worker claim: `analyses.find_one_and_update({status:"QUEUED"}, {$set:{status:"VALIDATING", lockedBy, lockedAt, heartbeatAt}}, sort=[("createdAt",1)])`
- Results screen: assessments, findings and links, each `find({analysisId})`; join in the API, not in the browser.
- Review queue: `discordance_events.find({reviewStatus:"OPEN"}).sort({priority:1, createdAt:-1})` (store `priority` as a sortable rank field `priorityRank`: 1 high, 2 medium, 3 info).

### Migrations and seed data

- `db/migrations/NNN_<name>.py`, each idempotent, recorded in a `schema_migrations` collection; run by `python -m db.migrate` at deploy.
- `db/seed/` holds `reference_versions` and `demo_datasets` as JSON; `python -m db.seed` is safe to re-run (upserts by `_id`).
- Add fields as optional first, backfill, then make required in a later migration.
- Retention: uploaded files and analyses are kept 90 days on the demo deployment unless pinned; `audit_events` expire by TTL; a documented `DELETE /api/v1/samples/{id}` removes a sample and everything derived from it (Level 2 if time is short).

## 9. API specification

Base path `/api/v1`. JSON in and out except the upload (multipart) and the report (HTML). FastAPI generates `/openapi.json`; **that file, committed as `contracts/openapi.json`, is what the frontend and tests consume.** Write endpoints require header `X-Access-Key: <DEMO_ACCESS_KEY>` (SEC-02); reads of demo data are open. Rate limits (SEC-04): 10 uploads and 20 analysis creations per IP per hour by default, configurable.

| # | Method and path | Purpose | Request | Success | Errors | Database operations |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `GET /health` | Liveness and DB ping | none | 200 `{status, db, engine, time}` |  | ping |
| 2 | `GET /scope` | Supported organisms and drugs, use statement, limits | none | 200 `{organisms:[{name, antibiotics[]}], maxUploadBytes, useStatement}` |  | reads `scope.yaml` |
| 3 | `GET /reference-versions` | Tool, DB, rule versions | none | 200 `{items[]}` |  | find `reference_versions` |
| 4 | `GET /demo-datasets` | Labelled demo inputs | none | 200 `{items[]}` each with `resultOrigin`, `disclaimer` |  | find `demo_datasets` |
| 5 | `POST /samples` | Create sample | `{label, organism, sourceType, isSynthetic?, collectionYear?, country?, state?, facilityType?, provenance?}` | 201 sample | 401, 422 `VALIDATION_ERROR`, `UNSUPPORTED_ORGANISM` | insert `samples`, `audit_events` |
| 6 | `POST /genome-files` | Upload FASTA | multipart: `sampleId`, `file` | 201 `{fileId, fileName, sizeBytes, checksumSha256, contigCount, totalLength, n50, nFraction, qcPreview}` | 401, 404, 413, 415, 422 `INVALID_FASTA`, 429 | insert `genome_files`; file to storage |
| 7 | `POST /analyses` | Queue analysis | `{sampleId, fileId, organism}` or `{demoId}` | 202 analysis in `QUEUED` (or `COMPLETED` for a cached demo) | 401, 404, 409, 422 | insert `analyses`, `reference_versions` snapshot |
| 8 | `GET /analyses` | History | `limit`, `cursor`, `organism?`, `status?` | 200 `{items[], nextCursor}` |  | find `analyses` |
| 9 | `GET /analyses/{id}` | Status and summary | none | 200 analysis with `status`, `stageProgress`, `qc`, `toolVersions`, `resultOrigin`, `error?` and `counts` (findings, assessments by category, open discordance) | 404 | find one + counts |
| 10 | `POST /analyses/{id}/cancel` | Cancel while `QUEUED` | none | 200 | 404, 409 | conditional update |
| 11 | `GET /analyses/{id}/findings` | Detected elements | `quality?`, `limit`, `cursor` | 200 `{items[]}` | 404, 409 if not `COMPLETED` | find `analysis_findings` |
| 12 | `GET /analyses/{id}/assessments` | One per drug | none | 200 `{items[]}` | 404, 409 | find `antibiotic_assessments` |
| 13 | `GET /analyses/{id}/evidence` | Links with joined finding and rule summaries | `assessmentId?` | 200 `{items[]}` | 404, 409 | find `evidence_links`, joins in API |
| 14 | `POST /analyses/{id}/ast-results` | Add or replace AST entries | `{items:[{antibiotic, category, method, mic?, micUnit?, zoneDiameterMm?, standard?, standardVersion?}]}` | 201 `{items[], discordance[]}` (events generated in the same request) | 401, 404, 409 (analysis not `COMPLETED`), 422 `UNSUPPORTED_ANTIBIOTIC` | upsert `ast_results`; replace `discordance_events` for the affected drugs |
| 15 | `GET /analyses/{id}/discordance` | Discordance events | `reviewStatus?` | 200 `{items[]}` each with embedded assessment summary and AST entry | 404 | find `discordance_events` |
| 16 | `PATCH /discordance/{eventId}` | Mark reviewed | `{reviewStatus, reviewNote?}` | 200 | 401, 404, 422 | update + `audit_events` |
| 17 | `GET /analyses/{id}/report` | Printable report (HTML; browser prints to PDF) | `format=html` | 200 `text/html` built only from persisted data | 404, 409 | reads all |
| 18 | `DELETE /samples/{id}` | Remove sample and derived data (Level 2 if time-pressed) | none | 204 | 401, 404 | cascade delete + file delete |

### Response shapes the frontend depends on

**Assessment item** (`GET /analyses/{id}/assessments`):

```json
{ "id": "ass_...", "analysisId": "ana_...", "organism": "Klebsiella pneumoniae", "antibiotic": "meropenem",
  "resultCategory": "RESISTANCE_EVIDENCE_STRONG", "evidenceTier": "A_CURATED_STRONG",
  "capped": false, "reasonCode": "", "ruleIds": ["KP-MER-001"], "findingIds": ["fnd_..."],
  "explanation": "Detected <symbol> (exact match) which rule KP-MER-001 associates with reduced meropenem susceptibility.",
  "limitations": "Genotype only; phenotype remains the reference.",
  "hasDiscordance": false }
```

**Finding item**: `{id, symbol, name, elementType, subtype, klass, subclass, method, identity, coverage, contigId, start, stop, detectionQuality}`.

**Discordance item**: `{id, assessmentId, antibiotic, discordanceType, priority, reviewStatus, explanation, ast:{category, method, mic?, standard?}, genomic:{resultCategory, evidenceTier, findingIds[]}}`.

### Upload example

```bash
curl -X POST https://api.example.org/api/v1/genome-files \
  -H "X-Access-Key: $DEMO_ACCESS_KEY" \
  -F sampleId=smp_01JBX3K1... -F file=@isolate.fna
```

### Rules for changing the API

- Additive changes (new optional field, new endpoint) are allowed in `v1`; the OpenAPI diff in CI must show only additions.
- Renames, removals, enum value removals or semantic changes require `/api/v2` or a feature flag; update section 7, this table, the Mongo validators and the frontend generated types in the same pull request.
- The frontend must ignore unknown fields and fall back gracefully on unknown enum values (show the raw value with a neutral style), so a backend addition never white-screens the UI.
- Contract test CT-02 runs Schemathesis (or equivalent) against the running API using `contracts/openapi.json`.

## 10. Frontend: design system, screens, components

### Visual direction

"Mission-control for evidence": calm, dense where it should be, quiet colour so that the few signal colours mean something. Dark theme is the hero (demo projector), light theme is complete and ships too. No decorative gradients; one restrained animated genome-track motif on the landing page, built from SVG.

### Design tokens (CSS variables; Tailwind reads them)

| Token group | Decision |
| --- | --- |
| Typeface | UI: **Inter**; data, identifiers, gene symbols: **JetBrains Mono**; both via `next/font` (self-hosted, no runtime Google call, which also supports NFR-08) |
| Type scale (px) | 12, 13, 14, 16, 20, 24, 32, 44; body 14 or 16; line height 1.5 body, 1.2 headings |
| Spacing | 4 px base: 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius and borders | 6 px controls, 10 px cards; 1 px borders at 12% foreground; elevation by border and subtle surface shift, not heavy shadows |
| Breakpoints | 360 (base), 640, 1024, 1280, 1536; content max width 1280 |
| Dark surfaces | background `#0B1020`, panel `#121A2E`, raised `#18223B`, border `#26314D` |
| Light surfaces | background `#F7F8FB`, panel `#FFFFFF`, border `#DDE2EE` |
| Brand accent | teal `#2DD4BF` on dark, `#0F766E` on light (links, focus, primary button) |

Treat the hex values as starting values and **verify every foreground/background pair meets 4.5:1 (text) and 3:1 (UI) with an automated check** in the design-token test (FE-A11Y-01).

### Evidence colour semantics

The colour system is a scientific claim, so it follows the scientific contract. **There is no green "safe" colour anywhere**, because we never conclude susceptibility; absence of evidence is neutral grey. Colour is always paired with an icon and a text label (NFR-04).

| Result category | Colour role | Icon | Label shown |
| --- | --- | --- | --- |
| `RESISTANCE_EVIDENCE_STRONG` | Red | filled shield-x | Strong resistance evidence |
| `RESISTANCE_EVIDENCE_MODERATE` | Orange | half shield-x | Moderate resistance evidence |
| `RESISTANCE_EVIDENCE_WEAK` | Amber | outlined shield-x | Weak resistance evidence |
| `INCONCLUSIVE` | Violet | question | Inconclusive |
| `INSUFFICIENT_EVIDENCE` | Neutral grey | dash circle | No known marker detected (not evidence of susceptibility) |
| `NOT_ASSESSABLE` | Hatched grey | slash circle | Not assessable |
| Discordance flag | Magenta outline, always an extra badge | split arrows | Discrepancy requiring review |
| Result origin banner | Blue (real), blue-hatched (cached real), yellow-hatched (synthetic) | database / flask | Real analysis / Cached real analysis / Synthetic demonstration data |

Detection quality uses a separate 5-step glyph (filled dots) rather than a colour: EXACT ●●●●, STRICT ●●●○, PARTIAL ●●○○, LOOSE ●○○○, LOW\_QUALITY ○ with warning, UNKNOWN "?".

### Screens (MVP)

| Route | Screen | Primary data | Main interactions | States to build |
| --- | --- | --- | --- | --- |
| `/` | Landing | `GET /scope` | Start analysis, Open demo, Read methodology | Loading (scope), error (still renders static copy) |
| `/analyses/new` | New analysis (3-step wizard: sample → file → optional AST) | `/scope`, `POST` samples, genome-files, analyses | Drag-drop FASTA, organism select, client pre-checks, inline server errors | Idle, dragging, uploading with progress, validation error per `error.code`, success |
| `/analyses/[id]` | Progress and results (one route; progress view until terminal) | `GET /analyses/{id}` polled | Cancel (queued), retry on `FAILED` | Queued, each stage, failed (with `error.code` message), completed |
| `/analyses/[id]` (results tab) | Results dashboard | assessments, findings, qc | Select a drug row to open evidence drawer; filter | Empty (no findings: say so with the "not evidence of susceptibility" note), partial data, loading skeletons |
| `/analyses/[id]/evidence` | Evidence explorer | findings, evidence | Table with quality glyphs, finding ↔ drug highlighting, rule and source panel | Many findings (virtualise above \~100), none |
| `/analyses/[id]/discordance` | Discordance review | discordance, ast | Enter AST, side-by-side genomic vs AST, mark reviewed | No AST yet (call to action), none found (explain what that does and does not mean), error |
| `/analyses/[id]/report` | Report view | report HTML | Print, copy summary | Loading, 409 if not complete |
| `/analyses` | History | `GET /analyses` | Filter, open, compare two (Level 2) | Empty first-run, loading, error |
| `/methodology` | Methodology and limitations | `GET /reference-versions`, static text | Read | Static |

### Textual wireframe: results dashboard

```text
+----------------------------------------------------------------------------------+
| [Origin banner: REAL ANALYSIS | CACHED REAL ANALYSIS | SYNTHETIC DEMONSTRATION DATA]  |
| Sample label . organism . genome QC badge (PASS / WARN / FAIL) . versions chip   |
+----------------------------------------------------------------------------------+
| ANTIBIOTIC EVIDENCE MATRIX (rows = drugs)                                        |
|  drug | category badge (icon+text) | tier | #findings | detection glyph | AST | [!]|
+-------------------------------------+--------------------------------------------+
| GENOME TRACK (contigs, hit ticks)   | DRAWER for selected drug:                  |
| ticks only where findings exist     |  why: findings -> rule -> explanation      |
|                                     |  what we cannot see (limitations)          |
|                                     |  versions + rule sources                   |
+-------------------------------------+--------------------------------------------+
| Footer: For research and surveillance use only. Not for clinical diagnosis ...   |
+----------------------------------------------------------------------------------+
```

Information hierarchy: origin banner and use statement (always visible) → discordance badge (if any) → matrix → drawer detail → provenance. On 360 px the matrix becomes a stacked card list and the drawer a full-screen sheet.

### Component inventory (props are the API shapes above)

| Component | Props | Notes and tests |
| --- | --- | --- |
| `OriginBanner` | `origin: ResultOrigin` | Renders text for each origin; test snapshots all three |
| `UseStatement` | none | Exact required string; test equality (SW-LINT-01) |
| `CategoryBadge` | `category: ResultCategory, size?` | Icon + label + colour; unknown value renders neutral with raw text |
| `DetectionGlyph` | `quality: DetectionQuality` | `aria-label` spells the class |
| `EvidenceMatrix` | `assessments, discordanceByAntibiotic, onSelect` | Keyboard: arrow keys move rows, Enter opens drawer |
| `EvidenceDrawer` | `assessment, findings, links` | Focus trap, Esc closes, returns focus |
| `GenomeTrack` | `contigs, findings` | Draws **only** from real `contigId/start/stop`; hidden if no coordinates |
| `StageTimeline` | `stageProgress, status` | Driven by server data only; no fake timers |
| `AstEntryForm` | `antibiotics, onSubmit` | Zod validated; category S/I/R required; MIC/zone optional |
| `DiscordanceCard` | `event` | Side by side genomic vs AST; never says the lab result is wrong |
| `FastaDropzone` | `onFile, maxBytes` | Client checks extension and size only; server is the authority |
| `VersionChip` | `toolVersions` | Opens popover with tool, database, rule set versions |

**State management:** server state in TanStack Query (keys `['analysis', id]`, `['assessments', id]`...), wizard state in a small React context, no global store. API client in `apps/web/src/lib/api.ts` generated from OpenAPI; every call goes through one `request()` that parses the error envelope into a typed `ApiError`.

### Mocking so the frontend can start on day one

Use **MSW (Mock Service Worker)** handlers returning fixtures from `packages/contracts/fixtures/` (one per screen state: queued, analyzing, failed, completed with a discordance, completed with no findings). Mock data are labelled `SYNTHETIC_FIXTURE` and the banner shows it, so mock screens can never be mistaken for real results.

### Motion

- Animate: stage transitions (150–200 ms fade/slide), drawer open (200 ms), row selection highlight (100 ms), landing genome-track draw-in (once, 1.2 s).
- Do not animate: result values, badges changing category, anything that could imply progress that is not real (no looping fake progress bars).
- `prefers-reduced-motion`: replace all transitions with instant state changes; the landing motif becomes static.
- Easing and durations come from tokens (`--motion-fast: 120ms`, `--motion-base: 200ms`) so polish is one file.

### High-impact visuals: decision

| Visual | Needs real data? | MVP? | Reason |
| --- | --- | --- | --- |
| Evidence matrix | Yes | Yes | The main value screen |
| Genome track with hit ticks | Yes (contig, start, stop) | Yes | Cheap SVG, reflects real coordinates |
| Evidence-link graph (finding ↔ drug) | Yes | Yes, simple | Explains why; derive from `evidence_links` only |
| Side-by-side genomic vs AST | Yes | Yes | Core differentiator |
| Landing motif | Decorative (labelled so) | Yes | First 30 seconds |
| 3D genome viewer | Yes, plus data we do not have | No | Slower, decorative, risks implying evidence |
| Confidence meters | No valid basis (D-01) | Never in MVP | Would imply calibration we lack |

### Accessibility checklist (build into every component)

Semantic HTML first; visible focus ring (2 px, 3:1 contrast); every icon-only control has a label; tables are real `<table>` with headers; status changes announced through an `aria-live="polite"` region; dialogs and drawers trap and restore focus; targets at least 24 px (WCAG 2.2); axe checks run in Playwright on every main screen (AC-11, FE-A11Y-02).

## 11. Analysis engine

The engine is plain Python with no web or database imports, so it can be built and tested alone (Work Package D). Its boundary: **input** a FASTA path, organism and config; **output** a list of finding dictionaries and a list of assessment dictionaries. The worker persists them.

**Test status, stated plainly.** The three modules below were run with 10 unit tests (all passing) in my sandbox. The tests use **synthetic, hand-written TSV rows that imitate AMRFinderPlus columns**; they prove the logic of normalisation, rule application, capping and the discordance matrix. They do **not** prove compatibility with real AMRFinderPlus output of your pinned version: test EN-04 (below) does that and must be run on your machine, and it may force changes to the column aliases.

### Pipeline stages

| Stage | Input | Output | Failure behaviour |
| --- | --- | --- | --- |
| 1. FASTA validation | file path | contig count, total length, N50, N fraction, GC% | `INVALID_FASTA` |
| 2. QC | metrics + `config/quality.yaml` | `PASS`, `WARN` or `FAIL` with reasons | `FAIL` makes all pairs `NOT_ASSESSABLE` (analysis still `COMPLETED`, explaining why) |
| 3. Organism plausibility | total length vs `scope.yaml` range | warning only; the user-declared organism is not overridden | warning shown on results |
| 4. Detection | FASTA, organism | AMRFinderPlus TSV file | `ENGINE_FAILED` |
| 5. Normalise | TSV text | findings with `detectionQuality` | `SchemaError` becomes `ENGINE_FAILED` with the header list |
| 6. Interpret | findings, rules | one assessment per matrix pair | none; always produces all pairs |
| 7. Persist | all of the above | documents in section 8 | partial results deleted on failure |

QC defaults in `config/quality.yaml` (project decisions to confirm with your domain lead, not tool facts): `max_contigs: 500`, `max_n_fraction: 0.02`, `min_n50: 20000` (warn), plausible length ranges per organism (*E. coli* about 4.5–5.8 Mb, *K. pneumoniae* about 5.0–6.0 Mb, *S. aureus* about 2.6–3.2 Mb; verify against RefSeq genome statistics before locking). Hard `FAIL`: not DNA, zero contigs, N fraction above max, total length under 50% or over 200% of the lower/upper plausible bound.

### Detection command (verify flags against `amrfinder --help` of the pinned version)

```bash
amrfinder --nucleotide assembly.fna --organism Klebsiella_pneumoniae \
          --plus --output amr.tsv --threads 2
amrfinder --version        # record in toolVersions
amrfinder --database_version   # record in toolVersions (flag name: confirm for your version)
```

Run it from Python as `subprocess.run([...list...], capture_output=True, text=True, timeout=ANALYSIS_TIMEOUT_S, check=False)`; never `shell=True`; never put user-supplied text in the argument list (organism comes from a fixed map, the path from the storage layer). Run `amrfinder --update` at image build time, not at request time, so the database version is fixed per deployment (NFR-06).

### `engine/normalize.py` (tested logic)

Maps columns by name with aliases for older and newer header spellings, fails loudly if required columns are absent, and classifies detection quality.

```python
import csv, io
from dataclasses import dataclass, asdict
from typing import Optional
from .contracts import DetectionQuality as Q

ALIASES = {
    "symbol": ["Element symbol", "Gene symbol"], "name": ["Element name", "Sequence name"],
    "type": ["Type", "Element type"], "subtype": ["Subtype", "Element subtype"],
    "klass": ["Class"], "subclass": ["Subclass"], "method": ["Method"],
    "coverage": ["% Coverage of reference", "% Coverage of reference sequence"],
    "identity": ["% Identity to reference", "% Identity to reference sequence"],
    "contig": ["Contig id"], "start": ["Start"], "stop": ["Stop"],
}
REQUIRED = ["symbol", "method", "klass"]

class SchemaError(ValueError):
    pass

@dataclass
class Finding:
    symbol: str; name: str; element_type: str; subtype: str; klass: str; subclass: str
    method: str; identity: Optional[float]; coverage: Optional[float]
    contig: Optional[str]; start: Optional[int]; stop: Optional[int]
    detection_quality: str; id: str = ""
    def to_dict(self): return asdict(self)

def _num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def _int(v):
    try: return int(v)
    except (TypeError, ValueError): return None

def classify(method, identity, coverage, thr_identity=90.0, thr_coverage=90.0) -> Q:
    m = (method or "").upper()
    if m in ("EXACT", "ALLELE", "EXACTX", "ALLELEX", "POINT", "POINTX"): return Q.EXACT
    if m in ("INTERNAL_STOP", "POINT_DISRUPT"): return Q.LOW_QUALITY
    if m.startswith("PARTIAL"): return Q.PARTIAL
    if m in ("BLAST", "BLASTX", "HMM"):
        if identity is None or coverage is None: return Q.UNKNOWN
        if identity < thr_identity: return Q.LOOSE
        if coverage < thr_coverage: return Q.PARTIAL
        return Q.STRICT
    return Q.UNKNOWN

def parse_amrfinder_tsv(text, thr_identity=90.0, thr_coverage=90.0):
    reader = csv.DictReader(io.StringIO(text), delimiter="\t")
    headers = reader.fieldnames or []
    col = {k: next((n for n in names if n in headers), None) for k, names in ALIASES.items()}
    col = {k: v for k, v in col.items() if v}
    missing = [k for k in REQUIRED if k not in col]
    if missing:
        raise SchemaError(f"Unrecognised AMRFinderPlus output; missing {missing}; headers={headers}")
    out = []
    for i, row in enumerate(reader, start=1):
        g = lambda k: row.get(col[k]) if k in col else None
        ident, cov, method = _num(g("identity")), _num(g("coverage")), g("method") or ""
        out.append(Finding(
            symbol=g("symbol") or "", name=g("name") or "", element_type=g("type") or "",
            subtype=g("subtype") or "", klass=(g("klass") or "").upper(),
            subclass=(g("subclass") or "").upper(), method=method, identity=ident, coverage=cov,
            contig=g("contig"), start=_int(g("start")), stop=_int(g("stop")),
            detection_quality=classify(method, ident, cov, thr_identity, thr_coverage).value,
            id=f"fnd_{i:04d}"))   # temporary; the worker replaces with real fnd_<ULID> on insert
    return out
```

### `engine/interpret.py` (tested logic)

Implements the seven-step assessment algorithm from section 4. Rules are loaded from YAML into dictionaries with the keys shown in the rule format.

```python
from dataclasses import dataclass, field
from typing import List
from .contracts import ResultCategory as C, DetectionQuality as Q, EvidenceTier as T

NO_MARKER_TEXT = "No known marker detected by the pinned database. This is not evidence of susceptibility."
TIER_BASE = {T.A_CURATED_STRONG.value: C.RESISTANCE_EVIDENCE_STRONG,
             T.B_CURATED_MODERATE.value: C.RESISTANCE_EVIDENCE_MODERATE,
             T.C_INDIRECT.value: C.RESISTANCE_EVIDENCE_WEAK,
             T.D_EXPLORATORY.value: C.RESISTANCE_EVIDENCE_WEAK}
ORDER = [C.RESISTANCE_EVIDENCE_WEAK, C.RESISTANCE_EVIDENCE_MODERATE, C.RESISTANCE_EVIDENCE_STRONG]
CAP = {Q.EXACT.value: C.RESISTANCE_EVIDENCE_STRONG, Q.STRICT.value: C.RESISTANCE_EVIDENCE_STRONG,
       Q.PARTIAL.value: C.RESISTANCE_EVIDENCE_MODERATE, Q.LOOSE.value: C.RESISTANCE_EVIDENCE_WEAK,
       Q.LOW_QUALITY.value: C.RESISTANCE_EVIDENCE_WEAK, Q.UNKNOWN.value: C.RESISTANCE_EVIDENCE_WEAK}

@dataclass
class Assessment:
    organism: str; antibiotic: str; result_category: str; evidence_tier: str
    rule_ids: List[str] = field(default_factory=list)
    finding_ids: List[str] = field(default_factory=list)
    reason_code: str = ""; limitations: str = ""; capped: bool = False

def _lower(a, b): return a if ORDER.index(a) <= ORDER.index(b) else b

def assess_pair(organism, antibiotic, drug_class, findings, rules, qc_pass=True, in_matrix=True):
    if not in_matrix:
        return Assessment(organism, antibiotic, C.NOT_ASSESSABLE.value, T.INSUFFICIENT.value, reason_code="PAIR_OUT_OF_SCOPE")
    if not qc_pass:
        return Assessment(organism, antibiotic, C.NOT_ASSESSABLE.value, T.INSUFFICIENT.value, reason_code="GENOME_QC_FAILED")
    best, best_rank, best_tier, rule_ids, finding_ids, capped = None, -1, T.INSUFFICIENT.value, [], [], False
    for r in rules:
        if r["organism"] != organism or r["antibiotic"] != antibiotic or r.get("effect") != "resistance":
            continue
        syms = set(r["match"]["element_symbols"])
        for f in findings:
            if f["symbol"] not in syms: continue
            base = TIER_BASE[r["tier"]]
            cat = _lower(base, CAP[f["detection_quality"]])
            rule_ids.append(r["id"]); finding_ids.append(f["id"])
            if ORDER.index(cat) > best_rank:
                best, best_rank, best_tier, capped = cat, ORDER.index(cat), r["tier"], (cat != base)
    if best is not None:
        return Assessment(organism, antibiotic, best.value, best_tier, sorted(set(rule_ids)), sorted(set(finding_ids)), capped=capped)
    related = [f["id"] for f in findings if drug_class and f["klass"] == drug_class.upper()]
    if related:
        return Assessment(organism, antibiotic, C.INCONCLUSIVE.value, T.INSUFFICIENT.value, finding_ids=related,
            reason_code="NO_DRUG_SPECIFIC_RULE",
            limitations="A determinant of this drug class was found but no curated rule links it to this drug.")
    return Assessment(organism, antibiotic, C.INSUFFICIENT_EVIDENCE.value, T.INSUFFICIENT.value,
                      reason_code="NO_KNOWN_MARKER", limitations=NO_MARKER_TEXT)
```

`drug_class` comes from `config/scope.yaml` (for example meropenem → `CARBAPENEM`, gentamicin → `AMINOGLYCOSIDE`). **Confirm each mapping against the exact `Class` and `Subclass` strings that AMRFinderPlus prints in your pinned version**, because a wrong string silently turns `INCONCLUSIVE` into `INSUFFICIENT_EVIDENCE`. That is test EN-05.

### `engine/discordance.py` (tested logic)

```python
from typing import Optional
from .contracts import ResultCategory as C, DiscordanceType as D, AstCategory as A
STRONG, MOD = C.RESISTANCE_EVIDENCE_STRONG.value, C.RESISTANCE_EVIDENCE_MODERATE.value

def compare(category: str, capped: bool, ast: str, supported_pair: bool = True) -> Optional[dict]:
    if not supported_pair or category == C.NOT_ASSESSABLE.value:
        return {"type": D.UNSUPPORTED_COMPARISON.value, "priority": "info"}
    if ast not in (A.S.value, A.I.value, A.R.value):
        return None
    if ast == A.S.value and category in (STRONG, MOD):
        if capped:
            return {"type": D.LOW_QUALITY_CONFLICT.value, "priority": "medium"}
        return {"type": D.GENOMIC_RESISTANT_AST_SUSCEPTIBLE.value, "priority": "high" if category == STRONG else "medium"}
    if ast == A.R.value:
        if category == C.INSUFFICIENT_EVIDENCE.value:
            return {"type": D.GENOMIC_NO_EVIDENCE_AST_RESISTANT.value, "priority": "medium"}
        if category == C.INCONCLUSIVE.value:
            return {"type": D.GENOMIC_INCONCLUSIVE_AST_RESISTANT.value, "priority": "medium"}
    return None
```

### Test plan for the engine (EN = engine tests)

| ID | Objective | Input | Expected | Proves | Does not prove |
| --- | --- | --- | --- | --- | --- |
| EN-01 | Exact strong mechanism is STRONG | exact hit matching a tier A rule | `RESISTANCE_EVIDENCE_STRONG` | Rule matching | That the rule is scientifically right |
| EN-02 | Loose hit is capped to WEAK | BLAST hit, identity 70 | `RESISTANCE_EVIDENCE_WEAK`, `capped` true | SCI-04 |  |
| EN-03 | No marker is INSUFFICIENT, never susceptible | empty findings | `INSUFFICIENT_EVIDENCE` with the note | SCI-01 |  |
| EN-04 | **Real output compatibility** | Real AMRFinderPlus TSV from a public genome, run with your pinned version | Parser returns findings; headers recognised | Adapter matches the real tool | Correctness of interpretation |
| EN-05 | Class strings match the tool | Real hits for each drug class in the matrix | Each lands in the intended `klass` | `scope.yaml` mapping |  |
| EN-06 | Same class but wrong drug is INCONCLUSIVE | *aac(6')*-Ib vs gentamicin | `INCONCLUSIVE` | Drug-class matching is not used as resistance |  |
| EN-07 | QC fail makes all pairs NOT\_ASSESSABLE | `qc_pass=False` | `NOT_ASSESSABLE` |  |  |
| EN-08 | Bad header fails loudly | wrong TSV | `SchemaError` | No silent empty results |  |
| EN-09 | Reproducibility | same input twice | identical output | NFR-06 |  |
| EN-10 | Discordance matrix | every cell of the table in section 4 | as table | FR-11 | Whether discordances are real errors |

EN-01 to EN-03, EN-06 to EN-10 exist and pass on synthetic input; EN-04 and EN-05 are **yours to run**.

### Worker outline (to implement in Part 2, not yet tested)

`worker/main.py` loop: claim job → stream-verify checksum → FASTA metrics and QC → run AMRFinderPlus → parse → for every pair in `scope.yaml` call `assess_pair` → write findings, assessments, links in bulk → set `COMPLETED`; on any exception set `FAILED` with the matching error code; heartbeat thread every 15 s; recovery sweep each minute (section 6).

## 12. Testing and scientific validation

Two tracks that never substitute for each other: **software validation** (does the app do what the engine produced?) and **scientific validation** (does the interpretation agree with laboratory AST on held-out genomes?). A green test suite is not evidence of scientific correctness.

### Software test layers

| Layer | Tool | What it covers | Run when |
| --- | --- | --- | --- |
| Engine unit (EN-01 to EN-10) | pytest | Normalisation, rules, capping, discordance | Every commit |
| API unit and contract (CT-01 to CT-03) | pytest, Schemathesis | Enum equality between Python and TypeScript (CT-01); responses match OpenAPI (CT-02); error envelope everywhere (CT-03) | Every pull request |
| Database integration (DB-01 to DB-05) | pytest against a disposable MongoDB (local container) | Validators reject bad documents; unique indexes; worker claim is atomic (two workers, one job); lease recovery; cascade delete | Every pull request |
| Upload validation (UP-01 to UP-08) | pytest | Text file renamed `.fasta`, empty file, protein FASTA, over-size, gzip bomb (decompressed-size cap), duplicate headers, non-ASCII, path traversal in filename | Every pull request |
| Lifecycle (LC-01 to LC-05) | pytest with a **fake engine** that returns canned TSV | Status transitions, `FAILED` paths, cancel, kill worker mid-run (AC-08), tampered file (LC-05) | Every pull request |
| Frontend components (FE-01 to FE-12) | Vitest + Testing Library | Each component in section 10 for all category values, unknown enum value, empty and error states | Every pull request |
| Accessibility (FE-A11Y-01, -02) | Contrast check on tokens; axe in Playwright | AC-11, NFR-04 | Every pull request |
| End to end (E2E-01 to E2E-05) | Playwright against the full stack with the fake engine | Upload → results → AST → discordance → report; invalid upload; unsupported organism; failed analysis; responsive 360 px | Before merge to `main` |
| Language lint (SW-LINT-01) | Script | Greps UI strings, report templates, README for the forbidden phrases in section 2, and checks the exact use statement is present | Every pull request |
| Real-tool smoke (EN-04, EN-05, E2E-06) | One manual or nightly job with real AMRFinderPlus and a public genome | Parser and class mappings match the pinned tool | Before the demo and after any tool or database update |

For each important test the plan records objective, preconditions, input, expected result, failure condition, proves, does-not-prove. Template (keep it in `docs/test-plan.md`):

```text
ID: DB-03   Objective: worker claim is atomic
Pre: 1 QUEUED analysis; 2 workers started simultaneously
Input: both call claim()
Expected: exactly one receives the job; status VALIDATING; lockedBy set once
Fails if: both receive it, or neither
Proves: no duplicate processing under concurrency in this setup
Does not prove: behaviour on multiple hosts with clock skew
```

### Fixtures and their labels

- `fixtures/synthetic/`: hand-written TSVs and tiny FASTA files for software tests. Every file begins with a comment line `# SYNTHETIC FIXTURE, NOT A REAL ANALYSIS`, and the database `resultOrigin` is `SYNTHETIC_FIXTURE`.
- `fixtures/real/`: real public genomes plus the real AMRFinderPlus output you generated, with accession, download date and tool versions in a `README`. Used for EN-04 and the demo.

### Scientific validation protocol (do this before any accuracy statement)

The aim is to measure, per organism–drug pair, how the rule-based interpretation compares with laboratory AST labels on genomes **not used to write the rules**.

1. **Data.** Public genome + AST pairs (for example BV-BRC genome AMR data, or other published collections). Record source, retrieval date, and the AST method and standard where available. Labels vary in quality; exclude records with unclear method or category.
2. **Rule freeze.** Write and review rules (section 4) using literature and a *development* subset only. Freeze the rule set version before touching the test set.
3. **Split by relatedness, not at random.** Cluster isolates by genomic similarity (for example Mash distance clustering or MLST/sequence type) and assign whole clusters to development or test; random splits overstate performance on related strains, which your own bridge document cites as a documented trap.
4. **De-duplicate.** Remove identical or near-identical genomes within a cluster before counting.
5. **Run the product's engine unchanged** on the test genomes with the pinned tool and rule versions.
6. **Define the comparison per pair.** Predicted resistant = `RESISTANCE_EVIDENCE_STRONG` or `MODERATE` (state this choice up front; report the stricter STRONG-only variant too). Treat `I` as its own bucket or exclude it, and say which.
7. **Report per pair, never pooled:** confusion matrix; sensitivity and specificity for resistance; precision; F1; the number and fraction of `INCONCLUSIVE`, `INSUFFICIENT_EVIDENCE`, `NOT_ASSESSABLE` (an abstention rate is part of the result, not a footnote); class balance; discordance rate and a manual review of every discordant case.
8. **Uncertainty.** Give confidence intervals for proportions (for example Wilson intervals) and say how many isolates each pair has; small counts get no headline number.
9. **Publish** the table inside the app's methodology page together with dataset provenance and the sentence "Not validated on Indian clinical isolates" until it is.

**What would justify a claim of clinical usefulness** (Level 3, not MVP): prospective or at least independent external validation in the intended laboratories, agreement measured against the reference method with pre-specified acceptance criteria, evidence on the effect on lab workflow or decisions, and a regulatory assessment for any use in patient care. Until then the product says "research and surveillance".

### Test data to use for the demo case

See section 15. Do not name specific accessions here until you have confirmed the AST labels and AMRFinderPlus output yourself.

## 13. Security, privacy and reliability

Proportionate to a research prototype. **The deployment must not be described as suitable for hospital or patient data**, and the upload form states that users must not submit identifiable patient information.

| Area | Control (MVP) | Test |
| --- | --- | --- |
| Upload type | Allow `.fa`, `.fasta`, `.fna`, optionally `.gz`; check by content, not extension: first non-empty line starts with `>`; `all other lines contain only IUPAC nucleotide letters (protein-like FASTA is rejected)` | UP-01 to UP-04 |
| Upload size | Stream with a byte counter and abort at `MAX_UPLOAD_BYTES` (default 25 MB); for `.gz`, cap **decompressed** size (default 100 MB) to stop decompression bombs | UP-05, UP-06 |
| Filename | Store under `storageKey = fil_<ULID>.fna`; the original name is metadata only; never used in a path | UP-08 |
| Execution | Files are never executed or interpreted beyond being read by the FASTA parser and passed as a path argument to AMRFinderPlus | Code review checklist |
| Subprocess | `subprocess.run` with an argument list, no shell, fixed environment, timeout, working directory per job, container runs as non-root | EN, LC tests |
| Integrity | SHA-256 at upload; verified by worker before analysis (`FILE_TAMPERED`) | LC-05 |
| Secrets | `MONGODB_URI`, `DEMO_ACCESS_KEY`, storage credentials only in server environment variables; `.env` in `.gitignore`; an `.env.example` with placeholders is committed; a secret-scanning step in CI; **no secrets in the frontend bundle** (only `NEXT_PUBLIC_API_BASE_URL`) | CI |
| Database access | Atlas user with least privilege on one database; IP allow-list to the backend host; TLS only | Manual check |
| API protection | CORS restricted to the frontend origin; write endpoints require `X-Access-Key`; rate limits on upload and analysis creation; request-size limits | RATE-01 |
| Input handling | Pydantic validation on every body; strings length-capped; labels checked for identifier-like patterns (SEC-03); HTML output in the report is built from a template with auto-escaping | VALIDATION tests |
| Logging | JSON logs with `requestId`, route, status, duration; never log file contents, access keys or full free-text labels | Log review |
| Retention | Demo deployment deletes uploads and analyses after 90 days; `audit_events` TTL; documented deletion endpoint | Manual |
| Backup | Atlas backups (or a nightly `mongodump` to the bucket) and a stated recovery test before the demo | Restore rehearsal |
| Dependencies | Lockfiles; Dependabot or equivalent weekly; `pip-audit` and `npm audit` in CI (non-blocking at first, then blocking for high severity) | CI |
| Provenance and auditability | Every analysis stores tool, database, rule set and app commit; reviews of discordance events write `audit_events`; completed analyses are immutable | DB, LC tests |

### Protection against inconsistent or false data

- **Partial failures:** results are written before the status flips to `COMPLETED`; on retry the worker deletes any rows with that `analysisId` first.
- **Repeated requests:** idempotency keys and unique indexes (`{analysisId, antibiotic}`).
- **Tampered files:** checksum verification.
- **False AST data:** AST is user-entered and displayed as entered with its provenance; the system never edits genomic results because of it (D-07).
- **Stale knowledge:** a version banner shows database age; updating the AMRFinderPlus database is a controlled change that requires re-running EN-04, EN-05 and the regression fixtures.

### If identifiable clinical metadata is ever introduced (Level 3 gate)

Before adding any patient-linked field: authentication and per-user or per-institution authorisation, encryption at rest with key management, field-level access logging, a data protection assessment under applicable Indian law (confirm current requirements with qualified counsel; I am not giving legal advice), data-processing agreements with the institution, a defined retention and deletion process, and a review of whether the deployment region is permitted.

## 14. Repository, work packages, integration

### Monorepo layout (file ownership in the last column)

```text
genome-firewall/
  apps/
    web/                    # Next.js frontend                     (WP-A)
    api/                    # FastAPI service                      (WP-B)
    worker/                 # job runner                           (WP-B)
  engine/                   # pure-Python analysis engine          (WP-D)
  packages/
    contracts/              # enums.ts, fixtures/, openapi types   (WP-C, shared; changes need all owners' review)
  config/
    scope.yaml  quality.yaml  rules/*.yaml                         (WP-D, reviewed by domain lead)
  contracts/openapi.json    # generated, committed                 (WP-B)
  db/ migrations/ seed/ validators/                                (WP-C)
  report/                   # report templates and chart code      (WP-E)
  tests/ e2e/ fixtures/{synthetic,real}/                           (WP-F)
  docs/  decisions/ sources.md versions.md test-plan.md            (everyone; this reference lives in docs/)
  docker/  .github/workflows/                                      (WP-F)
```

### Work packages

| WP | Owns | Reads (must not change unilaterally) | Mock inputs and outputs | Definition of done | Integration point |
| --- | --- | --- | --- | --- | --- |
| **A Frontend and design** | `apps/web` | OpenAPI, enums, fixtures | MSW handlers with fixtures; no backend needed | Every screen in section 10 works against mocks in all listed states; axe clean; 360 px usable | Switch `NEXT_PUBLIC_API_BASE_URL` from mock to real API |
| **B Backend and APIs** | `apps/api`, `apps/worker` | Section 7 contracts, Mongo validators, engine interface | Fake engine returning canned TSV | All endpoints in section 9 pass contract tests; lifecycle tests pass | Engine function call inside the worker |
| **C MongoDB and contracts** | `db/`, `packages/contracts` | Section 7, 8 | Local MongoDB container, seed JSON | Validators, indexes, seed and migrations reproducible from a clean database; enum parity test CT-01 passes | Validators applied at API start |
| **D Genomic analysis** | `engine/`, `config/` | Finding and assessment schemas | Fixture TSV and FASTA | EN-01 to EN-10 pass; EN-04 and EN-05 pass on real output; rules reviewed with sources | Called by the worker |
| **E Reporting and visualisation** | `report/` | Assessment, finding, evidence shapes | Fixture analyses | Report built from persisted data only; contains use statement, versions, limitations, origin | `GET /report` |
| **F Testing, security, deployment** | CI, e2e, Docker, deploy | All contracts | Fake engine in E2E | CI green on every pull request; deployment rehearsed; restore rehearsed | Release checklist |

### Dependency matrix (row needs column)

|  | Contracts (7) | Mongo (8) | API (9) | Engine (11) | Frontend (10) |
| --- | --- | --- | --- | --- | --- |
| Frontend | yes | no | yes (via mocks first) | no |  |
| Backend | yes | yes |  | yes (via fake first) | no |
| Engine | yes | no | no |  | no |
| Mongo | yes |  | no | no | no |
| Reporting | yes | yes | yes | no | no |

**Freeze before parallel work starts (Day 0):** sections 4, 7, 8 and 9; `openapi.json` skeleton; `scope.yaml`; fixture set. Everything else can move.

### Integration sequence

1. Day 0: freeze contracts; generate `openapi.json`; create fixtures; agree decisions D-01 to D-12.
2. Frontend builds against MSW; backend builds CRUD, upload and lifecycle against a fake engine; Mongo validators and seed in place; engine built against fixtures. All in parallel.
3. Wire backend to Mongo (real) and run lifecycle and DB tests.
4. Run **EN-04 and EN-05** with real AMRFinderPlus; fix aliases and class mappings.
5. Plug the engine into the worker; run E2E with the real engine on one public genome.
6. Switch frontend from mocks to the real API; fix mismatches (they should be few because both sides follow OpenAPI).
7. Add AST entry and discordance end to end.
8. Report and visuals from persisted results.
9. Demo dataset (section 15), polish, accessibility pass.
10. Deploy with the cached-real fallback; rehearse restore and the demo.

### Preventing integration failures

| Failure | Prevention |
| --- | --- |
| Different field names or enums | OpenAPI is the source; frontend types generated; CT-01 and CT-02 in CI |
| Mismatched response shapes | MSW fixtures are validated against OpenAPI schemas in a test |
| Incompatible dates | ISO 8601 UTC only; a shared `parseTimestamp` helper |
| Duplicate identifiers | Server-generated ULIDs, unique indexes |
| Conflicting file ownership | Table above; CODEOWNERS file enforces review |
| Frontend assumptions not matching backend | Unknown-field tolerance; E2E against the real stack before merge |
| Engine output not matching schemas | Validators on insert; Pydantic models shared between worker and API |

### Working agreements for fast iteration

- Branches: `main` is always deployable; short-lived `feat/<wp>-<topic>` branches; pull requests need one review and green CI; squash merge.
- Conventions: Ruff and Black (Python), ESLint and Prettier (TypeScript), strict TypeScript, type hints required in `engine/`.
- Decisions: one short file per decision in `docs/decisions/NNNN-title.md` (context, decision, consequences); the Decision Register in this document links to them.
- **Add an organism:** (1) confirm `amrfinder --list_organisms` supports it; (2) add to `scope.yaml` with antibiotics and drug classes; (3) add `config/rules/<organism>.yaml` with sourced rules; (4) add synthetic and real fixtures; (5) run section 12 validation for each new pair; (6) only then list it in `/scope`. No code change should be needed in the frontend.
- **Add an antibiotic:** same, per pair.
- **Update the AMRFinderPlus database:** rebuild image; record new `reference_versions`; rerun EN-04, EN-05 and regression fixtures; diff findings on the real fixtures and review every change; bump `ruleSet` only if rules changed.
- **Change the analysis engine:** keep the `assess_pair` and normaliser interfaces; the API and frontend see only the stored schemas, so they do not change.
- **Add a visualisation:** it reads persisted results and may never compute scientific results itself.
- **Measure improvement:** track per-pair sensitivity, specificity and abstention rate on the frozen test set for science changes; time-to-first-result and task completion in a 5-person usability check for UX changes.

## 15. Demo plan and judge narrative

### The credibility move

Most teams will claim "AI predicts resistance". You will open with what existing tools do not tell a lab, and show that you know the limits. That honesty is the differentiator judges with scientific backgrounds will remember.

### Demo inputs (decide and verify during build, then freeze)

Choose **two real public genomes** and run them with your pinned tool ahead of time; store the results as `CACHED_REAL_ANALYSIS` demo datasets, with the live path available when the network and worker are healthy.

| Demo | Selection criteria (do not name an accession until you have verified these yourself) | Purpose |
| --- | --- | --- |
| **A. Concordant case** | A *K. pneumoniae* or *E. coli* assembly with a carbapenemase and an ESBL detected by AMRFinderPlus, with public AST labels (meropenem R, ceftriaxone R) | Shows evidence → matrix → drawer → report |
| **B. Discordance case** | A real genome whose public AST label disagrees with the interpretation for at least one pair (for example resistant AST with no known marker, or marker present with susceptible AST), checked manually | Shows the headline feature on real data |
| **C. Synthetic safety net** | A small synthetic FASTA and TSV, banner `SYNTHETIC DEMONSTRATION DATA` | Works offline; **never presented as real**. Use only if A and B fail and say so |

If no real discordant example exists in the public data you can access, say that on stage and use the synthetic one labelled as such. Do not edit a real label to create a conflict.

### Three-minute script

| Time | Screen | Say (adapt) | Proves |
| --- | --- | --- | --- |
| 0:00–0:25 | Landing | "A gene list is not an answer. Labs need to know which hits matter for which drug, how much to trust them, and when the genome disagrees with the lab. We do not predict treatment success; we make the evidence and the disagreements visible." | Problem, honest boundary |
| 0:25–0:50 | New analysis | Upload demo genome A (or open cached); choose organism | Real workflow |
| 0:50–1:10 | Progress | Real stages, versions chip | Not a fake spinner |
| 1:10–1:50 | Results matrix | Open a strong-evidence drug: finding → rule → explanation → limitations. Then show a drug with `INSUFFICIENT EVIDENCE` and read the note "not evidence of susceptibility" | Explainability, abstention |
| 1:50–2:30 | Discordance | Enter AST for demo B; show the side-by-side and the wording "discrepancy requiring review" | Differentiator |
| 2:30–2:50 | Report | Download; point to versions, origin, use statement | Provenance |
| 2:50–3:00 | Methodology | Validation status: "here is the held-out evaluation, and here is what is not validated, including Indian isolates" | Credibility |

### Fallback tree

1. Worker or AMRFinderPlus down → open cached analysis A (banner says cached real).
2. Database down → static export of the cached analyses bundled in the frontend, banner says cached; explain plainly.
3. Network down → run the local build with the same cached data.
4. Everything down → recorded video made from the real app, labelled as a recording.

### Judge questions to prepare (answers must come from this document)

| Question | Answer basis |
| --- | --- |
| "Is this accurate?" | Show the per-pair held-out table and abstention rates, or say the evaluation is in progress; never quote an unmeasured number (SCI-05) |
| "Why not ML?" | D-03: rule-first is more defensible on divergent genomes and explainable; ML is Level 2 behind lineage-aware validation |
| "How does this differ from CARD, ResFinder or AMRFinderPlus?" | We build on AMRFinderPlus; they list genes, we interpret per drug and compare with AST |
| "Is it for India?" | Built for Indian surveillance workflows with provenance fields; not validated on Indian isolates yet |
| "Can a doctor use it?" | No; research and surveillance only (D-02) |
| "What if no gene is found?" | `INSUFFICIENT_EVIDENCE`; absence is never susceptibility |

### Feature value table (what goes in the MVP and why)

| Feature | Judge value | User value | Cost | Scientific prerequisite | Risk | Release |
| --- | --- | --- | --- | --- | --- | --- |
| Evidence matrix + drawer | High | High | Medium | Rules | Wrong rules | MVP |
| Discordance review | High | High | Medium | AST entry | Over-reading | MVP |
| Provenance and versions | Medium | High | Low | None | None | MVP |
| Genome track | Medium | Medium | Low | Coordinates | Implying completeness | MVP |
| Landing motif | High | Low | Low | None | Decorative; labelled | MVP |
| Comparison of isolates | Medium | Medium | Medium | None | Scope creep | Level 2 |
| ML probabilities | Hype | Unknown | High | Calibrated, lineage-validated model | Fabricated confidence | Not MVP |
| 3D genome viewer | Hype | Low | High | None | Misleading | No |

## 16. Traceability, open items, and Part 2

### Traceability matrix

| Requirement | Implemented in (module, section) | Verified by |
| --- | --- | --- |
| FR-01 sample | API `POST /samples` (9), `samples` (8) | API contract tests, E2E-01 |
| FR-02, FR-03 upload and validation | API upload, QC (11, 13) | UP-01 to UP-08 |
| FR-04 organism | `scope.yaml`, plausibility check (4, 11) | E2E-03, EN tests |
| FR-05 detection | Worker + AMRFinderPlus (6, 11) | EN-04, E2E-06 |
| FR-06 normalisation | `engine/normalize.py` (11) | EN-04, EN-08 |
| FR-07, FR-08, FR-09 assessments | `engine/interpret.py` (4, 11) | EN-01 to EN-07 |
| FR-10, FR-11 AST and discordance | API 14 and 15, `engine/discordance.py` | EN-10, E2E-01 |
| FR-12 progress | `stageProgress` (6), `StageTimeline` (10) | LC-01, FE tests |
| FR-13 history | API 8, History screen | E2E-01 |
| FR-14 report | API 17, `report/` | AC-10 |
| FR-15 demo | `demo_datasets`, section 15 | AC-09 |
| FR-16 versions | `toolVersions`, `VersionChip` | CT-02, FE tests |
| FR-17 methodology | `/methodology` | Manual review |
| NFR-04, NFR-05 | Design system (10) | FE-A11Y-01/02, E2E-05 |
| NFR-06 reproducibility | Deterministic engine, version snapshot | EN-09 |
| NFR-07 recovery | Lease and sweep (6) | DB-03, LC-04 |
| SEC-01 to SEC-04 | Section 13 | UP, RATE tests |
| SCI-01 to SCI-05 | Sections 2, 4, 10, 12 | EN-02, EN-03, SW-LINT-01 |
| AC-01 to AC-12 | Sections 3, 15 | E2E suite |

### Open items that need an owner and a date

| ID | Item | Why it blocks | Owner |
| --- | --- | --- | --- |
| O-01 | Confirm the team can run AMRFinderPlus (Bioconda) in the deployment image and measure runtime | Determines NFR-01 and the job timeout | WP-D |
| O-02 | Confirm file storage choice (volume vs S3-compatible) | Upload path | WP-B |
| O-03 | Domain lead reviews the matrix and every seed rule against primary sources; fills `sources`, `reviewed_by` | No rule may ship without a source | Domain lead |
| O-04 | Verify the research report's quoted statistics against originals and record in `docs/sources.md`; re-verify the bridge document's citations | Slides and UI text | Research lead |
| O-05 | Select demo genomes A and B and run EN-04 on them | Demo plan | WP-D, WP-F |
| O-06 | Decide whether any user accounts are wanted (default: none) | Security scope | Team |
| O-07 | Decide whether to include an experimental ML tab (default: no) | Scope | Team |
| O-08 | Confirm judges accept clearly labelled synthetic fallback | Demo risk | Team |
| O-09 | Pin versions (Node, Python, Next.js, FastAPI, PyMongo, AMRFinderPlus, database) in `docs/versions.md` | Reproducibility | WP-F |
| O-10 | Obtain or plan for an Indian isolate set with WGS and AST (ICMR network or partners) | Any India-specific claim | Research lead |

### What Part 2 contains (continue from here)

The master prompt asks for chapter-by-chapter, file-by-file implementation with complete code. That does not fit one document without losing quality, so it continues in numbered parts using the consolidated 24-chapter structure in your bridge document. Each chapter will follow your 18-point chapter template.

| Part | Chapters | Deliverable |
| --- | --- | --- |
| **2 Repo and shared foundation** | Dev environment; repo, config, `.env.example`, Docker; contracts package; Mongo validators, indexes, migrations, seed; OpenAPI skeleton | Runnable empty stack and CI |
| **3 Backend and worker** | FastAPI app; storage; upload validation; analyses lifecycle; worker with lease and recovery; AST and discordance API; report endpoint | All endpoints passing contract and lifecycle tests with the fake engine |
| **4 Analysis engine integration** | QC module; subprocess runner; real-output compatibility (EN-04, EN-05); YAML rule loader; rule curation workflow | Engine passing on real output |
| **5 Frontend** | App shell, tokens, components, wizard, progress, matrix, drawer, evidence explorer, discordance, history, methodology, MSW mocks | All screens against mocks, then real API |
| **6 Quality and delivery** | E2E, accessibility, performance, security review, deployment, demo build, cached demo data | Release checklist complete |

Tell me which part to write next; I recommend **Part 2**, because every other part depends on its contracts being executable.
