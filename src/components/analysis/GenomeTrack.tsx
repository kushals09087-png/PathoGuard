import React, { useState } from "react";
import { Finding } from "@/types/contracts";
import { DetectionGlyph } from "../common/DetectionGlyph";
import { Dna, Info } from "lucide-react";

interface GenomeTrackProps {
  findings: Finding[];
  totalLength?: number;
  contigCount?: number;
  onSelectFinding?: (finding: Finding) => void;
  className?: string;
}

export const GenomeTrack: React.FC<GenomeTrackProps> = ({
  findings,
  totalLength,
  contigCount,
  onSelectFinding,
  className = "",
}) => {
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);

  // Filter findings that have real genomic contig coordinates
  const mappedFindings = findings.filter(
    (f) => f.contigId && typeof f.start === "number" && typeof f.stop === "number"
  );

  if (mappedFindings.length === 0) {
    return (
      <div
        className={`p-4 rounded-card border border-panel-border bg-panel text-xs text-foreground-muted flex items-center gap-2 ${className}`}
      >
        <Info className="w-4 h-4 text-accent shrink-0" />
        <span>
          No physical genomic contig coordinates were mapped for the current findings or assembly.
        </span>
      </div>
    );
  }

  // Group by contig
  const contigGroups = mappedFindings.reduce<Record<string, Finding[]>>((acc, f) => {
    const cId = f.contigId || "contig_unplaced";
    if (!acc[cId]) acc[cId] = [];
    acc[cId].push(f);
    return acc;
  }, {});

  const contigNames = Object.keys(contigGroups);

  return (
    <div
      className={`p-4 rounded-card border border-panel-border bg-panel space-y-4 ${className}`}
      role="region"
      aria-label="Genomic Contig & Determinant Coordinate Track"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-panel-border/50">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Genomic Assembly Hit Distribution
          </h3>
          <span className="text-xs text-foreground-muted font-mono">
            ({mappedFindings.length} determinants mapped)
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-foreground-muted font-mono">
          {contigCount && <span>Contigs: {contigCount}</span>}
          {totalLength && (
            <span>Length: {(totalLength / 1_000_000).toFixed(2)} Mb</span>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {contigNames.map((cName) => {
          const hits = contigGroups[cName];
          // Find max coordinate in this contig to scale
          const maxCoord = Math.max(...hits.map((h) => h.stop || 10000), 50000);

          return (
            <div key={cName} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-foreground font-medium text-[11px]">{cName}</span>
                <span className="text-foreground-muted text-[10px]">
                  Span ~{maxCoord.toLocaleString()} bp
                </span>
              </div>

              {/* Contig Bar SVG */}
              <div className="relative h-10 w-full bg-panel-raised rounded border border-panel-border/60 overflow-hidden flex items-center">
                <svg
                  className="w-full h-full"
                  viewBox={`0 0 1000 40`}
                  preserveAspectRatio="none"
                >
                  {/* Contig backbone line */}
                  <line
                    x1="20"
                    y1="20"
                    x2="980"
                    y2="20"
                    stroke="#26314D"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Marker ticks */}
                  {hits.map((hit) => {
                    const startPos = hit.start || 0;
                    const stopPos = hit.stop || startPos + 1000;
                    // Proportional X from 20 to 980
                    const xStart = 20 + (startPos / maxCoord) * 960;
                    const xStop = Math.max(xStart + 8, 20 + (stopPos / maxCoord) * 960);
                    const isSelected = selectedFindingId === hit.id;

                    return (
                      <g
                        key={hit.id}
                        className="cursor-pointer transition-transform hover:scale-110"
                        onClick={() => {
                          setSelectedFindingId(hit.id);
                          if (onSelectFinding) onSelectFinding(hit);
                        }}
                      >
                        {/* Gene block */}
                        <rect
                          x={xStart}
                          y="12"
                          width={Math.max(10, xStop - xStart)}
                          height="16"
                          rx="2"
                          fill={isSelected ? "#2DD4BF" : "#EF4444"}
                          fillOpacity={isSelected ? 0.9 : 0.75}
                          stroke={isSelected ? "#FFFFFF" : "#F87171"}
                          strokeWidth="1.5"
                        />
                        {/* Pin marker */}
                        <polygon
                          points={`${xStart + 5},4 ${xStart + 1},12 ${xStart + 9},12`}
                          fill={isSelected ? "#2DD4BF" : "#F87171"}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Hit Pills underneath */}
              <div className="flex flex-wrap gap-2 pt-1">
                {hits.map((h) => {
                  const isSelected = selectedFindingId === h.id;
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setSelectedFindingId(h.id);
                        if (onSelectFinding) onSelectFinding(h);
                      }}
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                        isSelected
                          ? "bg-accent-subtle border-accent text-accent font-semibold"
                          : "bg-panel-raised border-panel-border/50 text-foreground-muted hover:text-foreground"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>{h.symbol}</span>
                      <DetectionGlyph quality={h.detectionQuality} />
                      <span className="text-[10px] text-foreground-muted">
                        ({(h.start || 0).toLocaleString()} bp)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
