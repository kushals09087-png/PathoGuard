"""API contract and laboratory isolation tests for Genome Firewall."""

import pytest
import httpx
from httpx import ASGITransport
from apps.api.main import app


@pytest.mark.asyncio
async def test_health_endpoints():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res_live = await client.get("/health/live")
        assert res_live.status_code == 200
        assert res_live.json()["status"] == "UP"

        res_ready = await client.get("/health/ready")
        assert res_ready.status_code == 200
        assert res_ready.json()["status"] == "READY"


@pytest.mark.asyncio
async def test_auth_login_and_me():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Invalid login
        bad_login = await client.post("/api/v1/auth/login", json={"labId": "LAB-REF-AIIMS", "password": "WrongPassword"})
        assert bad_login.status_code == 401

        # 2. Valid login
        good_login = await client.post("/api/v1/auth/login", json={"labId": "LAB-REF-AIIMS", "password": "DemoPassword123!"})
        assert good_login.status_code == 200
        data = good_login.json()
        assert "token" in data
        assert data["lab"]["labId"] == "LAB-REF-AIIMS"
        token = data["token"]

        # 3. Authenticated profile
        me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["labId"] == "LAB-REF-AIIMS"


@pytest.mark.asyncio
async def test_scope_endpoint():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/scope")
        assert res.status_code == 200
        data = res.json()
        assert "Escherichia coli" in data["organisms"]
        assert "Klebsiella pneumoniae" in data["organisms"]
        assert "Staphylococcus aureus" in data["organisms"]
        assert "Ciprofloxacin" in data["antibiotics"]
        assert "Meropenem" in data["antibiotics"]


@pytest.mark.asyncio
async def test_laboratory_isolation():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Login Lab A
        login_a = await client.post("/api/v1/auth/login", json={"labId": "LAB-REF-AIIMS", "password": "DemoPassword123!"})
        token_a = login_a.json()["token"]

        # Login Lab B
        login_b = await client.post("/api/v1/auth/login", json={"labId": "LAB-SURV-NCDC", "password": "DemoPassword123!"})
        token_b = login_b.json()["token"]

        # Lab A creates sample
        smp_res = await client.post(
            "/api/v1/samples",
            json={"sampleLabel": "LAB-A-PRIVATE", "organism": "Escherichia coli"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert smp_res.status_code == 201
        sample_id = smp_res.json()["sampleId"]

        # Lab B attempts to upload or access Lab A's sample -> 404
        bad_access = await client.post(
            f"/api/v1/samples/{sample_id}/genome",
            files={"file": ("test.fasta", b">c1\nACGTACGT", "text/plain")},
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert bad_access.status_code == 404


@pytest.mark.asyncio
async def test_benchmarks_endpoint():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/benchmarks")
        assert res.status_code == 200
        benchmarks = res.json()
        assert len(benchmarks) >= 13
        # Check Wilson CI bounds presence
        for bm in benchmarks:
            assert "agreementRate" in bm
            assert "ciLower" in bm
            assert "ciUpper" in bm
            assert bm["ciLower"] <= bm["agreementRate"] <= bm["ciUpper"]


@pytest.mark.asyncio
async def test_demo_datasets_listing():
    async with httpx.AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/v1/demo-datasets")
        assert res.status_code == 200
        datasets = res.json()
        assert len(datasets) >= 3
        # Ensure signature discordance demo exists
        ec_demo = next((d for d in datasets if "ec_discordant" in d["datasetId"]), None)
        assert ec_demo is not None
        assert ec_demo["discordanceCount"] >= 1
