"use client";

import React from "react";
import { BENCHMARK_DATA, SCOPE_CONFIG, MANDATORY_USE_STATEMENT } from "@/lib/mockData";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { DetectionGlyph } from "@/components/common/DetectionGlyph";
import {
  BookOpen,
  ShieldAlert,
  AlertTriangle,
  GitCompare,
  BarChart3,
  Dna,
  Layers,
  HelpCircle,
  FileCheck,
} from "lucide-react";

export default function MethodologyPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto text-foreground">
      {/* Page Title */}
      <div className="space-y-2 border-b border-panel-border pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">
            Scientific Methodology & Biological Scope
          </h1>
        </div>
        <p className="text-xs text-foreground-muted font-mono leading-relaxed">
          Operational framework, scientific rationale, evidence categories, and known limitations of PathoGuard.
        </p>
      </div>

      {/* Mandatory Use Statement Alert */}
      <div className="p-4 rounded-card border border-panel-border bg-panel text-xs text-foreground-muted space-y-1 font-mono">
        <div className="text-accent font-bold uppercase tracking-wider text-[11px]">
          Research and Surveillance Use Only
        </div>
        <p className="text-foreground text-xs leading-relaxed">
          {MANDATORY_USE_STATEMENT} PathoGuard is designed for microbiology research, genomic surveillance,
          and laboratory quality assurance. It does not provide individual patient diagnostic calls or antibiotic treatment recommendations.
        </p>
      </div>

      {/* 1. Core Scientific Principles: Detection vs Interpretation */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2 border-b border-panel-border/60 pb-2">
          <Dna className="w-4 h-4 text-accent" />
          <span>1. Core Principles: Detection vs. Interpretation</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
          <div className="p-4 rounded-card bg-panel border border-panel-border space-y-2">
            <h3 className="font-bold text-foreground font-sans text-sm flex items-center gap-1.5">
              <span>Genomic Detection (Tool Layer)</span>
            </h3>
            <p className="text-foreground-muted">
              Identifies the presence of a resistance-associated gene, allele, or point mutation within an assembled nucleotide genome.
              Executed by NCBI AMRFinderPlus against a versioned reference catalogue.
              Detection reports what DNA sequences exist; it does not infer clinical phenotype.
            </p>
          </div>

          <div className="p-4 rounded-card bg-panel border border-panel-border space-y-2">
            <h3 className="font-bold text-foreground font-sans text-sm flex items-center gap-1.5">
              <span>Scientific Interpretation (Firewall Layer)</span>
            </h3>
            <p className="text-foreground-muted">
              Applies curated, organism- and drug-specific rules to determine whether a detected determinant is known to mediate resistance
              to a specific drug in that specific bacterial taxon. Capped by detection quality metrics (identity and coverage).
            </p>
          </div>
        </div>
      </section>

      {/* 2. Result Categories & Semantics */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2 border-b border-panel-border/60 pb-2">
          <Layers className="w-4 h-4 text-accent" />
          <span>2. Standardized Result Categories</span>
        </h2>
        <div className="p-4 rounded-card bg-panel border border-panel-border space-y-4 text-xs">
          <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <strong>CRITICAL RULE: </strong>
            Absence of a detected resistance marker must NEVER be presented as proof of susceptibility.
            The platform emits <strong className="font-mono text-foreground">INSUFFICIENT_EVIDENCE</strong>, never "SUSCEPTIBLE".
          </div>

          <div className="divide-y divide-panel-border/60 space-y-3 pt-1">
            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="RESISTANCE_EVIDENCE_STRONG" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Curated, well-established resistance mechanism detected for this specific organism and drug, backed by an EXACT or STRICT match.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="RESISTANCE_EVIDENCE_MODERATE" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Relevant determinant detected, but context-dependent (e.g. single QRDR mutation without secondary mutation), or a Tier A rule capped due to partial contig coverage.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="RESISTANCE_EVIDENCE_WEAK" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Possible resistance association. Capped when findings exhibit loose homology (&lt;90% identity) or disrupted reading frames.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="INCONCLUSIVE" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Evidence of general drug-class activity detected (e.g. broad aminoglycoside acetyltransferase), but no drug-specific curated rule exists for this agent.
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="INSUFFICIENT_EVIDENCE" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                No known curated resistance determinant detected by the pinned database. <em>Absence of a marker does not establish susceptibility.</em>
              </p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="w-64 shrink-0">
                <CategoryBadge category="NOT_ASSESSABLE" />
              </div>
              <p className="text-foreground-muted leading-relaxed">
                Assembly fails quality control thresholds, or the requested organism-antibiotic pair lies outside the configured scope matrix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Discordance Review Architecture */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2 border-b border-panel-border/60 pb-2">
          <GitCompare className="w-4 h-4 text-rose-400" />
          <span>3. Discordance Review Architecture</span>
        </h2>
        <div className="p-4 rounded-card bg-panel border border-panel-border space-y-3 text-xs leading-relaxed">
          <p className="text-foreground-muted">
            A discordance event represents a discrepancy requiring laboratory investigation. It is not an assertion of laboratory error or a novel resistance mechanism.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-mono text-[11px]">
            <div className="p-3 rounded bg-panel-raised border border-panel-border space-y-1">
              <span className="font-bold text-red-300 block">GENOMIC_RESISTANT_AST_SUSCEPTIBLE</span>
              <p className="text-foreground-muted">
                Curated resistance gene detected (e.g. blaNDM-5), but AST reported Susceptible. Potential plasmid drop, silenced gene, or disc testing anomaly.
              </p>
            </div>
            <div className="p-3 rounded bg-panel-raised border border-panel-border space-y-1">
              <span className="font-bold text-amber-300 block">GENOMIC_NO_EVIDENCE_AST_RESISTANT</span>
              <p className="text-foreground-muted">
                AST reported Resistant, but no curated genomic marker detected. Potential novel mechanism, porin loss, or efflux pump overexpression.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Measured Pair Reliability Benchmarks Table */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2 border-b border-panel-border/60 pb-2">
          <BarChart3 className="w-4 h-4 text-accent" />
          <span>4. Calibrated Pair Reliability Benchmarks</span>
        </h2>
        <div className="border border-panel-border rounded-card bg-panel overflow-hidden">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-panel-border bg-panel-raised text-foreground-muted text-[11px]">
                <th className="py-2.5 px-3">Organism — Antibiotic</th>
                <th className="py-2.5 px-3 text-center">N (Isolates)</th>
                <th className="py-2.5 px-3">Concordance</th>
                <th className="py-2.5 px-3">95% Wilson CI</th>
                <th className="py-2.5 px-3 text-center">Abstention</th>
                <th className="py-2.5 px-3">Split Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border/60">
              {BENCHMARK_DATA.map((b) => (
                <tr key={`${b.organism}-${b.antibiotic}`} className="hover:bg-panel-raised/30">
                  <td className="py-2.5 px-3 font-semibold text-foreground">
                    <span className="font-sans italic">{b.organism}</span> — <span className="capitalize">{b.antibiotic}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-foreground">{b.evaluatedIsolatesCount}</td>
                  <td className="py-2.5 px-3 font-bold text-teal-400">{b.concordancePercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-foreground-muted">
                    [{b.wilsonIntervalLower}% – {b.wilsonIntervalUpper}%]
                  </td>
                  <td className="py-2.5 px-3 text-center text-foreground-muted">{b.abstentionRatePercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 uppercase text-[10px] text-foreground-muted">{b.splitMethod.replace("_", "-")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Documented Biological Blind Spots */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-foreground uppercase tracking-wider font-mono flex items-center gap-2 border-b border-panel-border/60 pb-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>5. Documented Biological Blind Spots</span>
        </h2>
        <div className="p-4 rounded-card bg-panel border border-panel-border space-y-3 text-xs leading-relaxed text-foreground-muted">
          <p>
            PathoGuard deliberately does not attempt to predict phenotypic susceptibility for biological mechanisms
            that cannot be reliably established from assembly data alone:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-foreground/90">
            <li><strong>Transcriptional & Promoter Alterations:</strong> Variation in promoter strength or copy number affecting beta-lactamase expression.</li>
            <li><strong>Membrane Permeability & Porin Loss:</strong> OmpC/OmpF or OprD truncations leading to carbapenem resistance without carbapenemase genes.</li>
            <li><strong>Multidrug Efflux Overexpression:</strong> AcrAB-TolC or MexAB-OprM upregulation not captured by point mutations alone.</li>
            <li><strong>Heteroresistance & Population Subclones:</strong> Minority resistant subpopulations that grow during extended laboratory incubation.</li>
            <li><strong>Incomplete Draft Assemblies:</strong> Gene fragmentation across contig borders or repetitive transposon junctions.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
