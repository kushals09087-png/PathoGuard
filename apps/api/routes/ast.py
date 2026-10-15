"""AST entry and retrieval routes for Genome Firewall."""

import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from db.client import get_db
from engine import evaluate_discordance, AstCategory
from apps.api.schemas.models import CreateAstRequest, AstResponse
from apps.api.security import AuthenticatedLab, get_current_lab

router = APIRouter(prefix="/analyses", tags=["Antimicrobial Susceptibility Testing"])


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/{analysis_id}/ast", response_model=AstResponse, status_code=status.HTTP_201_CREATED)
async def create_ast_result(
    analysis_id: str,
    req: CreateAstRequest,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    if req.category.upper() not in ["S", "I", "R"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid AST category '{req.category}'. Must be 'S', 'I', or 'R'.",
        )

    db = get_db()
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    assessments_col = db.get_collection("antibiotic_assessments")
    ast_col = db.get_collection("ast_results")
    disc_col = db.get_collection("discordance_events")
    bm_col = db.get_collection("benchmark_results")

    # Authorize analysis
    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    sample = await samples_col.find_one({"sampleId": ana["sampleId"]})
    organism = sample.get("organism", "") if sample else ""

    ast_id = f"ast_{uuid.uuid4().hex[:12]}"
    created_at = get_utc_now()

    ast_doc = {
        "astId": ast_id,
        "analysisId": analysis_id,
        "sampleId": ana["sampleId"],
        "labId": current_lab.lab_id,
        "antibiotic": req.antibiotic,
        "category": req.category.upper(),
        "mic": req.mic,
        "micUnit": req.micUnit,
        "method": req.method,
        "standard": req.standard,
        "standardVersion": req.standardVersion,
        "testDate": req.testDate,
        "notes": req.notes,
        "createdAt": created_at,
    }

    # Upsert AST record for this (analysisId, antibiotic)
    await ast_col.update_one(
        {"analysisId": analysis_id, "antibiotic": req.antibiotic},
        {"$set": ast_doc},
        upsert=True,
    )

    # Re-evaluate discordance
    assessment = await assessments_col.find_one({
        "analysisId": analysis_id,
        "antibiotic": {"$regex": f"^{req.antibiotic}$", "$options": "i"},
    })

    if assessment:
        bm = await bm_col.find_one({"organism": organism, "antibiotic": req.antibiotic})
        disc_eval = evaluate_discordance(
            genomic_category=assessment["resultCategory"],
            ast_category=req.category.upper(),
            pair_benchmark=bm,
        )

        disc_id = f"dis_{analysis_id}_{req.antibiotic.lower().replace(' ', '_')}"
        if disc_eval.is_discordant:
            await disc_col.update_one(
                {"discordanceId": disc_id},
                {
                    "$set": {
                        "discordanceId": disc_id,
                        "analysisId": analysis_id,
                        "sampleId": ana["sampleId"],
                        "labId": current_lab.lab_id,
                        "antibiotic": req.antibiotic,
                        "discordanceType": str(disc_eval.discordance_type),
                        "genomicCategory": assessment["resultCategory"],
                        "astCategory": req.category.upper(),
                        "reviewStatus": "OPEN",
                        "priorityScore": disc_eval.priority_score,
                        "explanation": disc_eval.explanation,
                        "pairReliabilitySnapshot": bm,
                        "updatedAt": get_utc_now(),
                    },
                    "$setOnInsert": {
                        "createdAt": get_utc_now(),
                        "reviewNotes": None,
                        "reviewedBy": None,
                        "reviewedAt": None,
                    },
                },
                upsert=True,
            )
        else:
            # If no longer discordant, remove old open event if any
            await disc_col.delete_one({"analysisId": analysis_id, "antibiotic": req.antibiotic})

    return AstResponse(**ast_doc)


@router.get("/{analysis_id}/ast", response_model=List[AstResponse])
async def get_ast_results(
    analysis_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    analyses_col = db.get_collection("analyses")
    ast_col = db.get_collection("ast_results")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    records = await ast_col.find({"analysisId": analysis_id, "labId": current_lab.lab_id})
    return [AstResponse(**r) for r in records]
