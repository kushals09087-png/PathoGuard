"""Scope configuration routes."""

from fastapi import APIRouter
from apps.api.schemas.models import ScopeResponse

router = APIRouter(tags=["Scope"])

from engine.clinical_profiles import CLINICAL_PANELS

ORGANISM_ANTIBIOTICS = {
    org: [item["antibiotic"] for item in panel]
    for org, panel in CLINICAL_PANELS.items()
}


@router.get("/scope", response_model=ScopeResponse)
async def get_scope():
    organisms = list(ORGANISM_ANTIBIOTICS.keys())
    all_abx = sorted(list(set(abx for sublist in ORGANISM_ANTIBIOTICS.values() for abx in sublist)))
    return ScopeResponse(
        organisms=organisms,
        antibiotics=all_abx,
        pairs=ORGANISM_ANTIBIOTICS,
    )
