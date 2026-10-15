"""Quality control module for assembled bacterial genomes.

Evaluates:
- FASTA structural validity (nucleotide character set, header formatting).
- Contig count (max 500).
- Ambiguous nucleotide fraction ('N' ratio <= 0.05).
- Assembly length plausibility for declared organism.
- N50 contig length calculation.
"""

from typing import Dict, Any, List, Tuple
from pathlib import Path
import yaml

ORGANISM_BOUNDS = {
    "Escherichia coli": (4_000_000, 6_000_000),
    "Klebsiella pneumoniae": (4_500_000, 6_500_000),
    "Staphylococcus aureus": (2_500_000, 3_200_000),
}

VALID_NUCLEOTIDES = set("ACGTURYKMSWBDHVNacgturykmswbdhvn")
STANDARD_BASES = set("ACGTacgt")


class QCResult:
    def __init__(
        self,
        status: str,
        contigs: int,
        total_length: int,
        n50: int,
        n_fraction: float,
        warnings: List[str],
        errors: List[str],
    ):
        self.status = status  # PASS, WARN, FAIL
        self.contigs = contigs
        self.total_length = total_length
        self.n50 = n50
        self.n_fraction = round(n_fraction, 6)
        self.warnings = warnings
        self.errors = errors

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "contigs": self.contigs,
            "totalLength": self.total_length,
            "n50": self.n50,
            "nFraction": self.n_fraction,
            "warnings": self.warnings,
            "errors": self.errors,
        }


def calculate_n50(lengths: List[int]) -> int:
    if not lengths:
        return 0
    sorted_lengths = sorted(lengths, reverse=True)
    total_length = sum(sorted_lengths)
    half_length = total_length / 2.0
    running_sum = 0
    for length in sorted_lengths:
        running_sum += length
        if running_sum >= half_length:
            return length
    return 0


def assess_assembly_qc(fasta_path_or_content: str, organism: str) -> QCResult:
    """Parses and checks FASTA assembly quality for the given organism."""
    errors: List[str] = []
    warnings: List[str] = []

    # Read content either from file path or raw string
    raw_lines: List[str] = []
    if "\n" not in fasta_path_or_content and len(fasta_path_or_content) < 1024:
        p = Path(fasta_path_or_content)
        if p.exists() and p.is_file():
            with open(p, "r", encoding="utf-8", errors="replace") as f:
                raw_lines = f.readlines()
    if not raw_lines:
        raw_lines = fasta_path_or_content.splitlines()

    if not raw_lines or not any(line.strip() for line in raw_lines):
        return QCResult(
            status="FAIL",
            contigs=0,
            total_length=0,
            n50=0,
            n_fraction=0.0,
            warnings=[],
            errors=["Empty FASTA file"],
        )

    # Validate first non-empty line starts with '>'
    first_line = next((line.strip() for line in raw_lines if line.strip()), "")
    if not first_line.startswith(">"):
        return QCResult(
            status="FAIL",
            contigs=0,
            total_length=0,
            n50=0,
            n_fraction=0.0,
            warnings=[],
            errors=["Malformed FASTA: Header line does not start with '>'"],
        )

    contig_lengths: List[int] = []
    contig_headers: set[str] = set()
    current_contig_seq: List[str] = []
    total_ambiguous_n = 0
    total_bases = 0
    duplicate_headers = 0

    def finalize_contig():
        nonlocal total_bases, total_ambiguous_n
        if current_contig_seq:
            seq_str = "".join(current_contig_seq)
            length = len(seq_str)
            contig_lengths.append(length)
            total_bases += length
            for char in seq_str:
                if char not in VALID_NUCLEOTIDES:
                    if "Invalid nucleotide characters detected" not in errors:
                        errors.append("Invalid nucleotide characters detected (possible amino acid or corrupt data)")
                if char in "Nn":
                    total_ambiguous_n += 1

    for line in raw_lines:
        line_clean = line.strip()
        if not line_clean:
            continue
        if line_clean.startswith(">"):
            finalize_contig()
            current_contig_seq = []
            header = line_clean[1:].strip()
            if header in contig_headers:
                duplicate_headers += 1
            contig_headers.add(header)
        else:
            current_contig_seq.append(line_clean)

    finalize_contig()

    if duplicate_headers > 0:
        warnings.append(f"Detected {duplicate_headers} duplicate contig header(s)")

    contigs_count = len(contig_lengths)
    if contigs_count == 0:
        return QCResult(
            status="FAIL",
            contigs=0,
            total_length=0,
            n50=0,
            n_fraction=0.0,
            warnings=warnings,
            errors=["No sequence content found in FASTA"],
        )

    n_fraction = total_ambiguous_n / total_bases if total_bases > 0 else 0.0
    n50 = calculate_n50(contig_lengths)

    # QC threshold checks
    if contigs_count > 500:
        warnings.append(f"High contig count: {contigs_count} (recommended < 500)")

    if n_fraction > 0.05:
        errors.append(f"Ambiguous base fraction {n_fraction:.4f} exceeds maximum threshold of 0.05")

    # Plausibility check for organism length
    if organism in ORGANISM_BOUNDS:
        min_len, max_len = ORGANISM_BOUNDS[organism]
        if total_bases < min_len:
            warnings.append(
                f"Assembly size ({total_bases:,} bp) is smaller than expected for {organism} (minimum {min_len:,} bp)"
            )
        elif total_bases > max_len:
            warnings.append(
                f"Assembly size ({total_bases:,} bp) is larger than expected for {organism} (maximum {max_len:,} bp)"
            )
    else:
        warnings.append(f"Organism '{organism}' length boundaries not configured in standard bounds")

    # Overall status
    if errors:
        status = "FAIL"
    elif warnings:
        status = "WARN"
    else:
        status = "PASS"

    return QCResult(
        status=status,
        contigs=contigs_count,
        total_length=total_bases,
        n50=n50,
        n_fraction=n_fraction,
        warnings=warnings,
        errors=errors,
    )
