import React from "react";
import { ResultOrigin } from "@/types/contracts";
import { Database, FlaskConical, Cpu } from "lucide-react";

interface OriginBannerProps {
  origin?: ResultOrigin;
  className?: string;
  showDetails?: boolean;
}

export const OriginBanner: React.FC<OriginBannerProps> = ({
  origin = "REAL_ANALYSIS",
  className = "",
  showDetails = true,
}) => {
  if (origin === "SYNTHETIC_FIXTURE") {
    return (
      <div
        className={`pattern-hatched-synthetic border border-amber-500/40 bg-amber-500/10 text-amber-300 px-4 py-2.5 rounded-card flex items-center justify-between text-xs font-mono ${className}`}
        role="status"
        aria-label="Result Origin: Synthetic Demonstration Data"
      >
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-amber-200">
            Synthetic Demonstration Data
          </span>
          <span className="text-amber-400/80 hidden sm:inline">• Test Fixture Only</span>
        </div>
        {showDetails && (
          <span className="text-[11px] text-amber-400/90 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
            SYNTHETIC_FIXTURE
          </span>
        )}
      </div>
    );
  }

  if (origin === "CACHED_REAL_ANALYSIS") {
    return (
      <div
        className={`pattern-hatched-cached border border-blue-400/40 bg-blue-500/10 text-blue-300 px-4 py-2.5 rounded-card flex items-center justify-between text-xs font-mono ${className}`}
        role="status"
        aria-label="Result Origin: Cached Real Analysis"
      >
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-blue-200">
            Cached Real Analysis
          </span>
          <span className="text-blue-300/80 hidden sm:inline">• Verified Public Isolate</span>
        </div>
        {showDetails && (
          <span className="text-[11px] text-blue-300/90 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-400/30">
            CACHED_REAL_ANALYSIS
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`border border-blue-500/30 bg-blue-500/10 text-blue-200 px-4 py-2.5 rounded-card flex items-center justify-between text-xs font-mono ${className}`}
      role="status"
      aria-label="Result Origin: Real Live Analysis"
    >
      <div className="flex items-center gap-2">
        <Cpu className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-semibold uppercase tracking-wider text-blue-100">
          Real Analysis
        </span>
        <span className="text-blue-300/70 hidden sm:inline">• Executed Pipeline Result</span>
      </div>
      {showDetails && (
        <span className="text-[11px] text-blue-300/80 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/30">
          REAL_ANALYSIS
        </span>
      )}
    </div>
  );
};
