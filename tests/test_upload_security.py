"""Upload security and integrity tests for Genome Firewall."""

import pytest
from pathlib import Path
from storage.manager import StorageManager
from engine.qc import assess_assembly_qc


def test_storage_path_traversal_prevention(tmp_path):
    mgr = StorageManager(base_dir=str(tmp_path))
    with pytest.raises(ValueError, match="Path traversal detected"):
        mgr.get_absolute_path("../../etc/passwd")


def test_storage_checksum_verification(tmp_path):
    mgr = StorageManager(base_dir=str(tmp_path))
    data = b">contig1\nACGTACGT"
    key, sha256_hex, size = mgr.save_bytes(data, "LAB-TEST", "smp_01", "test.fasta")

    assert mgr.verify_integrity(key, sha256_hex) is True

    # Tamper with file
    file_path = mgr.get_absolute_path(key)
    with open(file_path, "wb") as f:
        f.write(b">contig1\nACGTACGT_TAMPERED")

    assert mgr.verify_integrity(key, sha256_hex) is False


def test_storage_max_upload_size(tmp_path):
    mgr = StorageManager(base_dir=str(tmp_path))
    large_data = b"A" * 1024
    with pytest.raises(ValueError, match="exceeds maximum allowed size"):
        mgr.save_bytes(large_data, "LAB-TEST", "smp_02", "test.fasta", max_bytes=512)


def test_qc_rejects_protein_fasta():
    protein_fasta = ">sp|P0A9A6|RPOA_ECOLI DNA-directed RNA polymerase\nMQGSVTEFLKPRLVDIEQVSSTHAKVTLEPLERGFGHTLGNALRRILLSSMPGCAVTEVEIDGVLHEYST"
    qc = assess_assembly_qc(protein_fasta, "Escherichia coli")
    assert qc.status == "FAIL"
    assert any("Invalid nucleotide characters" in err for err in qc.errors)
