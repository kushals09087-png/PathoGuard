"""Samples and genome upload routes for Genome Firewall."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from db.client import get_db
from storage.manager import StorageManager
from apps.api.schemas.models import (
    CreateSampleRequest,
    SampleResponse,
    GenomeUploadResponse,
)
from apps.api.security import AuthenticatedLab, get_current_lab
from apps.api.config import settings

router = APIRouter(prefix="/samples", tags=["Samples & Upload"])
storage_mgr = StorageManager(base_dir=settings.STORAGE_DIR)

SUPPORTED_ORGANISMS = [
    "Escherichia coli",
    "Klebsiella pneumoniae",
    "Staphylococcus aureus",
]

ALLOWED_EXTENSIONS = [".fa", ".fasta", ".fna", ".gz"]


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("", response_model=SampleResponse, status_code=status.HTTP_201_CREATED)
async def create_sample(
    req: CreateSampleRequest,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    if req.organism not in SUPPORTED_ORGANISMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported organism '{req.organism}'. Must be one of: {', '.join(SUPPORTED_ORGANISMS)}",
        )

    db = get_db()
    samples_col = db.get_collection("samples")

    sample_id = f"smp_{uuid.uuid4().hex[:12]}"
    created_at = get_utc_now()

    doc = {
        "sampleId": sample_id,
        "labId": current_lab.lab_id,
        "sampleLabel": req.sampleLabel.strip(),
        "organism": req.organism,
        "collectionDate": req.collectionDate,
        "source": req.source,
        "createdAt": created_at,
    }

    await samples_col.insert_one(doc)
    return SampleResponse(**doc)


@router.post("/{sample_id}/genome", response_model=GenomeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_genome(
    sample_id: str,
    file: UploadFile = File(...),
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    samples_col = db.get_collection("samples")
    files_col = db.get_collection("genome_files")

    # Authorize sample ownership
    sample = await samples_col.find_one({"sampleId": sample_id, "labId": current_lab.lab_id})
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sample '{sample_id}' not found in current laboratory scope.",
        )

    # Check filename extension
    filename = file.filename or "unknown.fasta"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Invalid file extension '{ext}'. Only .fasta, .fa, .fna, and .gz are supported.",
        )

    try:
        storage_key, sha256_hex, file_size = await storage_mgr.save_stream(
            stream=file,
            lab_id=current_lab.lab_id,
            sample_id=sample_id,
            original_filename=filename,
            max_bytes=settings.MAX_UPLOAD_BYTES,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload failed: {str(e)}")

    file_id = f"fil_{uuid.uuid4().hex[:12]}"
    created_at = get_utc_now()

    file_doc = {
        "fileId": file_id,
        "sampleId": sample_id,
        "labId": current_lab.lab_id,
        "filename": filename,
        "fileSize": file_size,
        "sha256": sha256_hex,
        "storageKey": storage_key,
        "validationStatus": "PENDING",
        "createdAt": created_at,
    }

    await files_col.insert_one(file_doc)

    return GenomeUploadResponse(
        fileId=file_id,
        sampleId=sample_id,
        filename=filename,
        fileSize=file_size,
        sha256=sha256_hex,
        validationStatus="PENDING",
        createdAt=created_at,
    )
