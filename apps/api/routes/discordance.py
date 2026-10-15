"""Discordance review queue routes for Genome Firewall."""

from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from db.client import get_db
from apps.api.schemas.models import (
    DiscordanceEventResponse,
    ReviewDiscordanceRequest,
)
from apps.api.security import AuthenticatedLab, get_current_lab

router = APIRouter(prefix="/discordances", tags=["Discordance Review"])


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=List[DiscordanceEventResponse])
async def list_discordance_events(
    current_lab: AuthenticatedLab = Depends(get_current_lab),
    review_status: Optional[str] = Query(None, alias="reviewStatus"),
    antibiotic: Optional[str] = None,
    analysis_id: Optional[str] = Query(None, alias="analysisId"),
):
    db = get_db()
    disc_col = db.get_collection("discordance_events")

    query = {"labId": current_lab.lab_id}
    if review_status:
        query["reviewStatus"] = review_status
    if antibiotic:
        query["antibiotic"] = antibiotic
    if analysis_id:
        query["analysisId"] = analysis_id

    events = await disc_col.find(
        query=query,
        sort=[("priorityScore", -1), ("createdAt", -1)],
    )

    return [DiscordanceEventResponse(**e) for e in events]


@router.get("/{discordance_id}", response_model=DiscordanceEventResponse)
async def get_discordance_event(
    discordance_id: str,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    db = get_db()
    disc_col = db.get_collection("discordance_events")

    event = await disc_col.find_one({"discordanceId": discordance_id, "labId": current_lab.lab_id})
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Discordance event '{discordance_id}' not found in laboratory scope.",
        )

    return DiscordanceEventResponse(**event)


@router.patch("/{discordance_id}/review", response_model=DiscordanceEventResponse)
async def review_discordance_event(
    discordance_id: str,
    req: ReviewDiscordanceRequest,
    current_lab: AuthenticatedLab = Depends(get_current_lab),
):
    allowed_statuses = ["OPEN", "REVIEWED_CONFIRMED", "REVIEWED_DISMISSED"]
    if req.reviewStatus not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review status '{req.reviewStatus}'. Must be one of: {', '.join(allowed_statuses)}",
        )

    db = get_db()
    disc_col = db.get_collection("discordance_events")
    audit_col = db.get_collection("audit_events")

    event = await disc_col.find_one({"discordanceId": discordance_id, "labId": current_lab.lab_id})
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Discordance event '{discordance_id}' not found in laboratory scope.",
        )

    now_str = get_utc_now()
    updates = {
        "reviewStatus": req.reviewStatus,
        "reviewNotes": req.reviewNotes,
        "reviewedBy": current_lab.lab_id,
        "reviewedAt": now_str,
        "updatedAt": now_str,
    }

    await disc_col.update_one({"discordanceId": discordance_id}, {"$set": updates})

    # Record audit event
    await audit_col.insert_one({
        "eventId": f"aud_{discordance_id}_{int(datetime.now().timestamp())}",
        "labId": current_lab.lab_id,
        "action": "DISCORDANCE_REVIEW_UPDATED",
        "resourceType": "discordance_event",
        "resourceId": discordance_id,
        "details": {
            "previousStatus": event.get("reviewStatus"),
            "newStatus": req.reviewStatus,
            "notes": req.reviewNotes,
        },
        "timestamp": now_str,
    })

    updated_event = await disc_col.find_one({"discordanceId": discordance_id})
    return DiscordanceEventResponse(**updated_event)
