"""Health and readiness probes for Genome Firewall."""

from datetime import datetime, timezone
from fastapi import APIRouter
from db.client import get_db
from storage.manager import StorageManager
from apps.api.schemas.models import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health/live", response_model=HealthResponse)
async def liveness():
    return HealthResponse(
        status="UP",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        database="OK",
        storage="OK",
    )


@router.get("/health/ready", response_model=HealthResponse)
async def readiness():
    db = get_db()
    # Ping database
    labs_col = db.get_collection("labs")
    count = await labs_col.count_documents({})

    # Check storage directory
    storage = StorageManager()
    storage_ok = storage.base_dir.exists()

    db_status = "OK" if count >= 0 else "DEGRADED"
    storage_status = "OK" if storage_ok else "ERROR"

    return HealthResponse(
        status="READY" if (db_status == "OK" and storage_status == "OK") else "NOT_READY",
        timestamp=datetime.now(timezone.utc).isoformat(),
        version="1.0.0",
        database=f"{db_status} (mode: {'MongoDB' if db.is_connected_to_mongo else 'DurableJSON'})",
        storage=storage_status,
    )
