import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, X, ShieldAlert } from "lucide-react";

interface FastaDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  maxSizeBytes?: number;
  className?: string;
}

export const FastaDropzone: React.FC<FastaDropzoneProps> = ({
  onFileSelect,
  selectedFile,
  onClear,
  maxSizeBytes = 26214400, // 25 MB
  className = "",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    contigsPreview: number;
    approxLength: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = async (file: File) => {
    setValidationError(null);
    setPreviewInfo(null);

    // 1. Extension check
    const validExts = [".fasta", ".fna", ".fa", ".gz"];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExts.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setValidationError(
        `Unsupported file extension for "${file.name}". Supported: .fasta, .fna, .fa (optionally .gz).`
      );
      return;
    }

    // 2. Size check
    if (file.size > maxSizeBytes) {
      setValidationError(
        `File size (${(file.size / 1_000_000).toFixed(1)} MB) exceeds maximum allowed limit of ${(
          maxSizeBytes / 1_000_000
        ).toFixed(0)} MB.`
      );
      return;
    }

    // 3. Nucleotide FASTA quick client sanity check (first 64 KB slice)
    try {
      const slice = file.slice(0, 65536);
      const text = await slice.text();
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

      if (lines.length === 0 || !lines[0].startsWith(">")) {
        setValidationError(
          "Invalid FASTA format: First non-empty line must start with a header symbol '>'. Plain text, raw FASTQ, or tabular data are rejected."
        );
        return;
      }

      // Check for nucleotide characters in first sequence chunk
      const seqLines = lines.filter((l) => !l.startsWith(">")).slice(0, 10).join("");
      const invalidChars = seqLines.match(/[^ACGTRYSWKMBDHVNacgtryswkmbdhvn]/g);

      if (invalidChars && invalidChars.length > seqLines.length * 0.05) {
        setValidationError(
          "Protein-like or non-nucleotide sequence detected. Genome Firewall requires nucleotide assembly FASTA files."
        );
        return;
      }

      // Count contigs in sample
      const contigCount = lines.filter((l) => l.startsWith(">")).length;
      setPreviewInfo({
        contigsPreview: Math.max(1, contigCount),
        approxLength: Math.round(file.size * 0.98),
      });

      onFileSelect(file);
    } catch {
      // If binary or gzip, bypass text preview and trust backend validation
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".fasta,.fna,.fa,.gz"
        onChange={handleInputChange}
        className="hidden"
        id="genome-file-input"
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-card p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-accent bg-accent-subtle/30 scale-[0.99]"
              : "border-panel-border hover:border-accent/60 bg-panel-raised/40 hover:bg-panel-raised"
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload bacterial genome FASTA assembly"
        >
          <div className="w-12 h-12 rounded-full bg-accent-subtle flex items-center justify-center mx-auto mb-3 text-accent">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">
            Drop your assembled bacterial genome here
          </h4>
          <p className="text-xs text-foreground-muted mt-1 max-w-sm mx-auto">
            Supports assembled FASTA (<span className="font-mono text-accent">.fasta</span>,{" "}
            <span className="font-mono text-accent">.fna</span>,{" "}
            <span className="font-mono text-accent">.fa</span>). Maximum file size: 25 MB.
          </p>
          <div className="mt-4">
            <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-semibold rounded-control bg-panel border border-panel-border text-foreground hover:bg-panel-border transition-colors">
              Browse Local Files
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-card border border-teal-500/40 bg-teal-950/20 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground font-mono">
                  {selectedFile.name}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded border border-teal-500/30">
                  <CheckCircle2 className="w-3 h-3" /> FASTA Verified
                </span>
              </div>
              <p className="text-xs text-foreground-muted mt-1 font-mono">
                Size: {(selectedFile.size / 1_000_000).toFixed(2)} MB • Nucleotide Contig Assembly
              </p>
              {previewInfo && (
                <p className="text-[11px] text-foreground-muted mt-0.5 font-mono">
                  Estimated contigs: ~{previewInfo.contigsPreview} • Span ~
                  {(previewInfo.approxLength / 1_000_000).toFixed(2)} Mb
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-foreground-muted hover:text-red-400 rounded-control hover:bg-panel-border/30 transition-colors"
            title="Remove selected file"
            aria-label="Remove selected genome assembly"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {validationError && (
        <div
          className="p-3.5 rounded-card border border-red-500/40 bg-red-950/30 text-xs text-red-300 flex items-start gap-2.5 font-sans"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-red-200">File Validation Error</span>
            <p className="leading-relaxed">{validationError}</p>
          </div>
        </div>
      )}
    </div>
  );
};
