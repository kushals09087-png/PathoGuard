import React from "react";
import { ShieldAlert, ShieldCheck, Zap, HelpCircle } from "lucide-react";

export type PhenotypeTag = "RESISTANT" | "SUSCEPTIBLE" | "IMMUNE";

interface PhenotypeTagBadgeProps {
  phenotype?: PhenotypeTag | string | null;
  size?: "xs" | "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const PhenotypeTagBadge: React.FC<PhenotypeTagBadgeProps> = ({
  phenotype,
  size = "md",
  showIcon = true,
  className = "",
}) => {
  const norm = (phenotype || "").toUpperCase().trim();

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1 tracking-wider",
    sm: "px-2 py-0.5 text-[11px] gap-1 tracking-wider",
    md: "px-2.5 py-1 text-xs gap-1.5 tracking-wider",
    lg: "px-3.5 py-1.5 text-sm gap-2 tracking-wider",
  };

  const iconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  if (norm === "RESISTANT") {
    return (
      <span
        className={`inline-flex items-center font-bold font-mono rounded border border-rose-500/40 bg-rose-500/20 text-rose-300 shadow-sm ${sizeClasses[size]} ${className}`}
        role="status"
        aria-label="Resistance Profile: Resistant"
        title="Antimicrobial Resistance Determinant Confirmed"
      >
        {showIcon && <ShieldAlert className={`${iconSizes[size]} text-rose-400 shrink-0 fill-rose-500/20`} />}
        <span>RESISTANT</span>
      </span>
    );
  }

  if (norm === "SUSCEPTIBLE") {
    return (
      <span
        className={`inline-flex items-center font-bold font-mono rounded border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-sm ${sizeClasses[size]} ${className}`}
        role="status"
        aria-label="Resistance Profile: Susceptible"
        title="Retained Target Sensitivity Confirmed"
      >
        {showIcon && <ShieldCheck className={`${iconSizes[size]} text-emerald-400 shrink-0 fill-emerald-500/20`} />}
        <span>SUSCEPTIBLE</span>
      </span>
    );
  }

  if (norm === "IMMUNE" || norm === "INTRINSIC") {
    return (
      <span
        className={`inline-flex items-center font-bold font-mono rounded border border-purple-500/40 bg-purple-500/20 text-purple-300 shadow-sm ${sizeClasses[size]} ${className}`}
        role="status"
        aria-label="Resistance Profile: Immune"
        title="Intrinsic Species-Level Immunity / Natural Antimicrobial Resistance"
      >
        {showIcon && <Zap className={`${iconSizes[size]} text-purple-400 shrink-0 fill-purple-500/20`} />}
        <span>IMMUNE</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold font-mono rounded border border-panel-border bg-panel-raised text-foreground-muted ${sizeClasses[size]} ${className}`}
      role="status"
    >
      {showIcon && <HelpCircle className={`${iconSizes[size]} text-foreground-muted shrink-0`} />}
      <span>{norm || "UNASSESSED"}</span>
    </span>
  );
};
