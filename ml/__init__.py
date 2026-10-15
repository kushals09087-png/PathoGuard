"""Machine learning package for Genome Firewall."""

from .inference.predictor import predict_pair_resistance, MLPredictionOutcome
from .hybrid import evaluate_hybrid_decision, HybridDecision
from .models.champion_models import get_champion_model, list_champion_models, MLModelCard
from .features.schema import extract_features, FEATURE_NAMES

__all__ = [
    "predict_pair_resistance",
    "MLPredictionOutcome",
    "evaluate_hybrid_decision",
    "HybridDecision",
    "get_champion_model",
    "list_champion_models",
    "MLModelCard",
    "extract_features",
    "FEATURE_NAMES",
]
