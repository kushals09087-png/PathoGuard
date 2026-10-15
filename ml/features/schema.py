"""Machine Learning feature extraction and schema definition for Genome Firewall.

Transforms AMRFinderPlus normalized findings into a structured feature vector
complying with Feature Sets A, B, C, and D of the approved ML plan:
- Set A: Gene presence/absence flags (binary)
- Set B: Curated QRDR and target point mutation flags (binary)
- Set C: Detection quality metrics (max identity, coverage, and quality tier counts)
- Set D: Drug-class resistance determinant counts
"""

from typing import List, Dict, Any
from engine.normalize import NormalizedFinding
from engine.contracts import DetectionQuality

FEATURE_NAMES = [
    # Set A: Gene Presence / Absence
    "has_blaNDM",
    "has_blaKPC",
    "has_blaOXA48_like",
    "has_blaVIM",
    "has_blaIMP",
    "has_blaCTXM",
    "has_blaTEM",
    "has_blaSHV",
    "has_blaCMY",
    "has_mecA",
    "has_mecC",
    "has_vanA",
    "has_vanB",
    "has_ermA",
    "has_ermB",
    "has_ermC",
    "has_msrA",
    "has_aac3",
    "has_ant2",
    "has_armA",
    "has_rmtB",
    "has_tetA",
    "has_tetB",
    "has_tetM",
    "has_oqxA",
    "has_oqxB",
    # Set B: Point Mutations
    "mut_gyrA_S83L",
    "mut_gyrA_D87N",
    "mut_parC_S80I",
    "mut_gyrA_S83I",
    "mut_grlA_S80F",
    # Set C: Detection Quality Features
    "max_identity_class",
    "max_coverage_class",
    "exact_hits_count",
    "strict_hits_count",
    "loose_hits_count",
    # Set D: Drug Class Counts
    "beta_lactam_count",
    "quinolone_count",
    "aminoglycoside_count",
    "tetracycline_count",
    "macrolide_count",
]


def extract_features(
    findings: List[NormalizedFinding],
    organism: str,
    antibiotic: str,
) -> Dict[str, float]:
    """Extracts a standardized tabular feature dictionary from normalized AMR findings."""
    features: Dict[str, float] = {k: 0.0 for k in FEATURE_NAMES}

    target_class = ""
    abx_lower = antibiotic.lower()
    if any(b in abx_lower for b in ["meropenem", "ceftriaxone", "cefoxitin", "ampicillin"]):
        target_class = "BETA-LACTAM"
    elif any(q in abx_lower for q in ["ciprofloxacin", "levofloxacin"]):
        target_class = "QUINOLONE"
    elif any(a in abx_lower for a in ["gentamicin", "amikacin", "tobramycin"]):
        target_class = "AMINOGLYCOSIDE"
    elif "tetracycline" in abx_lower:
        target_class = "TETRACYCLINE"
    elif "erythromycin" in abx_lower:
        target_class = "MACROLIDE"
    elif "vancomycin" in abx_lower:
        target_class = "GLYCOPEPTIDE"

    max_id = 0.0
    max_cov = 0.0

    for f in findings:
        sym = f.gene_symbol.lower()
        d_class = f.drug_class.upper()

        # Update quality counts
        if f.detection_quality == DetectionQuality.EXACT:
            features["exact_hits_count"] += 1.0
        elif f.detection_quality == DetectionQuality.STRICT:
            features["strict_hits_count"] += 1.0
        elif f.detection_quality == DetectionQuality.LOOSE:
            features["loose_hits_count"] += 1.0

        # Class counts
        if "BETA-LACTAM" in d_class:
            features["beta_lactam_count"] += 1.0
        elif "QUINOLONE" in d_class:
            features["quinolone_count"] += 1.0
        elif "AMINOGLYCOSIDE" in d_class:
            features["aminoglycoside_count"] += 1.0
        elif "TETRACYCLINE" in d_class:
            features["tetracycline_count"] += 1.0
        elif "MACROLIDE" in d_class:
            features["macrolide_count"] += 1.0

        # Max identity & coverage for target drug class
        if target_class and target_class in d_class:
            if f.percent_identity > max_id:
                max_id = f.percent_identity
            if f.percent_coverage > max_cov:
                max_cov = f.percent_coverage

        # Gene Presence Flags
        if "ndm" in sym:
            features["has_blaNDM"] = 1.0
        if "kpc" in sym:
            features["has_blaKPC"] = 1.0
        if "oxa-48" in sym or "oxa-181" in sym or "oxa-232" in sym:
            features["has_blaOXA48_like"] = 1.0
        if "vim" in sym:
            features["has_blaVIM"] = 1.0
        if "imp" in sym:
            features["has_blaIMP"] = 1.0
        if "ctx-m" in sym:
            features["has_blaCTXM"] = 1.0
        if "tem" in sym:
            features["has_blaTEM"] = 1.0
        if "shv" in sym:
            features["has_blaSHV"] = 1.0
        if "cmy" in sym:
            features["has_blaCMY"] = 1.0
        if "meca" in sym:
            features["has_mecA"] = 1.0
        if "mecc" in sym:
            features["has_mecC"] = 1.0
        if "vana" in sym:
            features["has_vanA"] = 1.0
        if "vanb" in sym:
            features["has_vanB"] = 1.0
        if "erm(a)" in sym or "erma" in sym:
            features["has_ermA"] = 1.0
        if "erm(b)" in sym or "ermb" in sym:
            features["has_ermB"] = 1.0
        if "erm(c)" in sym or "ermc" in sym:
            features["has_ermC"] = 1.0
        if "msr" in sym:
            features["has_msrA"] = 1.0
        if "aac(3)" in sym or "aac3" in sym:
            features["has_aac3"] = 1.0
        if "ant(2" in sym or "ant2" in sym:
            features["has_ant2"] = 1.0
        if "arma" in sym:
            features["has_armA"] = 1.0
        if "rmtb" in sym:
            features["has_rmtB"] = 1.0
        if "tet(a)" in sym or "teta" in sym:
            features["has_tetA"] = 1.0
        if "tet(b)" in sym or "tetb" in sym:
            features["has_tetB"] = 1.0
        if "tet(m)" in sym or "tetm" in sym:
            features["has_tetM"] = 1.0
        if "oqxa" in sym:
            features["has_oqxA"] = 1.0
        if "oqxb" in sym:
            features["has_oqxB"] = 1.0

        # Point Mutation Flags
        if "gyra_s83l" in sym:
            features["mut_gyrA_S83L"] = 1.0
        if "gyra_d87n" in sym:
            features["mut_gyrA_D87N"] = 1.0
        if "parc_s80i" in sym:
            features["mut_parC_S80I"] = 1.0
        if "gyra_s83i" in sym:
            features["mut_gyrA_S83I"] = 1.0
        if "grla_s80f" in sym:
            features["mut_grlA_S80F"] = 1.0

    features["max_identity_class"] = round(max_id, 2)
    features["max_coverage_class"] = round(max_cov, 2)

    return features
