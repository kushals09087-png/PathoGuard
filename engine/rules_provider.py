"""Rules provider module for Genome Firewall.

Loads organism-specific deterministic AMR rules from structured YAML definitions.
Provides lookup by organism and antibiotic name.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
import yaml


class AmrRule:
    def __init__(
        self,
        rule_id: str,
        organism: str,
        antibiotic: str,
        target_symbols: List[str],
        effect: str,
        tier: str,
        rationale: str,
        limitations: str,
        sources: List[Dict[str, Any]],
    ):
        self.rule_id = rule_id
        self.organism = organism
        self.antibiotic = antibiotic.lower()
        self.target_symbols = [s.strip() for s in target_symbols]
        self.effect = effect
        self.tier = tier
        self.rationale = rationale
        self.limitations = limitations
        self.sources = sources

    def matches_symbol(self, symbol: str) -> bool:
        clean_symbol = symbol.strip().lower()
        for target in self.target_symbols:
            t_clean = target.lower()
            if clean_symbol == t_clean:
                return True
            # Handle mutation or gene variants like gyrA_S83L / gyrA S83L
            if clean_symbol.replace("_", " ") == t_clean.replace("_", " "):
                return True
            # Handle parenthetical variants like erm(A) vs ermA
            if clean_symbol.replace("(", "").replace(")", "") == t_clean.replace("(", "").replace(")", ""):
                return True
        return False


class SeedYamlProvider:
    def __init__(self, rules_dir: str = "config/rules"):
        self.rules_dir = Path(rules_dir).resolve()
        self.rules: Dict[str, List[AmrRule]] = {}
        self.version = "1.0.0"
        self._load_rules()

    def _load_rules(self):
        if not self.rules_dir.exists():
            return

        for yaml_file in self.rules_dir.glob("*.yaml"):
            try:
                with open(yaml_file, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if not data or "rules" not in data:
                        continue
                    org = data.get("organism")
                    for r_dict in data["rules"]:
                        match_block = r_dict.get("match", {})
                        rule = AmrRule(
                            rule_id=r_dict["id"],
                            organism=r_dict.get("organism", org),
                            antibiotic=r_dict["antibiotic"],
                            target_symbols=match_block.get("element_symbols", []),
                            effect=r_dict.get("effect", "resistance"),
                            tier=r_dict.get("tier", "A_CURATED_STRONG"),
                            rationale=r_dict.get("rationale", ""),
                            limitations=r_dict.get("limitations", ""),
                            sources=r_dict.get("sources", []),
                        )
                        self.rules.setdefault(rule.organism, []).append(rule)
            except Exception as e:
                print(f"Error loading rule file {yaml_file}: {e}")

    def get_rules_for_pair(self, organism: str, antibiotic: str) -> List[AmrRule]:
        org_rules = self.rules.get(organism, [])
        abx_lower = antibiotic.lower()
        return [r for r in org_rules if r.antibiotic == abx_lower]


# Global singleton rules provider
_rules_provider_instance: Optional[SeedYamlProvider] = None

def get_rules_provider() -> SeedYamlProvider:
    global _rules_provider_instance
    if _rules_provider_instance is None:
        _rules_provider_instance = SeedYamlProvider()
    return _rules_provider_instance
