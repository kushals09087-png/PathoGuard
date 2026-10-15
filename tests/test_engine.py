"""Unit and scientific engine tests for Genome Firewall.

Validates:
- QC assessment on nucleotide assemblies.
- Detection quality categorization and capping (D-03).
- Absence of markers is NEVER susceptible (D-10).
- QC failure yields NOT_ASSESSABLE.
- Deterministic 7-step interpretation across the 3-organism MVP matrix.
- Discordance classification and prioritization matrix.
"""

import pytest
from engine.contracts import (
    ResultCategory,
    DetectionQuality,
    AstCategory,
    DiscordanceType,
)
from engine.qc import assess_assembly_qc, QCResult
from engine.normalize import (
    parse_amrfinder_tsv,
    classify_detection_quality,
)
from engine.interpret import interpret_antibiotic_evidence
from engine.discordance import evaluate_discordance
from engine.rules_provider import get_rules_provider


def test_classify_detection_quality():
    assert classify_detection_quality(100.0, 100.0) == DetectionQuality.EXACT
    assert classify_detection_quality(98.5, 95.0) == DetectionQuality.STRICT
    assert classify_detection_quality(85.0, 70.0) == DetectionQuality.PARTIAL
    assert classify_detection_quality(75.0, 55.0) == DetectionQuality.LOOSE
    assert classify_detection_quality(50.0, 40.0) == DetectionQuality.LOW_QUALITY


def test_qc_empty_file():
    qc = assess_assembly_qc("", "Escherichia coli")
    assert qc.status == "FAIL"
    assert "Empty FASTA file" in qc.errors


def test_qc_invalid_header():
    qc = assess_assembly_qc("ACGTACGTACGT", "Escherichia coli")
    assert qc.status == "FAIL"
    assert any("Header line does not start with '>'" in e for e in qc.errors)


def test_qc_high_ambiguous_n():
    # 20 bases, 5 N's = 25% N > 5% limit
    seq = ">contig_1\nACGTACGTNNNNNACGTACG"
    qc = assess_assembly_qc(seq, "Escherichia coli")
    assert qc.status == "FAIL"
    assert any("Ambiguous base fraction" in e for e in qc.errors)


def test_qc_invalid_characters():
    # Protein sequence instead of nucleotide
    seq = ">contig_1\nMTEITAAMVKELRESTGAGMMDCKNAL"
    qc = assess_assembly_qc(seq, "Escherichia coli")
    assert qc.status == "FAIL"
    assert any("Invalid nucleotide characters" in e for e in qc.errors)


def test_interpretation_qc_failure_yields_not_assessable():
    qc_fail = QCResult(
        status="FAIL",
        contigs=1,
        total_length=100,
        n50=100,
        n_fraction=0.10,
        warnings=[],
        errors=["Ambiguous base fraction 0.10 exceeds 0.05"],
    )
    res = interpret_antibiotic_evidence(
        organism="Escherichia coli",
        antibiotic="Ciprofloxacin",
        qc_result=qc_fail,
        findings=[],
    )
    assert res.result_category == ResultCategory.NOT_ASSESSABLE
    assert res.confidence == 0.0
    assert "Quality check failed" in res.limitations or "failed" in res.limitations.lower()


def test_interpretation_absence_never_susceptible():
    """Decision D-10: Absence of resistance markers MUST produce INSUFFICIENT_EVIDENCE, never susceptible."""
    qc_pass = QCResult(
        status="PASS",
        contigs=10,
        total_length=5_000_000,
        n50=500_000,
        n_fraction=0.0,
        warnings=[],
        errors=[],
    )
    # Empty findings = clean genome
    res = interpret_antibiotic_evidence(
        organism="Escherichia coli",
        antibiotic="Ceftriaxone",
        qc_result=qc_pass,
        findings=[],
    )
    assert res.result_category == ResultCategory.INSUFFICIENT_EVIDENCE
    assert res.result_category != ResultCategory.SUSCEPTIBILITY_EVIDENCE_LIMITED
    assert "Absence of evidence is not proof of susceptibility" in res.limitations


def test_detection_quality_capping_loose():
    """Decision D-03: LOOSE hits cannot elevate assessment above RESISTANCE_EVIDENCE_WEAK."""
    qc_pass = QCResult(
        status="PASS",
        contigs=10,
        total_length=5_000_000,
        n50=500_000,
        n_fraction=0.0,
        warnings=[],
        errors=[],
    )
    tsv_loose = (
        "Protein identifier\tContig id\tStart\tStop\tStrand\tGene symbol\tSequence name\t"
        "Scope\tElement type\tElement subtype\tClass\tSubclass\tMethod\tTarget length\t"
        "Reference sequence length\t% Coverage of reference sequence\t% Identity to reference sequence\t"
        "Alignment length\tAccession of closest sequence\tName of closest sequence\tHMM id\tHMM description\n"
        "NA\tcontig_01\t100\t500\t+\tblaNDM-1\tblaNDM-1 beta-lactamase\tcore\tAMR\tAMR\t"
        "BETA-LACTAM\tCARBAPENEM\tBLASTN\t813\t813\t55.00\t75.00\t450\tWP_004201164.1\tblaNDM-1\tNA\tNA"
    )
    findings = parse_amrfinder_tsv(tsv_loose, "ana_cap_test")
    assert len(findings) == 1
    assert findings[0].detection_quality == DetectionQuality.LOOSE

    res = interpret_antibiotic_evidence(
        organism="Escherichia coli",
        antibiotic="Meropenem",
        qc_result=qc_pass,
        findings=findings,
    )
    # Even though blaNDM-1 is a strong resistance gene, the LOOSE alignment caps it at WEAK
    assert res.result_category == ResultCategory.RESISTANCE_EVIDENCE_WEAK


def test_discordance_matrix_signature_case():
    """Signature Discordance: Strong Genomic Resistance + AST Susceptible."""
    eval_res = evaluate_discordance(
        genomic_category=ResultCategory.RESISTANCE_EVIDENCE_STRONG,
        ast_category=AstCategory.S,
        pair_benchmark={"agreementRate": 0.893, "sampleCount": 420},
    )
    assert eval_res.is_discordant is True
    assert eval_res.discordance_type == DiscordanceType.GENOMIC_RESISTANT_AST_SUSCEPTIBLE
    assert eval_res.priority_score >= 85
    assert "High-priority discordance" in eval_res.explanation


def test_discordance_matrix_concordant():
    eval_res = evaluate_discordance(
        genomic_category=ResultCategory.RESISTANCE_EVIDENCE_STRONG,
        ast_category=AstCategory.R,
    )
    assert eval_res.is_discordant is False
    assert eval_res.discordance_type is None
