"use client";

import React, { useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { DetectionGlyph } from "@/components/common/DetectionGlyph";
import { MANDATORY_USE_STATEMENT } from "@/lib/mockData";
import {
  Printer,
  Download,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Building,
  Dna,
  FileCheck,
  AlertTriangle,
  GitCompare,
} from "lucide-react";

export default function ReportPage() {
  const params = useParams();
  const analysisId = (params?.id as string) || "";
  const reportRef = useRef<HTMLDivElement>(null);

  // Load Analysis
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => api.getAnalysis(analysisId),
    enabled: !!analysisId,
  });

  // Load Findings
  const { data: findings = [] } = useQuery({
    queryKey: ["findings", analysisId],
    queryFn: () => api.getAnalysisFindings(analysisId),
    enabled: !!analysisId,
  });

  // Load Assessments
  const { data: assessments = [] } = useQuery({
    queryKey: ["assessments", analysisId],
    queryFn: () => api.getAnalysisAssessments(analysisId),
    enabled: !!analysisId,
  });

  // Load AST Results
  const { data: astResults = [] } = useQuery({
    queryKey: ["ast", analysisId],
    queryFn: () => api.getAnalysisAst(analysisId),
    enabled: !!analysisId,
  });

  // Load Discordance Events
  const { data: discordanceEvents = [] } = useQuery({
    queryKey: ["discordance", analysisId],
    queryFn: () => api.getAnalysisDiscordance(analysisId),
    enabled: !!analysisId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    if (!analysis) return;
    const reportData = {
      title: "Genome Firewall — Explainable Resistance-Evidence Report",
      disclaimer: MANDATORY_USE_STATEMENT,
      generatedAt: new Date().toISOString(),
      analysis,
      assessments,
      findings,
      astResults,
      discordanceEvents,
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GenomeFirewall_Report_${analysis.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoadingAnalysis) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
        <p className="text-xs font-mono text-foreground-muted">Generating report view...</p>
      </div>
    );
  }

  if (!analysis) {
    return <div className="p-8 text-center text-xs text-foreground-muted">Analysis record not found.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top Action Controls (hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-panel-border">
        <div className="flex items-center gap-2">
          <Link
            href={`/analyses/${analysisId}`}
            className="p-1.5 rounded-control text-foreground-muted hover:text-foreground hover:bg-panel-raised transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground font-mono">
              Report View: {analysis.sample?.label || analysis.id}
            </h1>
            <p className="text-xs text-foreground-muted">
              Print-optimized scientific evaluation report with full audit provenance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadJson}
            className="px-3.5 py-1.5 rounded-control bg-panel-raised border border-panel-border hover:bg-panel-border text-foreground text-xs font-semibold flex items-center gap-1.5 font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover text-xs flex items-center gap-1.5 font-mono shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Sheet */}
      <div
        ref={reportRef}
        className="bg-panel border border-panel-border rounded-card p-8 sm:p-10 space-y-8 text-foreground font-sans print:border-none print:p-0 print:bg-white print:text-black shadow-lg"
      >
        {/* Document Header */}
        <div className="border-b border-panel-border pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-accent-subtle border border-accent/40 flex items-center justify-center text-accent">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight">Genome Firewall</span>
            </div>
            <p className="text-xs font-mono text-foreground-muted">
              Explainable Genomic Resistance-Evidence Review Report
            </p>
            <div className="text-[11px] font-mono text-accent pt-1">
              Provenance: {analysis.resultOrigin}
            </div>
          </div>

          <div className="text-right font-mono text-xs text-foreground-muted space-y-1">
            <div>
              <span>Report ID: </span>
              <strong className="text-foreground">{analysis.id}</strong>
            </div>
            <div>
              <span>Date: </span>
              <span className="text-foreground">
                {analysis.completedAt
                  ? new Date(analysis.completedAt).toLocaleString()
                  : new Date().toLocaleString()}
              </span>
            </div>
            <div>
              <span>Authorized Lab: </span>
              <span className="text-foreground">{analysis.labId || "Reference Lab"}</span>
            </div>
          </div>
        </div>

        {/* Mandatory Use Disclaimer Banner */}
        <div className="p-3 rounded border border-panel-border/80 bg-panel-raised/60 text-center font-mono text-xs">
          <strong>USE STATEMENT: </strong>
          <span>{MANDATORY_USE_STATEMENT}</span>
        </div>

        {/* Isolate Metadata & Assembly QC */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded bg-panel-raised/40 border border-panel-border/60 text-xs font-mono">
          <div>
            <span className="text-foreground-muted block text-[10px] uppercase">Isolate Label</span>
            <span className="text-foreground font-bold text-sm">
              {analysis.sample?.label || "Unlabelled"}
            </span>
          </div>
          <div>
            <span className="text-foreground-muted block text-[10px] uppercase">Organism</span>
            <span className="text-foreground font-semibold font-sans italic text-sm">
              {analysis.organism}
            </span>
          </div>
          <div>
            <span className="text-foreground-muted block text-[10px] uppercase">QC Status</span>
            <span className="text-teal-400 font-bold">{analysis.qc?.result || "PASS"}</span>
          </div>
          <div>
            <span className="text-foreground-muted block text-[10px] uppercase">Assembly Stats</span>
            <span>
              {analysis.qc?.contigCount || 1} contigs •{" "}
              {analysis.qc?.totalLength
                ? `${(analysis.qc.totalLength / 1_000_000).toFixed(2)} Mb`
                : "N/A"}
            </span>
          </div>
        </div>

        {/* Antibiotic-Wise Evidence Matrix */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono border-b border-panel-border pb-1.5 flex items-center gap-2">
            <Dna className="w-4 h-4 text-accent" />
            <span>1. Antibiotic Resistance Evidence Matrix</span>
          </h3>

          <div className="border border-panel-border rounded overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-panel-border bg-panel-raised text-foreground-muted text-[11px]">
                  <th className="py-2.5 px-3">Antibiotic</th>
                  <th className="py-2.5 px-3">Genomic Evidence Assessment</th>
                  <th className="py-2.5 px-3">Tier</th>
                  <th className="py-2.5 px-3 text-center">Hits</th>
                  <th className="py-2.5 px-3">Laboratory AST</th>
                  <th className="py-2.5 px-3 text-center">Discordance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border/60 text-xs">
                {assessments.map((a) => {
                  const ast = astResults.find((x) => x.antibiotic === a.antibiotic);
                  const isDiscordant = discordanceEvents.some((d) => d.antibiotic === a.antibiotic);

                  return (
                    <tr key={a.id} className="hover:bg-panel-raised/30">
                      <td className="py-2.5 px-3 font-semibold capitalize font-sans">{a.antibiotic}</td>
                      <td className="py-2.5 px-3">
                        <CategoryBadge category={a.resultCategory} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-foreground-muted text-[11px]">
                        {a.evidenceTier.replace("_CURATED", "").replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-3 text-center">{a.findingIds.length}</td>
                      <td className="py-2.5 px-3">
                        {ast ? (
                          <span>
                            <strong>{ast.category}</strong>
                            {ast.mic !== undefined && ` (${ast.mic} mg/L)`}
                          </span>
                        ) : (
                          <span className="text-foreground-muted italic">Not Entered</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isDiscordant ? (
                          <span className="text-rose-400 font-bold">FLAGGED</span>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Discordance Findings (if any) */}
        {discordanceEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono border-b border-panel-border pb-1.5 flex items-center gap-2 text-rose-300">
              <GitCompare className="w-4 h-4 text-rose-400" />
              <span>2. Flagged Laboratory vs Genomic Discrepancies</span>
            </h3>

            <div className="space-y-3">
              {discordanceEvents.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded bg-panel-raised/40 border border-panel-border text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-foreground capitalize">
                      {d.antibiotic} — {d.discordanceType.replace(/_/g, " ")}
                    </span>
                    <span className="text-red-400 uppercase font-semibold text-[10px]">
                      {d.priority} Priority
                    </span>
                  </div>
                  <p className="text-foreground-muted font-sans text-xs">{d.explanation}</p>
                  {d.reviewNote && (
                    <div className="text-[11px] font-mono text-accent pt-1">
                      QA Note: {d.reviewNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detected Resistance Elements Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono border-b border-panel-border pb-1.5">
            3. Detected Genomic Resistance Determinants ({findings.length})
          </h3>

          <div className="border border-panel-border rounded overflow-hidden">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-panel-border bg-panel-raised text-foreground-muted text-[11px]">
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Element Name & Class</th>
                  <th className="py-2 px-3">Quality</th>
                  <th className="py-2 px-3">% Identity</th>
                  <th className="py-2 px-3">% Coverage</th>
                  <th className="py-2 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border/60">
                {findings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 px-3 text-center text-foreground-muted">
                      No resistance-associated determinants detected by the pinned database.
                    </td>
                  </tr>
                ) : (
                  findings.map((f) => (
                    <tr key={f.id} className="hover:bg-panel-raised/20">
                      <td className="py-2 px-3 font-bold text-foreground">{f.symbol}</td>
                      <td className="py-2 px-3 text-foreground-muted">
                        <div>{f.name}</div>
                        <div className="text-[10px] text-accent">{f.klass} / {f.subclass || "N/A"}</div>
                      </td>
                      <td className="py-2 px-3">
                        <DetectionGlyph quality={f.detectionQuality} showText />
                      </td>
                      <td className="py-2 px-3">{f.identity !== undefined ? `${f.identity.toFixed(1)}%` : "N/A"}</td>
                      <td className="py-2 px-3">{f.coverage !== undefined ? `${f.coverage.toFixed(1)}%` : "N/A"}</td>
                      <td className="py-2 px-3">{f.method}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Provenance & Limitations Audit Box */}
        <div className="p-4 rounded bg-panel-raised/60 border border-panel-border text-xs font-mono space-y-2">
          <div className="font-bold text-foreground uppercase tracking-wider text-[11px]">
            Software Provenance & Biological Limitations
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-foreground-muted">
            <div>AMRFinderPlus: {analysis.toolVersions?.amrfinderplus || "v4.2.7"}</div>
            <div>Reference DB: {analysis.toolVersions?.database || "2024-05-02.1"}</div>
            <div>Rule Set: {analysis.ruleSetVersion || "0.1.0-seed"}</div>
          </div>
          <p className="text-[11px] text-foreground-muted font-sans pt-1 leading-relaxed">
            <strong>Biological Limitations: </strong>
            Assembly-based genomic screening does not assess transcriptional regulation, promoter alterations,
            efflux pump expression, outer-membrane porin permeability, heteroresistance, or non-genetic tolerance.
            Absence of a resistance-associated gene must never be interpreted as proof of antimicrobial susceptibility.
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-panel-border pt-4 text-center text-[10px] font-mono text-foreground-muted space-y-1">
          <div>{MANDATORY_USE_STATEMENT}</div>
          <div>Genome Firewall Research Consortium • Generated via Deterministic Explainability Engine</div>
        </div>
      </div>
    </div>
  );
}
