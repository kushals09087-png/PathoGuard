import React, { useEffect } from "react";
import {
  AntibioticAssessment,
  Finding,
  EvidenceTier,
} from "@/types/contracts";
import { CategoryBadge } from "../common/CategoryBadge";
import { DetectionGlyph } from "../common/DetectionGlyph";
import { PairReliabilityPanel } from "./PairReliabilityPanel";
import {
  X,
  BookOpen,
  AlertTriangle,
  ExternalLink,
  Tag,
  Dna,
  Shield,
  Layers,
} from "lucide-react";

interface EvidenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AntibioticAssessment | null;
  findings: Finding[];
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  isOpen,
  onClose,
  assessment,
  findings,
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !assessment) return null;

  // Find findings associated with this assessment
  const associatedFindings = findings.filter((f) =>
    assessment.findingIds.includes(f.id)
  );

  const getTierLabel = (tier: EvidenceTier) => {
    switch (tier) {
      case "A_CURATED_STRONG":
        return "Tier A — Curated, Well-Established Determinant";
      case "B_CURATED_MODERATE":
        return "Tier B — Context-Dependent or Moderate Penetrance";
      case "C_INDIRECT":
        return "Tier C — Indirect / Exploratory Marker";
      case "D_EXPLORATORY":
        return "Tier D — Experimental Candidate";
      case "INSUFFICIENT":
        return "Tier Insufficient — No Curated Determinant";
      default:
        return tier;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-panel border-l border-panel-border shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-5 border-b border-panel-border flex items-start justify-between bg-panel-raised/50">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono uppercase text-accent tracking-wider font-semibold">
                  Genomic Evidence Explorer
                </span>
                <span className="text-panel-border">•</span>
                <span className="text-xs text-foreground-muted italic">
                  {assessment.organism}
                </span>
              </div>
              <h2
                id="evidence-drawer-title"
                className="text-xl font-bold text-foreground capitalize flex items-center gap-2"
              >
                <span>{assessment.antibiotic}</span>
                <CategoryBadge category={assessment.resultCategory} size="sm" />
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-control text-foreground-muted hover:text-foreground hover:bg-panel-border/30 transition-colors"
              aria-label="Close evidence drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Scientific Explanation Card */}
            <div className="p-4 rounded-card bg-panel-raised border border-panel-border space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-accent" />
                <span>Interpretation & Scientific Rationale</span>
              </h3>
              <p className="text-sm text-foreground leading-relaxed">
                {assessment.explanation ||
                  "Organism-specific assessment derived from configured reference rules."}
              </p>
              {assessment.capped && (
                <div className="flex items-center gap-2 text-xs font-mono text-orange-400 bg-orange-950/40 border border-orange-500/30 p-2 rounded mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Quality Cap Applied: Result category capped due to partial or loose finding quality.
                  </span>
                </div>
              )}
            </div>

            {/* Evidence Tier & Rule Provenance */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-accent" />
                <span>Applied Curated Rules & Evidence Tier</span>
              </h3>
              <div className="p-3.5 rounded-card bg-panel-raised border border-panel-border text-xs space-y-2 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Evidence Tier</span>
                  <span className="text-foreground font-semibold">
                    {getTierLabel(assessment.evidenceTier)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground-muted">Applied Rule Identifiers</span>
                  <div className="flex gap-1.5">
                    {assessment.ruleIds.length > 0 ? (
                      assessment.ruleIds.map((rId) => (
                        <span
                          key={rId}
                          className="bg-panel px-2 py-0.5 rounded border border-panel-border text-accent font-semibold"
                        >
                          {rId}
                        </span>
                      ))
                    ) : (
                      <span className="text-foreground-muted">None (No Rule Matched)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Driving Genomic Findings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Dna className="w-4 h-4 text-accent" />
                  <span>Driving Detected Markers ({associatedFindings.length})</span>
                </h3>
                <span className="text-xs text-foreground-muted font-mono">
                  AMRFinderPlus Calls
                </span>
              </div>

              {associatedFindings.length === 0 ? (
                <div className="p-4 rounded-card bg-panel-raised border border-panel-border text-xs text-foreground-muted">
                  No driving resistance determinants detected in this assembly for {assessment.antibiotic}.
                  Remember: absence of evidence is not proof of susceptibility.
                </div>
              ) : (
                <div className="space-y-3">
                  {associatedFindings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-4 rounded-card bg-panel-raised border border-panel-border space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-foreground">
                              {finding.symbol}
                            </span>
                            <DetectionGlyph quality={finding.detectionQuality} showText />
                          </div>
                          <p className="text-xs text-foreground-muted mt-0.5">{finding.name}</p>
                        </div>
                        <span className="text-[11px] font-mono text-accent bg-accent-subtle px-2 py-0.5 rounded border border-accent/30">
                          {finding.elementType}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-panel p-2.5 rounded border border-panel-border/60">
                        <div>
                          <span className="text-foreground-muted block text-[10px]">Method</span>
                          <span className="text-foreground font-medium">{finding.method}</span>
                        </div>
                        <div>
                          <span className="text-foreground-muted block text-[10px]">% Identity</span>
                          <span className="text-foreground font-medium">
                            {finding.identity !== undefined ? `${finding.identity.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-foreground-muted block text-[10px]">% Coverage</span>
                          <span className="text-foreground font-medium">
                            {finding.coverage !== undefined ? `${finding.coverage.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-foreground-muted block text-[10px]">Coordinates</span>
                          <span className="text-foreground font-medium truncate block">
                            {finding.contigId
                              ? `${finding.contigId}:${finding.start || 0}-${finding.stop || 0}`
                              : "Unplaced"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Limitations & Blind Spots */}
            <div className="p-4 rounded-card bg-panel-raised/50 border border-panel-border space-y-2">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Known Scope & Biological Limitations</span>
              </h3>
              <p className="text-xs text-foreground-muted leading-relaxed">
                {assessment.limitations}
              </p>
              <div className="text-[11px] text-foreground-muted pt-1 border-t border-panel-border/40">
                Assembly-based detection does not measure gene expression levels, promoter mutations,
                efflux pump regulation, membrane porin loss, or heteroresistance.
              </div>
            </div>

            {/* Pair Reliability Benchmark Panel */}
            <PairReliabilityPanel
              organism={assessment.organism}
              antibiotic={assessment.antibiotic}
            />

            {/* Citable Reference Sources */}
            {assessment.ruleSources && assessment.ruleSources.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-purple-400" />
                  <span>Literature & Citable Primary Sources</span>
                </h3>
                <div className="space-y-2">
                  {assessment.ruleSources.map((src) => (
                    <div
                      key={src.id}
                      className="p-3 rounded-card bg-panel-raised border border-panel-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{src.title}</span>
                        {src.url && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-foreground-muted text-[11px] font-mono">{src.citation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-panel-border bg-panel-raised/80 flex items-center justify-between text-xs text-foreground-muted">
            <span className="font-mono text-[11px]">
              Analysis ID: {assessment.analysisId.substring(0, 16)}...
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover transition-colors"
            >
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
