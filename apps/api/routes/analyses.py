"""Analysis lifecycle, status, results, and history routes."""

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status

from db.client import get_db
from engine.contracts import AnalysisStatus
from apps.api.schemas.models import (
    CreateAnalysisRequest,
    AnalysisStatusResponse,
    AnalysisSummaryResponse,
    AnalysisResultsResponse,
    EvidenceResponse,
    FindingModel,
    AssessmentModel,
)
from apps.api.security import AuthenticatedLab, get_current_lab
from apps.api.config import settings
from apps.worker.main import AnalysisWorker

router = APIRouter(prefix="/analyses", tags=["Analyses"])


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("", response_model=AnalysisStatusResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    req: CreateAnalysisRequest,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    samples_col = db.get_collection("samples")
    files_col = db.get_collection("genome_files")
    analyses_col = db.get_collection("analyses")

    # Authorize sample and file
    sample = await samples_col.find_one({"sampleId": req.sampleId, "labId": current_lab.lab_id})
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{req.sampleId}' not found in laboratory scope.",
        )

    file_doc = await files_col.find_one({"fileId": req.fileId, "labId": current_lab.lab_id})
    if not file_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Genome file '{req.fileId}' not found in laboratory scope.",
        )

    # Idempotency check
    if req.idempotencyKey:
        existing = await analyses_col.find_one({
            "labId": current_lab.lab_id,
            "idempotencyKey": req.idempotencyKey,
        })
        if existing:
            return AnalysisStatusResponse(
                analysisId=existing["analysisId"],
                sampleId=existing["sampleId"],
                status=existing["status"],
                stage=existing.get("stage"),
                origin=existing.get("origin", "REAL_ANALYSIS"),
                createdAt=existing["createdAt"],
                completedAt=existing.get("completedAt"),
                errorCode=existing.get("errorCode"),
                errorMessage=existing.get("errorMessage"),
                qcSummary=existing.get("qcSummary"),
            )

    analysis_id = f"ana_{uuid.uuid4().hex[:12]}"
    created_at = get_utc_now()

    analysis_doc = {
        "analysisId": analysis_id,
        "labId": current_lab.lab_id,
        "sampleId": req.sampleId,
        "fileId": req.fileId,
        "status": AnalysisStatus.QUEUED,
        "stage": "QUEUED",
        "origin": "REAL_ANALYSIS",
        "idempotencyKey": req.idempotencyKey,
        "attemptCount": 0,
        "createdAt": created_at,
        "completedAt": None,
    }

    await analyses_col.insert_one(analysis_doc)

    # Trigger background worker execution asynchronously if configured
    if settings.INLINE_WORKER:
        asyncio.create_task(AnalysisWorker(worker_id="api_inline_worker").run_once())

    return AnalysisStatusResponse(
        analysisId=analysis_id,
        sampleId=req.sampleId,
        status=AnalysisStatus.QUEUED,
        stage="QUEUED",
        origin="REAL_ANALYSIS",
        createdAt=created_at,
    )


@router.get("", response_model=List[AnalysisSummaryResponse])
async def list_analyses(
    current_lab: AuthenticatedLab = Depends(get_current_lab),
    status_filter: Optional[str] = Query(None, alias="status"),
    organism: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """Lab-scoped analysis history listing."""
    db = get_db()
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    disc_col = db.get_collection("discordance_events")

    query = {"labId": current_lab.lab_id}
    if status_filter:
        query["status"] = status_filter

    analyses = await analyses_col.find(
        query=query,
        sort=[("createdAt", -1)],
        skip=offset,
        limit=limit,
    )

    summaries: List[AnalysisSummaryResponse] = []
    for ana in analyses:
        sample = await samples_col.find_one({"sampleId": ana["sampleId"]})
        sample_label = sample.get("sampleLabel", "Unknown") if sample else "Unknown"
        sample_organism = sample.get("organism", "Unknown") if sample else "Unknown"

        # Apply search or organism filter
        if organism and sample_organism.lower() != organism.lower():
            continue
        if search and search.lower() not in sample_label.lower() and search.lower() not in ana["analysisId"].lower():
            continue

        disc_count = await disc_col.count_documents({"analysisId": ana["analysisId"]})

        summaries.append(
            AnalysisSummaryResponse(
                analysisId=ana["analysisId"],
                sampleId=ana["sampleId"],
                sampleLabel=sample_label,
                organism=sample_organism,
                status=ana["status"],
                stage=ana.get("stage"),
                origin=ana.get("origin", "REAL_ANALYSIS"),
                findingsCount=ana.get("findingsCount", 0),
                discordanceCount=disc_count,
                createdAt=ana.get("createdAt") or ana.get("created_at") or get_utc_now(),
                completedAt=ana.get("completedAt") or ana.get("completed_at"),
            )
        )

    return summaries


@router.get("/{analysis_id}", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    analysis_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    analyses_col = db.get_collection("analyses")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    return AnalysisStatusResponse(
        analysisId=ana["analysisId"],
        sampleId=ana["sampleId"],
        status=ana["status"],
        stage=ana.get("stage"),
        origin=ana.get("origin", "REAL_ANALYSIS"),
        createdAt=ana.get("createdAt") or ana.get("created_at") or get_utc_now(),
        completedAt=ana.get("completedAt") or ana.get("completed_at"),
        errorCode=ana.get("errorCode"),
        errorMessage=ana.get("errorMessage"),
        qcSummary=ana.get("qcSummary"),
    )


@router.get("/{analysis_id}/results", response_model=AnalysisResultsResponse)
async def get_analysis_results(
    analysis_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    findings_col = db.get_collection("analysis_findings")
    assessments_col = db.get_collection("antibiotic_assessments")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    sample = await samples_col.find_one({"sampleId": ana["sampleId"]})
    sample_label = sample.get("sampleLabel", "Unknown") if sample else "Unknown"
    organism = sample.get("organism", "Unknown") if sample else "Unknown"

    raw_findings = await findings_col.find({"analysisId": analysis_id})
    raw_assessments = await assessments_col.find({"analysisId": analysis_id})

    findings = [FindingModel(**f) for f in raw_findings]
    assessments = [AssessmentModel(**a) for a in raw_assessments]

    return AnalysisResultsResponse(
        analysisId=ana["analysisId"],
        sampleId=ana["sampleId"],
        sampleLabel=sample_label,
        organism=organism,
        status=ana["status"],
        origin=ana.get("origin", "REAL_ANALYSIS"),
        qcSummary=ana.get("qcSummary"),
        findings=findings,
        assessments=assessments,
        versions=ana.get("versions"),
        disclaimer=settings.DISCLAIMER,
    )


@router.get("/{analysis_id}/evidence", response_model=EvidenceResponse)
async def get_analysis_evidence(
    analysis_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    analyses_col = db.get_collection("analyses")
    findings_col = db.get_collection("analysis_findings")
    links_col = db.get_collection("evidence_links")

    ana = await analyses_col.find_one({"analysisId": analysis_id, "labId": current_lab.lab_id})
    if not ana:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    raw_findings = await findings_col.find({"analysisId": analysis_id})
    raw_links = await links_col.find({"analysisId": analysis_id})

    findings = [FindingModel(**f) for f in raw_findings]

    return EvidenceResponse(
        analysisId=analysis_id,
        findings=findings,
        links=raw_links,
    )


@router.get("/{analysis_id}/report")
async def get_analysis_report(
    analysis_id: str,
    format: str = Query("json", pattern="^(json|html)$"),
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    from report.generator import build_report_data, render_html_report
    from fastapi.responses import HTMLResponse

    data = await build_report_data(analysis_id, current_lab.lab_id)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis '{analysis_id}' not found in laboratory scope.",
        )

    if format == "html":
        return HTMLResponse(content=render_html_report(data))
    return data

