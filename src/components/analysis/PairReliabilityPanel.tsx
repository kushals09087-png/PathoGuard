import React from "react";
import { PairReliabilityBenchmark, SupportedAntibiotic, SupportedOrganism } from "@/types/contracts";
import { BENCHMARK_DATA } from "@/lib/mockData";
import { BarChart3, HelpCircle, ShieldCheck, AlertCircle } from "lucide-react";

interface PairReliabilityPanelProps {
  organism: SupportedOrganism;
  antibiotic: SupportedAntibiotic;
  className?: string;
}

export const PairReliabilityPanel: React.FC<PairReliabilityPanelProps> = ({
  organism,
  antibiotic,
  className = "",
}) => {
  const benchmark: PairReliabilityBenchmark | undefined = BENCHMARK_DATA.find(
    (b) => b.organism === organism && b.antibiotic === antibiotic
  );

  if (!benchmark) {
    return (
      <div
        className={`p-3.5 rounded-card border border-panel-border bg-panel-raised/50 text-xs text-foreground-muted space-y-1 ${className}`}
        role="region"
        aria-label="Pair-Level Measured Reliability Benchmark"
      >
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <HelpCircle className="w-4 h-4 text-panel-border" />
          <span>Benchmark Reliability Evidence</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          Validated benchmark reliability data is not yet calibrated for this specific{" "}
          <strong className="text-foreground">{organism} — {antibiotic}</strong> pair on held-out public datasets.
          Per project scientific guidelines, absence of benchmark data is never presented as 100% reliability.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-card border border-panel-border bg-panel space-y-3 ${className}`}
      role="region"
      aria-label="Pair-Level Measured Reliability Benchmark"
    >
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-panel-border/50">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <h4 className="text-sm font-semibold text-foreground">
              Measured Pair-Level Reliability
            </h4>
          </div>
          <p className="text-xs text-foreground-muted">
            Independent evaluation on held-out bacterial isolates with confirmed phenotypic AST.
          </p>
        </div>
        <span className="text-[11px] font-mono text-accent bg-accent-subtle px-2 py-0.5 rounded border border-accent/30">
          N = {benchmark.evaluatedIsolatesCount} isolates
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-2.5 rounded bg-panel-raised border border-panel-border/60">
          <span className="text-[11px] text-foreground-muted block">Genomic–AST Concordance</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-foreground font-mono">
              {benchmark.concordancePercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-foreground-muted font-mono">
              (95% CI: {benchmark.wilsonIntervalLower}–{benchmark.wilsonIntervalUpper}%)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-panel-raised border border-panel-border/60">
          <span className="text-[11px] text-foreground-muted block">Pipeline Abstention Rate</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-foreground font-mono">
              {benchmark.abstentionRatePercent.toFixed(1)}%
            </span>
            <span className="text-[10px] text-foreground-muted font-mono">
              (Insufficient/Inconclusive)
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-panel-raised border border-panel-border/60">
          <span className="text-[11px] text-foreground-muted block">Evaluation Split Protocol</span>
          <div className="mt-1">
            <span className="text-xs font-mono font-medium text-foreground uppercase bg-panel px-1.5 py-0.5 rounded border border-panel-border">
              {benchmark.splitMethod.replace("_", "-")}
            </span>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-foreground-muted space-y-1 pt-1">
        <div className="flex items-center gap-1 text-foreground/80 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-accent" />
          <span>Dataset: {benchmark.datasetName}</span>
        </div>
        <div className="flex items-start gap-1 text-foreground-muted">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>Limitations: {benchmark.limitations}</span>
        </div>
      </div>
    </div>
  );
};
