import React from "react";
import { DetectionQuality } from "@/types/contracts";

interface DetectionGlyphProps {
  quality: DetectionQuality | string;
  showText?: boolean;
  className?: string;
}

export const DetectionGlyph: React.FC<DetectionGlyphProps> = ({
  quality,
  showText = false,
  className = "",
}) => {
  const renderDots = () => {
    switch (quality) {
      case "EXACT":
        return (
          <span className="text-teal-400 font-mono tracking-tighter" aria-hidden="true">
            ●●●●
          </span>
        );
      case "STRICT":
        return (
          <span className="text-teal-400 font-mono tracking-tighter" aria-hidden="true">
            ●●●<span className="text-slate-600">○</span>
          </span>
        );
      case "PARTIAL":
        return (
          <span className="text-orange-400 font-mono tracking-tighter" aria-hidden="true">
            ●●<span className="text-slate-600">○○</span>
          </span>
        );
      case "LOOSE":
        return (
          <span className="text-amber-400 font-mono tracking-tighter" aria-hidden="true">
            ●<span className="text-slate-600">○○○</span>
          </span>
        );
      case "LOW_QUALITY":
        return (
          <span className="text-red-400 font-mono tracking-tighter" aria-hidden="true">
            ○ <span className="text-[10px] text-red-400 font-sans font-bold">(!)</span>
          </span>
        );
      default:
        return (
          <span className="text-slate-500 font-mono" aria-hidden="true">
            ?
          </span>
        );
    }
  };

  const getLabel = () => {
    switch (quality) {
      case "EXACT":
        return "Exact / Allele Match (100% identity & coverage)";
      case "STRICT":
        return "Strict BLAST/HMM Match (≥90% identity & coverage)";
      case "PARTIAL":
        return "Partial / Truncated Match (<90% coverage or contig edge)";
      case "LOOSE":
        return "Loose Match (<90% identity, capped to Weak)";
      case "LOW_QUALITY":
        return "Low Quality Hit (Internal stop codon or disrupted)";
      default:
        return "Unknown Detection Quality";
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${className}`}
      title={getLabel()}
      role="note"
      aria-label={`Detection Quality: ${quality}`}
    >
      <span className="text-sm select-none">{renderDots()}</span>
      {showText && <span className="text-xs font-mono text-foreground-muted">{quality}</span>}
    </div>
  );
};
