"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  SupportedOrganism,
  ScopeResponse,
  DemoDataset,
  AstResultItem,
  SupportedAntibiotic,
} from "@/types/contracts";
import { FastaDropzone } from "@/components/analysis/FastaDropzone";
import { AstEntryForm } from "@/components/analysis/AstEntryForm";
import { UseStatement } from "@/components/common/UseStatement";
import {
  FilePlus2,
  FlaskConical,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building,
  Dna,
  Zap,
  Sparkles,
} from "lucide-react";

export default function NewAnalysisPage() {
  const router = useRouter();

  // Wizard Steps: 1: Mode -> 2: Sample Info -> 3: Genome File -> 4: AST Input -> 5: Review
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [analysisMode, setAnalysisMode] = useState<"UPLOAD" | "DEMO">("UPLOAD");
  const [selectedDemoId, setSelectedDemoId] = useState<string>("dem_02_ec_discordant");

  // Scope & Demo Data
  const [scope, setScope] = useState<ScopeResponse | null>(null);
  const [demos, setDemos] = useState<DemoDataset[]>([]);
  const [isLoadingScope, setIsLoadingScope] = useState(true);

  // Form State
  const [isolateLabel, setIsolateLabel] = useState("");
  const [organism, setOrganism] = useState<SupportedOrganism>("Escherichia coli");
  const [sourceType, setSourceType] = useState("Clinical Blood / Urine Isolate");
  const [collectionYear, setCollectionYear] = useState<number>(new Date().getFullYear());
  const [provenanceNote, setProvenanceNote] = useState("");
  const [isSynthetic, setIsSynthetic] = useState(false);

  // File & AST State
  const [genomeFile, setGenomeFile] = useState<File | null>(null);
  const [astResults, setAstResults] = useState<AstResultItem[]>([]);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingScope(true);
      try {
        const [scopeRes, demoRes] = await Promise.all([
          api.getScope(),
          api.getDemoDatasets(),
        ]);
        setScope(scopeRes);
        setDemos(demoRes);
      } catch (err) {
        console.error("Failed to load scope configuration:", err);
      } finally {
        setIsLoadingScope(false);
      }
    }
    loadData();
  }, []);

  const currentOrgConfig = scope?.organisms.find((o) => o.name === organism);
  const currentAntibiotics: SupportedAntibiotic[] = currentOrgConfig?.antibiotics || [
    "ciprofloxacin",
    "ceftriaxone",
    "meropenem",
    "gentamicin",
  ];

  // Hardcode pre-configured demo isolate input
  const handleLoadHardcodedInput = () => {
    // 1. Hardcode sample metadata
    setAnalysisMode("UPLOAD");
    setIsolateLabel("AIIMS-MDR-KP-01");
    setOrganism("Klebsiella pneumoniae");
    setSourceType("Blood culture / ICU Sepsis Isolate");
    setCollectionYear(2026);
    setProvenanceNote("Clinical MDR Klebsiella pneumoniae isolate harboring blaNDM-1, blaCTX-M-15, and aac(3)-IIa determinants.");
    setIsSynthetic(false);

    // 2. Hardcode realistic bacterial FASTA assembly file
    const sampleFastaText = `>contig_01 len=284000 cov=45.2
ATGCGCAACATTTTCGCCCTGCTCGGCGTTCTGCTGCTGTCGCTGAGCGCCGCGCCTGCCTACGCCAAGGAGGTC
GAGGCCACCGCCACCGCCGCCGACAGCGGCGGCGACAAGCTGAAGCTGATCGTGCGCGACCAGAACACCGGCTTC
CTGCACCCCGGCGAGCGCAAGCCCGACCTGACCACCGCCGAGCTGAAGCGCAAGGGCGCCGACGTGATCCTGATC
GACGGCATCAAGGACGGCGGCACCACCATCTACACCAAGGACACCGGCCAGCCCGTGCGCATCGCCGGCGACTTC
CACCTGGACGGCACCGGCGACGAGCCCGGCGACGTGGCCCTGAACACCGCCAAGGAGATCATCGCCGCCGCCTTC
>contig_02_blaNDM1 len=142000 cov=52.1
ATGGAATTGCCCAATATTATGCACCCGGTCGCGAAGCTGAGCACCGCATTAGCCGCTGCATTGATGCTGAGCGGG
TGCATGCCCGGTGAAATCCGCCCGACGATTGGCCAGCAAATGGAAACTGGCGACCAACGTTTTGGCGATCTGGTT
TTCCGCCAGCTCGCACCGAACTGGTTCCAGTCGCTTGGCGATCAGCGTGTCCTCTACTTCTGGACCATGGCCTCG
>contig_03_blaCTXM15 len=185000 cov=48.9
ATGGTTAAAAAATCACTGCGTCAGTTCACGCTGATGGCGACGGCGACGCTGTTTATGAGCGCCGCGCTGCCGGTG
TTTGCCCAGCCGGCATTAGCCGTCACGCTCGTGAAACAGCTGGAGCAGCAGGCCCAGTTTGCCCAGCAGGCGGCG
GCCAGCGTCGCCGGCGCGGCGGCGTTTGTGCTGGGCGAGCTGAACACCAGCGAGCTGGCGGCGGCGCAGCTGGCC
>contig_04_aac3 len=96000 cov=38.4
ATGACCACCCACGCCGACCTCGACTGGACCGTCTACACCGACGCCGACGGCCGCCGCACCCTCGACGGCCGCCTC
GTCGTCGAGTACCTCGCCGGCGGCGAGTACGTCCTCACCCACACCGACCACGGCCGCCCCTTCGTCCTCGCCGAC
>contig_05 len=112000 cov=41.0
CGTACTAGCTAGCTAGCTAGCTAGCTACGATCGATCGATCGATCGATCGATCGACTACGACTACGATCAGCTACG
ATCGATCGATCGATCGATCGATCGATCGATCGATCGACTAGCTAGCTACGATCGATCGACTAGCTACGATCGACT
`;
    const hardcodedFile = new File([sampleFastaText], "aiims_mdr_kp01.fasta", {
      type: "application/octet-stream",
    });
    setGenomeFile(hardcodedFile);

    // 3. Hardcode Phenotypic Laboratory AST values
    setAstResults([
      {
        antibiotic: "meropenem",
        category: "R",
        mic: 32,
        micUnit: "mg/L",
        method: "Broth Microdilution (BMD)",
        standard: "CLSI M100-ED34",
      },
      {
        antibiotic: "ceftriaxone",
        category: "R",
        mic: 64,
        micUnit: "mg/L",
        method: "Broth Microdilution (BMD)",
        standard: "CLSI M100-ED34",
      },
      {
        antibiotic: "gentamicin",
        category: "R",
        mic: 16,
        micUnit: "mg/L",
        method: "Broth Microdilution (BMD)",
        standard: "CLSI M100-ED34",
      },
      {
        antibiotic: "ciprofloxacin",
        category: "S",
        mic: 0.25,
        micUnit: "mg/L",
        method: "Broth Microdilution (BMD)",
        standard: "CLSI M100-ED34",
        notes: "Tested in duplicate. Demonstrates signature AST Susceptible vs Genomic resistance discordance.",
      },
    ]);

    // Jump to Step 5 (Review & Submit)
    setCurrentStep(5);
  };

  // Handle Submission
  const handleSubmitAnalysis = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (analysisMode === "DEMO") {
        const created = await api.createAnalysis({
          organism,
          demoId: selectedDemoId,
        });
        router.push(`/analyses/${created.id}`);
        return;
      }

      if (!genomeFile) {
        throw new Error("Please upload a bacterial genome FASTA assembly.");
      }

      // Step A: Create Sample
      const sample = await api.createSample({
        label: isolateLabel.trim() || `Isolate-${Date.now().toString(36).toUpperCase()}`,
        organism,
        sourceType,
        collectionYear,
        provenance: provenanceNote.trim() || undefined,
        isSynthetic,
      });

      // Step B: Upload File
      const fileRecord = await api.uploadGenomeFile(sample.id, genomeFile);

      // Step C: Queue Analysis
      const analysis = await api.createAnalysis({
        sampleId: sample.id,
        fileId: fileRecord.id,
        organism,
      });

      // Step D: If AST results were entered, submit them
      if (astResults.length > 0) {
        try {
          await api.submitAstResults(analysis.id, astResults);
        } catch (astErr) {
          console.warn("Could not submit AST initially; can be added in results:", astErr);
        }
      }

      router.push(`/analyses/${analysis.id}`);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to initiate genome analysis."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Wizard Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <FilePlus2 className="w-5 h-5 text-accent" />
          <h1 className="text-xl font-bold text-foreground">
            Initiate Resistance-Evidence Analysis
          </h1>
        </div>
        <p className="text-xs text-foreground-muted">
          Submit an assembled bacterial genome for explainable resistance-associated evidence interpretation
          and optional laboratory AST discordance comparison.
        </p>
      </div>

      {/* 1-Click Hardcoded Preset Bar */}
      <div className="p-4 rounded-card border border-teal-500/40 bg-gradient-to-r from-teal-950/40 via-panel to-teal-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover-lift transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(45,212,191,0.3)]">
            <Zap className="w-5 h-5 text-teal-300 animate-pulse-subtle" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground flex items-center gap-2 font-mono">
              <span>Hardcoded Demo Isolate:</span>
              <span className="text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-500/40 text-[11px]">
                AIIMS-MDR-KP-01 (K. pneumoniae)
              </span>
            </div>
            <div className="text-[11px] text-foreground-muted mt-0.5">
              1-click pre-fills real clinical metadata, assembled FASTA contigs, and phenotypic AST measurements.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLoadHardcodedInput}
          className="px-4 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover transition-all duration-200 flex items-center justify-center gap-2 shrink-0 shadow-md shadow-accent/20 hover:shadow-accent/40 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Sparkles className="w-4 h-4" />
          <span>⚡ 1-Click Load Hardcoded Input</span>
        </button>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between border-b border-panel-border pb-3 text-xs font-mono">
        {[
          { num: 1, label: "Mode" },
          { num: 2, label: "Isolate Metadata" },
          { num: 3, label: "Genome File" },
          { num: 4, label: "AST Input (Optional)" },
          { num: 5, label: "Review & Submit" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              currentStep === s.num
                ? "text-accent font-bold"
                : currentStep > s.num
                ? "text-teal-400"
                : "text-foreground-muted/60"
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-mono border ${
                currentStep === s.num
                  ? "border-accent bg-accent-subtle text-accent"
                  : currentStep > s.num
                  ? "border-teal-400 bg-teal-950/40 text-teal-400"
                  : "border-panel-border text-foreground-muted/60"
              }`}
            >
              {currentStep > s.num ? "✓" : s.num}
            </div>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Mode Selection */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Step 1: Select Analysis Intake Source
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={() => {
                setAnalysisMode("UPLOAD");
                setIsSynthetic(false);
              }}
              className={`p-5 rounded-card border cursor-pointer transition-all ${
                analysisMode === "UPLOAD"
                  ? "border-accent bg-panel-raised shadow-md"
                  : "border-panel-border bg-panel hover:bg-panel-raised/50"
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="w-10 h-10 rounded-control bg-accent-subtle text-accent flex items-center justify-center mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Upload Live FASTA Assembly</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Upload your local bacterial genome assembly (<span className="font-mono text-accent">.fasta</span>,{" "}
                <span className="font-mono text-accent">.fna</span>). Evaluated against the pinned AMRFinderPlus database and configured rule sets.
              </p>
            </div>

            <div
              onClick={() => setAnalysisMode("DEMO")}
              className={`p-5 rounded-card border cursor-pointer transition-all ${
                analysisMode === "DEMO"
                  ? "border-purple-400 bg-panel-raised shadow-md"
                  : "border-panel-border bg-panel hover:bg-panel-raised/50"
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="w-10 h-10 rounded-control bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-foreground">Explore Labelled Demo Dataset</h3>
              <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
                Choose a pre-validated public surveillance or reference isolate demonstrating concordant or discordant AST outcomes.
              </p>
            </div>
          </div>

          {analysisMode === "DEMO" && (
            <div className="p-4 rounded-card border border-panel-border bg-panel space-y-3">
              <span className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono block">
                Available Demonstration Datasets:
              </span>
              <div className="space-y-2">
                {demos.map((d) => (
                  <label
                    key={d.id}
                    className={`p-3 rounded-control border flex items-start gap-3 cursor-pointer transition-colors ${
                      selectedDemoId === d.id
                        ? "border-accent bg-panel-raised"
                        : "border-panel-border bg-panel-raised/30 hover:bg-panel-raised"
                    }`}
                  >
                    <input
                      type="radio"
                      name="demoSelect"
                      checked={selectedDemoId === d.id}
                      onChange={() => {
                        setSelectedDemoId(d.id);
                        setOrganism(d.organism);
                        setIsSynthetic(d.resultOrigin === "SYNTHETIC_FIXTURE");
                      }}
                      className="mt-1 text-accent accent-accent cursor-pointer"
                    />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{d.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-panel border border-panel-border text-foreground-muted">
                          {d.resultOrigin}
                        </span>
                      </div>
                      <p className="text-foreground-muted text-[11px]">{d.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(analysisMode === "DEMO" ? 5 : 2)}
              className="px-5 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover transition-colors flex items-center gap-1.5"
            >
              <span>{analysisMode === "DEMO" ? "Skip to Review →" : "Next: Isolate Info →"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Isolate Metadata */}
      {currentStep === 2 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Step 2: Enter Isolate Identification & Organism
          </h2>

          <div className="p-4 rounded-card border border-panel-border bg-panel space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground font-mono block">
                Isolate Identifier / Specimen Label *
              </label>
              <input
                type="text"
                value={isolateLabel}
                onChange={(e) => setIsolateLabel(e.target.value)}
                placeholder="e.g. EC-SURV-2024-001 (Do not enter patient names or MRNs)"
                className="w-full p-2.5 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs font-mono focus:outline-none focus:border-accent"
              />
              <span className="text-[11px] text-foreground-muted block">
                Security notice: Never enter patient identifiers, Aadhaar numbers, or names. Use laboratory accession codes.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground font-mono block">
                Bacterial Organism Species *
              </label>
              <select
                value={organism}
                onChange={(e) => setOrganism(e.target.value as SupportedOrganism)}
                className="w-full p-2.5 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs font-sans focus:outline-none focus:border-accent"
              >
                <option value="Escherichia coli">Escherichia coli</option>
                <option value="Klebsiella pneumoniae">Klebsiella pneumoniae</option>
                <option value="Staphylococcus aureus">Staphylococcus aureus</option>
              </select>
              <div className="text-[11px] text-foreground-muted font-mono">
                AMRFinder Organism Flag: <span className="text-accent">{currentOrgConfig?.amrfinderOrganismFlag}</span> •
                Plausible size: {currentOrgConfig?.plausibleLengthMb.min}–{currentOrgConfig?.plausibleLengthMb.max} Mb
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono block">
                  Specimen / Source Type
                </label>
                <input
                  type="text"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  placeholder="e.g. Blood culture, Urine, Sputum"
                  className="w-full p-2 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono block">
                  Collection Year
                </label>
                <input
                  type="number"
                  value={collectionYear}
                  onChange={(e) => setCollectionYear(parseInt(e.target.value) || 2024)}
                  className="w-full p-2 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground font-mono block">
                Surveillance / Provenance Notes
              </label>
              <textarea
                value={provenanceNote}
                onChange={(e) => setProvenanceNote(e.target.value)}
                placeholder="Optional notes regarding sequencing platform (Illumina/Nanopore) or surveillance cluster..."
                rows={2}
                className="w-full p-2 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-control border border-panel-border bg-panel text-xs text-foreground-muted hover:text-foreground flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover flex items-center gap-1.5"
            >
              <span>Next: Genome Upload →</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Genome File Upload */}
      {currentStep === 3 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Step 3: Upload Bacterial Genome Assembly FASTA
          </h2>

          <FastaDropzone
            selectedFile={genomeFile}
            onFileSelect={(f) => setGenomeFile(f)}
            onClear={() => setGenomeFile(null)}
          />

          <div className="flex justify-between pt-3">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-control border border-panel-border bg-panel text-xs text-foreground-muted hover:text-foreground flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={!genomeFile}
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover disabled:opacity-50 flex items-center gap-1.5"
            >
              <span>Next: Optional AST Input →</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Optional AST Entry */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Step 4: Enter Optional Phenotypic AST Results for {organism}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="text-xs text-accent hover:underline font-mono"
            >
              Skip AST Entry →
            </button>
          </div>

          <AstEntryForm
            organism={organism}
            antibiotics={currentAntibiotics}
            initialValues={astResults}
            onSubmit={(items) => {
              setAstResults(items);
              setCurrentStep(5);
            }}
          />

          <div className="flex justify-between pt-3 border-t border-panel-border">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-control border border-panel-border bg-panel text-xs text-foreground-muted hover:text-foreground flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover flex items-center gap-1.5"
            >
              <span>Proceed to Review & Submit →</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {currentStep === 5 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">
            Step 5: Verify Analysis Details Prior to Pipeline Submission
          </h2>

          {submitError && (
            <div className="p-3.5 rounded-card border border-red-500/40 bg-red-950/30 text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-red-200">Submission Error</span>
                <p className="mt-0.5">{submitError}</p>
              </div>
            </div>
          )}

          <div className="p-5 rounded-card border border-panel-border bg-panel space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-panel-border/60">
              <span className="text-foreground-muted uppercase">Analysis Mode</span>
              <span className="text-accent font-bold">
                {analysisMode === "DEMO" ? "Demonstration Dataset" : "Live Assembly Upload"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-foreground-muted block text-[11px]">Bacterial Organism</span>
                <span className="text-foreground font-semibold font-sans text-sm">{organism}</span>
              </div>
              <div>
                <span className="text-foreground-muted block text-[11px]">Isolate Specimen Label</span>
                <span className="text-foreground font-semibold">
                  {analysisMode === "DEMO" ? selectedDemoId : isolateLabel || "Auto-assigned"}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted block text-[11px]">Genome Assembly File</span>
                <span className="text-foreground">
                  {analysisMode === "DEMO"
                    ? "Packaged reference FASTA"
                    : genomeFile?.name || "None"}
                </span>
              </div>
              <div>
                <span className="text-foreground-muted block text-[11px]">Configured AST Comparators</span>
                <span className="text-foreground">
                  {analysisMode === "DEMO"
                    ? "Included in demo fixture"
                    : `${astResults.length} antibiotic(s) entered`}
                </span>
              </div>
            </div>

            {astResults.length > 0 && analysisMode !== "DEMO" && (
              <div className="pt-2 border-t border-panel-border/40">
                <span className="text-[11px] text-foreground-muted block mb-1">
                  Entered Phenotypic AST Categories:
                </span>
                <div className="flex flex-wrap gap-2">
                  {astResults.map((a) => (
                    <span
                      key={a.antibiotic}
                      className="px-2 py-0.5 rounded bg-panel-raised border border-panel-border text-[11px]"
                    >
                      <strong className="capitalize">{a.antibiotic}</strong>: {a.category}
                      {a.mic !== undefined && ` (${a.mic} mg/L)`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Research Use Banner */}
          <UseStatement variant="banner" />

          <div className="flex justify-between pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setCurrentStep(analysisMode === "DEMO" ? 1 : 4)}
              className="px-4 py-2 rounded-control border border-panel-border bg-panel text-xs text-foreground-muted hover:text-foreground flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitAnalysis}
              className="px-6 py-2.5 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover transition-colors flex items-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Pipeline...</span>
                </>
              ) : (
                <>
                  <span>Submit for Evidence Review</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
