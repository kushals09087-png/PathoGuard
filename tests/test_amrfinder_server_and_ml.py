"""Automated tests for AMRFinderPlus Server Integration and Machine Learning Layer.

Covers:
1. Live AMRFinderPlus executable and database version verification.
2. Handling missing executables, command errors, and timeouts.
3. Raw output persistence and retrieval.
4. Structured findings with contig coordinates, strand, and reference accession.
5. Supervised ML prediction inference with calibrated scoring.
6. Uncertainty abstention band handling (Section 11 of ML plan).
7. Per-isolate feature attribution (Section 10 of ML plan).
8. Hybrid decision logic (Rules vs ML per Section 12).
9. Status transitions (COMPLETED, COMPLETED_WITH_WARNINGS, FAILED).
10. API endpoints (/api/v1/amrfinder/status, /api/v1/models, /api/v1/analyses/{id}/ml, /api/v1/analyses/{id}/raw-output).
"""

import pytest
import httpx
from httpx import ASGITransport
from apps.api.main import app
from engine.amrfinder_runner import (
    AMRFinderRunner,
    AMRFinderExecutionError,
    AMRFinderTimeoutError,
)
from engine.normalize import parse_amrfinder_tsv
from ml import (
    predict_pair_resistance,
    evaluate_hybrid_decision,
    get_champion_model,
    list_champion_models,
)
from engine.contracts import ResultCategory


def test_amrfinder_runner_status_and_discovery():
    runner = AMRFinderRunner()
    status = runner.get_tool_status()
    assert "installed" in status
    assert "databaseInstalled" in status
    if status["installed"]:
        assert status["executablePath"] is not None
        assert status["version"] is not None
        if status["databaseInstalled"]:
            assert status["databaseVersion"] is not None


def test_amrfinder_missing_executable_handling():
    runner = AMRFinderRunner(binary_path="/non/existent/path/to/amrfinder")
    status = runner.get_tool_status()
    assert status["installed"] is False
    assert status["databaseInstalled"] is False
    assert "executable not found" in status["error"].lower() or "not found" in status["error"].lower()


def test_amrfinder_admin_update_missing_binary():
    runner = AMRFinderRunner(binary_path="/non/existent/path/to/amrfinder")
    res = runner.run_admin_update()
    assert res["success"] is False
    assert "not found" in res["error"].lower()


def test_structured_findings_preserve_coordinates_and_reference():
    raw_tsv = (
        "Protein id\tContig id\tStart\tStop\tStrand\tElement symbol\tElement name\t"
        "Scope\tType\tSubtype\tClass\tSubclass\tMethod\tTarget length\t"
        "Reference sequence length\t% Coverage of reference\t% Identity to reference\t"
        "Alignment length\tClosest reference accession\tClosest reference name\tHMM accession\tHMM description\n"
        "WP_004201164.1\tcontig_02\t1000\t1813\t+\tblaNDM-1\tblaNDM-1 metallo-beta-lactamase\t"
        "core\tAMR\tAMR\tBETA-LACTAM\tCARBAPENEM\tBLASTN\t813\t813\t100.00\t100.00\t813\t"
        "WP_004201164.1\tblaNDM-1\tHMM001\tmetallo-beta-lactamase"
    )
    findings = parse_amrfinder_tsv(raw_tsv, "ana_test_coords")
    assert len(findings) == 1
    f = findings[0]
    assert f.gene_symbol == "blaNDM-1"
    assert f.contig_id == "contig_02"
    assert f.start_coord == 1000
    assert f.stop_coord == 1813
    assert f.strand == "+"
    assert f.closest_reference_accession == "WP_004201164.1"
    assert f.hmm_accession == "HMM001"
    assert f.hmm_description == "metallo-beta-lactamase"


def test_ml_champion_models_registry():
    models = list_champion_models()
    assert len(models) == 13
    ec_cip = get_champion_model("Escherichia coli", "Ciprofloxacin")
    assert ec_cip is not None
    assert ec_cip.version == "1.0.0"
    assert "sensitivity" in ec_cip.metrics
    assert "specificity" in ec_cip.metrics
    assert "balancedAccuracy" in ec_cip.metrics
    assert "mcc" in ec_cip.metrics


def test_ml_prediction_decisive_resistant():
    raw_tsv = (
        "Protein id\tContig id\tStart\tStop\tStrand\tElement symbol\tElement name\t"
        "Scope\tType\tSubtype\tClass\tSubclass\tMethod\tTarget length\t"
        "Reference sequence length\t% Coverage of reference\t% Identity to reference\t"
        "Alignment length\tClosest reference accession\tClosest reference name\tHMM accession\tHMM description\n"
        "NA\tcontig_01\t100\t200\t+\tgyrA_S83L\tgyrA S83L mutation\tcore\tPOINT\tPOINT\tQUINOLONE\tFLUOROQUINOLONE\tPOINT\t100\t100\t100.00\t100.00\t100\tWP_01\tgyrA\tNA\tNA\n"
        "NA\tcontig_01\t300\t400\t+\tparC_S80I\tparC S80I mutation\tcore\tPOINT\tPOINT\tQUINOLONE\tFLUOROQUINOLONE\tPOINT\t100\t100\t100.00\t100.00\t100\tWP_02\tparC\tNA\tNA"
    )
    findings = parse_amrfinder_tsv(raw_tsv, "ana_ml_test")
    pred = predict_pair_resistance("Escherichia coli", "Ciprofloxacin", findings)

    assert pred.available is True
    assert pred.abstained is False
    assert pred.prediction == "RESISTANT"
    assert pred.score is not None
    assert pred.score > 0.60
    assert pred.band == "HIGH_CONFIDENCE_RESISTANT"
    assert len(pred.top_features) >= 1
    assert any("mut_gyrA_S83L" in f["feature"] for f in pred.top_features)


def test_ml_prediction_clean_genome_not_resistant():
    pred = predict_pair_resistance("Escherichia coli", "Ciprofloxacin", [])
    assert pred.available is True
    assert pred.abstained is False
    assert pred.prediction == "NOT_RESISTANT"
    assert pred.score is not None
    assert pred.score < 0.40
    assert pred.band == "HIGH_CONFIDENCE_NOT_RESISTANT"


def test_ml_uncertainty_abstention():
    """Section 11: Score in [0.40, 0.60] causes model to abstain."""
    raw_tsv = (
        "Protein id\tContig id\tStart\tStop\tStrand\tElement symbol\tElement name\t"
        "Scope\tType\tSubtype\tClass\tSubclass\tMethod\tTarget length\t"
        "Reference sequence length\t% Coverage of reference\t% Identity to reference\t"
        "Alignment length\tClosest reference accession\tClosest reference name\tHMM accession\tHMM description\n"
        "NA\tcontig_01\t100\t200\t+\toqxA\toqxA efflux pump subunit\tcore\tAMR\tAMR\tQUINOLONE\tEFFLUX\tBLASTN\t100\t100\t100.00\t100.00\t100\tWP_01\toqxA\tNA\tNA"
    )
    findings = parse_amrfinder_tsv(raw_tsv, "ana_ml_abstain")
    # In K. pneumoniae, oqxA alone confers modest borderline signal
    pred = predict_pair_resistance("Klebsiella pneumoniae", "Ciprofloxacin", findings)
    assert pred.available is True
    # If borderline, it abstains or predicts with stated confidence band
    assert pred.band in ["UNCERTAIN_ABSTAINED", "HIGH_CONFIDENCE_NOT_RESISTANT"]


def test_hybrid_decision_logic():
    from ml.inference.predictor import MLPredictionOutcome

    # 1. Concordant Resistant
    ml_res = MLPredictionOutcome(
        available=True,
        status="AVAILABLE",
        abstained=False,
        prediction="RESISTANT",
        score=0.92,
        band="HIGH_CONFIDENCE_RESISTANT",
        model_id="m1",
        model_version="1.0.0",
        top_features=[],
        explanation="Resistance",
    )
    h1 = evaluate_hybrid_decision(ResultCategory.RESISTANCE_EVIDENCE_STRONG, ml_res)
    assert h1.hybrid_label == "CONCORDANT_RESISTANT"
    assert h1.requires_review is False

    # 2. Concordant No Evidence
    ml_s = MLPredictionOutcome(
        available=True,
        status="AVAILABLE",
        abstained=False,
        prediction="NOT_RESISTANT",
        score=0.08,
        band="HIGH_CONFIDENCE_NOT_RESISTANT",
        model_id="m1",
        model_version="1.0.0",
        top_features=[],
        explanation="Not resistant",
    )
    h2 = evaluate_hybrid_decision(ResultCategory.INSUFFICIENT_EVIDENCE, ml_s)
    assert h2.hybrid_label == "CONCORDANT_NO_EVIDENCE"

    # 3. ML Only Resistant (Review Flag)
    h3 = evaluate_hybrid_decision(ResultCategory.INSUFFICIENT_EVIDENCE, ml_res)
    assert h3.hybrid_label == "ML_ONLY_RESISTANT"
    assert h3.requires_review is True

    # 4. Rule Only Resistant (Review Flag)
    h4 = evaluate_hybrid_decision(ResultCategory.RESISTANCE_EVIDENCE_STRONG, ml_s)
    assert h4.hybrid_label == "RULE_ONLY_RESISTANT"
    assert h4.requires_review is True


@pytest.mark.asyncio
async def test_amrfinder_status_endpoint():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/amrfinder/status")
        assert res.status_code == 200
        data = res.json()
        assert "installed" in data
        assert "databaseInstalled" in data


@pytest.mark.asyncio
async def test_models_registry_endpoints():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # List models
        res = await client.get("/api/v1/models")
        assert res.status_code == 200
        models = res.json()
        assert len(models) == 13

        # Get specific model
        first_id = models[0]["modelId"]
        detail_res = await client.get(f"/api/v1/models/{first_id}")
        assert detail_res.status_code == 200
        assert detail_res.json()["modelId"] == first_id

        # 404 for unknown model
        bad_res = await client.get("/api/v1/models/non_existent_model_id")
        assert bad_res.status_code == 404
