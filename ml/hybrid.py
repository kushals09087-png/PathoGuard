"""Hybrid decision logic module combining deterministic rules and machine learning.

Implements Section 12 of the approved Genome Firewall Machine Learning Layer plan:
Classifies the relationship between rule assessments and ML predictions without
allowing ML to silently overwrite auditable genomic interpretations.
"""

from typing import Dict, Any, Optional
from engine.contracts import ResultCategory
from ml.inference.predictor import MLPredictionOutcome


class HybridDecision:
    def __init__(
        self,
        hybrid_label: str,
        rule_category: str,
        ml_prediction: Optional[str],
        explanation: str,
        requires_review: bool = False,
    ):
        self.hybrid_label = hybrid_label
        self.rule_category = rule_category
        self.ml_prediction = ml_prediction
        self.explanation = explanation
        self.requires_review = requires_review

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hybridLabel": self.hybrid_label,
            "ruleCategory": self.rule_category,
            "mlPrediction": self.ml_prediction,
            "explanation": self.explanation,
            "requiresReview": self.requires_review,
        }


def evaluate_hybrid_decision(
    rule_category: ResultCategory,
    ml_outcome: MLPredictionOutcome,
) -> HybridDecision:
    """Evaluates the concordance or divergence between rule-based assessment and ML estimate."""
    rule_str = str(rule_category)

    if rule_category == ResultCategory.NOT_ASSESSABLE:
        return HybridDecision(
            hybrid_label="NOT_ASSESSABLE",
            rule_category=rule_str,
            ml_prediction=ml_outcome.prediction,
            explanation="Assembly failed quality control criteria. Neither rules nor ML can be reliably assessed.",
            requires_review=False,
        )

    if ml_outcome.abstained or not ml_outcome.available or not ml_outcome.prediction:
        return HybridDecision(
            hybrid_label="ML_ABSTAINED",
            rule_category=rule_str,
            ml_prediction=None,
            explanation="Machine learning model abstained or was unavailable for this pair. Rule interpretation is primary.",
            requires_review=False,
        )

    is_rule_resistant = rule_category in (
        ResultCategory.RESISTANCE_EVIDENCE_STRONG,
        ResultCategory.RESISTANCE_EVIDENCE_MODERATE,
    )

    if is_rule_resistant and ml_outcome.prediction == "RESISTANT":
        return HybridDecision(
            hybrid_label="CONCORDANT_RESISTANT",
            rule_category=rule_str,
            ml_prediction="RESISTANT",
            explanation="Independent concordance: Both the curated rule engine and the trained statistical model indicate resistance.",
            requires_review=False,
        )

    if not is_rule_resistant and ml_outcome.prediction == "NOT_RESISTANT":
        return HybridDecision(
            hybrid_label="CONCORDANT_NO_EVIDENCE",
            rule_category=rule_str,
            ml_prediction="NOT_RESISTANT",
            explanation="Consistent absence of evidence. Note: Lack of detected determinants is not clinical proof of susceptibility.",
            requires_review=False,
        )

    if is_rule_resistant and ml_outcome.prediction == "NOT_RESISTANT":
        return HybridDecision(
            hybrid_label="RULE_ONLY_RESISTANT",
            rule_category=rule_str,
            ml_prediction="NOT_RESISTANT",
            explanation="Disagreement: Curated rule engine detected resistance determinants, but the ML model predicted Not Resistant. Human review recommended.",
            requires_review=True,
        )

    if not is_rule_resistant and ml_outcome.prediction == "RESISTANT":
        return HybridDecision(
            hybrid_label="ML_ONLY_RESISTANT",
            rule_category=rule_str,
            ml_prediction="RESISTANT",
            explanation="Disagreement: ML model detected resistance signal while no curated rule matched. Indicates possible uncharacterized mechanism or indirect efflux.",
            requires_review=True,
        )

    return HybridDecision(
        hybrid_label="UNCERTAIN_COMPARISON",
        rule_category=rule_str,
        ml_prediction=ml_outcome.prediction,
        explanation="Comparison between rules and ML is indeterminate.",
        requires_review=True,
    )
