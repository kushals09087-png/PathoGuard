"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AstResultItem, SupportedAntibiotic } from "@/types/contracts";
import { DiscordanceCard } from "@/components/discordance/DiscordanceCard";
import { AstEntryForm } from "@/components/analysis/AstEntryForm";
import {
  GitCompare,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  FlaskConical,
  CheckCircle2,
} from "lucide-react";

export default function IsolateDiscordancePage() {
  const params = useParams();
  const analysisId = (params?.id as string) || "";
  const queryClient = useQueryClient();

  const [showAstForm, setShowAstForm] = useState(false);

  // Load Analysis
  const { data: analysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["analysis", analysisId],
    queryFn: () => api.getAnalysis(analysisId),
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
  const { data: discordanceEvents = [], isLoading: isLoadingDiscordance } = useQuery({
    queryKey: ["discordance", analysisId],
    queryFn: () => api.getAnalysisDiscordance(analysisId),
    enabled: !!analysisId,
  });

  // Mutation to update AST
  const updateAstMutation = useMutation({
    mutationFn: (items: AstResultItem[]) => api.submitAstResults(analysisId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ast", analysisId] });
      queryClient.invalidateQueries({ queryKey: ["discordance", analysisId] });
      queryClient.invalidateQueries({ queryKey: ["assessments", analysisId] });
      setShowAstForm(false);
    },
  });

  if (isLoadingAnalysis || isLoadingDiscordance) {
    return (
      <div className="p-12 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto" />
        <p className="text-xs font-mono text-foreground-muted">Loading discordance data...</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center text-xs text-foreground-muted">
        Analysis not found.
      </div>
    );
  }

  const configuredAntibiotics: SupportedAntibiotic[] = assessments.map((a) => a.antibiotic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-panel-border">
        <div className="flex items-center gap-2">
          <Link
            href={`/analyses/${analysisId}`}
            className="p-1.5 rounded-control text-foreground-muted hover:text-foreground hover:bg-panel-raised transition-colors"
            title="Return to Results"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">
                Discordance Review Center
              </h1>
              <span className="text-xs text-foreground-muted italic">• {analysis.sample?.label || analysis.id}</span>
            </div>
            <p className="text-xs text-foreground-muted font-mono">
              Comparing genomic resistance calls with laboratory AST for {analysis.organism}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAstForm(!showAstForm)}
          className="px-3.5 py-1.5 rounded-control bg-panel-raised border border-panel-border hover:bg-panel-border text-xs font-semibold text-foreground flex items-center gap-1.5 font-mono"
        >
          <FlaskConical className="w-3.5 h-3.5 text-purple-400" />
          <span>{showAstForm ? "Hide AST Form" : "Edit / Add Lab AST"}</span>
        </button>
      </div>

      {/* AST Form Accordion */}
      {showAstForm && (
        <div className="p-5 rounded-card border border-panel-border bg-panel space-y-3">
          <div className="flex items-center justify-between border-b border-panel-border/60 pb-2">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">
              Update Laboratory AST Results
            </h2>
          </div>
          <AstEntryForm
            organism={analysis.organism}
            antibiotics={configuredAntibiotics}
            initialValues={astResults}
            isSubmitting={updateAstMutation.isPending}
            onSubmit={(items) => updateAstMutation.mutate(items)}
          />
        </div>
      )}

      {/* Discordance Events List */}
      {discordanceEvents.length === 0 ? (
        <div className="p-10 rounded-card border border-panel-border bg-panel text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-teal-950/40 border border-teal-500/40 text-teal-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              No Genotype–AST Discordance Detected
            </h2>
            <p className="text-xs text-foreground-muted leading-relaxed">
              {astResults.length === 0
                ? "No laboratory AST phenotypes have been entered for this isolate yet. Enter AST results using the button above to run the comparative discordance engine."
                : "All entered laboratory AST categories are concordant with the genomic evidence calls according to the deterministic rule matrix."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-foreground-muted font-mono">
            <span>
              {discordanceEvents.length} Discrepancy Event(s) Requiring QA Review
            </span>
          </div>

          <div className="space-y-4">
            {discordanceEvents.map((evt) => (
              <DiscordanceCard
                key={evt.id}
                event={evt}
                onStatusChange={() => {
                  queryClient.invalidateQueries({ queryKey: ["discordance", analysisId] });
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
