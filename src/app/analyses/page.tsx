"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Analysis, SupportedOrganism } from "@/types/contracts";
import {
  History,
  Search,
  Filter,
  FilePlus2,
  GitCompare,
  Download,
  Loader2,
  RefreshCw,
  Building,
  Dna,
} from "lucide-react";

export default function AnalysisHistoryPage() {
  const { labProfile } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrganism, setFilterOrganism] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAnalyses();
      setAnalyses(res.items || []);
    } catch (err) {
      console.error("Failed to load analysis history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredAnalyses = analyses.filter((a) => {
    if (filterOrganism !== "ALL" && a.organism !== filterOrganism) return false;
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const labelMatch = a.sample?.label?.toLowerCase().includes(q);
      const idMatch = a.id.toLowerCase().includes(q);
      return labelMatch || idMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-panel-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            <h1 className="text-xl font-bold text-foreground">
              Laboratory Analysis History
            </h1>
          </div>
          <p className="text-xs text-foreground-muted font-mono">
            Persisted historical analyses scoped to Laboratory {labProfile?.labId || "Session"}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadHistory}
            className="p-2 rounded-control bg-panel border border-panel-border hover:bg-panel-raised text-foreground-muted hover:text-foreground transition-colors"
            title="Refresh Analysis History"
            aria-label="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/analyses/new"
            className="px-4 py-2 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>New Analysis</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-card border border-panel-border bg-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-foreground-muted">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={filterOrganism}
            onChange={(e) => setFilterOrganism(e.target.value)}
            className="p-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Organisms</option>
            <option value="Klebsiella pneumoniae">Klebsiella pneumoniae</option>
            <option value="Escherichia coli">Escherichia coli</option>
            <option value="Staphylococcus aureus">Staphylococcus aureus</option>
            <option value="Pseudomonas aeruginosa">Pseudomonas aeruginosa</option>
            <option value="Acinetobacter baumannii">Acinetobacter baumannii</option>
            <option value="Enterococcus faecalis">Enterococcus faecalis</option>
            <option value="Salmonella enterica">Salmonella enterica</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="QUEUED">Queued</option>
            <option value="ANALYZING">Analyzing</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search isolate label or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs w-full sm:w-64 focus:outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      {/* History Table */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs font-mono text-foreground-muted">
            Querying laboratory history...
          </p>
        </div>
      ) : filteredAnalyses.length === 0 ? (
        <div className="p-12 rounded-card border border-panel-border bg-panel text-center space-y-3 max-w-md mx-auto">
          <p className="text-xs text-foreground-muted">
            No historical analysis records match your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-panel-border bg-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-panel-border bg-panel-raised/40 font-mono text-foreground-muted uppercase text-[11px]">
                  <th className="py-3 px-4 font-semibold">Isolate Label</th>
                  <th className="py-3 px-4 font-semibold">Organism</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-center">Hits</th>
                  <th className="py-3 px-4 font-semibold text-center">Discordances</th>
                  <th className="py-3 px-4 font-semibold">Provenance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border/60">
                {filteredAnalyses.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-panel-raised/50 transition-colors font-mono"
                  >
                    <td className="py-3.5 px-4 font-bold text-foreground">
                      <Link
                        href={`/analyses/${item.id}`}
                        className="hover:text-accent hover:underline"
                      >
                        {item.sample?.label || item.id}
                      </Link>
                      <span className="block text-[10px] text-foreground-muted font-normal">
                        {item.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-sans italic text-foreground">
                      {item.organism}
                    </td>
                    <td className="py-3.5 px-4 text-foreground-muted text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          item.status === "COMPLETED"
                            ? "bg-teal-950/60 text-teal-300 border border-teal-500/30"
                            : item.status === "FAILED"
                            ? "bg-red-950/60 text-red-300 border border-red-500/30"
                            : "bg-amber-950/60 text-amber-300 border border-amber-500/30 animate-pulse"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-foreground">
                      {item.counts?.findings ?? 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {(item.counts?.openDiscordance ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-300 font-bold bg-rose-950/40 px-2 py-0.5 rounded border border-rose-500/30">
                          <GitCompare className="w-3 h-3" />
                          <span>{item.counts?.openDiscordance}</span>
                        </span>
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[10px] text-foreground-muted">
                      {item.resultOrigin.replace("_ANALYSIS", "").replace("_FIXTURE", "")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/analyses/${item.id}`}
                          className="px-2.5 py-1 rounded bg-panel-raised border border-panel-border text-foreground hover:bg-panel-border text-[11px] font-semibold"
                        >
                          Open
                        </Link>
                        {item.status === "COMPLETED" && (
                          <Link
                            href={`/analyses/${item.id}/report`}
                            className="p-1 rounded text-foreground-muted hover:text-accent"
                            title="Printable Report"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
