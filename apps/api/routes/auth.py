"""Authentication routes for Genome Firewall."""

from fastapi import APIRouter, Depends, HTTPException, status
from db.client import get_db
from apps.api.schemas.models import LoginRequest, LoginResponse, LabProfileResponse
from apps.api.security import (
    AuthenticatedLab,
    get_current_lab,
    verify_password,
    generate_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    db = get_db()
    labs_col = db.get_collection("labs")

    lab = await labs_col.find_one({"labId": req.labId})
    if not lab or not lab.get("isActive", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Lab ID or laboratory is inactive.",
        )

    # Validate credential (password or accessKey)
    cred = req.password or req.accessKey
    if cred:
        if lab.get("passwordHash"):
            if not verify_password(cred, lab["passwordHash"]):
                # Check plain access key fallback
                if cred != lab.get("accessKey"):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid laboratory credentials.",
                    )
        elif lab.get("accessKey") and cred != lab["accessKey"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid laboratory credentials.",
            )
    else:
        # If in demo mode and no credentials provided, allow login for demo labs only
        if not lab.get("demoMode", False):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credentials required for non-demo laboratory.",
            )

    token = generate_token(lab["labId"])
    return LoginResponse(
        token=token,
        lab=LabProfileResponse(
            labId=lab["labId"],
            name=lab.get("name", lab["labId"]),
            demoMode=lab.get("demoMode", False),
        ),
    )


@router.get("/me", response_model=LabProfileResponse)
async def get_profile(current_lab: AuthenticatedLab = Depends(get_current_lab)):
    return LabProfileResponse(
        labId=current_lab.lab_id,
        name=current_lab.name,
        demoMode=current_lab.demo_mode,
    )


@router.post("/logout")
async def logout(current_lab: AuthenticatedLab = Depends(get_current_lab)):
    return {"message": "Logged out successfully."}
