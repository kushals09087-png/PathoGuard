"""Benchmark reliability routes for Genome Firewall."""

from typing import List, Optional
from fastapi import APIRouter, Query

from db.client import get_db
from apps.api.schemas.models import BenchmarkResponse

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])


@router.get("", response_model=List[BenchmarkResponse])
async def list_benchmarks(
    organism: Optional[str] = None,
    antibiotic: Optional[str] = None,
):
    """Retrieves measured per-pair reliability benchmarks on held-out evaluation datasets."""
    db = get_db()
    bm_col = db.get_collection("benchmark_results")

    query = {}
    if organism:
        query["organism"] = organism
    if antibiotic:
        query["antibiotic"] = antibiotic

    benchmarks = await bm_col.find(query=query, sort=[("organism", 1), ("antibiotic", 1)])
    return [BenchmarkResponse(**bm) for bm in benchmarks]
