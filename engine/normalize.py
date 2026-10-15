"""AMRFinderPlus output normalization module.

Parses standard AMRFinderPlus TSV output (v3.12 through v4.2+),
extracts resistance findings including contig coordinates and strand,
computes detection quality categories (EXACT, STRICT, PARTIAL, LOOSE, LOW_QUALITY),
and assigns evidence tiers.
"""

import csv
import io
from typing import List, Dict, Any, Optional
from engine.contracts import DetectionQuality, EvidenceTier


class NormalizedFinding:
    def __init__(
        self,
        finding_id: str,
        gene_symbol: str,
        sequence_name: str,
        drug_class: str,
        subclass: Optional[str],
        percent_identity: float,
        percent_coverage: float,
        detection_method: str,
        detection_quality: DetectionQuality,
        element_subtype: str,
        core_hit: bool,
        evidence_tier: EvidenceTier,
        source_tool: str,
        raw_hit: Dict[str, Any],
        contig_id: Optional[str] = None,
        start_coord: Optional[int] = None,
        stop_coord: Optional[int] = None,
        strand: Optional[str] = None,
        closest_reference_accession: Optional[str] = None,
        closest_reference_name: Optional[str] = None,
        hmm_accession: Optional[str] = None,
        hmm_description: Optional[str] = None,
    ):
        self.finding_id = finding_id
        self.gene_symbol = gene_symbol
        self.sequence_name = sequence_name
        self.drug_class = drug_class
        self.subclass = subclass
        self.percent_identity = percent_identity
        self.percent_coverage = percent_coverage
        self.detection_method = detection_method
        self.detection_quality = detection_quality
        self.element_subtype = element_subtype
        self.core_hit = core_hit
        self.evidence_tier = evidence_tier
        self.source_tool = source_tool
        self.raw_hit = raw_hit
        self.contig_id = contig_id
        self.start_coord = start_coord
        self.stop_coord = stop_coord
        self.strand = strand
        self.closest_reference_accession = closest_reference_accession
        self.closest_reference_name = closest_reference_name
        self.hmm_accession = hmm_accession
        self.hmm_description = hmm_description

    def to_dict(self) -> Dict[str, Any]:
        return {
            "findingId": self.finding_id,
            "geneSymbol": self.gene_symbol,
            "sequenceName": self.sequence_name,
            "drugClass": self.drug_class,
            "subclass": self.subclass,
            "percentIdentity": self.percent_identity,
            "percentCoverage": self.percent_coverage,
            "detectionMethod": self.detection_method,
            "detectionQuality": str(self.detection_quality),
            "elementSubtype": self.element_subtype,
            "coreHit": self.core_hit,
            "evidenceTier": str(self.evidence_tier),
            "sourceTool": self.source_tool,
            "rawHit": self.raw_hit,
            "contigId": self.contig_id,
            "start": self.start_coord,
            "stop": self.stop_coord,
            "strand": self.strand,
            "closestReferenceAccession": self.closest_reference_accession,
            "closestReferenceName": self.closest_reference_name,
            "hmmAccession": self.hmm_accession,
            "hmmDescription": self.hmm_description,
        }


def classify_detection_quality(identity: float, coverage: float) -> DetectionQuality:
    """Classifies hit into detection quality category based on identity and coverage."""
    if identity >= 99.99 and coverage >= 99.99:
        return DetectionQuality.EXACT
    elif identity >= 95.0 and coverage >= 90.0:
        return DetectionQuality.STRICT
    elif identity >= 80.0 and coverage >= 60.0:
        return DetectionQuality.PARTIAL
    elif identity >= 70.0 and coverage >= 50.0:
        return DetectionQuality.LOOSE
    else:
        return DetectionQuality.LOW_QUALITY


def assign_evidence_tier(quality: DetectionQuality, element_subtype: str) -> EvidenceTier:
    if quality in (DetectionQuality.EXACT, DetectionQuality.STRICT):
        return EvidenceTier.A_CURATED_STRONG
    elif quality == DetectionQuality.PARTIAL:
        return EvidenceTier.B_CURATED_MODERATE
    elif quality == DetectionQuality.LOOSE:
        return EvidenceTier.D_EXPLORATORY
    else:
        return EvidenceTier.INSUFFICIENT


def parse_amrfinder_tsv(
    tsv_content: str,
    analysis_id: str,
    tool_version: str = "NCBI AMRFinderPlus",
) -> List[NormalizedFinding]:
    """Parses AMRFinderPlus TSV output into a list of NormalizedFinding instances."""
    findings: List[NormalizedFinding] = []
    if not tsv_content or not tsv_content.strip():
        return findings

    # Ignore leading CLI status lines if present
    tsv_lines = [
        line for line in tsv_content.splitlines()
        if not line.startswith("Running:") and not line.startswith("Software") and not line.startswith("Database") and not line.startswith("AMRFinder") and not line.startswith("Making report")
    ]
    cleaned_tsv = "\n".join(tsv_lines).strip()
    if not cleaned_tsv:
        return findings

    reader = csv.DictReader(io.StringIO(cleaned_tsv), delimiter="\t")
    if not reader.fieldnames:
        return findings

    def get_field(row, *aliases):
        for a in aliases:
            if a in row and row[a] is not None:
                return row[a].strip()
        return ""

    hit_idx = 1
    for row in reader:
        gene_symbol = get_field(row, "Element symbol", "Gene symbol", "Gene Symbol", "gene_symbol", "Gene")
        if not gene_symbol or gene_symbol == "NA":
            continue

        seq_name = get_field(row, "Element name", "Sequence name", "sequence_name", "Contig id", "Protein name")
        contig_id = get_field(row, "Contig id", "contig_id", "Contig") or None
        
        start_str = get_field(row, "Start", "start")
        start_coord = int(start_str) if start_str and start_str.isdigit() else None
        
        stop_str = get_field(row, "Stop", "stop")
        stop_coord = int(stop_str) if stop_str and stop_str.isdigit() else None
        
        strand = get_field(row, "Strand", "strand") or None

        drug_class = get_field(row, "Class", "class", "Drug Class").upper() or "AMR"
        subclass = get_field(row, "Subclass", "subclass", "Sub-class") or None
        method = get_field(row, "Method", "method", "Detection method") or "BLASTN"
        element_subtype = get_field(row, "Subtype", "Element subtype", "element_subtype") or "AMR"
        scope = get_field(row, "Scope", "scope").upper()
        core_hit = scope == "CORE" or "core" in scope.lower()

        closest_ref_acc = get_field(row, "Closest reference accession", "Accession of closest sequence") or None
        closest_ref_name = get_field(row, "Closest reference name", "Name of closest sequence") or None
        hmm_acc = get_field(row, "HMM accession", "HMM id") or None
        hmm_desc = get_field(row, "HMM description") or None

        try:
            identity = float(get_field(row, "% Identity to reference", "% Identity to reference sequence", "Identity", "% Identity", "identity") or 100.0)
        except ValueError:
            identity = 100.0

        try:
            coverage = float(get_field(row, "% Coverage of reference", "% Coverage of reference sequence", "Coverage", "% Coverage", "coverage") or 100.0)
        except ValueError:
            coverage = 100.0

        quality = classify_detection_quality(identity, coverage)
        tier = assign_evidence_tier(quality, element_subtype)

        finding_id = f"fnd_{analysis_id}_{hit_idx:03d}"
        hit_idx += 1

        finding = NormalizedFinding(
            finding_id=finding_id,
            gene_symbol=gene_symbol,
            sequence_name=seq_name,
            drug_class=drug_class,
            subclass=subclass,
            percent_identity=round(identity, 2),
            percent_coverage=round(coverage, 2),
            detection_method=method,
            detection_quality=quality,
            element_subtype=element_subtype,
            core_hit=core_hit,
            evidence_tier=tier,
            source_tool=tool_version,
            raw_hit=dict(row),
            contig_id=contig_id,
            start_coord=start_coord,
            stop_coord=stop_coord,
            strand=strand,
            closest_reference_accession=closest_ref_acc,
            closest_reference_name=closest_ref_name,
            hmm_accession=hmm_acc,
            hmm_description=hmm_desc,
        )
        findings.append(finding)

    return findings
