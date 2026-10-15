import React, { useState, useMemo } from "react";
import {
  AntibioticAssessment,
  DiscordanceEvent,
  AstResultItem,
} from "@/types/contracts";
import { CategoryBadge } from "../common/CategoryBadge";
import { PhenotypeTagBadge } from "../common/PhenotypeTagBadge";
import {
  ChevronRight,
  GitCompare,
  FlaskConical,
  Dna,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface EvidenceMatrixProps {
  assessments: AntibioticAssessment[];
  discordanceEvents?: DiscordanceEvent[];
  astResults?: AstResultItem[];
  onSelectAssessment: (assessment: AntibioticAssessment) => void;
  className?: string;
}

export const EvidenceMatrix: React.FC<EvidenceMatrixProps> = ({
  assessments,
  discordanceEvents = [],
  astResults = [],
  onSelectAssessment,
  className = "",
}) => {
  const [filter, setFilter] = useState<"ALL" | "RESISTANT" | "SUSCEPTIBLE" | "IMMUNE">("ALL");

  const counts = useMemo(() => {
    let resistant = 0;
    let susceptible = 0;
    let immune = 0;
    for (const a of assessments) {
      const tag = (a.phenotypeTag || (a.resultCategory.includes("STRONG") ? "RESISTANT" : "SUSCEPTIBLE")).toUpperCase();
      if (tag === "RESISTANT") resistant++;
      else if (tag === "IMMUNE" || tag === "INTRINSIC") immune++;
      else susceptible++;
    }
    return { all: assessments.length, resistant, susceptible, immune };
  }, [assessments]);

  const filteredAssessments = useMemo(() => {
    if (filter === "ALL") return assessments;
    return assessments.filter((a) => {
      const tag = (a.phenotypeTag || (a.resultCategory.includes("STRONG") ? "RESISTANT" : "SUSCEPTIBLE")).toUpperCase();
      if (filter === "RESISTANT") return tag === "RESISTANT";
      if (filter === "IMMUNE") return tag === "IMMUNE" || tag === "INTRINSIC";
      if (filter === "SUSCEPTIBLE") return tag === "SUSCEPTIBLE";
      return true;
    });
  }, [assessments, filter]);

  return (
    <div
      className={`rounded-card border border-panel-border bg-panel overflow-hidden shadow-sm ${className}`}
      role="region"
      aria-label="Antibiotic Resistance Evidence Matrix"
    >
      {/* Top Header & Filter Bar */}
      <div className="p-4 border-b border-panel-border bg-panel-raised/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-accent" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Antibiotic Resistance Evidence Matrix
            </h3>
            <p className="text-[11px] text-foreground-muted">
              Curated genomic determinant assessments and resistance profiles
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-panel-raised/80 p-1 rounded-control border border-panel-border text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              filter === "ALL"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("RESISTANT")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              filter === "RESISTANT"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>Resistant ({counts.resistant})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("SUSCEPTIBLE")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              filter === "SUSCEPTIBLE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>Susceptible ({counts.susceptible})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter("IMMUNE")}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              filter === "IMMUNE"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-400/80 hover:text-purple-300"
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>Immune ({counts.immune})</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-panel-border bg-panel-raised/40 font-mono text-foreground-muted uppercase text-[11px]">
              <th className="py-3 px-4 font-semibold">Antibiotic</th>
              <th className="py-3 px-4 font-semibold">Resistance Profile</th>
              <th className="py-3 px-4 font-semibold">Genomic Evidence Assessment</th>
              <th className="py-3 px-4 font-semibold">Evidence Tier</th>
              <th className="py-3 px-4 font-semibold text-center">Hits</th>
              <th className="py-3 px-4 font-semibold">Laboratory AST</th>
              <th className="py-3 px-4 font-semibold text-center">Discrepancy</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border/60">
            {filteredAssessments.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-foreground-muted italic">
                  No antibiotics matched the active filter ({filter}).
                </td>
              </tr>
            ) : (
              filteredAssessments.map((assessment) => {
                const hasDiscordance = discordanceEvents.some(
                  (d) => d.antibiotic.toLowerCase() === assessment.antibiotic.toLowerCase()
                );
                const ast = astResults.find(
                  (a) => a.antibiotic.toLowerCase() === assessment.antibiotic.toLowerCase()
                );

                const activeTag = assessment.phenotypeTag || (assessment.resultCategory.includes("STRONG") ? "RESISTANT" : "SUSCEPTIBLE");

                return (
                  <tr
                    key={assessment.id}
                    onClick={() => onSelectAssessment(assessment)}
                    className="hover:bg-panel-raised/50 cursor-pointer transition-colors group"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectAssessment(assessment);
                      }
                    }}
                    role="button"
                    aria-label={`Inspect evidence for ${assessment.antibiotic}`}
                  >
                    <td className="py-3.5 px-4 font-semibold text-foreground capitalize font-sans text-sm">
                      {assessment.antibiotic}
                    </td>
                    <td className="py-3.5 px-4">
                      <PhenotypeTagBadge phenotype={activeTag} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={assessment.resultCategory} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-foreground-muted text-[11px]">
                      {assessment.evidenceTier.replace("_CURATED", "").replace("_", " ")}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                          assessment.findingIds.length > 0
                            ? "bg-accent-subtle text-accent font-semibold"
                            : "text-foreground-muted"
                        }`}
                      >
                        {assessment.findingIds.length}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {ast ? (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-bold text-xs ${
                            ast.category === "R"
                              ? "bg-red-500/15 text-red-300 border border-red-500/30"
                              : ast.category === "I"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-teal-500/15 text-teal-300 border border-teal-500/30"
                          }`}
                        >
                          <FlaskConical className="w-3 h-3" />
                          <span>{ast.category}</span>
                          {ast.mic !== undefined && (
                            <span className="font-normal text-[10px] text-foreground-muted">
                              ({ast.mic} {ast.micUnit || "mg/L"})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-foreground-muted text-[11px] italic">Not Entered</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {hasDiscordance ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/40 text-[11px] font-mono font-semibold"
                          title="Genomic vs Laboratory Discrepancy Flagged"
                        >
                          <GitCompare className="w-3 h-3 shrink-0" />
                          <span>DISCORDANT</span>
                        </span>
                      ) : (
                        <span className="text-foreground-muted/60 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-accent group-hover:translate-x-0.5 transition-transform font-mono text-[11px]">
                        <span>Inspect</span>
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
