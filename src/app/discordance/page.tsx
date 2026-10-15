"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { DiscordanceEvent, ReviewStatus, SupportedOrganism } from "@/types/contracts";
import { DiscordanceCard } from "@/components/discordance/DiscordanceCard";
import {
  GitCompare,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";

export default function GlobalDiscordanceQueuePage() {
  const [events, setEvents] = useState<DiscordanceEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterOrganism, setFilterOrganism] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadDiscordanceQueue() {
      setIsLoading(true);
      try {
        // Retrieve all analyses to aggregate discordance events across the lab
        const analysesRes = await api.getAnalyses();
        const allEvents: DiscordanceEvent[] = [];

        await Promise.all(
          analysesRes.items.map(async (ana) => {
            const list = await api.getAnalysisDiscordance(ana.id);
            allEvents.push(...list);
          })
        );

        // Sort by priority rank (1 = high, 2 = medium, 3 = info)
        allEvents.sort((a, b) => a.priorityRank - b.priorityRank);
        setEvents(allEvents);
      } catch (err) {
        console.error("Failed to load discordance queue:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDiscordanceQueue();
  }, []);

  // Filtered Events
  const filteredEvents = events.filter((evt) => {
    if (filterOrganism !== "ALL" && evt.organism !== filterOrganism) return false;
    if (filterPriority !== "ALL" && evt.priority !== filterPriority) return false;
    if (filterStatus !== "ALL" && evt.reviewStatus !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        evt.antibiotic.toLowerCase().includes(q) ||
        evt.organism.toLowerCase().includes(q) ||
        evt.discordanceType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const highPriorityCount = events.filter((e) => e.priority === "high" && e.reviewStatus === "OPEN").length;
  const mediumPriorityCount = events.filter((e) => e.priority === "medium" && e.reviewStatus === "OPEN").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 rounded-card border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/20 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 animate-fade-in">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <GitCompare className="w-4 h-4 animate-pulse-subtle" />
            </div>
            <span className="text-xs font-mono uppercase text-rose-400 font-bold tracking-wider">
              Primary Differentiator
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Laboratory Discordance Review Center
          </h1>
          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            A centralized audit queue for investigating discrepancies between genomic resistance determinants
            and phenotypic antimicrobial susceptibility test (AST) measurements.
          </p>
        </div>

        {/* Priority Counts Badge */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="p-3 rounded-control bg-panel border border-panel-border text-center">
            <span className="text-red-400 font-bold text-base block">{highPriorityCount}</span>
            <span className="text-[10px] text-foreground-muted">High Priority Open</span>
          </div>
          <div className="p-3 rounded-control bg-panel border border-panel-border text-center">
            <span className="text-amber-400 font-bold text-base block">{mediumPriorityCount}</span>
            <span className="text-[10px] text-foreground-muted">Medium Priority Open</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
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
            <option value="Escherichia coli">Escherichia coli</option>
            <option value="Klebsiella pneumoniae">Klebsiella pneumoniae</option>
            <option value="Staphylococcus aureus">Staphylococcus aureus</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="p-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="info">Info / Unsupported</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="OPEN">Open for Review</option>
            <option value="REVIEWED_CONFIRMED">Reviewed & Confirmed</option>
            <option value="REVIEWED_DISMISSED">Dismissed</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-foreground-muted absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search antibiotic or mechanism..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 rounded bg-panel-raised border border-panel-border text-foreground text-xs w-full sm:w-56 focus:outline-none focus:border-accent font-mono"
          />
        </div>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
          <p className="text-xs font-mono text-foreground-muted">
            Aggregating laboratory discordance events...
          </p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-12 rounded-card border border-panel-border bg-panel text-center space-y-3 max-w-md mx-auto">
          <CheckCircle2 className="w-8 h-8 text-teal-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Discordance Events Found</h3>
            <p className="text-xs text-foreground-muted">
              {events.length === 0
                ? "No discordance events have been recorded across your laboratory analyses yet."
                : "No events match the selected filter criteria."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((evt) => (
            <DiscordanceCard
              key={evt.id}
              event={evt}
              onStatusChange={(updated) => {
                setEvents((prev) =>
                  prev.map((item) => (item.id === updated.id ? updated : item))
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
