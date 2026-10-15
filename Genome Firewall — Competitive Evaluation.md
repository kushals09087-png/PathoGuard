# Genome Firewall — Competitive Evaluation

Oct 15, 2026 · @kushal

Recommendations only; nothing in the Master Engineering Reference has been changed, and nothing here should be implemented until you approve it.

## What I inspected, and my assumptions

I evaluated Genome Firewall as a **plan**, not as running software: I have your three documents and the Master Engineering Reference I wrote with you, and no codebase, designs or demo. Where this evaluation says "weakness", it means a weakness in the plan or in untested assumptions, not a bug I observed.

| Gap | Assumption I made | If wrong, tell me |
| --- | --- | --- |
| Hackathon name, deadline, rubric, team size unknown | A typical rubric: innovation, real-world impact, technical execution, user experience, feasibility, presentation. Team of students, a deadline of days to a few weeks | Send the rubric and deadline; the ranking in section 5 may change |
| No code exists | The repository is empty or near-empty; Part 2 of the reference is not built | Share the repository and I will re-evaluate against it |
| Data access unknown | You can download public genomes and AST labels, but have no Indian clinical isolate set with WGS and AST | Say so if you do; it changes the strongest pitch |
| Judges | A mix of technical and domain reviewers |  |

I could not verify everything I looked for. Pathogenwatch details, ARESdb, Day Zero Diagnostics and other competitor statuses were not confirmed from primary sources this session, so they appear below only as unverified. Page details I could not read are marked "not confirmed".

## Verified landscape

Only facts that change a product decision, each opened and read this session (as of 15 Oct 2026). "Modelled estimate" and "forecast" are labelled; none of the burden numbers are direct counts.

| Fact | Value | Source, date, scope | Type |
| --- | --- | --- | --- |
| Bacterial AMR deaths, 2021 | 1.14 million attributable; 4.71 million associated | [Oxford summary of the GRAM study in The Lancet](https://www.ox.ac.uk/news/2024-09-17-antibiotic-resistance-has-claimed-least-one-million-lives-each-year-1990), published 17 Sep 2024, global | Modelled estimate |
| Forecast to 2050 | 1.91 million attributable deaths per year in 2050; 39 million cumulative attributable 2025–2050 (11.8 million in South Asia), assuming no further policy change | Same source | Forecast |
| Share of infections resistant | About 1 in 6 reported bacterial infections; about 1 in 3 for urinary tract infections; 127 countries enrolled, 104 reported in 2023 | WHO GLASS 2025, read through a [secondary summary](https://www.amr-insights.eu/global-antibiotic-resistance-surveillance-report-2025/) (no publication date on the page; WHO original not opened) | Observation, reported data |
| India, carbapenem susceptibility 2024 | *E. coli*: meropenem 62.9%, imipenem 57.6%. *K. pneumoniae*: meropenem 35.1%, imipenem 31.2%. Based on 26,001 *E. coli* and 17,413 *K. pneumoniae* isolates | [ICMR AMRSN annual report 2024](https://www.icmr.gov.in/icmrobject/uploads/Report/1763981012_icmramrsnannualreport2024.pdf), 1 Jan–31 Dec 2024, tertiary-care hospitals only; the report itself warns against extrapolating to the community | Observation |
| India, resistance genes 2024 | *E. coli*: TEM 29.6%, IMP 28.0%, VIM 19.3%, NDM-1 14.5%. *K. pneumoniae*: TEM 33.7%, OXA-48 25.6%, SHV 23.0% | Same report, page 5. The denominator (all isolates or only a tested subset) was not confirmed from my read; check the PDF before quoting | Observation |
| India policy | National Action Plan on AMR 2.0 launched 18 Nov 2025, covering 2025–2029 | [Down To Earth](https://www.downtoearth.org.in/amp/story/health/waaw-2025-indias-much-awaited-second-version-of-the-national-action-plan-on-amr-released); the plan text was not seen, so its genomics content is not confirmed | Policy fact |
| Detection tool | AMRFinderPlus v4.2.7 is the latest release on the project page; v4.2.4 added function-disrupting mutation calls (`POINT_DISRUPT`) and renamed `STOP` to `Ter`; v4.0.3 changed output column names | [NCBI AMRFinderPlus releases](https://github.com/ncbi/amr/releases); the page shows day and month without the year, so confirm the date | Observation |
| Community interpretation standard | AMRrules: curated by the ESGEM-AMR working group (formed 2024, about 200 members), documentation at v1.0.0; a Python package applies organism-specific rules to AMRFinderPlus output | [AMRrules curation repository](https://github.com/AMRverse/AMRrulesCuration), [AMRrules repository](https://github.com/AMRverse/AMRrules), [documentation](https://docs.amrrules.org); rule format, supported organisms and licence not confirmed | Observation |
| Rules versus machine learning | On 78 species–antibiotic datasets (11 species, 44 antimicrobials, 31,195 genomes), machine-learning methods scored F1-macro of at least 0.9 in 64% of experiments with random splits but only 33% with homology-aware and 25% with phylogeny-aware splits. The rule-based ResFinder was the top performer most often in the phylogeny-aware (44%) and homology-aware (50%) settings. Best tool per pair still reached 0.9 in only 55–79% of pairs. Per pair it ranged from 0.99 or higher (cefoxitin–*S. aureus*) to an average of 0.59 (aztreonam–*K. pneumoniae*) | [bioRxiv preprint, 2024](https://www.biorxiv.org/content/10.1101/2024.01.31.578169.full.pdf); I have not checked whether it has been peer-reviewed | Observation, preprint |

### Two corrections to what we assumed earlier

- Your research report said carbapenem susceptibility is about 60% for *E. coli* and about 40% for *K. pneumoniae*. The ICMR 2024 report gives 62.9% and 35.1% (meropenem). Use the report's numbers, and say "tertiary care, 2024".
- The Master Reference says AMRFinderPlus is documented not to infer phenotype. The NCBI page I opened does not say that, and I could not confirm it in the wiki. Treat it as our own design statement until you find the sentence in the official documentation, and do not attribute it to NCBI.

### What this evidence means for product decisions

Three points matter. First, the benchmark shows predictive reliability varies enormously by organism–drug pair, so any single "how good is it" claim is wrong and a per-pair view is right. Second, a team of volunteers is already standardising exactly the interpretation layer that Genome Firewall planned to hand-write. Third, India's own surveillance report shows the resistance picture is dominated by carbapenemases that are well-characterised genes, which suits a rules-based tool.

## A. Brutally honest assessment

**Today Genome Firewall is a well-reasoned document, not a product, and it has not yet produced a single piece of evidence that a judge can verify.** The thinking is better than most entries will have; the risk is that all of it is untested.

### What is genuinely strong

- It refuses the claim most teams will make ("AI predicts resistance"), which is the right call given the benchmark evidence above and will stand out with any scientific judge.
- The framing is coherent: detection, interpretation, and disagreement with the lab are kept separate; absence of a marker never becomes "susceptible".
- Provenance, abstention and a deterministic engine are real engineering virtues, and cheap.

### What is weak, in order of danger

1. **Execution risk.** A 16-section reference, 24 planned chapters and six work packages describe far more than a student team can finish and polish by a typical hackathon deadline. If the end-to-end path (upload, analyse, results, AST, discordance) is not working early, the document's quality does not matter.
2. **The rules are the weakest link and the most visible.** The scientific value rests on interpretation rules that a student team would write by hand from memory-level knowledge. A domain judge can find one wrong rule and discount the whole result. Meanwhile a 200-member international group (ESGEM-AMR, AMRrules) is building these rules as a shared standard, so our hand-written version would be a lower-quality duplicate of something the field is converging on.
3. **The headline feature has no real-data proof.** "Discordance-first" is the differentiator, but we have no evidence yet that real public genomes produce meaningful discordance, how often, or for which drugs. The demo currently depends on finding one convincing example later.
4. **It stops at one isolate at a time.** A laboratory QA process is a stream of isolates with a queue of things to re-check. One-isolate analysis shows the idea but not the workflow it claims to serve.
5. **Nothing is measured.** Section 12 describes a validation protocol but plans no results by demo day. "We will validate" does not score; "here are the per-pair numbers on public data" does.
6. **India is a claim, not a capability.** There is no Indian data, and the product has no India-specific feature beyond metadata fields. That is honest, but it means the Indian angle is only a motivation.

### Competitive position

On detection we have no edge and should not claim one: we depend on AMRFinderPlus. On interpretation we are behind a community effort. Our genuinely open ground is the **comparison with the laboratory result, presented as a review workflow with honest reliability information**, which none of the sources I opened describes as their focus. I cannot prove nobody else does this, so do not say it is unique.

## Against the strongest alternatives

A focused comparison on the criteria that decide whether Genome Firewall matters. "Not confirmed" means I could not read it from a primary source this session; it does not mean "no".

| Alternative | What it does | Per-drug interpretation | Compares with lab AST | Measured performance shown | Evidence in this session |
| --- | --- | --- | --- | --- | --- |
| [AMRFinderPlus](https://github.com/ncbi/amr/releases) (NCBI) | Detects resistance genes and point mutations from assemblies; versioned | Not its purpose (reports detections) | No | Not applicable | Release page read; interpretation claim not found on the NCBI page |
| [AMRrules](https://docs.amrrules.org) (ESGEM-AMR) | Applies expert-curated organism rules to AMRFinderPlus output to give an interpreted susceptibility report; documentation v1.0.0 | Yes, where rules exist | Related R package AMRgen for genotype–phenotype analysis is mentioned; scope not confirmed | Not confirmed | Documentation and repository read; organisms, categories and licence not confirmed |
| ResFinder 4.0 (rule-based) | Gene and mutation catalogues with phenotype predictions | Yes, via catalogues | Not confirmed | Top performer most often on divergent genomes in the 2024 benchmark preprint | Benchmark preprint read; tool itself not opened |
| Machine-learning methods (Kover, PhenotypeSeeker, Seq2Geno2Pheno, Aytan-Aktug) | Learn genotype to phenotype from labelled genomes | Yes | Not their purpose | Strong with random splits; falls with lineage-aware splits (see landscape table) | Benchmark preprint read |
| Pathogenwatch (Cambridge CGPS) | Web platform for genomic surveillance with AMR predictions | Not confirmed | Not confirmed | Not confirmed | Only a paper title seen in search results: "A global resource for genomic predictions of antimicrobial resistance and surveillance of Salmonella Typhi at pathogenwatch". Check it directly; it is the nearest thing to a polished public web app |
| ARESdb, Day Zero Diagnostics, BV-BRC models | Commercial or research genotype-to-phenotype prediction | Yes (claimed) | Not confirmed | Not confirmed | Not verified this session; do not describe their features or status without checking |
| **Genome Firewall (planned)** | Per-drug evidence interpretation plus comparison with the lab result as a review workflow | Yes (rules) | **Yes (central)** | **None yet** | Plan only |

### Gaps that matter, and which we can close

| Gap against the best | Can we close it in a hackathon? | Better move |
| --- | --- | --- |
| Rule quality and coverage (AMRrules is expert-curated at scale) | No, and we should not try | Consume it instead of competing with it |
| Detection quality (AMRFinderPlus, NCBI) | Not needed | Keep as is |
| Published performance evidence | Partly: per-pair results on public data for a few pairs | Make this a headline deliverable |
| Polish and reach of an established web platform like Pathogenwatch | No | Compete on the lab-QA workflow, not on breadth |
| Treatment decision support or probabilities | No, and we should not | Stay research and QA only |

**The honest conclusion:** on every dimension where established tools are strong, they are stronger. Genome Firewall can only win by being the best at one narrow job: telling a laboratory where its AST results and the genome disagree, and how much that disagreement should be trusted for each drug.

## B. The highest-impact changes

Three changes clear the bar; everything else I considered was cosmetic, duplicate, or not worth the time. Ranked by impact, but **do change 2 first in time**, because its two-hour spike decides which rules everything else uses.

### Change 1: Measured reliability per organism–drug pair, and a gallery of real discordant isolates

| Point | Detail |
| --- | --- |
| The change | Before demo day, run the engine on public genomes that have laboratory AST labels for 3 to 4 pairs. Store per-pair results (sensitivity and specificity with intervals, abstention rate, background discordance rate). Show them next to each drug in the matrix and on the methodology page, and use them to rank discordance events. Add a gallery of a few manually reviewed real discordant isolates |
| Existing limitation | The plan contains a validation protocol but no results, so nobody can answer "how reliable is this for ceftriaxone in *K. pneumoniae*?". The benchmark preprint shows the answer differs enormously by pair (from about 0.59 to at least 0.99 F1), so one number would be wrong and no number is unconvincing |
| Expected impact | Labs learn which pairs a discordance flag deserves a re-test for; judges see measured numbers; every accuracy sentence in the pitch becomes defensible |
| Evidence | Per-pair variation and the drop under lineage-aware splits in the [2024 benchmark preprint](https://www.biorxiv.org/content/10.1101/2024.01.31.578169.full.pdf); the validation protocol in the Master Reference section 12 already specifies the method |
| Differentiation | In the sources I opened, I did not see a tool whose headline is "here is how reliable the genome check is for your drug, and here are the disagreements to review first". I cannot prove nobody does; treat this as a hypothesis |
| Implementation | (1) Choose pairs the rules cover. (2) Pull public genomes with AST labels (BV-BRC is a candidate; confirm the download route and label method fields) and keep only labels with a recorded method. (3) De-duplicate, assign sequence types, and split so test sequence types are unseen in development. (4) Run the real engine in a batch script. (5) Compute confusion matrix, Wilson intervals, abstention and background discordance per pair. (6) Store in a new `benchmark_results` collection (organism, antibiotic, n, counts, intervals, dataset source, retrieval date, split method, tool and rule versions). (7) Expose `GET /api/v1/benchmarks`. (8) Add a `PairReliability` panel to the evidence drawer and methodology page; hide any headline figure for pairs under a minimum count you set in advance. (9) Manually review and store up to 5 real discordant cases as `CACHED_REAL_ANALYSIS` demos |
| Trade-offs | Public labels are noisy and uneven in method; public data is not Indian; some pairs will look poor, which is honest and still shows rigour; compute and curation time; small counts must stay unreported |
| Success metric | At least 3 pairs with a held-out report and stated counts; every number in the app traceable to a stored result; at least 1 real discordant case reviewed by a domain person |
| Priority | It is the only change that converts claims into evidence, it unlocks the demo's strongest moment, and no other change can be justified numerically without it |

### Change 2: Adopt the AMRrules community standard as the primary rule source

| Point | Detail |
| --- | --- |
| The change | Use AMRrules for organism-specific interpretation wherever it covers our matrix; keep our own detection-quality capping and result categories on top; label any team-written rule "uncurated" |
| Existing limitation | Our scientific core is hand-written seed rules, reviewed by whoever is available. One wrong rule damages credibility, and the work duplicates a 200-member group's effort |
| Expected impact | Higher scientific credibility, less to maintain, and a sentence judges will respect: "interpretation follows the community standard, we add the lab-comparison layer" |
| Evidence | The [ESGEM-AMR group](https://github.com/AMRverse/AMRrulesCuration) curates the rules; the [AMRrules documentation](https://docs.amrrules.org) says the package applies organism-specific rules to AMRFinderPlus output, which is our engine. **Not confirmed:** rule format, categories, supported organisms, licence |
| Differentiation | We stand on the standard instead of racing it, and our differentiator moves to the part nobody asked us to rebuild |
| Implementation | **Spike, 2 to 3 hours on day 1:** install the package, run it on a real AMRFinderPlus output, record its categories, the organisms and drugs it covers, and its licence. **Gate:** if it covers at least 2 of our organisms with at least 3 drugs each, adopt it for those and keep seed rules only for the rest; otherwise keep the seed rules and say so. **Code:** add `engine/rules_provider.py` with one function `interpret(findings, organism)` and two providers (AMRrules, seed YAML); write the mapping from AMRrules outputs to our `ResultCategory` and `EvidenceTier` as a decision record; add reason codes rather than new enum values for categories we lack (for example intrinsic resistance); store the AMRrules version in `ruleSetVersion`. Update Master Reference sections 4, 8, 11 and the decision register only after you approve |
| Trade-offs | Unknown coverage and licence until the spike; dependence on an external release cadence; its categories may not fit ours one-to-one |
| Success metric | Share of matrix pairs covered by community-curated rules (target: all that AMRrules supports); zero unlabelled uncurated rules; engine tests pass after swapping providers |
| Priority | Cheap, de-risks the weakest link, and changes which rules change 1 benchmarks, so it must happen first |

### Change 3: Batch review queue with AST import

| Point | Detail |
| --- | --- |
| The change | Accept up to about 20 genomes plus one AST CSV in a single batch and show one prioritised discordance queue across isolates |
| Existing limitation | Single-isolate analysis cannot show a laboratory QA workflow, and a discordance rate only exists across many isolates |
| Expected impact | The demo shows the actual job ("which of these 10 isolates should we re-test?"); the real discordant gallery from change 1 becomes a natural batch demo |
| Evidence | Labs handle streams: the ICMR 2024 report covers 99,027 culture-positive isolates in one year in one network. The QA framing is Concept B in your research report |
| Differentiation | Workflow, not features: a queue sorted by priority and by pair reliability |
| Implementation | `POST /api/v1/batches` (multipart: genome files and one AST CSV); strict CSV schema `isolateLabel, antibiotic, category, method, mic, micUnit, standard, standardVersion`, with `isolateLabel` matching the file name; row-level validation errors; new `batches` collection `{batchId, status, analysisIds, counts}`; `GET /api/v1/batches/{id}` and `/batches/{id}/discordance`; frontend `/batches/[id]` table reusing `DiscordanceCard`; the worker is unchanged because a batch only groups analyses, processed one after another |
| Trade-offs | More API and UI surface; CSV friction; no WHONET import because I did not verify that format |
| Success metric | 5 people find the discordant isolates among 10 faster than with a plain results list; a batch of 10 completes in a measured time; malformed rows are rejected with a clear message |
| Priority | Third: only after the benchmark and rule source work, because without them the queue has nothing credible to rank |

## C. The breakthrough idea

**Measured trust per organism–antibiotic pair, used to rank which genome-versus-lab disagreements deserve a human's attention first.**

Every tool in this space reports what it found. None that I could verify tells the reviewer how much to trust the finding for this particular drug and species, measured on held-out public data. The benchmark preprint I cite in the landscape table reports per-pair F1 spread from roughly 0.59 to at least 0.99, and a drop when splits respect lineage. That spread is the product opportunity: a flag on a pair that agrees with lab results 99% of the time means something very different from a flag on a pair that agrees 60% of the time, and a reviewer cannot tell the difference today.

**How it works.** Offline, you run the engine on public genome plus AST isolates and store, per pair: number of isolates, agreement with AST (with Wilson interval), abstention rate, and background discordance rate. At runtime, each discordance flag carries its pair's numbers, and the batch queue sorts by them. A discordance on a high-agreement pair floats to the top (probably a lab or labelling problem, or a novel mechanism). A discordance on a low-agreement pair is shown as expected noise.

**Why it fits our rules.** These are dataset-level performance figures with intervals, not a per-isolate probability, so decision D-01 (no numeric probabilities per sample) holds. The wording must say "on benchmark isolates, this pair agreed X% (CI a–b)", never "this isolate is X% likely resistant".

**Status: hypothesis.** I have not seen our engine run on real data, so the actual per-pair numbers are unknown and some pairs will look bad. That is acceptable and arguably the point: publishing a weak pair honestly is the differentiator. It is the same work as Change 1; the breakthrough is using the result to drive the interface rather than leaving it on a side page.

## D. What I would not change

- **The scientific framing.** Research and surveillance use only, no treatment advice, no probabilities per sample, no "AI" claim, absence of a marker is not susceptibility. This is the strongest trust signal you have and costs nothing.
- **The deterministic rule engine and its tests.** Same input gives same output, every output cites its evidence. Do not replace it with a model. Change only where the rules come from (Change 2).
- **AMRFinderPlus for detection.** Established, maintained, and judges can check it. Building your own detector would burn the whole schedule for no gain.
- **Provenance and abstention.** Result origin tags, detection-quality capping, and the right to say "cannot assess" are what separate this from a demo.
- **The simple stack.** MongoDB, one polling worker, no queue, no auth. Every piece you add is a piece that can fail during the demo.
- **The three-organism scope.** Depth on three beats shallow coverage of ten. Do not add Pseudomonas or more drugs before the benchmark exists.
- **No 3D structure viewer, no ML predictor, no chatbot.** None of them improves the question a reviewer is asking.

## E. Implementation roadmap

I do not know the deadline or team size, so the plan is in working blocks that you can map onto your calendar. Replace "block" with half-days if time is very short.

| Tier | Block | Work | Gate |
| --- | --- | --- | --- |
| Essential | 1 | AMRrules spike (Change 2): load its rules for the three organisms, run on 5 known isolates | If it loads and gives sensible calls, keep it; if not after 3 hours, stay on seed YAML and say so honestly |
| Essential | 2–3 | Working end-to-end path from the Master Reference: upload, AMRFinderPlus, engine, result page, discordance with a single AST entry | One real isolate runs start to finish |
| Differentiator | 4–5 | Benchmark run (Change 1): 100–300 public isolates per organism with AST, store `benchmark_results`, show `PairReliability` panel | Per-pair table with intervals exists, even if some pairs are weak |
| Differentiator | 5 | Discordant-isolate gallery: 3–5 real cases, each with evidence trail | Each case reproducible from a stored accession |
| Differentiator | 6 | Batch queue (Change 3) sorted by pair reliability | CSV of 20+ isolates imports and ranks |
| Essential | 7 | Demo rehearsal, fallback cached results (tagged CACHED\_REAL\_ANALYSIS), README, honest limitations slide | Full demo runs with network off |
| Longer term | after | More organisms and drugs, lineage-aware benchmark splits as a published method, deployment with a public health lab, auth | Do not start before the event |

**If time is very short:** do blocks 1, 2–3 and 7, plus a small benchmark (one organism, two drugs). A small honest measurement beats a large unmeasured claim.

## F. Technical execution plan

| Change | Components | Data flow | Fits into existing design at |
| --- | --- | --- | --- |
| 1. Per-pair benchmark | Script `benchmarks/run_benchmark.py`; new `benchmark_results` collection; `GET /api/v1/benchmarks`; `PairReliability` component | Public genome accessions plus AST labels go in, the same engine used in production runs, per-pair counts and Wilson intervals go out to Mongo | Reuses `assess_pair` and `compare` from section 11 unchanged; adds one collection to section 8 and one endpoint to section 9 |
| 2. AMRrules provider | `engine/rules_provider.py` with `AmrRulesProvider` and `SeedYamlProvider` behind one interface | Rules load at worker start, version recorded on every result | Replaces direct YAML read in `interpret.py`; the contract types in `contracts.py` stay the same |
| 3. Batch queue | `POST /api/v1/batches`; `batches` collection; `/batches/[id]` page; CSV parser with the schema isolateLabel, antibiotic, category, method, mic, micUnit, standard, standardVersion | CSV rows become isolate jobs, worker processes them as normal, queue sorts by discordance type then pair reliability | Uses the existing job lifecycle and the `compare` function; no new worker |

**Algorithms.** Agreement is the fraction of benchmark isolates where engine category matches AST category for supported pairs. Abstention is the fraction where the engine returns no assessable result. Background discordance is agreement failures where no mechanism was found and AST was resistant, which the discordance matrix already types. Confidence intervals use the Wilson method. Report counts next to every percentage.

**Things that would break if done carelessly.** Do not tune rules against the same isolates you report on (split first, report only on the held-out set). Do not mix AST methods or breakpoint standards in one pair without saying so. Do not display a percentage without its sample size.

## G. Validation strategy

| What | How | Pass looks like |
| --- | --- | --- |
| Engine correctness | The 10 existing tests plus golden-file tests on 10–15 known isolates with hand-checked expectations | All pass; any change to a golden file needs a written reason |
| Rule source (Change 2) | Compare AMRrules calls with seed YAML on the same isolates | Differences are listed and each explained |
| Benchmark (Change 1) | Held-out public isolates, ideally lineage-aware split; Wilson intervals; counts shown | A table you would be willing to show a microbiologist, including weak pairs |
| Batch (Change 3) | Import a CSV with deliberately wrong labels | Planted errors rank near the top |
| Honest-claim check | Search the UI and README for words such as predicts, probability, recommend, treat | None present |
| Demo reliability | Run the full demo three times offline from cached results | No failure; cached results are visibly tagged |
| Expert read | Ask one microbiologist or lab scientist to review the gallery and wording | Written comments, even two lines, to quote |

I have not run any of these. The pass criteria are targets, not results.

## H. Final competitive verdict

**Biggest weakness.** The product reports findings but proves nothing about how reliable they are. Without measurement, the hand-written rules and the discordance flags are assertions, and a judge with domain knowledge will notice that quickly.

**Most valuable first change.** Run the AMRrules spike (a few hours) and then the per-pair benchmark. The spike comes first in time because its outcome changes what the benchmark measures; the benchmark is the most valuable change overall.

**What makes it meaningfully different.** Strong tools already detect genes, and AMRrules standardizes interpretation. What I could not find is a tool that shows, per drug and species, how often its genome-based call matched lab results on held-out data, and uses that to rank disagreements. That is the gap to occupy. This is based on my search, not an exhaustive survey, so state it as "we did not find" in the pitch.

**With very limited time.** Blocks 1, 2–3 and 7 plus a one-organism, two-drug benchmark. Cut the batch queue and the gallery to two cases. Never cut the honest-limitations slide.

**If the only goal is the strongest hackathon entry.** Build the working path, the per-pair reliability panel and a gallery of three to five real discordant isolates, then rehearse the demo around one case: isolate arrives, mechanism found, lab disagrees, the pair's measured reliability says this disagreement is worth a look. Add the batch queue only if everything else is stable. Check the actual rubric, which I have not seen, and reweight if it favours something else.

**For long-term global leadership.** Treat the benchmark as the product: publish lineage-aware splits and per-pair results as an open, versioned reference that other tools can be compared against, contribute back to AMRrules rather than forking it, validate with at least one public-health lab on local isolates (including Indian data, if available), and only then widen organisms and drugs. Regulatory and clinical use would be a separate, much larger step that this project should not imply.

**What I need from you.** The hackathon name, rubric, deadline and team size; whether any code already exists beyond the Master Reference; and whether you have access to local isolate data. Until you approve, I have changed nothing in the Master Reference.
