import React from "react";
import { AnalysisStatus, StageProgress } from "@/types/contracts";
import { CheckCircle2, Loader2, AlertCircle, Clock, XCircle } from "lucide-react";

interface StageTimelineProps {
  status: AnalysisStatus;
  stageProgress?: StageProgress[];
  error?: { code: string; message: string };
  className?: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
  status,
  stageProgress = [],
  error,
  className = "",
}) => {
  const defaultStages: Array<"VALIDATING" | "ANALYZING" | "INTERPRETING"> = [
    "VALIDATING",
    "ANALYZING",
    "INTERPRETING",
  ];

  const stageDescriptions = {
    VALIDATING: {
      title: "Assembly & QC Validation",
      detail: "Validating FASTA headers, contig lengths, GC ratio, and IUPAC characters",
    },
    ANALYZING: {
      title: "AMRFinderPlus Detection",
      detail: "Scanning assemblies for curated antimicrobial resistance genes and point mutations",
    },
    INTERPRETING: {
      title: "Scientific Rule Interpretation",
      detail: "Applying organism-specific evidence rules and detection-quality caps to matrix pairs",
    },
  };

  const getStageState = (stageName: "VALIDATING" | "ANALYZING" | "INTERPRETING") => {
    const found = stageProgress.find((s) => s.stage === stageName);
    if (found) return found.state;

    // Fallbacks based on top-level status
    if (status === "COMPLETED") return "DONE";
    if (status === "QUEUED") return "PENDING";
    if (status === "FAILED") return "FAILED";
    if (status === stageName) return "RUNNING";

    if (stageName === "VALIDATING") {
      return status === "ANALYZING" || status === "INTERPRETING" ? "DONE" : "PENDING";
    }
    if (stageName === "ANALYZING") {
      return status === "INTERPRETING" ? "DONE" : "PENDING";
    }
    return "PENDING";
  };

  return (
    <div className={`space-y-4 ${className}`} role="region" aria-label="Analysis Stage Progress">
      {status === "QUEUED" && (
        <div className="flex items-center gap-3 p-3 rounded-card bg-panel-raised border border-panel-border text-sm">
          <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
          <div>
            <div className="font-semibold text-foreground">Waiting in Execution Queue</div>
            <div className="text-xs text-foreground-muted">
              Analysis has been registered and is awaiting the next available local worker lease.
            </div>
          </div>
        </div>
      )}

      {status === "CANCELLED" && (
        <div className="flex items-center gap-3 p-3 rounded-card bg-slate-900 border border-slate-700 text-sm">
          <XCircle className="w-5 h-5 text-slate-400 shrink-0" />
          <div>
            <div className="font-semibold text-foreground">Analysis Cancelled</div>
            <div className="text-xs text-foreground-muted">
              Job was cancelled prior to execution worker lock.
            </div>
          </div>
        </div>
      )}

      {status === "FAILED" && error && (
        <div className="p-3.5 rounded-card bg-red-950/40 border border-red-500/40 text-sm space-y-1">
          <div className="flex items-center gap-2 font-semibold text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>Analysis Failed: {error.code}</span>
          </div>
          <p className="text-xs text-red-200/80 pl-6">{error.message}</p>
        </div>
      )}

      <div className="space-y-3">
        {defaultStages.map((stageKey, idx) => {
          const state = getStageState(stageKey);
          const meta = stageDescriptions[stageKey];
          const isDone = state === "DONE";
          const isRunning = state === "RUNNING";
          const isFailed = state === "FAILED" && status === "FAILED";

          return (
            <div
              key={stageKey}
              className={`p-3.5 rounded-card border transition-all ${
                isRunning
                  ? "bg-panel-raised border-accent/40 shadow-sm"
                  : isDone
                  ? "bg-panel border-panel-border/60"
                  : isFailed
                  ? "bg-red-950/20 border-red-500/30"
                  : "bg-panel/40 border-panel-border/30 opacity-70"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-teal-400" />
                  ) : isRunning ? (
                    <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  ) : isFailed ? (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-panel-border flex items-center justify-center text-[10px] font-mono text-foreground-muted">
                      {idx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`text-sm font-semibold ${
                        isRunning
                          ? "text-accent"
                          : isDone
                          ? "text-foreground"
                          : "text-foreground-muted"
                      }`}
                    >
                      {meta.title}
                    </h4>
                    <span
                      className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded ${
                        isDone
                          ? "bg-teal-950/50 text-teal-300 border border-teal-500/30"
                          : isRunning
                          ? "bg-accent-subtle text-accent border border-accent/40 animate-pulse"
                          : "text-foreground-muted bg-panel-raised"
                      }`}
                    >
                      {state}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-muted mt-0.5">{meta.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
