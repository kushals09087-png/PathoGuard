"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AntibioticAssessment, Finding } from "@/types/contracts";
import { StageTimeline } from "@/components/analysis/StageTimeline";
import { EvidenceMatrix } from "@/components/analysis/EvidenceMatrix";
import { GenomeTrack } from "@/components/analysis/GenomeTrack";
import { EvidenceDrawer } from "@/components/analysis/EvidenceDrawer";
import { VersionChip } from "@/components/common/VersionChip";
import { OriginBanner } from "@/components/common/OriginBanner";
import { UseStatement } from "@/components/common/UseStatement";
import {
  FileText,
  GitCompare,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Building,
  Dna,
  History,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function AnalysisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = (params?.id as string) || "";

  const [selectedAssessment, setSelectedAssessment] = useState<AntibioticAssessment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Poll analysis state until terminal
  const {
    data: analysis,
    isLoading: isLoadingAnalysis,
    error: analysisError,
  } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => api.getAnalysis(analysisId),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "COMPLETED" || data.status === "FAILED" || data.status === "CANCELLED") {
        return false;
      }
      return 2000;
    },
    enabled: !!analysisId,
  });

  const isCompleted = analysis?.status === "COMPLETED";

  // Fetch Findings
  const { data: findings = [] } = useQuery({
    queryKey: ["findings", analysisId],
    queryFn: () => api.getAnalysisFindings(analysisId),
    enabled: isCompleted,
  });

  // Fetch Assessments
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", analysisId],
    queryFn: () => api.getAnalysisAssessments(analysisId),
    enabled: isCompleted,
  });

  // Fetch AST Results
  const { data: astResults = [] } = useQuery({
    queryKey: ["ast", analysisId],
    queryFn: () => api.getAnalysisAst(analysisId),
    enabled: isCompleted,
  });

  // Fetch Discordance Events
  const { data: discordanceEvents = [] } = useQuery({
    queryKey: ["discordance", analysisId],
    queryFn: () => api.getAnalysisDiscordance(analysisId),
    enabled: isCompleted,
  });

  const handleOpenDrawer = (assessment: AntibioticAssessment) => {
    setSelectedAssessment(assessment);
    setDrawerOpen(true);
  };

  const handleFindingSelectFromTrack = (finding: Finding) => {
    // Find assessment driving this finding
    const matchingAssessment = assessments.find((a) => a.findingIds.includes(finding.id));
    if (matchingAssessment) {
      setSelectedAssessment(matchingAssessment);
      setDrawerOpen(true);
    }
  };

  const resistanceCounts = React.useMemo(() => {
    let resistant = 0;
    let susceptible = 0;
    let immune = 0;
    for (const a of assessments) {
      const tag = (a.phenotypeTag || (a.resultCategory.includes("STRONG") ? "RESISTANT" : "SUSCEPTIBLE")).toUpperCase();
      if (tag === "RESISTANT") resistant++;
      else if (tag === "IMMUNE" || tag === "INTRINSIC") immune++;
      else susceptible++;
    }
    return { resistant, susceptible, immune, total: assessments.length };
  }, [assessments]);

  if (isLoadingAnalysis) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
        <p className="text-xs font-mono text-foreground-muted">
          Retrieving analysis aggregate {analysisId}...
        </p>
      </div>
    );
  }

  if (analysisError || !analysis) {
    return (
      <div className="p-8 rounded-card border border-red-500/40 bg-red-950/20 text-center space-y-4 max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-foreground">Analysis Not Found</h2>
          <p className="text-xs text-foreground-muted">
            The requested analysis record ({analysisId}) could not be retrieved from the laboratory database.
          </p>
        </div>
        <Link
          href="/analyses"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-panel border border-panel-border text-xs text-foreground hover:bg-panel-raised"
        >
          <History className="w-4 h-4" />
          <span>Return to Analysis History</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-panel-border">
        <div className="flex items-center gap-2">
          <Link
            href="/analyses"
            className="p-1.5 rounded-control text-foreground-muted hover:text-foreground hover:bg-panel-raised transition-colors"
            title="Return to Analysis History"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground font-mono">
                {analysis.sample?.label || analysis.id}
              </span>
              <span className="text-xs text-foreground-muted italic">• {analysis.organism}</span>
            </div>
            <span className="text-[11px] font-mono text-foreground-muted">
              Analysis ID: {analysis.id}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <VersionChip
            versions={analysis.toolVersions}
            ruleSetVersion={analysis.ruleSetVersion}
          />
          {isCompleted && (
            <>
              <Link
                href={`/analyses/${analysis.id}/discordance`}
                className="px-3 py-1.5 rounded-control bg-panel-raised border border-panel-border hover:bg-panel-border text-foreground text-xs font-semibold flex items-center gap-1.5 font-mono"
              >
                <GitCompare className="w-3.5 h-3.5 text-rose-400" />
                <span>Discordance ({discordanceEvents.length})</span>
              </Link>
              <Link
                href={`/analyses/${analysis.id}/report`}
                className="px-3 py-1.5 rounded-control bg-accent text-accent-foreground hover:bg-accent-hover text-xs font-semibold flex items-center gap-1.5 font-mono shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Printable Report</span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Origin Banner */}
      <OriginBanner origin={analysis.resultOrigin} />

      {/* If Still In Progress or Failed */}
      {!isCompleted && (
        <div className="p-6 rounded-card border border-panel-border bg-panel space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Analysis Pipeline In Progress
            </h2>
            <p className="text-xs text-foreground-muted">
              Displaying real pipeline stage progress from the backend execution engine. No synthetic progress bars.
            </p>
          </div>

          <StageTimeline
            status={analysis.status}
            stageProgress={analysis.stageProgress}
            error={analysis.error}
          />

          {analysis.status === "FAILED" && (
            <div className="pt-4 border-t border-panel-border flex justify-end">
              <Link
                href="/analyses/new"
                className="px-4 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Start New Analysis</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Completed Scientific Results Dashboard */}
      {isCompleted && (
        <div className="space-y-6">
          {/* Metadata & Genome QC Summary Strip */}
          <div className="p-4 rounded-card border border-panel-border bg-panel grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-foreground-muted block text-[10px] uppercase">QC Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs ${
                    analysis.qc?.result === "PASS"
                      ? "bg-teal-950/60 text-teal-300 border border-teal-500/40"
                      : analysis.qc?.result === "WARN"
                      ? "bg-amber-950/60 text-amber-300 border border-amber-500/40"
                      : "bg-red-950/60 text-red-300 border border-red-500/40"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{analysis.qc?.result || "PASS"}</span>
                </span>
                {analysis.qc?.warnings && analysis.qc.warnings.length > 0 && (
                  <span className="text-[10px] text-amber-400">
                    ({analysis.qc.warnings.length} warning)
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-foreground-muted block text-[10px] uppercase">Assembly Contigs</span>
              <span className="text-foreground font-semibold text-sm">
                {analysis.qc?.contigCount || 1} contigs
              </span>
            </div>

            <div>
              <span className="text-foreground-muted block text-[10px] uppercase">Total Span</span>
              <span className="text-foreground font-semibold text-sm">
                {analysis.qc?.totalLength
                  ? `${(analysis.qc.totalLength / 1_000_000).toFixed(2)} Mb`
                  : "N/A"}
              </span>
            </div>

            <div>
              <span className="text-foreground-muted block text-[10px] uppercase">N50 / N Fraction</span>
              <span className="text-foreground font-semibold text-sm">
                {analysis.qc?.n50?.toLocaleString() || "N/A"} bp
              </span>
            </div>
          </div>

          {/* Discordance Alert Banner if discrepancies exist */}
          {discordanceEvents.length > 0 && (
            <div className="p-4 rounded-card border border-rose-500/40 bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                  <GitCompare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-rose-200">
                    {discordanceEvents.length} Discrepancy Event(s) Flagged for Laboratory Review
                  </h3>
                  <p className="text-xs text-foreground/80 mt-0.5">
                    Disagreement identified between genomic resistance determinants and laboratory AST phenotypes.
                  </p>
                </div>
              </div>
              <Link
                href={`/analyses/${analysis.id}/discordance`}
                className="px-3.5 py-1.5 rounded-control bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors shrink-0 font-mono shadow-sm"
              >
                Review Discrepancies →
              </Link>
            </div>
          )}

          {/* Clinical Resistance Profile Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-card border border-rose-500/30 bg-rose-950/20 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Resistant</span>
                <span className="text-lg font-bold text-rose-300 font-sans">{resistanceCounts.resistant}</span>
                <span className="text-[10px] text-foreground-muted block">Acquired determinants</span>
              </div>
              <div className="p-2 rounded bg-rose-500/15 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-card border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Susceptible</span>
                <span className="text-lg font-bold text-emerald-300 font-sans">{resistanceCounts.susceptible}</span>
                <span className="text-[10px] text-foreground-muted block">Retained target sensitivity</span>
              </div>
              <div className="p-2 rounded bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-card border border-purple-500/30 bg-purple-950/20 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Immune</span>
                <span className="text-lg font-bold text-purple-300 font-sans">{resistanceCounts.immune}</span>
                <span className="text-[10px] text-foreground-muted block">Intrinsic species resistance</span>
              </div>
              <div className="p-2 rounded bg-purple-500/15 text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
            </div>

            <div className="p-3.5 rounded-card border border-panel-border bg-panel flex items-center justify-between shadow-xs">
              <div>
                <span className="text-foreground-muted block text-[10px] uppercase font-semibold">Evaluated Battery</span>
                <span className="text-lg font-bold text-foreground font-sans">{resistanceCounts.total}</span>
                <span className="text-[10px] text-foreground-muted block">Species-calibrated drugs</span>
              </div>
              <div className="p-2 rounded bg-panel-raised text-accent">
                <Dna className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Antibiotic-Wise Evidence Matrix */}
          <EvidenceMatrix
            assessments={assessments}
            discordanceEvents={discordanceEvents}
            astResults={astResults}
            onSelectAssessment={handleOpenDrawer}
          />

          {/* Genome Physical Coordinate Track */}
          <GenomeTrack
            findings={findings}
            totalLength={analysis.qc?.totalLength}
            contigCount={analysis.qc?.contigCount}
            onSelectFinding={handleFindingSelectFromTrack}
          />

          {/* Evidence Drawer Modal */}
          <EvidenceDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            assessment={selectedAssessment}
            findings={findings}
          />
        </div>
      )}
    </div>
  );
}
