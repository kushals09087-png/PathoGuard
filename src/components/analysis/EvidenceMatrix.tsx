import React from "react";
import {
  AntibioticAssessment,
  DiscordanceEvent,
  AstResultItem,
} from "@/types/contracts";
import { CategoryBadge } from "../common/CategoryBadge";
import {
  ChevronRight,
  GitCompare,
  FlaskConical,
  Dna,
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
  return (
    <div
      className={`rounded-card border border-panel-border bg-panel overflow-hidden ${className}`}
      role="region"
      aria-label="Antibiotic Resistance Evidence Matrix"
    >
      <div className="p-4 border-b border-panel-border bg-panel-raised/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Antibiotic Resistance Evidence Matrix
          </h3>
        </div>
        <span className="text-xs text-foreground-muted font-mono">
          {assessments.length} Configured Matrix Pairs
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-panel-border bg-panel-raised/40 font-mono text-foreground-muted uppercase text-[11px]">
              <th className="py-3 px-4 font-semibold">Antibiotic</th>
              <th className="py-3 px-4 font-semibold">Genomic Evidence Assessment</th>
              <th className="py-3 px-4 font-semibold">Evidence Tier</th>
              <th className="py-3 px-4 font-semibold text-center">Hits</th>
              <th className="py-3 px-4 font-semibold">Laboratory AST</th>
              <th className="py-3 px-4 font-semibold text-center">Discrepancy</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border/60">
            {assessments.map((assessment) => {
              const hasDiscordance = discordanceEvents.some(
                (d) => d.antibiotic === assessment.antibiotic
              );
              const ast = astResults.find(
                (a) => a.antibiotic === assessment.antibiotic
              );

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
                  <td className="py-3.5 px-4 font-medium text-foreground capitalize font-sans text-sm">
                    {assessment.antibiotic}
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
