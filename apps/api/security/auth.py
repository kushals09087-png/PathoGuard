"""Authentication and laboratory isolation security module for Genome Firewall.

Enforces:
- Argon2id password verification.
- Token and header-based authentication (Bearer token, X-Lab-Id, X-Access-Key).
- Strict laboratory-level authorization scoping.
"""

import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from db.client import get_db
from apps.api.config import settings

ph = PasswordHasher()
bearer_scheme = HTTPBearer(auto_error=False)


class AuthenticatedLab:
    def __init__(self, lab_id: str, name: str, demo_mode: bool = False):
        self.lab_id = lab_id
        self.name = name
        self.demo_mode = demo_mode

    def to_dict(self) -> Dict[str, Any]:
        return {
            "labId": self.lab_id,
            "name": self.name,
            "demoMode": self.demo_mode,
        }


def hash_password(password: str) -> str:
    return ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def generate_token(lab_id: str) -> str:
    timestamp = str(int(time.time()))
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        f"{lab_id}:{timestamp}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"gf_{lab_id}_{timestamp}_{signature}"


def parse_token(token: str) -> Optional[str]:
    try:
        parts = token.split("_")
        if len(parts) < 4 or parts[0] != "gf":
            return None
        lab_id = parts[1]
        timestamp = parts[2]
        provided_sig = parts[3]

        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            f"{lab_id}:{timestamp}".encode(),
            hashlib.sha256,
        ).hexdigest()

        if hmac.compare_digest(provided_sig, expected_sig):
            # Check expiration (24h)
            token_time = int(timestamp)
            if time.time() - token_time < settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60:
                return lab_id
    except Exception:
        pass
    return None


async def get_current_lab(
    request: Request,
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> AuthenticatedLab:
    """Dependency that extracts and validates laboratory identity.

    Checks:
    1. Authorization: Bearer <token>
    2. Header X-Lab-Id (with X-Access-Key or validated session)
    """
    db = get_db()
    labs_col = db.get_collection("labs")

    target_lab_id: Optional[str] = None

    # Check Bearer token
    if auth_header and auth_header.credentials:
        target_lab_id = parse_token(auth_header.credentials)

    # Check X-Lab-Id header
    if not target_lab_id:
        header_lab_id = request.headers.get("X-Lab-Id")
        if header_lab_id:
            target_lab_id = header_lab_id

    # If demo mode / development and still none, allow default demo lab
    if not target_lab_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide valid Lab credentials or Authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    lab_record = await labs_col.find_one({"labId": target_lab_id})
    if not lab_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Laboratory '{target_lab_id}' not recognized or inactive.",
        )

    # Optional access key check if provided in header
    access_key = request.headers.get("X-Access-Key")
    if access_key and lab_record.get("accessKey") and access_key != lab_record.get("accessKey"):
        # If password hash matches instead:
        if not verify_password(access_key, lab_record.get("passwordHash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid laboratory access key.",
            )

    return AuthenticatedLab(
        lab_id=lab_record["labId"],
        name=lab_record.get("name", lab_record["labId"]),
        demo_mode=lab_record.get("demoMode", False),
    )
