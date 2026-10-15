"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Analysis, DemoDataset, DiscordanceEvent, PairReliabilityBenchmark } from "@/types/contracts";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { OriginBanner } from "@/components/common/OriginBanner";
import {
  FilePlus2,
  GitCompare,
  History,
  Building,
  Dna,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Clock,
  FlaskConical,
  BookOpen,
} from "lucide-react";

export default function OverviewPage() {
  const { labProfile } = useAuth();
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [demoDatasets, setDemoDatasets] = useState<DemoDataset[]>([]);
  const [benchmarks, setBenchmarks] = useState<PairReliabilityBenchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOverviewData() {
      setIsLoading(true);
      try {
        const [analysesRes, demoRes, benchRes] = await Promise.all([
          api.getAnalyses({ limit: 5 }),
          api.getDemoDatasets(),
          api.getBenchmarks(),
        ]);
        setRecentAnalyses(analysesRes.items || []);
        setDemoDatasets(demoRes || []);
        setBenchmarks(benchRes || []);
      } catch (err) {
        console.error("Failed to load overview data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadOverviewData();
  }, []);

  const completedCount = recentAnalyses.filter((a) => a.status === "COMPLETED").length;
  const processingCount = recentAnalyses.filter(
    (a) => a.status === "QUEUED" || a.status === "VALIDATING" || a.status === "ANALYZING" || a.status === "INTERPRETING"
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome & Lab Banner */}
      <div className="p-6 rounded-card border border-panel-border bg-panel shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase text-accent font-semibold tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Laboratory Workspace</span>
            </span>
            <span className="text-panel-border">•</span>
            <span className="text-xs font-mono text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Scoped
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Welcome, {labProfile?.labName || "Laboratory Team"}
          </h1>
          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            Genome Firewall enables clinical microbiology and surveillance teams to review genomic resistance evidence,
            separate detection from prediction, and systematically audit discordance against laboratory AST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/analyses/new"
            className="px-4 py-2.5 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover transition-colors flex items-center gap-2 text-xs shadow-sm"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>New Analysis</span>
          </Link>
          <Link
            href="/discordance"
            className="px-4 py-2.5 rounded-control bg-panel-raised border border-panel-border hover:bg-panel-border/50 text-foreground font-semibold transition-colors flex items-center gap-2 text-xs"
          >
            <GitCompare className="w-4 h-4 text-rose-400" />
            <span>Review Discordance</span>
          </Link>
        </div>
      </div>

      {/* Primary Differentiator Showcase Banner */}
      <div className="p-4 rounded-card border border-rose-500/30 bg-rose-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase font-bold text-rose-300">
              Primary Differentiator • Laboratory Discrepancy Auditing
            </span>
            <p className="text-xs text-foreground/90 mt-0.5 max-w-2xl">
              Unlike gene-listing databases or black-box ML models, Genome Firewall prioritizes discrepancies between
              genotypic resistance mechanisms and phenotypic laboratory AST results to guide quality assurance and investigate putative novel mechanisms.
            </p>
          </div>
        </div>
        <Link
          href="/discordance"
          className="text-xs font-mono font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 shrink-0"
        >
          <span>Open Queue →</span>
        </Link>
      </div>

      {/* Recent Activity & Demo Datasets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Analyses (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
                Recent Isolate Analyses ({recentAnalyses.length})
              </h2>
            </div>
            <Link
              href="/analyses"
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1"
            >
              <span>View All History →</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 rounded-card border border-panel-border bg-panel text-center text-xs text-foreground-muted">
              Loading recent analyses...
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="p-8 rounded-card border border-panel-border bg-panel text-center space-y-3">
              <p className="text-xs text-foreground-muted">
                No analyses have been registered yet for laboratory {labProfile?.labId}.
              </p>
              <Link
                href="/analyses/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>Upload First Genome Assembly</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAnalyses.map((item) => (
                <Link
                  key={item.id}
                  href={`/analyses/${item.id}`}
                  className="p-4 rounded-card border border-panel-border bg-panel hover:bg-panel-raised transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group block"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground font-mono">
                        {item.sample?.label || item.id}
                      </span>
                      <span className="text-xs text-foreground-muted italic">
                        • {item.organism}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.2 rounded uppercase font-semibold ${
                          item.status === "COMPLETED"
                            ? "bg-teal-950/60 text-teal-300 border border-teal-500/30"
                            : item.status === "FAILED"
                            ? "bg-red-950/60 text-red-300 border border-red-500/30"
                            : "bg-amber-950/60 text-amber-300 border border-amber-500/30 animate-pulse"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-foreground-muted">
                      <span>ID: {item.id.substring(0, 16)}...</span>
                      <span>• Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.counts && (
                        <span>
                          • Findings:{" "}
                          <strong className="text-foreground">{item.counts.findings}</strong>
                        </span>
                      )}
                      {item.counts && item.counts.openDiscordance > 0 && (
                        <span className="text-rose-300 font-bold flex items-center gap-1">
                          <GitCompare className="w-3 h-3" />
                          <span>{item.counts.openDiscordance} Discordance Flag(s)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-accent font-mono group-hover:translate-x-0.5 transition-transform">
                      Inspect Results →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Demonstration Datasets (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider font-mono">
              Labelled Demonstration Datasets
            </h2>
          </div>

          <div className="space-y-3">
            {demoDatasets.map((demo) => (
              <div
                key={demo.id}
                className="p-4 rounded-card border border-panel-border bg-panel space-y-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-accent uppercase font-semibold">
                      {demo.organism}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel-raised text-foreground-muted border border-panel-border">
                      {demo.resultOrigin.replace("_ANALYSIS", "").replace("_FIXTURE", "")}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{demo.label}</h3>
                  <p className="text-xs text-foreground-muted leading-snug">
                    {demo.description}
                  </p>
                </div>

                <div className="p-2.5 rounded bg-panel-raised border border-panel-border/60 text-[11px] font-mono space-y-1 text-foreground-muted">
                  <div>
                    <span className="text-foreground-muted">Expected Markers: </span>
                    <span className="text-foreground">{demo.expectedFindingsSummary}</span>
                  </div>
                  {demo.expectedDiscordanceSummary && (
                    <div>
                      <span className="text-foreground-muted">Discordance: </span>
                      <span className="text-rose-300 font-semibold">
                        {demo.expectedDiscordanceSummary}
                      </span>
                    </div>
                  )}
                </div>

                <Link
                  href={
                    demo.id === "dem_01_kp_concordant"
                      ? "/analyses/ana_01JBX3M8Q2N7V4K9R6T0YHE5ZC"
                      : demo.id === "dem_02_ec_discordant"
                      ? "/analyses/ana_02JBX7C91D3K4L5M6N7P8Q9R0S"
                      : "/analyses/new"
                  }
                  className="w-full py-2 px-3 rounded-control bg-panel-raised hover:bg-panel-border/50 border border-panel-border text-xs text-foreground font-semibold flex items-center justify-center gap-1.5 transition-colors font-mono"
                >
                  <span>Explore Dataset Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
