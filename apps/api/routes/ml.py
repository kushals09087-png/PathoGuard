"""Machine Learning model cards, registry, and analysis prediction routes."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from db.client import get_db
from ml.models.champion_models import list_champion_models, get_champion_model
from apps.api.schemas.models import (
    ModelCardResponse,
    MLPredictionResponse,
)
from apps.api.security import AuthenticatedLab, get_current_lab

router = APIRouter(tags=["Machine Learning Layer"])


@router.get("/models", response_model=List[ModelCardResponse])
async def list_models():
    """Returns champion ML model cards and lineage-aware validation metrics."""
    models = list_champion_models()
    return [ModelCardResponse(**m.to_dict()) for m in models]


@router.get("/models/{model_id}", response_model=ModelCardResponse)
async def get_model(model_id: str):
    """Retrieves specific model card and feature configuration."""
    for m in list_champion_models():
        if m.model_id == model_id:
            return ModelCardResponse(**m.to_dict())

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Model '{model_id}' not found in registry.",
    )


@router.get("/analyses/{analysis_id}/ml", response_model=List[MLPredictionResponse])
async def get_analysis_ml_predictions(
    analysis_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    """Returns ML predictions, confidence bands, feature attributions, and hybrid labels."""
    db = get_db()
    analyses_col = db.get_collection("analyses")
    ml_col = db.get_collection("ml_predictions")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    preds = await ml_col.find({"analysisId": analysis_id})
    return [MLPredictionResponse(**p) for p in preds]
