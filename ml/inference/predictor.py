"""Machine Learning inference engine and per-isolate explainability for Genome Firewall.

Implements:
- Feature extraction and validation
- Calibrated score prediction
- Explicit abstention band handling (Section 11 of ML plan)
- Per-isolate feature contribution explainability (Section 10 of ML plan)
- Safe handling of unavailable models and missing features
"""

import math
from typing import Dict, Any, List, Optional
from engine.normalize import NormalizedFinding
from ml.features.schema import extract_features
from ml.models.champion_models import get_champion_model, MLModelCard


class MLPredictionOutcome:
    def __init__(
        self,
        available: bool,
        status: str,  # AVAILABLE, ABSTAINED, UNAVAILABLE
        abstained: bool,
        prediction: Optional[str],  # RESISTANT, NOT_RESISTANT, None
        score: Optional[float],
        band: str,  # HIGH_CONFIDENCE_RESISTANT, HIGH_CONFIDENCE_NOT_RESISTANT, UNCERTAIN_ABSTAINED, NOT_AVAILABLE
        model_id: Optional[str],
        model_version: Optional[str],
        top_features: List[Dict[str, Any]],
        explanation: str,
    ):
        self.available = available
        self.status = status
        self.abstained = abstained
        self.prediction = prediction
        self.score = score
        self.band = band
        self.model_id = model_id
        self.model_version = model_version
        self.top_features = top_features
        self.explanation = explanation

    def to_dict(self) -> Dict[str, Any]:
        return {
            "available": self.available,
            "status": self.status,
            "abstained": self.abstained,
            "prediction": self.prediction,
            "score": self.score,
            "band": self.band,
            "modelId": self.model_id,
            "modelVersion": self.model_version,
            "topFeatures": self.top_features,
            "explanation": self.explanation,
        }


def predict_pair_resistance(
    organism: str,
    antibiotic: str,
    findings: List[NormalizedFinding],
) -> MLPredictionOutcome:
    """Computes ML prediction, uncertainty abstention, and per-isolate feature attribution."""
    model = get_champion_model(organism, antibiotic)
    if not model:
        return MLPredictionOutcome(
            available=False,
            status="UNAVAILABLE",
            abstained=True,
            prediction=None,
            score=None,
            band="NOT_AVAILABLE",
            model_id=None,
            model_version=None,
            top_features=[],
            explanation=f"No trained ML model available for {organism} against {antibiotic}.",
        )

    # 1. Feature extraction
    features = extract_features(findings, organism, antibiotic)

    # 2. Score calculation via calibrated log-odds
    z = model.intercept
    feature_contributions: List[Dict[str, Any]] = []

    for feat_name, weight in model.weights.items():
        feat_val = features.get(feat_name, 0.0)
        contrib = feat_val * weight
        z += contrib
        if feat_val > 0.0 or abs(contrib) > 0.01:
            feature_contributions.append({
                "feature": feat_name,
                "value": feat_val,
                "weight": weight,
                "contribution": round(contrib, 3),
            })

    # Sort contributions by absolute magnitude descending
    feature_contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)

    # Sigmoid score
    prob = 1.0 / (1.0 + math.exp(-max(-15.0, min(15.0, z))))
    prob_rounded = round(prob, 3)

    # 3. Uncertainty and Abstention Handling (Section 11)
    if model.abstention_low <= prob <= model.abstention_high:
        return MLPredictionOutcome(
            available=True,
            status="ABSTAINED",
            abstained=True,
            prediction=None,
            score=prob_rounded,
            band="UNCERTAIN_ABSTAINED",
            model_id=model.model_id,
            model_version=model.version,
            top_features=feature_contributions[:5],
            explanation=(
                f"Model score ({prob_rounded:.2f}) falls within the calibrated uncertainty band "
                f"[{model.abstention_low:.2f}, {model.abstention_high:.2f}]. Model explicitly abstains to maintain high precision."
            ),
        )

    # 4. Decisive predictions
    if prob > model.abstention_high:
        prediction = "RESISTANT"
        band = "HIGH_CONFIDENCE_RESISTANT"
        top_driver = feature_contributions[0]["feature"] if feature_contributions else "genomic profile"
        explanation = f"Model predicts Resistance (score: {prob_rounded:.2f}), driven primarily by {top_driver}."
    else:
        prediction = "NOT_RESISTANT"
        band = "HIGH_CONFIDENCE_NOT_RESISTANT"
        explanation = f"Model predicts Not Resistant (score: {prob_rounded:.2f}); absence of dominant resistance determinants."

    return MLPredictionOutcome(
        available=True,
        status="AVAILABLE",
        abstained=False,
        prediction=prediction,
        score=prob_rounded,
        band=band,
        model_id=model.model_id,
        model_version=model.version,
        top_features=feature_contributions[:5],
        explanation=explanation,
    )
