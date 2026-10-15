"""Discordance detection and review prioritization engine.

Evaluates disagreement between genomic assessment and phenotypic AST.
Calculates explainable review priority scores factoring pair reliability benchmarks.
"""

from typing import Optional, Dict, Any
from engine.contracts import (
    ResultCategory,
    AstCategory,
    DiscordanceType,
    ReviewStatus,
)


class DiscordanceEvaluation:
    def __init__(
        self,
        is_discordant: bool,
        discordance_type: Optional[DiscordanceType],
        priority_score: int,
        explanation: str,
        pair_reliability_snapshot: Optional[Dict[str, Any]] = None,
    ):
        self.is_discordant = is_discordant
        self.discordance_type = discordance_type
        self.priority_score = priority_score
        self.explanation = explanation
        self.pair_reliability_snapshot = pair_reliability_snapshot

    def to_dict(self) -> Dict[str, Any]:
        return {
            "isDiscordant": self.is_discordant,
            "discordanceType": str(self.discordance_type) if self.discordance_type else None,
            "priorityScore": self.priority_score,
            "explanation": self.explanation,
            "pairReliabilitySnapshot": self.pair_reliability_snapshot,
        }


def evaluate_discordance(
    genomic_category: ResultCategory,
    ast_category: AstCategory,
    pair_benchmark: Optional[Dict[str, Any]] = None,
) -> DiscordanceEvaluation:
    """Evaluates discordance between genomic evidence and AST result."""
    # Convert string to enum if needed
    if isinstance(genomic_category, str):
        genomic_category = ResultCategory(genomic_category)
    if isinstance(ast_category, str):
        ast_category = AstCategory(ast_category)

    # 1. NOT_ASSESSABLE due to QC failure
    if genomic_category == ResultCategory.NOT_ASSESSABLE:
        return DiscordanceEvaluation(
            is_discordant=True,
            discordance_type=DiscordanceType.LOW_QUALITY_CONFLICT,
            priority_score=40,
            explanation="Genomic data failed quality control. Genome-AST comparison is not scientifically assessable.",
            pair_reliability_snapshot=pair_benchmark,
        )

    # 2. Case: Genomic Strong / Moderate Resistance vs AST Susceptible (Signature D-04)
    if genomic_category in (ResultCategory.RESISTANCE_EVIDENCE_STRONG, ResultCategory.RESISTANCE_EVIDENCE_MODERATE) and ast_category == AstCategory.S:
        # High priority flag
        base_priority = 85 if genomic_category == ResultCategory.RESISTANCE_EVIDENCE_STRONG else 75
        agreement = pair_benchmark.get("agreementRate", 0.85) if pair_benchmark else 0.85
        if agreement >= 0.90:
            base_priority += 10
        elif agreement >= 0.85:
            base_priority += 5

        explanation = (
            f"High-priority discordance: Curated genomic resistance markers were detected ({genomic_category}), "
            "yet phenotypic AST indicates Susceptible. Potential causes include subpopulation heteroresistance, "
            "unexpressed or silenced genes, incorrect isolate identification, or AST inoculum artifacts. "
            "Laboratory review recommended."
        )

        return DiscordanceEvaluation(
            is_discordant=True,
            discordance_type=DiscordanceType.GENOMIC_RESISTANT_AST_SUSCEPTIBLE,
            priority_score=min(100, base_priority),
            explanation=explanation,
            pair_reliability_snapshot=pair_benchmark,
        )

    # 3. Case: Insufficient Genomic Evidence vs AST Resistant
    if genomic_category == ResultCategory.INSUFFICIENT_EVIDENCE and ast_category in (AstCategory.R, AstCategory.I):
        base_priority = 70
        explanation = (
            "Phenotypic resistance observed without detected known genomic markers. "
            "Potential causes include novel/uncharacterized resistance determinants, unannotated promoter mutations, "
            "or non-specific efflux/porin downregulation not captured by targeted gene catalogs."
        )
        return DiscordanceEvaluation(
            is_discordant=True,
            discordance_type=DiscordanceType.GENOMIC_NO_EVIDENCE_AST_RESISTANT,
            priority_score=base_priority,
            explanation=explanation,
            pair_reliability_snapshot=pair_benchmark,
        )

    # 4. Case: Inconclusive vs AST Resistant
    if genomic_category == ResultCategory.INCONCLUSIVE and ast_category in (AstCategory.R, AstCategory.I):
        return DiscordanceEvaluation(
            is_discordant=True,
            discordance_type=DiscordanceType.GENOMIC_INCONCLUSIVE_AST_RESISTANT,
            priority_score=60,
            explanation="Genomic evidence was inconclusive, but phenotypic AST demonstrated resistance.",
            pair_reliability_snapshot=pair_benchmark,
        )

    # 5. Concordant / Agreement Cases
    return DiscordanceEvaluation(
        is_discordant=False,
        discordance_type=None,
        priority_score=0,
        explanation="Genomic interpretation and phenotypic AST are concordant.",
        pair_reliability_snapshot=pair_benchmark,
    )
