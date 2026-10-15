"""Background analysis worker for Genome Firewall.

Polls MongoDB for QUEUED analyses, manages execution lifecycle, computes quality control,
executes AMRFinderPlus, interprets evidence, and persists findings and discordance events.
"""

import asyncio
import os
import signal
import uuid
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, List, Any

from db.client import get_db
from storage.manager import StorageManager
from engine import (
    AnalysisStatus,
    assess_assembly_qc,
    parse_amrfinder_tsv,
    interpret_antibiotic_evidence,
    evaluate_discordance,
    AMRFinderRunner,
    get_rules_provider,
    AstCategory,
)
from ml import predict_pair_resistance, evaluate_hybrid_decision
from apps.worker.lease_manager import LeaseManager, get_utc_now

ORGANISM_ANTIBIOTIC_SCOPE = {
    "Escherichia coli": ["Ciprofloxacin", "Ceftriaxone", "Meropenem", "Gentamicin", "Tetracycline"],
    "Klebsiella pneumoniae": ["Ciprofloxacin", "Ceftriaxone", "Meropenem", "Gentamicin"],
    "Staphylococcus aureus": ["Cefoxitin", "Vancomycin", "Erythromycin", "Ciprofloxacin"],
}


class AnalysisWorker:
    def __init__(
        self,
        worker_id: Optional[str] = None,
        poll_interval: float = 1.0,
        lease_seconds: int = 120,
    ):
        self.worker_id = worker_id or f"worker_{uuid.uuid4().hex[:8]}"
        self.poll_interval = poll_interval
        self.lease_mgr = LeaseManager(self.worker_id, lease_seconds=lease_seconds)
        self.db = get_db()
        self.storage = StorageManager()
        self.amrfinder = AMRFinderRunner()
        self.rules_provider = get_rules_provider()
        self.is_running = False

    async def run_once(self) -> bool:
        """Processes a single queued job if available, sweeping expired leases first.

        Returns True if a job was processed, False otherwise.
        """
        # 1. Sweep stale leases
        await self.lease_mgr.sweep_expired_leases()

        # 2. Claim next job
        job = await self.lease_mgr.claim_next_job()
        if not job:
            return False

        analysis_id = job["analysisId"]
        lab_id = job["labId"]
        sample_id = job["sampleId"]
        file_id = job["fileId"]

        try:
            # 3. Retrieve sample and genome file
            samples_col = self.db.get_collection("samples")
            files_col = self.db.get_collection("genome_files")

            sample = await samples_col.find_one({"sampleId": sample_id})
            if not sample:
                await self.lease_mgr.fail_job(analysis_id, "SAMPLE_NOT_FOUND", f"Sample {sample_id} not found in database.")
                return True

            file_doc = await files_col.find_one({"fileId": file_id})
            if not file_doc:
                await self.lease_mgr.fail_job(analysis_id, "FILE_NOT_FOUND", f"Genome file {file_id} not found in database.")
                return True

            storage_key = file_doc["storageKey"]
            expected_sha = file_doc["sha256"]

            # 4. Checksum verification before analysis (Pre-execution integrity)
            if not self.storage.verify_integrity(storage_key, expected_sha):
                await self.lease_mgr.fail_job(
                    analysis_id,
                    "FILE_TAMPERED",
                    "Stored genome file checksum does not match recorded upload SHA-256 hash. Halting analysis.",
                )
                return True

            # 5. Quality Control (Stage: VALIDATING)
            await self.lease_mgr.update_heartbeat(analysis_id, AnalysisStatus.VALIDATING)
            file_path = self.storage.get_absolute_path(storage_key)
            qc_result = assess_assembly_qc(str(file_path), sample["organism"])

            # Update file QC summary
            await files_col.update_one(
                {"fileId": file_id},
                {"$set": {"qcSummary": qc_result.to_dict(), "validationStatus": "VALID" if qc_result.status != "FAIL" else "INVALID"}},
            )

            # 6. Detection Tool Execution (Stage: ANALYZING)
            await self.lease_mgr.update_heartbeat(analysis_id, AnalysisStatus.ANALYZING)
            tsv_output, tool_version, db_version, raw_output, diagnostics = self.amrfinder.run(
                str(file_path), sample["organism"]
            )
            findings = parse_amrfinder_tsv(tsv_output, analysis_id, tool_version=tool_version)

            # Persist raw output artifact
            raw_col = self.db.get_collection("analysis_raw_outputs")
            await raw_col.delete_many({"analysisId": analysis_id})
            await raw_col.insert_one({
                "analysisId": analysis_id,
                "labId": lab_id,
                "rawTsv": raw_output,
                "toolVersion": tool_version,
                "databaseVersion": db_version,
                "diagnostics": diagnostics,
                "createdAt": get_utc_now(),
            })

            # 7. Interpretation & ML Inference (Stage: INTERPRETING)
            await self.lease_mgr.update_heartbeat(analysis_id, AnalysisStatus.INTERPRETING)
            organism = sample["organism"]
            target_antibiotics = ORGANISM_ANTIBIOTIC_SCOPE.get(organism, [])

            assessments: List[Dict[str, Any]] = []
            evidence_links: List[Dict[str, Any]] = []
            ml_predictions: List[Dict[str, Any]] = []

            for abx in target_antibiotics:
                # Deterministic rule interpretation
                outcome = interpret_antibiotic_evidence(
                    organism=organism,
                    antibiotic=abx,
                    qc_result=qc_result,
                    findings=findings,
                    rules_provider=self.rules_provider,
                )

                # Machine Learning Inference (Approved ML Plan)
                ml_outcome = predict_pair_resistance(organism, abx, findings)
                hybrid = evaluate_hybrid_decision(outcome.result_category, ml_outcome)

                pred_id = f"mlp_{analysis_id}_{abx.lower().replace(' ', '_')}"
                ml_predictions.append({
                    "predictionId": pred_id,
                    "analysisId": analysis_id,
                    "labId": lab_id,
                    "organism": organism,
                    "antibiotic": abx,
                    **ml_outcome.to_dict(),
                    "hybridLabel": hybrid.hybrid_label,
                    "hybridExplanation": hybrid.explanation,
                    "createdAt": get_utc_now(),
                })

                assessment_id = f"ass_{analysis_id}_{abx.lower().replace(' ', '_')}"
                assessment_doc = {
                    "assessmentId": assessment_id,
                    "analysisId": analysis_id,
                    "labId": lab_id,
                    "antibiotic": abx,
                    "resultCategory": str(outcome.result_category),
                    "confidence": outcome.confidence,
                    "supportingFindingIds": outcome.supporting_finding_ids,
                    "appliedRuleIds": outcome.applied_rule_ids,
                    "mechanisms": outcome.mechanisms,
                    "limitations": outcome.limitations,
                    "hybridLabel": hybrid.hybrid_label,
                    "mlPredictionRef": pred_id,
                    "createdAt": get_utc_now(),
                }
                assessments.append(assessment_doc)

                for f_id in outcome.supporting_finding_ids:
                    evidence_links.append({
                        "linkId": f"lnk_{assessment_id}_{f_id}",
                        "analysisId": analysis_id,
                        "findingId": f_id,
                        "assessmentId": assessment_id,
                        "contributionType": "CAUSAL_DETERMINANT",
                    })

            # 8. Idempotent Result Persistence
            findings_col = self.db.get_collection("analysis_findings")
            assessments_col = self.db.get_collection("antibiotic_assessments")
            links_col = self.db.get_collection("evidence_links")
            ml_col = self.db.get_collection("ml_predictions")

            # Clean any old rows from previous attempts
            await findings_col.delete_many({"analysisId": analysis_id})
            await assessments_col.delete_many({"analysisId": analysis_id})
            await links_col.delete_many({"analysisId": analysis_id})
            await ml_col.delete_many({"analysisId": analysis_id})

            if findings:
                finding_docs = [
                    {**f.to_dict(), "analysisId": analysis_id, "labId": lab_id}
                    for f in findings
                ]
                await findings_col.insert_many(finding_docs)

            if assessments:
                await assessments_col.insert_many(assessments)

            if evidence_links:
                await links_col.insert_many(evidence_links)

            if ml_predictions:
                await ml_col.insert_many(ml_predictions)

            # 9. Evaluate existing AST records and generate discordance events if AST was already entered
            ast_col = self.db.get_collection("ast_results")
            discordance_col = self.db.get_collection("discordance_events")
            bm_col = self.db.get_collection("benchmark_results")

            existing_ast = await ast_col.find({"$or": [{"analysisId": analysis_id}, {"sampleId": sample_id}]})
            for ast_doc in existing_ast:
                abx_match = next((a for a in assessments if a["antibiotic"].lower() == ast_doc["antibiotic"].lower()), None)
                if abx_match:
                    bm_record = await bm_col.find_one({"organism": organism, "antibiotic": abx_match["antibiotic"]})
                    disc_eval = evaluate_discordance(
                        genomic_category=abx_match["resultCategory"],
                        ast_category=ast_doc["category"],
                        pair_benchmark=bm_record,
                    )
                    if disc_eval.is_discordant:
                        disc_id = f"dis_{analysis_id}_{abx_match['antibiotic'].lower()}"
                        await discordance_col.update_one(
                            {"discordanceId": disc_id},
                            {
                                "$set": {
                                    "discordanceId": disc_id,
                                    "analysisId": analysis_id,
                                    "sampleId": sample_id,
                                    "labId": lab_id,
                                    "antibiotic": abx_match["antibiotic"],
                                    "discordanceType": str(disc_eval.discordance_type),
                                    "genomicCategory": abx_match["resultCategory"],
                                    "astCategory": ast_doc["category"],
                                    "reviewStatus": "OPEN",
                                    "reviewNotes": None,
                                    "reviewedBy": None,
                                    "reviewedAt": None,
                                    "priorityScore": disc_eval.priority_score,
                                    "explanation": disc_eval.explanation,
                                    "pairReliabilitySnapshot": bm_record,
                                    "updatedAt": get_utc_now(),
                                }
                            },
                            upsert=True,
                        )

            # 10. Complete Job
            version_snapshot = {
                "amrfinder": tool_version,
                "database": db_version,
                "rules": self.rules_provider.version,
                "ml": "1.0.0",
                "qc": "1.0.0",
            }

            final_status = AnalysisStatus.COMPLETED
            if qc_result.warnings:
                final_status = "COMPLETED_WITH_WARNINGS"

            await self.lease_mgr.complete_job(
                analysis_id,
                {
                    "status": final_status,
                    "qcSummary": qc_result.to_dict(),
                    "findingsCount": len(findings),
                    "versions": version_snapshot,
                    "rawOutputAvailable": True,
                    "mlStatus": "AVAILABLE",
                },
            )
            return True

        except Exception as e:
            await self.lease_mgr.fail_job(
                analysis_id,
                "EXECUTION_ERROR",
                f"Unexpected error during analysis processing: {str(e)}",
            )
            return True

    async def start(self):
        """Continuous polling loop."""
        self.is_running = True
        print(f"Genome Firewall Worker '{self.worker_id}' started. Polling for queued jobs...")
        while self.is_running:
            try:
                processed = await self.run_once()
                if not processed:
                    await asyncio.sleep(self.poll_interval)
            except Exception as e:
                print(f"Worker error in main loop: {e}")
                await asyncio.sleep(self.poll_interval)

    def stop(self):
        self.is_running = False
        print(f"Genome Firewall Worker '{self.worker_id}' shutting down.")


if __name__ == "__main__":
    worker = AnalysisWorker()
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(worker.start())
    except KeyboardInterrupt:
        worker.stop()
