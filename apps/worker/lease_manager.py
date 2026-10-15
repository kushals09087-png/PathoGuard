"""Worker lease and lifecycle manager for Genome Firewall.

Enforces:
- Atomic job claims using find_one_and_update.
- Heartbeats during execution.
- Sweeper recovery for expired leases (>120s) with retry limits.
- Idempotency and safe terminal failure recording.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from db.client import get_db
from engine.contracts import AnalysisStatus


def get_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class LeaseManager:
    def __init__(self, worker_id: str, lease_seconds: int = 120, max_attempts: int = 3):
        self.worker_id = worker_id
        self.lease_seconds = lease_seconds
        self.max_attempts = max_attempts
        self.db = get_db()

    async def sweep_expired_leases(self) -> int:
        """Finds running jobs whose heartbeats expired and either requeues or fails them."""
        analyses_col = self.db.get_collection("analyses")
        now = datetime.now(timezone.utc)
        threshold_dt = now - timedelta(seconds=self.lease_seconds)
        threshold_str = threshold_dt.isoformat()

        # Find running jobs with stale heartbeat
        query = {
            "status": {"$in": [AnalysisStatus.VALIDATING, AnalysisStatus.ANALYZING, AnalysisStatus.INTERPRETING, "RUNNING"]},
            "heartbeatAt": {"$lt": threshold_str},
        }
        stale_jobs = await analyses_col.find(query)
        recovered_count = 0

        for job in stale_jobs:
            analysis_id = job["analysisId"]
            attempts = job.get("attemptCount", 1)
            if attempts >= self.max_attempts:
                # Terminal failure
                await analyses_col.update_one(
                    {"analysisId": analysis_id},
                    {
                        "$set": {
                            "status": AnalysisStatus.FAILED,
                            "stage": "FAILED",
                            "errorCode": "LEASE_EXPIRED_MAX_RETRIES",
                            "errorMessage": f"Analysis timed out and exceeded {self.max_attempts} retry attempts.",
                            "completedAt": get_utc_now(),
                        }
                    },
                )
            else:
                # Requeue for another attempt
                await analyses_col.update_one(
                    {"analysisId": analysis_id},
                    {
                        "$set": {
                            "status": AnalysisStatus.QUEUED,
                            "stage": "QUEUED",
                            "lockedBy": None,
                            "lockedAt": None,
                            "heartbeatAt": None,
                        }
                    },
                )
            recovered_count += 1

        return recovered_count

    async def claim_next_job(self) -> Optional[Dict[str, Any]]:
        """Atomically claims the next QUEUED analysis job in FIFO order."""
        analyses_col = self.db.get_collection("analyses")
        now_str = get_utc_now()

        claimed = await analyses_col.find_one_and_update(
            query={"status": AnalysisStatus.QUEUED},
            update={
                "$set": {
                    "status": AnalysisStatus.VALIDATING,
                    "stage": "VALIDATING",
                    "lockedBy": self.worker_id,
                    "lockedAt": now_str,
                    "heartbeatAt": now_str,
                },
                "$inc": {"attemptCount": 1},
            },
            sort=[("createdAt", 1)],
        )
        return claimed

    async def update_heartbeat(self, analysis_id: str, stage: str):
        analyses_col = self.db.get_collection("analyses")
        now_str = get_utc_now()
        await analyses_col.update_one(
            {"analysisId": analysis_id, "lockedBy": self.worker_id},
            {"$set": {"heartbeatAt": now_str, "stage": stage}},
        )

    async def complete_job(self, analysis_id: str, updates: Dict[str, Any]):
        analyses_col = self.db.get_collection("analyses")
        now_str = get_utc_now()
        doc_updates = {
            "status": AnalysisStatus.COMPLETED,
            "stage": "COMPLETED",
            "completedAt": now_str,
            "lockedBy": None,
            **updates,
        }
        await analyses_col.update_one({"analysisId": analysis_id}, {"$set": doc_updates})

    async def fail_job(self, analysis_id: str, error_code: str, error_message: str):
        analyses_col = self.db.get_collection("analyses")
        now_str = get_utc_now()
        await analyses_col.update_one(
            {"analysisId": analysis_id},
            {
                "$set": {
                    "status": AnalysisStatus.FAILED,
                    "stage": "FAILED",
                    "errorCode": error_code,
                    "errorMessage": error_message,
                    "completedAt": now_str,
                    "lockedBy": None,
                }
            },
        )
