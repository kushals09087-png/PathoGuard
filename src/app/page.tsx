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
  Activity,
  Cpu,
  Layers,
  ChevronRight,
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
          api.getAnalyses({ limit: 6 }),
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

  const completedCount = recentAnalyses.filter(
    (a) => a.status === "COMPLETED" || (a.status as string) === "COMPLETED_WITH_WARNINGS"
  ).length;
  const processingCount = recentAnalyses.filter(
    (a) => a.status === "QUEUED" || a.status === "VALIDATING" || a.status === "ANALYZING" || a.status === "INTERPRETING"
  ).length;
  const totalDiscordance = recentAnalyses.reduce(
    (acc, curr) => acc + (curr.counts?.openDiscordance || 0),
    0
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome & Lab Banner */}
      <div className="p-6 rounded-card border border-panel-border bg-panel shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300">
        {/* Subtle accent corner glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase text-accent font-semibold tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Laboratory Workspace</span>
            </span>
            <span className="text-panel-border">•</span>
            <span className="text-xs font-mono text-teal-400 bg-teal-950/40 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Scoped
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Welcome, {labProfile?.labName || "Laboratory Team"}
          </h1>
          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            PathoGuard enables clinical microbiology and surveillance teams to review genomic resistance evidence,
            separate detection from prediction, and systematically audit discordance against laboratory AST.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            href="/analyses/new"
            className="px-4 py-2.5 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover transition-all duration-200 flex items-center gap-2 text-xs shadow-md shadow-accent/20 hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>New Analysis</span>
          </Link>
          <Link
            href="/discordance"
            className="px-4 py-2.5 rounded-control bg-panel-raised border border-panel-border hover:bg-panel-border/50 text-foreground font-semibold transition-all duration-200 flex items-center gap-2 text-xs hover:border-rose-500/40"
          >
            <GitCompare className="w-4 h-4 text-rose-400" />
            <span>Review Discordance</span>
          </Link>
        </div>
      </div>

      {/* Live System Telemetry / Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Analyses */}
        <div className="p-4 rounded-card border border-panel-border bg-panel hover-lift space-y-1">
          <div className="flex items-center justify-between text-foreground-muted">
            <span className="text-[11px] font-mono uppercase tracking-wide">Analyses In Scope</span>
            <Activity className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {isLoading ? "..." : recentAnalyses.length}
          </div>
          <div className="text-[10px] text-foreground-muted flex items-center gap-1 font-mono">
            <span className="text-teal-400 font-semibold">{completedCount}</span> completed
          </div>
        </div>

        {/* Card 2: Active Worker Pipeline */}
        <div className="p-4 rounded-card border border-panel-border bg-panel hover-lift space-y-1">
          <div className="flex items-center justify-between text-foreground-muted">
            <span className="text-[11px] font-mono uppercase tracking-wide">Worker Queue</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-foreground font-mono">
            {isLoading ? "..." : processingCount}
          </div>
          <div className="text-[10px] text-foreground-muted font-mono">
            Live asynchronous pipeline
          </div>
        </div>

        {/* Card 3: Discordance Flagged */}
        <div className="p-4 rounded-card border border-panel-border bg-panel hover-lift space-y-1">
          <div className="flex items-center justify-between text-foreground-muted">
            <span className="text-[11px] font-mono uppercase tracking-wide">Open Discordances</span>
            <GitCompare className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {isLoading ? "..." : totalDiscordance}
          </div>
          <div className="text-[10px] text-rose-400/80 font-mono">
            Requires pathologist review
          </div>
        </div>

        {/* Card 4: Scientific Engine */}
        <div className="p-4 rounded-card border border-panel-border bg-panel hover-lift space-y-1">
          <div className="flex items-center justify-between text-foreground-muted">
            <span className="text-[11px] font-mono uppercase tracking-wide">AMRFinderPlus Engine</span>
            <Cpu className="w-4 h-4 text-accent" />
          </div>
          <div className="text-sm font-bold text-foreground font-mono truncate pt-1">
            v4.2.7 (NCBI)
          </div>
          <div className="text-[10px] text-foreground-muted font-mono truncate">
            DB: 2026-08-07.1
          </div>
        </div>
      </div>

      {/* Primary Differentiator Showcase Banner */}
      <div className="p-4 rounded-card border border-rose-500/30 bg-rose-950/15 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-300">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0 mt-0.5">
            <GitCompare className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase font-bold text-rose-400">
              Primary Differentiator • Laboratory Discrepancy Auditing
            </span>
            <p className="text-xs text-foreground/90 mt-0.5 max-w-2xl">
              Unlike gene-listing databases or unvalidated models, PathoGuard prioritizes discrepancies between
              genotypic resistance mechanisms and phenotypic laboratory AST results to guide quality assurance and investigate putative novel mechanisms.
            </p>
          </div>
        </div>
        <Link
          href="/discordance"
          className="text-xs font-mono font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 shrink-0 group"
        >
          <span>Open Queue</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
              className="text-xs font-mono text-accent hover:underline flex items-center gap-1 group"
            >
              <span>View All History</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs shadow-sm hover:bg-accent-hover transition-colors"
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
                  className="p-4 rounded-card border border-panel-border bg-panel hover:bg-panel-raised hover:border-accent/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group block hover-lift"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground font-mono group-hover:text-accent transition-colors">
                        {item.sample?.label || item.id}
                      </span>
                      <span className="text-xs text-foreground-muted italic">
                        • {item.organism}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                          item.status === "COMPLETED" || (item.status as string) === "COMPLETED_WITH_WARNINGS"
                            ? "bg-teal-500/15 text-teal-400 border border-teal-500/30"
                            : item.status === "FAILED"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
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
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <GitCompare className="w-3 h-3" />
                          <span>{item.counts.openDiscordance} Discordance Flag(s)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-accent font-mono group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>Inspect Results</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
                className="p-4 rounded-card border border-panel-border bg-panel space-y-3 hover-lift transition-all duration-200 hover:border-purple-500/30"
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
                      <span className="text-rose-400 font-semibold">
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
                  className="w-full py-2 px-3 rounded-control bg-panel-raised hover:bg-panel-border/50 border border-panel-border text-xs text-foreground font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 font-mono hover:border-accent/40 group"
                >
                  <span>Explore Dataset Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5 text-accent group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
