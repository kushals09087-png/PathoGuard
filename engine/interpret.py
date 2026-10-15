"""Deterministic AMR evidence interpretation engine.

Implements the 7-step interpretation algorithm:
- Evaluates QC status (FAIL -> NOT_ASSESSABLE).
- Matches normalized findings against organism-specific curated rules.
- Applies detection-quality capping (LOOSE hit caps at RESISTANCE_EVIDENCE_WEAK).
- Strictly preserves Decision D-10: Absence of resistance markers produces INSUFFICIENT_EVIDENCE,
  NEVER susceptibility.
"""

from typing import List, Dict, Any, Optional
from engine.contracts import (
    ResultCategory,
    DetectionQuality,
    EvidenceTier,
)
from engine.normalize import NormalizedFinding
from engine.rules_provider import AmrRule, get_rules_provider
from engine.qc import QCResult


class AssessmentOutcome:
    def __init__(
        self,
        antibiotic: str,
        result_category: ResultCategory,
        confidence: float,
        supporting_finding_ids: List[str],
        applied_rule_ids: List[str],
        mechanisms: List[str],
        limitations: str,
    ):
        self.antibiotic = antibiotic
        self.result_category = result_category
        self.confidence = round(confidence, 2)
        self.supporting_finding_ids = supporting_finding_ids
        self.applied_rule_ids = applied_rule_ids
        self.mechanisms = mechanisms
        self.limitations = limitations

    def to_dict(self) -> Dict[str, Any]:
        return {
            "antibiotic": self.antibiotic,
            "resultCategory": str(self.result_category),
            "confidence": self.confidence,
            "supportingFindingIds": self.supporting_finding_ids,
            "appliedRuleIds": self.applied_rule_ids,
            "mechanisms": self.mechanisms,
            "limitations": self.limitations,
        }


def interpret_antibiotic_evidence(
    organism: str,
    antibiotic: str,
    qc_result: QCResult,
    findings: List[NormalizedFinding],
    rules_provider=None,
) -> AssessmentOutcome:
    """Interprets genomic AMR evidence for a single organism-antibiotic pair."""
    if rules_provider is None:
        rules_provider = get_rules_provider()

    # Step 1: QC Check
    if qc_result.status == "FAIL":
        reasons = "; ".join(qc_result.errors) if qc_result.errors else "Assembly failed quality control criteria."
        return AssessmentOutcome(
            antibiotic=antibiotic,
            result_category=ResultCategory.NOT_ASSESSABLE,
            confidence=0.0,
            supporting_finding_ids=[],
            applied_rule_ids=[],
            mechanisms=[],
            limitations=f"Assembly quality check failed: {reasons}. Resistance evidence cannot be assessed.",
        )

    # Step 2: Retrieve applicable rules
    rules = rules_provider.get_rules_for_pair(organism, antibiotic)
    if not rules:
        return AssessmentOutcome(
            antibiotic=antibiotic,
            result_category=ResultCategory.NOT_ASSESSABLE,
            confidence=0.0,
            supporting_finding_ids=[],
            applied_rule_ids=[],
            mechanisms=[],
            limitations=f"No curated interpretation rules available for {organism} against {antibiotic}.",
        )

    # Step 3: Match findings against rules
    matched_strong: List[tuple[AmrRule, NormalizedFinding]] = []
    matched_moderate: List[tuple[AmrRule, NormalizedFinding]] = []
    matched_weak: List[tuple[AmrRule, NormalizedFinding]] = []

    for finding in findings:
        # Ignore LOW_QUALITY hits
        if finding.detection_quality == DetectionQuality.LOW_QUALITY:
            continue

        for rule in rules:
            if rule.matches_symbol(finding.gene_symbol):
                # Apply detection quality capping
                if finding.detection_quality == DetectionQuality.LOOSE:
                    # LOOSE hits cannot elevate assessment above WEAK
                    matched_weak.append((rule, finding))
                elif finding.detection_quality == DetectionQuality.PARTIAL:
                    # PARTIAL hits cap at MODERATE
                    if rule.tier == "A_CURATED_STRONG":
                        matched_moderate.append((rule, finding))
                    else:
                        matched_moderate.append((rule, finding))
                elif finding.detection_quality in (DetectionQuality.EXACT, DetectionQuality.STRICT):
                    if rule.tier == "A_CURATED_STRONG":
                        matched_strong.append((rule, finding))
                    elif rule.tier == "B_CURATED_MODERATE":
                        matched_moderate.append((rule, finding))
                    else:
                        matched_weak.append((rule, finding))

    # Step 4: Determine ResultCategory and confidence
    if matched_strong:
        category = ResultCategory.RESISTANCE_EVIDENCE_STRONG
        confidence = 0.95
        supporting_findings = [f.finding_id for _, f in matched_strong]
        applied_rules = list(dict.fromkeys(r.rule_id for r, _ in matched_strong))
        mechanisms = list(dict.fromkeys(f"{r.rationale} ({f.gene_symbol})" for r, f in matched_strong))
        limitations = matched_strong[0][0].limitations or "Genomic evidence strongly supports resistance; AST remains gold standard."
    elif matched_moderate:
        category = ResultCategory.RESISTANCE_EVIDENCE_MODERATE
        confidence = 0.80
        supporting_findings = [f.finding_id for _, f in matched_moderate]
        applied_rules = list(dict.fromkeys(r.rule_id for r, _ in matched_moderate))
        mechanisms = list(dict.fromkeys(f"{r.rationale} ({f.gene_symbol})" for r, f in matched_moderate))
        limitations = matched_moderate[0][0].limitations or "Moderate genomic evidence; in vitro expression or MIC may be near breakpoint."
    elif matched_weak:
        category = ResultCategory.RESISTANCE_EVIDENCE_WEAK
        confidence = 0.50
        supporting_findings = [f.finding_id for _, f in matched_weak]
        applied_rules = list(dict.fromkeys(r.rule_id for r, _ in matched_weak))
        mechanisms = list(dict.fromkeys(f"{r.rationale} ({f.gene_symbol} - loose/partial alignment)" for r, f in matched_weak))
        limitations = "Evidence limited by partial or loose alignment quality. Laboratory AST confirmation essential."
    else:
        # Step 5: ABSENCE OF MARKER -> INSUFFICIENT EVIDENCE (Decision D-10)
        category = ResultCategory.INSUFFICIENT_EVIDENCE
        confidence = 0.20
        supporting_findings = []
        applied_rules = []
        mechanisms = []
        limitations = (
            f"No curated resistance markers detected for {antibiotic} in assembly. "
            "Absence of evidence is not proof of susceptibility. Uncharacterized or expression-based resistance mechanisms may exist."
        )

    return AssessmentOutcome(
        antibiotic=antibiotic,
        result_category=category,
        confidence=confidence,
        supporting_finding_ids=supporting_findings,
        applied_rule_ids=applied_rules,
        mechanisms=mechanisms,
        limitations=limitations,
    )
