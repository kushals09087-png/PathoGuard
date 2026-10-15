/**
 * Genome Firewall — Master Scientific and API Contracts
 * Synchronized with Master Engineering Reference v0.1.0
 */

export type AnalysisStatus =
  | "CREATED"
  | "QUEUED"
  | "VALIDATING"
  | "ANALYZING"
  | "INTERPRETING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type DetectionQuality =
  | "EXACT"
  | "STRICT"
  | "PARTIAL"
  | "LOOSE"
  | "LOW_QUALITY"
  | "UNKNOWN";

export type EvidenceTier =
  | "A_CURATED_STRONG"
  | "B_CURATED_MODERATE"
  | "C_INDIRECT"
  | "D_EXPLORATORY"
  | "INSUFFICIENT";

export type ResultCategory =
  | "RESISTANCE_EVIDENCE_STRONG"
  | "RESISTANCE_EVIDENCE_MODERATE"
  | "RESISTANCE_EVIDENCE_WEAK"
  | "SUSCEPTIBILITY_EVIDENCE_LIMITED" // Disabled in MVP (D-10)
  | "INCONCLUSIVE"
  | "INSUFFICIENT_EVIDENCE"
  | "NOT_ASSESSABLE";

export type DiscordanceType =
  | "GENOMIC_RESISTANT_AST_SUSCEPTIBLE"
  | "GENOMIC_NO_EVIDENCE_AST_RESISTANT"
  | "GENOMIC_INCONCLUSIVE_AST_RESISTANT"
  | "LOW_QUALITY_CONFLICT"
  | "UNSUPPORTED_COMPARISON";

export type AstCategory = "S" | "I" | "R";

export type ResultOrigin =
  | "REAL_ANALYSIS"
  | "CACHED_REAL_ANALYSIS"
  | "SYNTHETIC_FIXTURE";

export type ReviewStatus = "OPEN" | "REVIEWED_CONFIRMED" | "REVIEWED_DISMISSED";

export type SupportedOrganism =
  | "Escherichia coli"
  | "Klebsiella pneumoniae"
  | "Staphylococcus aureus";

export type SupportedAntibiotic =
  | "ciprofloxacin"
  | "ceftriaxone"
  | "meropenem"
  | "gentamicin"
  | "tetracycline"
  | "cefoxitin"
  | "vancomycin"
  | "erythromycin";

export interface StageProgress {
  stage: "VALIDATING" | "ANALYZING" | "INTERPRETING";
  state: "PENDING" | "RUNNING" | "DONE" | "FAILED";
  startedAt?: string;
  completedAt?: string;
}

export interface GenomeQC {
  result: "PASS" | "WARN" | "FAIL";
  warnings: string[];
  contigCount?: number;
  totalLength?: number;
  n50?: number;
  nFraction?: number;
  gcPercent?: number;
}

export interface ToolVersions {
  amrfinderplus: string;
  database: string;
  ruleSet: string;
  appCommit?: string;
}

export interface Sample {
  id: string;
  label: string;
  organism: SupportedOrganism;
  sourceType: string;
  isSynthetic: boolean;
  collectionYear?: number;
  country?: string;
  state?: string;
  facilityType?: string;
  provenance?: string;
  createdAt: string;
  labId?: string;
}

export interface GenomeFile {
  id: string;
  sampleId: string;
  fileName: string;
  checksumSha256: string;
  sizeBytes: number;
  storageKey: string;
  uploadStatus: "STORED" | "FAILED";
  contigCount?: number;
  totalLength?: number;
  n50?: number;
  nFraction?: number;
  gcPercent?: number;
  createdAt: string;
}

export interface AnalysisCounts {
  findings: number;
  assessmentsByCategory: Record<ResultCategory, number>;
  openDiscordance: number;
}

export interface Analysis {
  id: string;
  sampleId: string;
  fileId?: string;
  organism: SupportedOrganism;
  status: AnalysisStatus;
  resultOrigin: ResultOrigin;
  attempts: number;
  qc?: GenomeQC;
  toolVersions?: ToolVersions;
  ruleSetVersion?: string;
  stageProgress?: StageProgress[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  sample?: Sample;
  counts?: AnalysisCounts;
  labId?: string;
}

export interface Finding {
  id: string;
  analysisId: string;
  symbol: string;
  name: string;
  elementType: string;
  subtype?: string;
  klass: string;
  subclass?: string;
  method: string;
  identity?: number;
  coverage?: number;
  contigId?: string;
  start?: number;
  stop?: number;
  detectionQuality: DetectionQuality;
}

export interface RuleSource {
  id: string;
  ruleId: string;
  title: string;
  citation: string;
  url?: string;
}

export interface EvidenceLink {
  id: string;
  analysisId: string;
  findingId: string;
  assessmentId: string;
  ruleId: string;
  relationship: "SUPPORTS";
  effectiveCategory: ResultCategory;
  finding?: Finding;
}

export interface AntibioticAssessment {
  id: string;
  analysisId: string;
  organism: SupportedOrganism;
  antibiotic: SupportedAntibiotic;
  resultCategory: ResultCategory;
  evidenceTier: EvidenceTier;
  ruleIds: string[];
  findingIds: string[];
  capped: boolean;
  reasonCode: string;
  explanation: string;
  limitations: string;
  hasDiscordance: boolean;
  ruleSources?: RuleSource[];
}

export interface AstResultItem {
  id?: string;
  analysisId?: string;
  sampleId?: string;
  organism: SupportedOrganism;
  antibiotic: SupportedAntibiotic;
  category: AstCategory;
  method: "BROTH_MICRODILUTION" | "DISK_DIFFUSION" | "ETEST" | "AUTOMATED_SYSTEM" | "OTHER";
  mic?: number;
  micUnit?: "mg/L" | "ug/mL";
  zoneDiameterMm?: number;
  standard?: "EUCAST" | "CLSI" | "OTHER";
  standardVersion?: string;
  createdAt?: string;
}

export interface DiscordanceEvent {
  id: string;
  analysisId: string;
  assessmentId: string;
  astResultId?: string;
  antibiotic: SupportedAntibiotic;
  organism: SupportedOrganism;
  discordanceType: DiscordanceType;
  priority: "high" | "medium" | "info";
  priorityRank: number; // 1 = high, 2 = medium, 3 = info
  reviewStatus: ReviewStatus;
  explanation: string;
  reviewedAt?: string;
  reviewNote?: string;
  ast?: {
    category: AstCategory;
    method?: string;
    mic?: number;
    micUnit?: string;
    zoneDiameterMm?: number;
    standard?: string;
    standardVersion?: string;
  };
  genomic: {
    resultCategory: ResultCategory;
    evidenceTier: EvidenceTier;
    findingIds: string[];
    ruleIds?: string[];
  };
  createdAt: string;
}

export interface PairReliabilityBenchmark {
  organism: SupportedOrganism;
  antibiotic: SupportedAntibiotic;
  evaluatedIsolatesCount: number;
  datasetName: string;
  splitMethod: "lineage_aware" | "homology_aware" | "random";
  concordancePercent: number; // e.g. 96.4
  wilsonIntervalLower: number;
  wilsonIntervalUpper: number;
  abstentionRatePercent: number; // e.g. 3.2
  backgroundDiscordancePercent: number;
  toolVersion: string;
  ruleSetVersion: string;
  limitations: string;
}

export interface DemoDataset {
  id: string;
  label: string;
  organism: SupportedOrganism;
  resultOrigin: ResultOrigin;
  disclaimer: string;
  fileKey: string;
  description: string;
  expectedFindingsSummary: string;
  expectedDiscordanceSummary?: string;
  sourceNote: string;
  sampleData?: {
    sample?: Partial<Sample>;
    assessments?: Partial<AntibioticAssessment>[];
    findings?: Partial<Finding>[];
    astResults?: Partial<AstResultItem>[];
    discordanceEvents?: Partial<DiscordanceEvent>[];
  };
}

export interface ScopeResponse {
  organisms: {
    name: SupportedOrganism;
    amrfinderOrganismFlag: string;
    antibiotics: SupportedAntibiotic[];
    plausibleLengthMb: { min: number; max: number };
  }[];
  maxUploadBytes: number;
  useStatement: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
  };
}
