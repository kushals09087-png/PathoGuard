"""Methodology documentation route for Genome Firewall."""

from fastapi import APIRouter
from apps.api.config import settings

router = APIRouter(tags=["Methodology"])


@router.get("/methodology")
async def get_methodology():
    return {
        "title": "Genome Firewall Scientific Methodology & Validation Standards",
        "tagline": "Explainable resistance-evidence review.",
        "disclaimer": settings.DISCLAIMER,
        "principles": [
            {
                "id": "D-01",
                "name": "Deterministic Categorization over Probabilistic Prediction",
                "description": "Genome Firewall does NOT output per-isolate numeric probabilities of resistance. Results are classified into bounded evidence categories.",
            },
            {
                "id": "D-02",
                "name": "No Treatment Recommendations",
                "description": "The system never issues treatment recommendations or predicts clinical outcomes for individual patients.",
            },
            {
                "id": "D-03",
                "name": "Detection-Quality Capping",
                "description": "Loose or partial alignment hits are capped at RESISTANCE_EVIDENCE_WEAK or RESISTANCE_EVIDENCE_MODERATE and cannot produce strong resistance calls.",
            },
            {
                "id": "D-10",
                "name": "Absence of Evidence is Never Susceptibility",
                "description": "When no resistance markers are detected, the assessment is classified as INSUFFICIENT_EVIDENCE, never susceptible.",
            },
        ],
        "evidenceTiers": [
            {"tier": "A_CURATED_STRONG", "description": "Curated causative gene or point mutation with established high-level resistance."},
            {"tier": "B_CURATED_MODERATE", "description": "Documented resistance determinant with variable expression or near-breakpoint MIC."},
            {"tier": "C_INDIRECT", "description": "Efflux pump or regulatory element conferring minor baseline changes."},
            {"tier": "D_EXPLORATORY", "description": "Putative or uncurated sequence variant requiring experimental validation."},
            {"tier": "INSUFFICIENT", "description": "No recognized resistance mechanism found or alignment below quality threshold."},
        ],
        "qualityCriteria": {
            "maxContigs": 500,
            "maxAmbigFraction": 0.05,
            "minCoverage": 90.0,
            "minIdentity": 95.0,
        },
        "toolchain": {
            "detectionEngine": "NCBI AMRFinderPlus v3.12.8",
            "ruleEngine": "Genome Firewall SeedYamlProvider v1.0.0",
            "database": "NCBI Reference Gene Catalog 2024-05-02.1",
        },
    }
