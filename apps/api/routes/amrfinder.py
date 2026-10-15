"""NCBI AMRFinderPlus status and administrative routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from engine.amrfinder_runner import AMRFinderRunner
from apps.api.schemas.models import AMRFinderStatusResponse, AdminUpdateResponse
from apps.api.security import AuthenticatedLab, get_current_lab
from db.client import get_db
from datetime import datetime, timezone

router = APIRouter(tags=["AMRFinderPlus Server Integration"])
runner = AMRFinderRunner()


@router.get("/amrfinder/status", response_model=AMRFinderStatusResponse)
async def get_amrfinder_status():
    """Returns actual runtime availability of AMRFinderPlus binary and installed database version."""
    status_dict = runner.get_tool_status()
    return AMRFinderStatusResponse(**status_dict)


@router.post("/admin/amrfinder/update", response_model=AdminUpdateResponse)
async def trigger_database_update(
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    """Explicit administrative database update. Does not run automatically on analysis requests."""
    db = get_db()
    audit_col = db.get_collection("audit_events")

    res = runner.run_admin_update(timeout=300)

    # Log audit trail
    await audit_col.insert_one({
        "eventId": f"aud_amr_update_{int(datetime.now().timestamp())}",
        "labId": current_lab.lab_id,
        "action": "AMRFINDER_DATABASE_UPDATE_EXECUTED",
        "resourceType": "amrfinder_database",
        "resourceId": "ncbi_amrfinder_db",
        "details": {"success": res["success"], "returncode": res.get("returncode")},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    if not res["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AMRFinder database update failed: {res.get('error')}",
        )

    return AdminUpdateResponse(**res)
