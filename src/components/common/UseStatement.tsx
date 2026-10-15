import React from "react";
import { MANDATORY_USE_STATEMENT } from "@/lib/mockData";
import { AlertCircle } from "lucide-react";

interface UseStatementProps {
  variant?: "footer" | "banner" | "compact";
  className?: string;
}

export const UseStatement: React.FC<UseStatementProps> = ({
  variant = "footer",
  className = "",
}) => {
  if (variant === "banner") {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-control border border-amber-500/30 bg-amber-500/10 text-amber-300 ${className}`}
        role="note"
        aria-label="Research and surveillance use statement"
      >
        <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
        <span>{MANDATORY_USE_STATEMENT}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <p
        className={`text-[11px] text-foreground-muted tracking-wide font-mono ${className}`}
        role="note"
      >
        {MANDATORY_USE_STATEMENT}
      </p>
    );
  }

  return (
    <footer
      className={`border-t border-panel-border bg-panel/60 py-3 px-4 text-center text-xs text-foreground-muted ${className}`}
      role="contentinfo"
    >
      <div className="max-w-content mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-medium text-foreground/80">Genome Firewall</span>
        <span className="font-mono text-[11px] bg-panel-raised px-2 py-0.5 rounded border border-panel-border/50">
          {MANDATORY_USE_STATEMENT}
        </span>
        <span className="text-[11px]">v0.1.0 • Rules-Based Architecture</span>
      </div>
    </footer>
  );
};
