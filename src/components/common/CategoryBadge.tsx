import React from "react";
import { ResultCategory } from "@/types/contracts";
import {
  ShieldAlert,
  Shield,
  HelpCircle,
  MinusCircle,
  Ban,
  AlertTriangle,
} from "lucide-react";

interface CategoryBadgeProps {
  category: ResultCategory | string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = ({
  category,
  size = "md",
  showIcon = true,
  className = "",
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  switch (category) {
    case "RESISTANCE_EVIDENCE_STRONG":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-red-500/40 bg-red-500/15 text-red-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Strong resistance evidence"
        >
          {showIcon && <ShieldAlert className={`${iconSizes[size]} text-red-400 shrink-0 fill-red-400/30`} />}
          <span>Strong resistance evidence</span>
        </span>
      );

    case "RESISTANCE_EVIDENCE_MODERATE":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-orange-500/40 bg-orange-500/15 text-orange-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Moderate resistance evidence"
        >
          {showIcon && <ShieldAlert className={`${iconSizes[size]} text-orange-400 shrink-0`} />}
          <span>Moderate resistance evidence</span>
        </span>
      );

    case "RESISTANCE_EVIDENCE_WEAK":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-amber-500/40 bg-amber-500/15 text-amber-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Weak resistance evidence"
        >
          {showIcon && <Shield className={`${iconSizes[size]} text-amber-400 shrink-0`} />}
          <span>Weak resistance evidence</span>
        </span>
      );

    case "INCONCLUSIVE":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-purple-500/40 bg-purple-500/15 text-purple-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Inconclusive evidence"
        >
          {showIcon && <HelpCircle className={`${iconSizes[size]} text-purple-400 shrink-0`} />}
          <span>Inconclusive</span>
        </span>
      );

    case "INSUFFICIENT_EVIDENCE":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-slate-500/30 bg-slate-500/15 text-slate-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: No known marker detected (not evidence of susceptibility)"
          title="No known marker detected by the pinned database. This is not evidence of susceptibility."
        >
          {showIcon && <MinusCircle className={`${iconSizes[size]} text-slate-400 shrink-0`} />}
          <span>No known marker detected</span>
        </span>
      );

    case "NOT_ASSESSABLE":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-slate-600/40 bg-slate-700/20 text-slate-400 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Not assessable"
        >
          {showIcon && <Ban className={`${iconSizes[size]} text-slate-500 shrink-0`} />}
          <span>Not assessable</span>
        </span>
      );

    case "SUSCEPTIBILITY_EVIDENCE_LIMITED":
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-teal-500/40 bg-teal-500/15 text-teal-300 ${sizeClasses[size]} ${className}`}
          role="status"
          aria-label="Result: Limited susceptibility evidence (experimental)"
        >
          {showIcon && <Shield className={`${iconSizes[size]} text-teal-400 shrink-0`} />}
          <span>Susceptibility evidence (limited)</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-panel-border bg-panel-raised text-foreground-muted ${sizeClasses[size]} ${className}`}
          role="status"
        >
          {showIcon && <AlertTriangle className={`${iconSizes[size]} text-foreground-muted shrink-0`} />}
          <span>{category || "Unknown"}</span>
        </span>
      );
  }
};
