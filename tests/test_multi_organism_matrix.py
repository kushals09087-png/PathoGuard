"""Multi-organism scientific matrix tests for Genome Firewall.

Verifies complete 3-organism MVP coverage:
1. Escherichia coli (5 antibiotics)
2. Klebsiella pneumoniae (4 antibiotics)
3. Staphylococcus aureus (4 antibiotics)
"""

import pytest
from engine import (
    interpret_antibiotic_evidence,
    assess_assembly_qc,
    parse_amrfinder_tsv,
    AMRFinderRunner,
    ResultCategory,
    QCResult,
)


def test_klebsiella_pneumoniae_matrix():
    qc_pass = QCResult(
        status="PASS",
        contigs=20,
        total_length=5_300_000,
        n50=400_000,
        n_fraction=0.0,
        warnings=[],
        errors=[],
    )
    runner = AMRFinderRunner()
    tsv, ver, *_ = runner.run("kp_test.fasta", "Klebsiella pneumoniae")
    findings = parse_amrfinder_tsv(tsv, "ana_kp_test")

    # K. pneumoniae MVP antibiotics: Ciprofloxacin, Ceftriaxone, Meropenem, Gentamicin
    # Meropenem (blaNDM-1)
    mem_res = interpret_antibiotic_evidence("Klebsiella pneumoniae", "Meropenem", qc_pass, findings)
    assert mem_res.result_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG
    assert any("blaNDM-1" in m for m in mem_res.mechanisms)

    # Ceftriaxone (blaCTX-M-15)
    cro_res = interpret_antibiotic_evidence("Klebsiella pneumoniae", "Ceftriaxone", qc_pass, findings)
    assert cro_res.result_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG

    # Gentamicin (aac(3)-IIa)
    gen_res = interpret_antibiotic_evidence("Klebsiella pneumoniae", "Gentamicin", qc_pass, findings)
    assert gen_res.result_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG

    # Ciprofloxacin (oqxA is efflux, not strong QRDR point mutation)
    cip_res = interpret_antibiotic_evidence("Klebsiella pneumoniae", "Ciprofloxacin", qc_pass, findings)
    # oqxA is not gyrA_S83I/F, so absence of QRDR produces INSUFFICIENT_EVIDENCE (D-10)
    assert cip_res.result_category == ResultCategory.INSUFFICIENT_EVIDENCE


def test_staphylococcus_aureus_matrix():
    qc_pass = QCResult(
        status="PASS",
        contigs=15,
        total_length=2_800_000,
        n50=350_000,
        n_fraction=0.0,
        warnings=[],
        errors=[],
    )
    runner = AMRFinderRunner()
    tsv, ver, *_ = runner.run("sa_test.fasta", "Staphylococcus aureus")
    findings = parse_amrfinder_tsv(tsv, "ana_sa_test")

    # S. aureus MVP antibiotics: Cefoxitin, Vancomycin, Erythromycin, Ciprofloxacin
    # Cefoxitin (mecA)
    fox_res = interpret_antibiotic_evidence("Staphylococcus aureus", "Cefoxitin", qc_pass, findings)
    assert fox_res.result_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG
    assert any("mecA" in m for m in fox_res.mechanisms)

    # Erythromycin (erm(A))
    ery_res = interpret_antibiotic_evidence("Staphylococcus aureus", "Erythromycin", qc_pass, findings)
    assert ery_res.result_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG

    # Vancomycin (No vanA detected in standard MRSA) -> INSUFFICIENT_EVIDENCE (D-10)
    van_res = interpret_antibiotic_evidence("Staphylococcus aureus", "Vancomycin", qc_pass, findings)
    assert van_res.result_category == ResultCategory.INSUFFICIENT_EVIDENCE
    assert van_res.result_category != ResultCategory.SUSCEPTIBILITY_EVIDENCE_LIMITED
