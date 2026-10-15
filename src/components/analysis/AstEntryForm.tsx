import React, { useState } from "react";
import { AstCategory, AstResultItem, SupportedAntibiotic, SupportedOrganism } from "@/types/contracts";
import { FlaskConical, Info, Check, RotateCcw } from "lucide-react";

interface AstEntryFormProps {
  organism: SupportedOrganism;
  antibiotics: SupportedAntibiotic[];
  initialValues?: AstResultItem[];
  onSubmit: (items: AstResultItem[]) => void;
  isSubmitting?: boolean;
  className?: string;
}

export const AstEntryForm: React.FC<AstEntryFormProps> = ({
  organism,
  antibiotics,
  initialValues = [],
  onSubmit,
  isSubmitting = false,
  className = "",
}) => {
  // Map state by antibiotic
  const [entries, setEntries] = useState<
    Record<
      string,
      {
        enabled: boolean;
        category: AstCategory;
        method: AstResultItem["method"];
        mic?: string;
        zoneDiameterMm?: string;
        standard: "EUCAST" | "CLSI" | "OTHER";
        standardVersion: string;
      }
    >
  >(() => {
    const map: Record<string, any> = {};
    for (const ab of antibiotics) {
      const existing = initialValues.find((i) => i.antibiotic === ab);
      map[ab] = {
        enabled: !!existing,
        category: existing?.category || "S",
        method: existing?.method || "BROTH_MICRODILUTION",
        mic: existing?.mic !== undefined ? existing.mic.toString() : "",
        zoneDiameterMm:
          existing?.zoneDiameterMm !== undefined ? existing.zoneDiameterMm.toString() : "",
        standard: existing?.standard || "EUCAST",
        standardVersion: existing?.standardVersion || "v14.0 (2024)",
      };
    }
    return map;
  });

  const handleToggle = (ab: string) => {
    setEntries((prev) => ({
      ...prev,
      [ab]: {
        ...prev[ab],
        enabled: !prev[ab]?.enabled,
      },
    }));
  };

  const handleChange = (ab: string, field: string, value: any) => {
    setEntries((prev) => ({
      ...prev,
      [ab]: {
        ...prev[ab],
        [field]: value,
      },
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const items: AstResultItem[] = [];

    for (const ab of antibiotics) {
      const item = entries[ab];
      if (item && item.enabled) {
        items.push({
          organism,
          antibiotic: ab,
          category: item.category,
          method: item.method,
          mic: item.mic ? parseFloat(item.mic) : undefined,
          micUnit: item.mic ? "mg/L" : undefined,
          zoneDiameterMm: item.zoneDiameterMm ? parseFloat(item.zoneDiameterMm) : undefined,
          standard: item.standard,
          standardVersion: item.standardVersion,
        });
      }
    }
    onSubmit(items);
  };

  const resetAll = () => {
    const map: Record<string, any> = {};
    for (const ab of antibiotics) {
      map[ab] = {
        enabled: false,
        category: "S",
        method: "BROTH_MICRODILUTION",
        mic: "",
        zoneDiameterMm: "",
        standard: "EUCAST",
        standardVersion: "v14.0 (2024)",
      };
    }
    setEntries(map);
  };

  return (
    <form onSubmit={handleFormSubmit} className={`space-y-4 ${className}`}>
      <div className="p-3.5 rounded-card bg-panel-raised/60 border border-panel-border text-xs text-foreground-muted flex items-start gap-2.5">
        <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-foreground font-medium">
            Optional Antimicrobial Susceptibility Testing (AST) Phenotype Input
          </p>
          <p className="text-[11px] leading-relaxed">
            Laboratory AST results are optional for genomic evidence interpretation, but necessary for the intended
            laboratory-versus-genome discordance review. Enter phenotypic results as reported by your laboratory;
            PathoGuard will compare them against genomic resistance calls without altering the genomic assessment.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-panel-border bg-panel overflow-hidden">
        <div className="p-3.5 border-b border-panel-border bg-panel-raised/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span>Configured Antibiotics for {organism}</span>
          </span>
          <button
            type="button"
            onClick={resetAll}
            className="text-xs text-foreground-muted hover:text-foreground flex items-center gap-1 font-mono"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Clear AST</span>
          </button>
        </div>

        <div className="divide-y divide-panel-border/60">
          {antibiotics.map((ab) => {
            const row = entries[ab] || {
              enabled: false,
              category: "S",
              method: "BROTH_MICRODILUTION",
              standard: "EUCAST",
              standardVersion: "v14.0 (2024)",
            };

            return (
              <div
                key={ab}
                className={`p-3.5 transition-colors ${
                  row.enabled ? "bg-panel-raised/40" : "bg-panel/50 opacity-80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`ast-enable-${ab}`}
                      checked={row.enabled}
                      onChange={() => handleToggle(ab)}
                      className="w-4 h-4 rounded border-panel-border text-accent focus:ring-accent accent-accent cursor-pointer"
                    />
                    <label
                      htmlFor={`ast-enable-${ab}`}
                      className="text-sm font-semibold text-foreground capitalize cursor-pointer font-sans"
                    >
                      {ab}
                    </label>
                  </div>

                  {row.enabled ? (
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                      {/* S / I / R Selector */}
                      <div className="flex items-center gap-1 bg-panel p-1 rounded border border-panel-border">
                        {(["S", "I", "R"] as AstCategory[]).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleChange(ab, "category", cat)}
                            className={`w-7 h-7 rounded text-xs font-bold transition-all ${
                              row.category === cat
                                ? cat === "R"
                                  ? "bg-red-500 text-white shadow-sm"
                                  : cat === "I"
                                  ? "bg-amber-500 text-black shadow-sm"
                                  : "bg-teal-500 text-black shadow-sm"
                                : "text-foreground-muted hover:text-foreground"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      {/* Method Selector */}
                      <select
                        value={row.method}
                        onChange={(e) => handleChange(ab, "method", e.target.value)}
                        className="p-1.5 rounded bg-panel border border-panel-border text-foreground text-xs font-sans focus:outline-none focus:border-accent"
                      >
                        <option value="BROTH_MICRODILUTION">Broth Microdilution</option>
                        <option value="DISK_DIFFUSION">Disk Diffusion</option>
                        <option value="ETEST">Gradient Strip (Etest)</option>
                        <option value="AUTOMATED_SYSTEM">Automated System (Vitek/Phoenix)</option>
                      </select>

                      {/* MIC or Zone */}
                      {row.method === "DISK_DIFFUSION" ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="Zone mm"
                            value={row.zoneDiameterMm || ""}
                            onChange={(e) => handleChange(ab, "zoneDiameterMm", e.target.value)}
                            className="w-20 p-1.5 rounded bg-panel border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
                          />
                          <span className="text-[11px] text-foreground-muted">mm</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="MIC"
                            value={row.mic || ""}
                            onChange={(e) => handleChange(ab, "mic", e.target.value)}
                            className="w-20 p-1.5 rounded bg-panel border border-panel-border text-foreground text-xs focus:outline-none focus:border-accent"
                          />
                          <span className="text-[11px] text-foreground-muted">mg/L</span>
                        </div>
                      )}

                      {/* Standard */}
                      <select
                        value={row.standard}
                        onChange={(e) => handleChange(ab, "standard", e.target.value)}
                        className="p-1.5 rounded bg-panel border border-panel-border text-foreground text-xs font-sans focus:outline-none focus:border-accent"
                      >
                        <option value="EUCAST">EUCAST</option>
                        <option value="CLSI">CLSI</option>
                      </select>
                    </div>
                  ) : (
                    <span className="text-xs text-foreground-muted italic">
                      No laboratory AST result entered
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-control bg-accent text-accent-foreground font-semibold hover:bg-accent-hover transition-colors flex items-center gap-2 text-xs"
        >
          <Check className="w-4 h-4" />
          <span>Save & Apply AST Comparators</span>
        </button>
      </div>
    </form>
  );
};
