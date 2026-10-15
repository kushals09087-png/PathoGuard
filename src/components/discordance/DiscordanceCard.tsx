import React, { useState } from "react";
import { DiscordanceEvent, ReviewStatus } from "@/types/contracts";
import { CategoryBadge } from "../common/CategoryBadge";
import { api } from "@/lib/api";
import {
  GitCompare,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  FlaskConical,
  Dna,
} from "lucide-react";

interface DiscordanceCardProps {
  event: DiscordanceEvent;
  onStatusChange?: (updated: DiscordanceEvent) => void;
  className?: string;
}

export const DiscordanceCard: React.FC<DiscordanceCardProps> = ({
  event,
  onStatusChange,
  className = "",
}) => {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(event.reviewStatus);
  const [reviewNote, setReviewNote] = useState(event.reviewNote || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);

  const handleUpdateStatus = async (newStatus: ReviewStatus) => {
    setIsUpdating(true);
    try {
      const updated = await api.updateDiscordanceEvent(event.id, {
        reviewStatus: newStatus,
        reviewNote: reviewNote.trim() || undefined,
      });
      setReviewStatus(newStatus);
      if (onStatusChange) onStatusChange(updated);
    } catch (err) {
      console.error("Failed to update discordance review status:", err);
    } finally {
      setIsUpdating(false);
      setIsEditingNote(false);
    }
  };

  const priorityStyles = {
    high: "border-red-500/50 bg-red-950/20 text-red-300",
    medium: "border-orange-500/50 bg-orange-950/20 text-orange-300",
    info: "border-blue-500/50 bg-blue-950/20 text-blue-300",
  };

  return (
    <div
      className={`rounded-card border border-panel-border bg-panel shadow-sm overflow-hidden ${className}`}
      role="article"
      aria-label={`Discordance Event: ${event.organism} - ${event.antibiotic}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-panel-border bg-panel-raised/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
            <GitCompare className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground capitalize">
                {event.antibiotic}
              </h3>
              <span className="text-xs text-foreground-muted italic">• {event.organism}</span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${priorityStyles[event.priority]}`}
              >
                {event.priority} Priority
              </span>
            </div>
            <span className="text-xs font-mono text-rose-300/90 font-medium">
              {event.discordanceType.replace(/_/g, " ")}
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {reviewStatus === "OPEN" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" /> Open for Review
            </span>
          ) : reviewStatus === "REVIEWED_CONFIRMED" ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
              <CheckCircle className="w-3.5 h-3.5" /> Confirmed Discrepancy
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-slate-500/15 text-slate-300 border border-slate-500/30">
              <HelpCircle className="w-3.5 h-3.5" /> Dismissed
            </span>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-panel-border bg-panel-raised/20">
        {/* Left: Genomic Assessment */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
              <Dna className="w-4 h-4 text-accent" />
              <span>Genomic Evidence Call</span>
            </span>
            <span className="text-[10px] font-mono text-foreground-muted">
              {event.genomic.evidenceTier}
            </span>
          </div>
          <div>
            <CategoryBadge category={event.genomic.resultCategory} size="sm" />
          </div>
          <div className="text-xs font-mono text-foreground-muted space-y-1">
            <div>
              <span>Finding Determinants: </span>
              <span className="text-foreground">
                {event.genomic.findingIds.length > 0
                  ? `${event.genomic.findingIds.length} element(s) matched`
                  : "None detected"}
              </span>
            </div>
            {event.genomic.ruleIds && event.genomic.ruleIds.length > 0 && (
              <div>
                <span>Triggered Rule(s): </span>
                <span className="text-accent">{event.genomic.ruleIds.join(", ")}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Laboratory AST Result */}
        <div className="p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider flex items-center gap-1.5">
              <FlaskConical className="w-4 h-4 text-purple-400" />
              <span>Laboratory AST Result</span>
            </span>
            <span className="text-[10px] font-mono text-foreground-muted">
              {event.ast?.standard || "EUCAST"} {event.ast?.standardVersion || ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 rounded font-mono font-bold text-sm border ${
                event.ast?.category === "R"
                  ? "bg-red-500/20 text-red-300 border-red-500/40"
                  : event.ast?.category === "I"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-teal-500/20 text-teal-300 border-teal-500/40"
              }`}
            >
              {event.ast?.category || "N/A"}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {event.ast?.category === "R"
                ? "Resistant"
                : event.ast?.category === "I"
                ? "Intermediate / Susceptible with Increased Exposure"
                : "Susceptible"}
            </span>
          </div>
          <div className="text-xs font-mono text-foreground-muted space-y-1">
            <div>
              <span>Method: </span>
              <span className="text-foreground">{event.ast?.method || "Unspecified"}</span>
            </div>
            {event.ast?.mic !== undefined && (
              <div>
                <span>MIC: </span>
                <span className="text-foreground">
                  {event.ast.mic} {event.ast.micUnit || "mg/L"}
                </span>
              </div>
            )}
            {event.ast?.zoneDiameterMm !== undefined && (
              <div>
                <span>Zone Diameter: </span>
                <span className="text-foreground">{event.ast.zoneDiameterMm} mm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Explanation & Actionable Guidance */}
      <div className="p-4 bg-panel border-t border-panel-border space-y-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Discrepancy Review Guidance</span>
          </span>
          <p className="text-xs text-foreground/90 leading-relaxed font-sans">
            {event.explanation}
          </p>
        </div>

        {/* Existing Note or Note Editor */}
        {event.reviewNote && !isEditingNote && (
          <div className="p-2.5 rounded bg-panel-raised border border-panel-border/60 text-xs">
            <div className="flex items-center justify-between text-foreground-muted text-[11px] mb-1">
              <span className="font-semibold text-foreground flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-accent" /> Reviewer Notes:
              </span>
              {event.reviewedAt && (
                <span>Recorded: {new Date(event.reviewedAt).toLocaleDateString()}</span>
              )}
            </div>
            <p className="text-foreground italic">{event.reviewNote}</p>
          </div>
        )}

        {isEditingNote && (
          <div className="space-y-2 pt-2">
            <label className="text-xs font-medium text-foreground-muted block">
              Add QA Review Investigation Note:
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Subcultured isolate for repeat AST broth microdilution; verified contig assembly coverage depth."
              className="w-full text-xs p-2.5 rounded bg-panel-raised border border-panel-border text-foreground focus:outline-none focus:border-accent"
              rows={2}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-panel-border/40">
          <button
            type="button"
            onClick={() => setIsEditingNote(!isEditingNote)}
            className="text-xs text-accent hover:underline flex items-center gap-1 font-mono"
          >
            <MessageSquare className="w-3 h-3" />
            <span>{isEditingNote ? "Cancel Note" : event.reviewNote ? "Edit Note" : "Add Review Note"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus("REVIEWED_CONFIRMED")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-control transition-all ${
                reviewStatus === "REVIEWED_CONFIRMED"
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                  : "bg-panel-raised hover:bg-panel-border text-foreground border border-panel-border"
              }`}
            >
              Confirm Discrepancy
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleUpdateStatus("REVIEWED_DISMISSED")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-control transition-all ${
                reviewStatus === "REVIEWED_DISMISSED"
                  ? "bg-slate-700/50 text-slate-300 border border-slate-600"
                  : "bg-panel-raised hover:bg-panel-border text-foreground-muted border border-panel-border"
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
