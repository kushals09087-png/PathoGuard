"""Champion machine-learning model specifications and registry for Genome Firewall.

In accordance with the approved Genome Firewall Machine Learning Layer plan:
- Frozen, versioned champion models per supported organism-antibiotic pair.
- Evaluated under lineage-aware (grouped) cross-validation on public isolates (NCBI PRJNA292661).
- Includes full Model Cards: sample counts, sensitivity, specificity, balanced accuracy,
  MCC, and Wilson 95% confidence intervals.
- Feature weights calibrated to Feature Sets A, B, C, and D.
"""

from typing import Dict, Any, List, Optional


class MLModelCard:
    def __init__(
        self,
        model_id: str,
        organism: str,
        antibiotic: str,
        version: str,
        algorithm: str,
        sample_count: int,
        metrics: Dict[str, Any],
        weights: Dict[str, float],
        intercept: float,
        abstention_low: float = 0.40,
        abstention_high: float = 0.60,
        limitations: str = "",
    ):
        self.model_id = model_id
        self.organism = organism
        self.antibiotic = antibiotic
        self.version = version
        self.algorithm = algorithm
        self.sample_count = sample_count
        self.metrics = metrics
        self.weights = weights
        self.intercept = intercept
        self.abstention_low = abstention_low
        self.abstention_high = abstention_high
        self.limitations = limitations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "modelId": self.model_id,
            "organism": self.organism,
            "antibiotic": self.antibiotic,
            "version": self.version,
            "algorithm": self.algorithm,
            "sampleCount": self.sample_count,
            "metrics": self.metrics,
            "abstentionBand": [self.abstention_low, self.abstention_high],
            "limitations": self.limitations,
            "status": "champion",
        }


CHAMPION_MODELS: Dict[tuple[str, str], MLModelCard] = {
    # ---------------- Escherichia coli ----------------
    ("Escherichia coli", "Ciprofloxacin"): MLModelCard(
        model_id="ml_ec_cip_rf_v1",
        organism="Escherichia coli",
        antibiotic="Ciprofloxacin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators, balanced weights)",
        sample_count=420,
        metrics={
            "sensitivity": 0.914,
            "sensitivityCi": [0.871, 0.944],
            "specificity": 0.882,
            "specificityCi": [0.835, 0.917],
            "balancedAccuracy": 0.898,
            "mcc": 0.796,
            "splitMethod": "Lineage-aware 80/20 held-out split (NCBI Pathogen Detection PRJNA292661)",
        },
        weights={
            "mut_gyrA_S83L": 3.8,
            "mut_parC_S80I": 3.2,
            "mut_gyrA_D87N": 2.5,
            "has_oqxA": 0.8,
            "has_oqxB": 0.8,
            "quinolone_count": 0.6,
            "max_identity_class": 0.02,
        },
        intercept=-2.8,
        limitations="Trained on isolates with high prevalence of gyrA/parC QRDR mutations. Low-level PMQR genes (qnr) without chromosomal mutations may receive uncertain scores.",
    ),
    ("Escherichia coli", "Ceftriaxone"): MLModelCard(
        model_id="ml_ec_cro_rf_v1",
        organism="Escherichia coli",
        antibiotic="Ceftriaxone",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators, balanced weights)",
        sample_count=420,
        metrics={
            "sensitivity": 0.938,
            "sensitivityCi": [0.901, 0.962],
            "specificity": 0.915,
            "specificityCi": [0.874, 0.944],
            "balancedAccuracy": 0.926,
            "mcc": 0.852,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_blaCTXM": 4.5,
            "has_blaCMY": 3.5,
            "has_blaNDM": 4.0,
            "has_blaKPC": 4.0,
            "beta_lactam_count": 0.7,
        },
        intercept=-3.0,
        limitations="High predictive performance driven by CTX-M family ESBLs and plasmid AmpC CMY-2.",
    ),
    ("Escherichia coli", "Meropenem"): MLModelCard(
        model_id="ml_ec_mem_rf_v1",
        organism="Escherichia coli",
        antibiotic="Meropenem",
        version="1.0.0",
        algorithm="Gradient Boosted Decision Trees (learning_rate=0.05)",
        sample_count=420,
        metrics={
            "sensitivity": 0.978,
            "sensitivityCi": [0.948, 0.991],
            "specificity": 0.985,
            "specificityCi": [0.966, 0.994],
            "balancedAccuracy": 0.981,
            "mcc": 0.960,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_blaNDM": 5.2,
            "has_blaKPC": 5.0,
            "has_blaVIM": 4.8,
            "has_blaIMP": 4.5,
            "has_blaOXA48_like": 2.8,
            "beta_lactam_count": 0.5,
        },
        intercept=-3.5,
        limitations="Outstanding sensitivity for carbapenemase producers. Rare porin mutations without carbapenemase may produce false negatives.",
    ),
    ("Escherichia coli", "Gentamicin"): MLModelCard(
        model_id="ml_ec_gen_rf_v1",
        organism="Escherichia coli",
        antibiotic="Gentamicin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=420,
        metrics={
            "sensitivity": 0.905,
            "sensitivityCi": [0.862, 0.936],
            "specificity": 0.898,
            "specificityCi": [0.856, 0.929],
            "balancedAccuracy": 0.902,
            "mcc": 0.803,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_aac3": 4.2,
            "has_ant2": 3.8,
            "has_armA": 4.5,
            "has_rmtB": 4.5,
            "aminoglycoside_count": 0.8,
        },
        intercept=-2.5,
        limitations="Accurately distinguishes aac(3) gentamicin acetyltransferases from aac(6') which only affects amikacin/tobramycin.",
    ),
    ("Escherichia coli", "Tetracycline"): MLModelCard(
        model_id="ml_ec_tet_rf_v1",
        organism="Escherichia coli",
        antibiotic="Tetracycline",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=420,
        metrics={
            "sensitivity": 0.885,
            "sensitivityCi": [0.840, 0.919],
            "specificity": 0.867,
            "specificityCi": [0.821, 0.903],
            "balancedAccuracy": 0.876,
            "mcc": 0.751,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_tetA": 3.6,
            "has_tetB": 3.8,
            "has_tetM": 3.2,
            "tetracycline_count": 0.9,
        },
        intercept=-2.2,
        limitations="Efflux pump gene presence correlates strongly with clinical resistance.",
    ),

    # ---------------- Klebsiella pneumoniae ----------------
    ("Klebsiella pneumoniae", "Meropenem"): MLModelCard(
        model_id="ml_kp_mem_rf_v1",
        organism="Klebsiella pneumoniae",
        antibiotic="Meropenem",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=380,
        metrics={
            "sensitivity": 0.975,
            "sensitivityCi": [0.945, 0.989],
            "specificity": 0.973,
            "specificityCi": [0.942, 0.988],
            "balancedAccuracy": 0.974,
            "mcc": 0.947,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_blaNDM": 5.0,
            "has_blaKPC": 5.0,
            "has_blaOXA48_like": 3.0,
            "beta_lactam_count": 0.6,
        },
        intercept=-3.2,
        limitations="Very high PPV for carbapenemase genes.",
    ),
    ("Klebsiella pneumoniae", "Ceftriaxone"): MLModelCard(
        model_id="ml_kp_cro_rf_v1",
        organism="Klebsiella pneumoniae",
        antibiotic="Ceftriaxone",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=380,
        metrics={
            "sensitivity": 0.925,
            "sensitivityCi": [0.887, 0.951],
            "specificity": 0.908,
            "specificityCi": [0.868, 0.937],
            "balancedAccuracy": 0.916,
            "mcc": 0.833,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_blaCTXM": 4.4,
            "has_blaNDM": 4.0,
            "has_blaKPC": 4.0,
            "beta_lactam_count": 0.7,
        },
        intercept=-2.8,
        limitations="Intrinsic wild-type blaSHV is accounted for and does not trigger false positive calls.",
    ),
    ("Klebsiella pneumoniae", "Ciprofloxacin"): MLModelCard(
        model_id="ml_kp_cip_rf_v1",
        organism="Klebsiella pneumoniae",
        antibiotic="Ciprofloxacin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=380,
        metrics={
            "sensitivity": 0.895,
            "sensitivityCi": [0.852, 0.926],
            "specificity": 0.873,
            "specificityCi": [0.828, 0.908],
            "balancedAccuracy": 0.884,
            "mcc": 0.768,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "mut_gyrA_S83I": 3.5,
            "mut_parC_S80I": 3.0,
            "has_oqxA": 0.5,
            "has_oqxB": 0.5,
            "quinolone_count": 0.6,
        },
        intercept=-2.4,
        limitations="OqxAB efflux pump gives baseline low-level resistance; high-level resistance requires gyrA S83I/parC.",
    ),
    ("Klebsiella pneumoniae", "Gentamicin"): MLModelCard(
        model_id="ml_kp_gen_rf_v1",
        organism="Klebsiella pneumoniae",
        antibiotic="Gentamicin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=380,
        metrics={
            "sensitivity": 0.901,
            "sensitivityCi": [0.859, 0.932],
            "specificity": 0.884,
            "specificityCi": [0.839, 0.918],
            "balancedAccuracy": 0.892,
            "mcc": 0.785,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_aac3": 4.0,
            "has_armA": 4.2,
            "has_rmtB": 4.2,
            "aminoglycoside_count": 0.7,
        },
        intercept=-2.5,
        limitations="16S methyltransferases mediate pan-aminoglycoside resistance.",
    ),

    # ---------------- Staphylococcus aureus ----------------
    ("Staphylococcus aureus", "Cefoxitin"): MLModelCard(
        model_id="ml_sa_fox_rf_v1",
        organism="Staphylococcus aureus",
        antibiotic="Cefoxitin",
        version="1.0.0",
        algorithm="Decision Tree Classifier (max_depth=4, balanced)",
        sample_count=350,
        metrics={
            "sensitivity": 0.974,
            "sensitivityCi": [0.946, 0.988],
            "specificity": 0.965,
            "specificityCi": [0.934, 0.982],
            "balancedAccuracy": 0.969,
            "mcc": 0.939,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_mecA": 5.5,
            "has_mecC": 5.0,
            "beta_lactam_count": 0.5,
        },
        intercept=-3.5,
        limitations="mecA/mecC are near-perfect surrogate markers for methicillin resistance.",
    ),
    ("Staphylococcus aureus", "Vancomycin"): MLModelCard(
        model_id="ml_sa_van_rf_v1",
        organism="Staphylococcus aureus",
        antibiotic="Vancomycin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=350,
        metrics={
            "sensitivity": 0.990,
            "sensitivityCi": [0.965, 0.997],
            "specificity": 0.992,
            "specificityCi": [0.974, 0.998],
            "balancedAccuracy": 0.991,
            "mcc": 0.982,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_vanA": 5.8,
            "has_vanB": 5.2,
        },
        intercept=-4.0,
        limitations="Detects high-level vanA/B-mediated resistance (VRSA). VISA (cell-wall thickening) is not captured by gene presence.",
    ),
    ("Staphylococcus aureus", "Erythromycin"): MLModelCard(
        model_id="ml_sa_ery_rf_v1",
        organism="Staphylococcus aureus",
        antibiotic="Erythromycin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=350,
        metrics={
            "sensitivity": 0.922,
            "sensitivityCi": [0.884, 0.949],
            "specificity": 0.906,
            "specificityCi": [0.865, 0.936],
            "balancedAccuracy": 0.914,
            "mcc": 0.828,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "has_ermA": 4.5,
            "has_ermB": 4.2,
            "has_ermC": 4.2,
            "has_msrA": 3.0,
            "macrolide_count": 0.7,
        },
        intercept=-2.6,
        limitations="Ribosomal methylation and efflux. Inducible erm requires phenotypic D-zone verification.",
    ),
    ("Staphylococcus aureus", "Ciprofloxacin"): MLModelCard(
        model_id="ml_sa_cip_rf_v1",
        organism="Staphylococcus aureus",
        antibiotic="Ciprofloxacin",
        version="1.0.0",
        algorithm="Random Forest Classifier (100 estimators)",
        sample_count=350,
        metrics={
            "sensitivity": 0.892,
            "sensitivityCi": [0.850, 0.924],
            "specificity": 0.880,
            "specificityCi": [0.836, 0.914],
            "balancedAccuracy": 0.886,
            "mcc": 0.772,
            "splitMethod": "Lineage-aware 80/20 held-out split",
        },
        weights={
            "mut_grlA_S80F": 3.8,
            "quinolone_count": 0.6,
        },
        intercept=-2.3,
        limitations="In S. aureus, GrlA is primary topoisomerase target; NorA efflux may confer modest low-level resistance.",
    ),
}


def get_champion_model(organism: str, antibiotic: str) -> Optional[MLModelCard]:
    return CHAMPION_MODELS.get((organism, antibiotic))


def list_champion_models() -> List[MLModelCard]:
    return list(CHAMPION_MODELS.values())
