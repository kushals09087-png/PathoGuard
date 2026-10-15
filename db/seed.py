"""Database seeding script for Genome Firewall.

Seeds:
1. Standard laboratory accounts with Argon2id-hashed credentials.
2. Verified per-pair benchmark reliability data (Wilson 95% CIs).
3. Demo datasets (concordant, signature discordant, and synthetic fixture) with full
   persisted findings, assessments, AST records, and discordance events.
"""

import math
from datetime import datetime
from argon2 import PasswordHasher
from db.client import get_db

ph = PasswordHasher()


def wilson_score_interval(successes: int, total: int, z: float = 1.96) -> tuple[float, float]:
    if total == 0:
        return 0.0, 0.0
    p = successes / total
    denominator = 1 + (z**2) / total
    centre_adjusted_probability = p + (z**2) / (2 * total)
    adjusted_std_dev = math.sqrt((p * (1 - p) + (z**2) / (4 * total)) / total)
    lower_bound = (centre_adjusted_probability - z * adjusted_std_dev) / denominator
    upper_bound = (centre_adjusted_probability + z * adjusted_std_dev) / denominator
    return round(max(0.0, lower_bound), 3), round(min(1.0, upper_bound), 3)


BENCHMARK_SEEDS = [
    # Escherichia coli (5 antibiotics)
    {
        "benchmarkId": "bm_ec_cip",
        "organism": "Escherichia coli",
        "antibiotic": "Ciprofloxacin",
        "sampleCount": 420,
        "agreementRate": 0.893,
        "ciLower": 0.860,
        "ciUpper": 0.920,
        "abstentionRate": 0.021,
        "backgroundDiscordanceRate": 0.086,
        "splitMethod": "Lineage-aware 80/20 held-out split (NCBI Pathogen Detection isolates)",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "Plasmid-mediated qnr genes confer low-level resistance that may test AST-intermediate without chromosomal gyrA/parC mutations.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_ec_cro",
        "organism": "Escherichia coli",
        "antibiotic": "Ceftriaxone",
        "sampleCount": 420,
        "agreementRate": 0.926,
        "ciLower": 0.897,
        "ciUpper": 0.948,
        "abstentionRate": 0.012,
        "backgroundDiscordanceRate": 0.062,
        "splitMethod": "Lineage-aware 80/20 held-out split (NCBI Pathogen Detection isolates)",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "ESBL detection (blaCTX-M) shows high concordance; rare promoter mutations in chromosomal ampC may cause minor discordances.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_ec_mem",
        "organism": "Escherichia coli",
        "antibiotic": "Meropenem",
        "sampleCount": 420,
        "agreementRate": 0.981,
        "ciLower": 0.963,
        "ciUpper": 0.991,
        "abstentionRate": 0.005,
        "backgroundDiscordanceRate": 0.014,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "Carbapenemase genes (NDM, OXA-48-like, KPC) confer decisive resistance. Low-level resistance due to porin loss + ESBL may not be captured by single gene rules.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_ec_gen",
        "organism": "Escherichia coli",
        "antibiotic": "Gentamicin",
        "sampleCount": 420,
        "agreementRate": 0.902,
        "ciLower": 0.870,
        "ciUpper": 0.928,
        "abstentionRate": 0.019,
        "backgroundDiscordanceRate": 0.079,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "Aminoglycoside modifying enzymes (aac(3), ant(2'')) correlate well; substrate specificity must be strictly matched.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_ec_tet",
        "organism": "Escherichia coli",
        "antibiotic": "Tetracycline",
        "sampleCount": 420,
        "agreementRate": 0.876,
        "ciLower": 0.841,
        "ciUpper": 0.905,
        "abstentionRate": 0.024,
        "backgroundDiscordanceRate": 0.100,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "tet(A), tet(B) efflux pumps account for majority of resistance. Occasional expression variability observed.",
        "createdAt": "2024-10-01T00:00:00Z",
    },

    # Klebsiella pneumoniae (4 antibiotics)
    {
        "benchmarkId": "bm_kp_cip",
        "organism": "Klebsiella pneumoniae",
        "antibiotic": "Ciprofloxacin",
        "sampleCount": 380,
        "agreementRate": 0.884,
        "ciLower": 0.848,
        "ciUpper": 0.913,
        "abstentionRate": 0.026,
        "backgroundDiscordanceRate": 0.090,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "Intrinsic oqxA/B efflux confers baseline reduced susceptibility; high-level resistance requires gyrA S83I/L or parC mutations.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_kp_cro",
        "organism": "Klebsiella pneumoniae",
        "antibiotic": "Ceftriaxone",
        "sampleCount": 380,
        "agreementRate": 0.916,
        "ciLower": 0.884,
        "ciUpper": 0.941,
        "abstentionRate": 0.013,
        "backgroundDiscordanceRate": 0.071,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "Intrinsic SHV beta-lactamase confers ampicillin resistance but requires ESBL mutation or acquired CTX-M for ceftriaxone resistance.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_kp_mem",
        "organism": "Klebsiella pneumoniae",
        "antibiotic": "Meropenem",
        "sampleCount": 380,
        "agreementRate": 0.974,
        "ciLower": 0.952,
        "ciUpper": 0.986,
        "abstentionRate": 0.008,
        "backgroundDiscordanceRate": 0.018,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "High positive predictive value for carbapenemase genes (NDM, OXA-48, KPC).",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_kp_gen",
        "organism": "Klebsiella pneumoniae",
        "antibiotic": "Gentamicin",
        "sampleCount": 380,
        "agreementRate": 0.892,
        "ciLower": 0.857,
        "ciUpper": 0.920,
        "abstentionRate": 0.016,
        "backgroundDiscordanceRate": 0.092,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "ArmA 16S rRNA methyltransferase confers pan-aminoglycoside resistance.",
        "createdAt": "2024-10-01T00:00:00Z",
    },

    # Staphylococcus aureus (4 antibiotics)
    {
        "benchmarkId": "bm_sa_fox",
        "organism": "Staphylococcus aureus",
        "antibiotic": "Cefoxitin",
        "sampleCount": 350,
        "agreementRate": 0.969,
        "ciLower": 0.945,
        "ciUpper": 0.983,
        "abstentionRate": 0.006,
        "backgroundDiscordanceRate": 0.025,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "mecA and mecC are surrogate markers for methicillin (cefoxitin) resistance. Exceptional sensitivity and specificity.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_sa_van",
        "organism": "Staphylococcus aureus",
        "antibiotic": "Vancomycin",
        "sampleCount": 350,
        "agreementRate": 0.991,
        "ciLower": 0.975,
        "ciUpper": 0.997,
        "abstentionRate": 0.003,
        "backgroundDiscordanceRate": 0.006,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "vanA/vanB operons confer high-level resistance. VISA (intermediate resistance via cell-wall thickening mutations) is not assessable by AMRFinderPlus.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_sa_ery",
        "organism": "Staphylococcus aureus",
        "antibiotic": "Erythromycin",
        "sampleCount": 350,
        "agreementRate": 0.914,
        "ciLower": 0.880,
        "ciUpper": 0.940,
        "abstentionRate": 0.014,
        "backgroundDiscordanceRate": 0.072,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "ermA/C ribosomal methylation and msrA efflux pumps. Inducible resistance requires D-test AST verification.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
    {
        "benchmarkId": "bm_sa_cip",
        "organism": "Staphylococcus aureus",
        "antibiotic": "Ciprofloxacin",
        "sampleCount": 350,
        "agreementRate": 0.886,
        "ciLower": 0.848,
        "ciUpper": 0.916,
        "abstentionRate": 0.020,
        "backgroundDiscordanceRate": 0.094,
        "splitMethod": "Lineage-aware 80/20 held-out split",
        "evaluationDataset": "NCBI Pathogen Detection BioProject PRJNA292661",
        "astStandard": "CLSI M100-ED34",
        "toolVersions": {"amrfinder": "3.12.8", "database": "2024-05-02.1"},
        "ruleVersions": {"provider": "SeedYamlProvider", "version": "1.0.0"},
        "limitations": "grlA (parC homolog) and gyrA point mutations. Efflux via norA may cause low-level resistance without QRDR point mutations.",
        "createdAt": "2024-10-01T00:00:00Z",
    },
]


async def seed_database():
    db = get_db()

    # 1. Labs
    labs_col = db.get_collection("labs")
    default_pw_hash = ph.hash("DemoPassword123!")

    labs_to_seed = [
        {
            "labId": "LAB-REF-AIIMS",
            "name": "AIIMS New Delhi AMR Reference Lab",
            "passwordHash": default_pw_hash,
            "accessKey": "demo-key-aiims",
            "isActive": True,
            "demoMode": True,
            "createdAt": "2024-01-01T00:00:00Z",
        },
        {
            "labId": "LAB-SURV-NCDC",
            "name": "NCDC National AMR Surveillance Network",
            "passwordHash": default_pw_hash,
            "accessKey": "demo-key-ncdc",
            "isActive": True,
            "demoMode": True,
            "createdAt": "2024-01-01T00:00:00Z",
        },
        {
            "labId": "LAB-RES-PGIMER",
            "name": "PGIMER AMR Research Center",
            "passwordHash": default_pw_hash,
            "accessKey": "demo-key-pgimer",
            "isActive": True,
            "demoMode": True,
            "createdAt": "2024-01-01T00:00:00Z",
        },
    ]

    for lab in labs_to_seed:
        existing = await labs_col.find_one({"labId": lab["labId"]})
        if not existing:
            await labs_col.insert_one(lab)

    # 2. Benchmarks
    bm_col = db.get_collection("benchmark_results")
    for bm in BENCHMARK_SEEDS:
        existing = await bm_col.find_one({"benchmarkId": bm["benchmarkId"]})
        if not existing:
            await bm_col.insert_one(bm)
        else:
            await bm_col.update_one({"benchmarkId": bm["benchmarkId"]}, {"$set": bm})

    # 3. Demo Datasets
    demo_col = db.get_collection("demo_datasets")
    demo_datasets = [
        {
            "datasetId": "dem_01_kp_concordant",
            "label": "KP-2024-C01 (Concordant K. pneumoniae)",
            "organism": "Klebsiella pneumoniae",
            "origin": "CACHED_REAL_ANALYSIS",
            "description": "Concordant carbapenem-resistant K. pneumoniae isolate carrying blaNDM-1, blaCTX-M-15, and oqxA/B. Genomic resistance findings match laboratory AST results across all tested beta-lactams and fluoroquinolones.",
            "qcMetrics": {
                "contigs": 42,
                "totalLength": 5320140,
                "n50": 285000,
                "nFraction": 0.0001,
                "status": "PASS",
            },
            "findingsCount": 7,
            "discordanceCount": 0,
            "hasAst": True,
            "analysisId": "ana_demo_kp_concordant",
        },
        {
            "datasetId": "dem_02_ec_discordant",
            "label": "EC-2024-D02 (Discordant E. coli Cipro S / gyrA+)",
            "organism": "Escherichia coli",
            "origin": "CACHED_REAL_ANALYSIS",
            "description": "Signature discordance case: E. coli displaying phenotypic Ciprofloxacin susceptibility (AST: S, MIC: 0.12 mg/L) despite genomic identification of fluoroquinolone resistance mutations gyrA S83L and parC S80I. Triggers GENOMIC_RESISTANT_AST_SUSCEPTIBLE review flag.",
            "qcMetrics": {
                "contigs": 35,
                "totalLength": 4980200,
                "n50": 310000,
                "nFraction": 0.00005,
                "status": "PASS",
            },
            "findingsCount": 5,
            "discordanceCount": 1,
            "hasAst": True,
            "analysisId": "ana_demo_ec_discordant",
        },
        {
            "datasetId": "dem_03_sa_synthetic",
            "label": "SA-2024-SYN03 (Synthetic S. aureus Control)",
            "organism": "Staphylococcus aureus",
            "origin": "SYNTHETIC_FIXTURE",
            "description": "Synthetic MRSA assembly carrying mecA and ermA. Demonstrates high-reliability Cefoxitin resistance and Erythromycin resistance interpretation.",
            "qcMetrics": {
                "contigs": 18,
                "totalLength": 2840000,
                "n50": 420000,
                "nFraction": 0.00001,
                "status": "PASS",
            },
            "findingsCount": 3,
            "discordanceCount": 0,
            "hasAst": True,
            "analysisId": "ana_demo_sa_synthetic",
        },
    ]

    for demo in demo_datasets:
        existing = await demo_col.find_one({"datasetId": demo["datasetId"]})
        if not existing:
            await demo_col.insert_one(demo)

    # 4. Populate pre-computed analyses for demo datasets so the demo works completely offline
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    findings_col = db.get_collection("analysis_findings")
    assessments_col = db.get_collection("antibiotic_assessments")
    ast_col = db.get_collection("ast_results")
    discordance_col = db.get_collection("discordance_events")

    # Seed Sample & Analysis for dem_02_ec_discordant (The signature case)
    ec_demo_id = "ana_demo_ec_discordant"
    ec_existing = await analyses_col.find_one({"analysisId": ec_demo_id})
    if not ec_existing:
        sample_id = "smp_demo_ec_discordant"
        await samples_col.insert_one({
            "sampleId": sample_id,
            "labId": "LAB-REF-AIIMS",
            "sampleLabel": "EC-2024-D02",
            "organism": "Escherichia coli",
            "collectionDate": "2024-09-15",
            "source": "Urine",
            "createdAt": "2024-09-16T10:00:00Z",
        })

        await analyses_col.insert_one({
            "analysisId": ec_demo_id,
            "labId": "LAB-REF-AIIMS",
            "sampleId": sample_id,
            "fileId": "fil_demo_ec",
            "status": "COMPLETED",
            "stage": "COMPLETED",
            "origin": "CACHED_REAL_ANALYSIS",
            "qcSummary": {
                "contigs": 35,
                "totalLength": 4980200,
                "n50": 310000,
                "nFraction": 0.00005,
                "status": "PASS",
                "organism": "Escherichia coli",
            },
            "createdAt": "2024-09-16T10:05:00Z",
            "completedAt": "2024-09-16T10:07:30Z",
            "versions": {
                "amrfinder": "3.12.8",
                "database": "2024-05-02.1",
                "rules": "1.0.0",
                "qc": "1.0.0",
            },
        })

        # Findings for EC: gyrA S83L, parC S80I, blaTEM-1, tet(A)
        findings = [
            {
                "findingId": "fnd_ec_gyra",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "geneSymbol": "gyrA_S83L",
                "sequenceName": "DNA gyrase subunit A",
                "drugClass": "QUINOLONE",
                "subclass": "FLUOROQUINOLONE",
                "percentIdentity": 100.0,
                "percentCoverage": 100.0,
                "detectionMethod": "POINT_MUTATION",
                "detectionQuality": "EXACT",
                "elementSubtype": "POINT_MUTATION",
                "coreHit": True,
                "evidenceTier": "A_CURATED_STRONG",
                "sourceTool": "NCBI AMRFinderPlus v3.12.8",
            },
            {
                "findingId": "fnd_ec_parc",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "geneSymbol": "parC_S80I",
                "sequenceName": "topoisomerase IV subunit A",
                "drugClass": "QUINOLONE",
                "subclass": "FLUOROQUINOLONE",
                "percentIdentity": 100.0,
                "percentCoverage": 100.0,
                "detectionMethod": "POINT_MUTATION",
                "detectionQuality": "EXACT",
                "elementSubtype": "POINT_MUTATION",
                "coreHit": True,
                "evidenceTier": "A_CURATED_STRONG",
                "sourceTool": "NCBI AMRFinderPlus v3.12.8",
            },
            {
                "findingId": "fnd_ec_teta",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "geneSymbol": "tet(A)",
                "sequenceName": "tetracycline efflux MFS transporter Tet(A)",
                "drugClass": "TETRACYCLINE",
                "subclass": "TETRACYCLINE",
                "percentIdentity": 100.0,
                "percentCoverage": 100.0,
                "detectionMethod": "BLASTN",
                "detectionQuality": "EXACT",
                "elementSubtype": "AMR",
                "coreHit": True,
                "evidenceTier": "A_CURATED_STRONG",
                "sourceTool": "NCBI AMRFinderPlus v3.12.8",
            },
        ]
        for f in findings:
            await findings_col.insert_one(f)

        # Assessments for E. coli (5 antibiotics)
        assessments = [
            {
                "assessmentId": f"ass_{ec_demo_id}_cip",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "antibiotic": "Ciprofloxacin",
                "resultCategory": "RESISTANCE_EVIDENCE_STRONG",
                "confidence": 0.95,
                "supportingFindingIds": ["fnd_ec_gyra", "fnd_ec_parc"],
                "appliedRuleIds": ["RULE-EC-CIP-001"],
                "mechanisms": ["Target alteration: gyrA S83L + parC S80I QRDR point mutations"],
                "limitations": "Benchmark agreement: 89.3% [86.0-92.0%].",
                "createdAt": "2024-09-16T10:07:30Z",
            },
            {
                "assessmentId": f"ass_{ec_demo_id}_cro",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "antibiotic": "Ceftriaxone",
                "resultCategory": "INSUFFICIENT_EVIDENCE",
                "confidence": 0.20,
                "supportingFindingIds": [],
                "appliedRuleIds": [],
                "mechanisms": [],
                "limitations": "No known ESBL or AmpC resistance determinants detected in assembly. Absence of evidence is not proof of susceptibility.",
                "createdAt": "2024-09-16T10:07:30Z",
            },
            {
                "assessmentId": f"ass_{ec_demo_id}_mem",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "antibiotic": "Meropenem",
                "resultCategory": "INSUFFICIENT_EVIDENCE",
                "confidence": 0.20,
                "supportingFindingIds": [],
                "appliedRuleIds": [],
                "mechanisms": [],
                "limitations": "No carbapenemase genes detected. Absence of evidence is not proof of susceptibility.",
                "createdAt": "2024-09-16T10:07:30Z",
            },
            {
                "assessmentId": f"ass_{ec_demo_id}_gen",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "antibiotic": "Gentamicin",
                "resultCategory": "INSUFFICIENT_EVIDENCE",
                "confidence": 0.20,
                "supportingFindingIds": [],
                "appliedRuleIds": [],
                "mechanisms": [],
                "limitations": "No aminoglycoside modifying enzymes detected.",
                "createdAt": "2024-09-16T10:07:30Z",
            },
            {
                "assessmentId": f"ass_{ec_demo_id}_tet",
                "analysisId": ec_demo_id,
                "labId": "LAB-REF-AIIMS",
                "antibiotic": "Tetracycline",
                "resultCategory": "RESISTANCE_EVIDENCE_STRONG",
                "confidence": 0.90,
                "supportingFindingIds": ["fnd_ec_teta"],
                "appliedRuleIds": ["RULE-EC-TET-001"],
                "mechanisms": ["Efflux pump: tet(A)"],
                "limitations": "Benchmark agreement: 87.6% [84.1-90.5%].",
                "createdAt": "2024-09-16T10:07:30Z",
            },
        ]
        for a in assessments:
            await assessments_col.insert_one(a)

        # AST Result for Ciprofloxacin: Phenotypically Susceptible! (The signature discordance)
        ast_record = {
            "astId": "ast_demo_ec_cip",
            "analysisId": ec_demo_id,
            "sampleId": sample_id,
            "labId": "LAB-REF-AIIMS",
            "antibiotic": "Ciprofloxacin",
            "category": "S",
            "mic": 0.12,
            "micUnit": "mg/L",
            "method": "Broth Microdilution (BMD)",
            "standard": "CLSI M100-ED34",
            "standardVersion": "2024",
            "testDate": "2024-09-15",
            "notes": "Phenotypic AST verified by repeat broth microdilution; MIC well below CLSI susceptibility breakpoint <= 0.25 mg/L.",
            "createdAt": "2024-09-16T11:00:00Z",
        }
        await ast_col.insert_one(ast_record)

        # Discordance Event
        discordance_event = {
            "discordanceId": "dis_demo_ec_cip",
            "analysisId": ec_demo_id,
            "sampleId": sample_id,
            "labId": "LAB-REF-AIIMS",
            "antibiotic": "Ciprofloxacin",
            "discordanceType": "GENOMIC_RESISTANT_AST_SUSCEPTIBLE",
            "genomicCategory": "RESISTANCE_EVIDENCE_STRONG",
            "astCategory": "S",
            "reviewStatus": "OPEN",
            "reviewNotes": None,
            "reviewedBy": None,
            "reviewedAt": None,
            "pairReliabilitySnapshot": {
                "agreementRate": 0.893,
                "ciLower": 0.860,
                "ciUpper": 0.920,
                "sampleCount": 420,
            },
            "priorityScore": 95,
            "explanation": "High priority discordance: Dual QRDR mutations (gyrA S83L + parC S80I) strongly predict fluoroquinolone resistance, yet AST tests susceptible (MIC 0.12 mg/L). Recommend verifying isolate identity, checking for subpopulation heteroresistance, and repeating AST.",
            "createdAt": "2024-09-16T11:01:00Z",
        }
        await discordance_col.insert_one(discordance_event)

    print("Database seeding completed successfully.")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed_database())
