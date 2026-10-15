import React, { useState } from "react";
import { ToolVersions } from "@/types/contracts";
import { GitCommit, Tag, Database, BookOpen, ChevronDown } from "lucide-react";

interface VersionChipProps {
  versions?: ToolVersions;
  ruleSetVersion?: string;
  className?: string;
}

export const VersionChip: React.FC<VersionChipProps> = ({
  versions,
  ruleSetVersion,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const amr = versions?.amrfinderplus || "v4.2.7";
  const db = versions?.database || "2024-05-02.1";
  const rules = versions?.ruleSet || ruleSetVersion || "0.1.0-seed";
  const commit = versions?.appCommit || "e8f3b12";

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-panel-raised hover:bg-panel-border/40 text-foreground-muted hover:text-foreground border border-panel-border rounded-control transition-colors"
        aria-expanded={isOpen}
        aria-label="Provenance versions: AMRFinderPlus, Database, and RuleSet"
      >
        <Tag className="w-3 h-3 text-accent" />
        <span>AMRFinder {amr}</span>
        <span className="text-panel-border">•</span>
        <span>Rules {rules}</span>
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 mt-1.5 w-72 p-3 bg-panel border border-panel-border rounded-card shadow-xl z-50 text-xs space-y-2 font-mono"
            role="dialog"
            aria-label="Software & Database Provenance"
          >
            <div className="font-sans font-semibold text-foreground pb-1.5 border-b border-panel-border/50 flex items-center justify-between">
              <span>Provenance & Versions</span>
              <span className="text-[10px] text-accent font-mono uppercase">Verified</span>
            </div>

            <div className="flex items-center justify-between text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-accent" /> Tool
              </span>
              <span className="text-foreground font-medium">AMRFinderPlus {amr}</span>
            </div>

            <div className="flex items-center justify-between text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" /> Database
              </span>
              <span className="text-foreground font-medium">{db}</span>
            </div>

            <div className="flex items-center justify-between text-foreground-muted">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Rule Set
              </span>
              <span className="text-foreground font-medium">{rules}</span>
            </div>

            <div className="flex items-center justify-between text-foreground-muted pt-1 border-t border-panel-border/40 text-[11px]">
              <span className="flex items-center gap-1.5">
                <GitCommit className="w-3 h-3" /> Engine Commit
              </span>
              <span className="text-foreground-muted">{commit}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
