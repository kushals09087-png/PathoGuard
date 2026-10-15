"""Demo datasets and offline showcase routes for Genome Firewall."""

import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from db.client import get_db
from apps.api.schemas.models import (
    DemoDatasetResponse,
    AnalysisStatusResponse,
)
from apps.api.security import AuthenticatedLab, get_current_lab

router = APIRouter(prefix="/demo-datasets", tags=["Demo Datasets"])


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[DemoDatasetResponse])
async def list_demo_datasets():
    """Lists pre-packaged demonstration datasets with clear provenance markers."""
    db = get_db()
    demo_col = db.get_collection("demo_datasets")
    datasets = await demo_col.find({})
    return [DemoDatasetResponse(**d) for d in datasets]


@router.post("/{dataset_id}/load", response_model=AnalysisStatusResponse)
async def load_demo_dataset(
    dataset_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    """Loads a reproducible demo dataset into the active laboratory's workspace."""
    db = get_db()
    demo_col = db.get_collection("demo_datasets")
    analyses_col = db.get_collection("analyses")
    samples_col = db.get_collection("samples")
    findings_col = db.get_collection("analysis_findings")
    assessments_col = db.get_collection("antibiotic_assessments")
    ast_col = db.get_collection("ast_results")
    disc_col = db.get_collection("discordance_events")

    demo = await demo_col.find_one({"datasetId": dataset_id})
    if not demo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo dataset '{dataset_id}' not found.",
        )

    # Find the template analysis
    src_analysis = await analyses_col.find_one({"analysisId": demo["analysisId"]})
    if not src_analysis:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Demo dataset source analysis record missing from seed database.",
        )

    # Check if this lab already loaded this demo dataset
    existing_lab_analysis = await analyses_col.find_one({
        "labId": current_lab.lab_id,
        "sampleId": f"smp_{current_lab.lab_id}_{dataset_id}",
    })
    if existing_lab_analysis:
        return AnalysisStatusResponse(
            analysisId=existing_lab_analysis["analysisId"],
            sampleId=existing_lab_analysis["sampleId"],
            status=existing_lab_analysis["status"],
            stage=existing_lab_analysis.get("stage"),
            origin=existing_lab_analysis.get("origin", demo["origin"]),
            createdAt=existing_lab_analysis["createdAt"],
            completedAt=existing_lab_analysis.get("completedAt"),
            qcSummary=existing_lab_analysis.get("qcSummary"),
        )

    # Clone into current lab's scope
    new_sample_id = f"smp_{current_lab.lab_id}_{dataset_id}"
    new_analysis_id = f"ana_{current_lab.lab_id}_{dataset_id}"
    created_at = get_utc_now()

    # 1. Sample
    await samples_col.insert_one({
        "sampleId": new_sample_id,
        "labId": current_lab.lab_id,
        "sampleLabel": demo["label"],
        "organism": demo["organism"],
        "collectionDate": "2024-09-15",
        "source": "Clinical Reference Isolate",
        "createdAt": created_at,
    })

    # 2. Analysis
    await analyses_col.insert_one({
        "analysisId": new_analysis_id,
        "labId": current_lab.lab_id,
        "sampleId": new_sample_id,
        "fileId": f"fil_{dataset_id}",
        "status": "COMPLETED",
        "stage": "COMPLETED",
        "origin": demo["origin"],
        "qcSummary": demo["qcMetrics"],
        "findingsCount": demo["findingsCount"],
        "versions": src_analysis.get("versions", {}),
        "createdAt": created_at,
        "completedAt": created_at,
    })

    # 3. Clone Findings
    src_findings = await findings_col.find({"analysisId": src_analysis["analysisId"]})
    for f in src_findings:
        new_f = dict(f)
        new_f["_id"] = str(uuid.uuid4())
        new_f["findingId"] = f"fnd_{new_analysis_id}_{f['findingId'].split('_')[-1]}"
        new_f["analysisId"] = new_analysis_id
        new_f["labId"] = current_lab.lab_id
        await findings_col.insert_one(new_f)

    # 4. Clone Assessments
    src_assessments = await assessments_col.find({"analysisId": src_analysis["analysisId"]})
    for a in src_assessments:
        new_a = dict(a)
        new_a["_id"] = str(uuid.uuid4())
        new_a["assessmentId"] = f"ass_{new_analysis_id}_{a['antibiotic'].lower().replace(' ', '_')}"
        new_a["analysisId"] = new_analysis_id
        new_a["labId"] = current_lab.lab_id
        await assessments_col.insert_one(new_a)

    # 5. Clone AST & Discordance if present
    src_ast = await ast_col.find({"analysisId": src_analysis["analysisId"]})
    for ast_rec in src_ast:
        new_ast = dict(ast_rec)
        new_ast["_id"] = str(uuid.uuid4())
        new_ast["astId"] = f"ast_{new_analysis_id}_{ast_rec['antibiotic'].lower()}"
        new_ast["analysisId"] = new_analysis_id
        new_ast["sampleId"] = new_sample_id
        new_ast["labId"] = current_lab.lab_id
        await ast_col.insert_one(new_ast)

    src_disc = await disc_col.find({"analysisId": src_analysis["analysisId"]})
    for d in src_disc:
        new_d = dict(d)
        new_d["_id"] = str(uuid.uuid4())
        new_d["discordanceId"] = f"dis_{new_analysis_id}_{d['antibiotic'].lower()}"
        new_d["analysisId"] = new_analysis_id
        new_d["sampleId"] = new_sample_id
        new_d["labId"] = current_lab.lab_id
        await disc_col.insert_one(new_d)

    return AnalysisStatusResponse(
        analysisId=new_analysis_id,
        sampleId=new_sample_id,
        status="COMPLETED",
        stage="COMPLETED",
        origin=demo["origin"],
        createdAt=created_at,
        completedAt=created_at,
        qcSummary=demo["qcMetrics"],
    )
