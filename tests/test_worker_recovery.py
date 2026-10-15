"""Worker recovery, lease expiration, and failure resiliency tests."""

import pytest
from datetime import datetime, timezone, timedelta
from db.client import get_db
from apps.worker.lease_manager import LeaseManager
from apps.worker.main import AnalysisWorker
from storage.manager import StorageManager
from engine.contracts import AnalysisStatus


@pytest.mark.asyncio
async def test_worker_sweeper_requeues_stale_job():
    db = get_db()
    analyses_col = db.get_collection("analyses")
    lease_mgr = LeaseManager(worker_id="recovery_test_worker", lease_seconds=120, max_attempts=3)

    # Insert a stale running job with heartbeat 200s ago
    analysis_id = "ana_stale_job_01"
    stale_time = (datetime.now(timezone.utc) - timedelta(seconds=200)).isoformat()
    await analyses_col.update_one(
        {"analysisId": analysis_id},
        {
            "$set": {
                "analysisId": analysis_id,
                "labId": "LAB-REF-AIIMS",
                "sampleId": "smp_test",
                "fileId": "fil_test",
                "status": AnalysisStatus.ANALYZING,
                "stage": "ANALYZING",
                "lockedBy": "dead_worker",
                "heartbeatAt": stale_time,
                "attemptCount": 1,
            }
        },
        upsert=True,
    )

    # Run sweeper
    recovered = await lease_mgr.sweep_expired_leases()
    assert recovered >= 1

    # Check job is now QUEUED and unlocked
    job = await analyses_col.find_one({"analysisId": analysis_id})
    assert job["status"] == AnalysisStatus.QUEUED
    assert job["lockedBy"] is None


@pytest.mark.asyncio
async def test_worker_sweeper_fails_job_after_max_attempts():
    db = get_db()
    analyses_col = db.get_collection("analyses")
    lease_mgr = LeaseManager(worker_id="recovery_test_worker", lease_seconds=120, max_attempts=3)

    # Insert a stale running job with attemptCount = 3
    analysis_id = "ana_max_attempts_job"
    stale_time = (datetime.now(timezone.utc) - timedelta(seconds=200)).isoformat()
    await analyses_col.update_one(
        {"analysisId": analysis_id},
        {
            "$set": {
                "analysisId": analysis_id,
                "labId": "LAB-REF-AIIMS",
                "sampleId": "smp_test",
                "fileId": "fil_test",
                "status": AnalysisStatus.ANALYZING,
                "stage": "ANALYZING",
                "lockedBy": "dead_worker",
                "heartbeatAt": stale_time,
                "attemptCount": 3,
            }
        },
        upsert=True,
    )

    recovered = await lease_mgr.sweep_expired_leases()
    assert recovered >= 1

    job = await analyses_col.find_one({"analysisId": analysis_id})
    assert job["status"] == AnalysisStatus.FAILED
    assert job["errorCode"] == "LEASE_EXPIRED_MAX_RETRIES"


@pytest.mark.asyncio
async def test_worker_detects_tampered_file(tmp_path):
    db = get_db()
    storage = StorageManager(base_dir=str(tmp_path))
    worker = AnalysisWorker(worker_id="tamper_test_worker")
    worker.storage = storage

    sample_id = "smp_tamper_test"
    file_id = "fil_tamper_test"
    analysis_id = "ana_tamper_test"

    await db.get_collection("samples").update_one(
        {"sampleId": sample_id},
        {"$set": {"sampleId": sample_id, "labId": "LAB-REF-AIIMS", "organism": "Escherichia coli", "sampleLabel": "TAMPER-TEST"}},
        upsert=True,
    )

    # Save initial file
    key, sha256_hex, size = storage.save_bytes(b">contig1\nACGTACGT", "LAB-REF-AIIMS", sample_id, "test.fasta")
    await db.get_collection("genome_files").update_one(
        {"fileId": file_id},
        {"$set": {"fileId": file_id, "sampleId": sample_id, "labId": "LAB-REF-AIIMS", "storageKey": key, "sha256": sha256_hex, "fileSize": size}},
        upsert=True,
    )

    # Tamper with file on disk
    file_path = storage.get_absolute_path(key)
    with open(file_path, "wb") as f:
        f.write(b">contig1\nMALICIOUS_PAYLOAD")

    # Enqueue analysis
    await db.get_collection("analyses").update_one(
        {"analysisId": analysis_id},
        {"$set": {"analysisId": analysis_id, "labId": "LAB-REF-AIIMS", "sampleId": sample_id, "fileId": file_id, "status": AnalysisStatus.QUEUED, "attemptCount": 0, "createdAt": "2024-10-15T00:00:00Z"}},
        upsert=True,
    )

    # Run worker
    processed = await worker.run_once()
    assert processed is True

    # Confirm job failed with FILE_TAMPERED
    job = await db.get_collection("analyses").find_one({"analysisId": analysis_id})
    assert job["status"] == AnalysisStatus.FAILED
    assert job["errorCode"] == "FILE_TAMPERED"
