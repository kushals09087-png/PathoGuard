"""End-to-end integration and acceptance tests for Genome Firewall.

Validates the full user journey:
Lab ID login -> Upload genome -> Validate & QC -> Process analysis ->
Inspect evidence & assessments -> Enter AST -> Trigger & prioritize discordance ->
Review discordance disposition -> Generate persisted report -> Retrieve history.
"""

import pytest
import httpx
from httpx import ASGITransport
from apps.api.main import app
from apps.worker.main import AnalysisWorker


@pytest.mark.asyncio
async def test_full_e2e_user_journey():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login with Lab ID
        login_res = await client.post(
            "/api/v1/auth/login",
            json={"labId": "LAB-REF-AIIMS", "password": "DemoPassword123!"},
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        auth_data = login_res.json()
        token = auth_data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Create Sample Metadata
        sample_res = await client.post(
            "/api/v1/samples",
            json={
                "sampleLabel": "ECOLI-E2E-TEST",
                "organism": "Escherichia coli",
                "collectionDate": "2024-10-15",
                "source": "Blood culture",
            },
            headers=headers,
        )
        assert sample_res.status_code == 201
        sample_id = sample_res.json()["sampleId"]

        # 3. Upload Assembled FASTA
        fasta_content = (
            ">contig_01\n"
            + ("ACGT" * 500)
            + "\n>contig_02\n"
            + ("TGCA" * 500)
        )
        upload_res = await client.post(
            f"/api/v1/samples/{sample_id}/genome",
            files={"file": ("isolate.fasta", fasta_content.encode("utf-8"), "application/octet-stream")},
            headers=headers,
        )
        assert upload_res.status_code == 201
        file_id = upload_res.json()["fileId"]
        assert upload_res.json()["sha256"] is not None

        # 4. Enqueue Analysis
        analysis_res = await client.post(
            "/api/v1/analyses",
            json={"sampleId": sample_id, "fileId": file_id},
            headers=headers,
        )
        assert analysis_res.status_code == 201
        analysis_id = analysis_res.json()["analysisId"]

        # 5. Process through Worker
        worker = AnalysisWorker(worker_id="test_e2e_worker")
        processed = await worker.run_once()
        assert processed is True, "Worker should process the queued analysis"

        # 6. Retrieve Analysis Status
        status_res = await client.get(f"/api/v1/analyses/{analysis_id}", headers=headers)
        assert status_res.status_code == 200
        assert status_res.json()["status"] in ["COMPLETED", "COMPLETED_WITH_WARNINGS"]

        # 7. Inspect Results & Scientific Assertions
        results_res = await client.get(f"/api/v1/analyses/{analysis_id}/results", headers=headers)
        assert results_res.status_code == 200
        results_data = results_res.json()

        # Mandatory disclaimer check
        assert "For research and surveillance use only" in results_data["disclaimer"]

        # Assessments check: 5 antibiotics for E. coli
        assessments = {a["antibiotic"]: a for a in results_data["assessments"]}
        assert len(assessments) == 5
        assert "Ciprofloxacin" in assessments
        assert "Ceftriaxone" in assessments
        assert "Meropenem" in assessments

        # Ciprofloxacin has genomic resistance evidence (gyrA / parC)
        assert assessments["Ciprofloxacin"]["resultCategory"] == "RESISTANCE_EVIDENCE_STRONG"

        # Absence of ESBL marker is INSUFFICIENT_EVIDENCE (Decision D-10: NEVER SUSCEPTIBLE!)
        assert assessments["Ceftriaxone"]["resultCategory"] == "INSUFFICIENT_EVIDENCE"
        assert assessments["Ceftriaxone"]["resultCategory"] != "SUSCEPTIBLE"

        # 8. Record AST Result: Phenotypic Susceptible (Creating Signature Discordance)
        ast_res = await client.post(
            f"/api/v1/analyses/{analysis_id}/ast",
            json={
                "antibiotic": "Ciprofloxacin",
                "category": "S",
                "mic": 0.25,
                "micUnit": "mg/L",
                "method": "Broth Microdilution (BMD)",
                "standard": "CLSI M100-ED34",
                "notes": "Phenotypic AST tested in duplicate; clear zone / low MIC.",
            },
            headers=headers,
        )
        assert ast_res.status_code == 201

        # 9. Verify Discordance Event in Queue
        disc_queue_res = await client.get(
            f"/api/v1/discordances?analysisId={analysis_id}",
            headers=headers,
        )
        assert disc_queue_res.status_code == 200
        events = disc_queue_res.json()
        assert len(events) == 1
        event = events[0]
        assert event["discordanceType"] == "GENOMIC_RESISTANT_AST_SUSCEPTIBLE"
        assert event["priorityScore"] >= 85
        assert event["reviewStatus"] == "OPEN"
        discordance_id = event["discordanceId"]

        # 10. Review Discordance Disposition
        review_res = await client.patch(
            f"/api/v1/discordances/{discordance_id}/review",
            json={
                "reviewStatus": "REVIEWED_CONFIRMED",
                "reviewNotes": "Confirmed discordance. Repeat BMD scheduled; subpopulation heteroresistance suspected.",
            },
            headers=headers,
        )
        assert review_res.status_code == 200
        assert review_res.json()["reviewStatus"] == "REVIEWED_CONFIRMED"

        # 11. Generate Persisted Reports (JSON and HTML)
        report_json_res = await client.get(f"/api/v1/analyses/{analysis_id}/report", headers=headers)
        assert report_json_res.status_code == 200
        report_data = report_json_res.json()
        assert report_data["sample"]["sampleLabel"] == "ECOLI-E2E-TEST"
        assert len(report_data["assessments"]) == 5
        assert len(report_data["discordances"]) == 1

        report_html_res = await client.get(f"/api/v1/analyses/{analysis_id}/report?format=html", headers=headers)
        assert report_html_res.status_code == 200
        assert "text/html" in report_html_res.headers["content-type"]
        assert "ECOLI-E2E-TEST" in report_html_res.text
        assert "For research and surveillance use only" in report_html_res.text

        # 12. History Verification
        history_res = await client.get("/api/v1/analyses", headers=headers)
        assert history_res.status_code == 200
        history_list = history_res.json()
        target_summary = next((h for h in history_list if h["analysisId"] == analysis_id), None)
        assert target_summary is not None
        assert target_summary["sampleLabel"] == "ECOLI-E2E-TEST"
        assert target_summary["status"] in ["COMPLETED", "COMPLETED_WITH_WARNINGS"]
        assert target_summary["discordanceCount"] == 1
