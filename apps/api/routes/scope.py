"""Scope configuration routes."""

from fastapi import APIRouter
from apps.api.schemas.models import ScopeResponse

router = APIRouter(tags=["Scope"])

ORGANISM_ANTIBIOTICS = {
    "Escherichia coli": ["Ciprofloxacin", "Ceftriaxone", "Meropenem", "Gentamicin", "Tetracycline"],
    "Klebsiella pneumoniae": ["Ciprofloxacin", "Ceftriaxone", "Meropenem", "Gentamicin"],
    "Staphylococcus aureus": ["Cefoxitin", "Vancomycin", "Erythromycin", "Ciprofloxacin"],
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
