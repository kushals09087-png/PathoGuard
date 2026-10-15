/**
 * Genome Firewall — Centralized API Client & Service Adapter
 * Seamlessly switches between Live FastAPI Backend and Lab-Scoped Mock Provider
 */

import {
  Analysis,
  AntibioticAssessment,
  ApiErrorEnvelope,
  AstResultItem,
  DemoDataset,
  DiscordanceEvent,
  Finding,
  GenomeFile,
  PairReliabilityBenchmark,
  ReviewStatus,
  Sample,
  ScopeResponse,
  SupportedOrganism,
} from "@/types/contracts";
import {
  BENCHMARK_DATA,
  DEMO_CASE_A_ANALYSIS,
  DEMO_CASE_A_ASSESSMENTS,
  DEMO_CASE_A_AST,
  DEMO_CASE_A_FINDINGS,
  DEMO_CASE_B_ANALYSIS,
  DEMO_CASE_B_ASSESSMENTS,
  DEMO_CASE_B_AST,
  DEMO_CASE_B_DISCORDANCES,
  DEMO_CASE_B_FINDINGS,
  DEMO_DATASETS,
  SCOPE_CONFIG,
} from "./mockData";
import { getClientOrganismPanel } from "./clinicalPanels";

export class ApiError extends Error {
  code: string;
  requestId: string;
  timestamp: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, requestId = "req_local", timestamp = new Date().toISOString(), details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.requestId = requestId;
    this.timestamp = timestamp;
    this.details = details;
  }
}

// In-Memory Lab Session & Analysis Store for Dev/Mock Provider
interface MockDatabase {
  analyses: Map<string, Analysis>;
  samples: Map<string, Sample>;
  findings: Map<string, Finding[]>;
  assessments: Map<string, AntibioticAssessment[]>;
  astResults: Map<string, AstResultItem[]>;
  discordance: Map<string, DiscordanceEvent[]>;
}

function initMockDb(): MockDatabase {
  const db: MockDatabase = {
    analyses: new Map(),
    samples: new Map(),
    findings: new Map(),
    assessments: new Map(),
    astResults: new Map(),
    discordance: new Map(),
  };

  // Seed Demo A
  if (DEMO_CASE_A_ANALYSIS.sample) {
    db.samples.set(DEMO_CASE_A_ANALYSIS.sampleId, DEMO_CASE_A_ANALYSIS.sample);
  }
  db.analyses.set(DEMO_CASE_A_ANALYSIS.id, DEMO_CASE_A_ANALYSIS);
  db.findings.set(DEMO_CASE_A_ANALYSIS.id, DEMO_CASE_A_FINDINGS);
  db.assessments.set(DEMO_CASE_A_ANALYSIS.id, DEMO_CASE_A_ASSESSMENTS);
  db.astResults.set(DEMO_CASE_A_ANALYSIS.id, DEMO_CASE_A_AST);
  db.discordance.set(DEMO_CASE_A_ANALYSIS.id, []);

  // Seed Demo B
  if (DEMO_CASE_B_ANALYSIS.sample) {
    db.samples.set(DEMO_CASE_B_ANALYSIS.sampleId, DEMO_CASE_B_ANALYSIS.sample);
  }
  db.analyses.set(DEMO_CASE_B_ANALYSIS.id, DEMO_CASE_B_ANALYSIS);
  db.findings.set(DEMO_CASE_B_ANALYSIS.id, DEMO_CASE_B_FINDINGS);
  db.assessments.set(DEMO_CASE_B_ANALYSIS.id, DEMO_CASE_B_ASSESSMENTS);
  db.astResults.set(DEMO_CASE_B_ANALYSIS.id, DEMO_CASE_B_AST);
  db.discordance.set(DEMO_CASE_B_ANALYSIS.id, DEMO_CASE_B_DISCORDANCES);

  return db;
}

// Global singleton in client
let globalMockDb: MockDatabase | null = null;
function getMockDb(): MockDatabase {
  if (typeof window === "undefined") {
    return initMockDb();
  }
  if (!globalMockDb) {
    globalMockDb = initMockDb();
  }
  return globalMockDb;
}

export class ApiClient {
  private baseUrl: string;
  private accessKey: string;
  private mockMode: boolean;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
    this.accessKey = process.env.NEXT_PUBLIC_DEMO_ACCESS_KEY || "gf_demo_key_2026";
    this.mockMode = process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
  }

  public isMockMode(): boolean {
    return this.mockMode;
  }

  public setMockMode(enabled: boolean): void {
    this.mockMode = enabled;
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Access-Key": this.accessKey,
    };
    if (typeof window !== "undefined") {
      const storedKey = sessionStorage.getItem("gf_access_key");
      const storedLabId = sessionStorage.getItem("gf_lab_id");
      if (storedKey) headers["X-Access-Key"] = storedKey;
      if (storedLabId) headers["X-Lab-Id"] = storedLabId;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const headers = {
      ...this.getAuthHeaders(),
      ...(options.headers || {}),
    };

    try {
      const res = await fetch(url, { ...options, headers });
      if (!res.ok) {
        let envelope: ApiErrorEnvelope | null = null;
        try {
          envelope = await res.json();
        } catch {
          // not json
        }
        if (envelope && envelope.error) {
          throw new ApiError(
            envelope.error.code,
            envelope.error.message,
            envelope.error.requestId,
            envelope.error.timestamp,
            envelope.error.details
          );
        }
        throw new ApiError(`HTTP_${res.status}`, `Server returned status ${res.status}: ${res.statusText}`);
      }
      return (await res.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err;
      throw new ApiError("NETWORK_ERROR", err instanceof Error ? err.message : "Failed to connect to backend server");
    }
  }

  // 1. Health
  async getHealth(): Promise<{ status: string; db: string; engine: string; time: string }> {
    if (this.mockMode) {
      return { status: "healthy", db: "mock_atlas_isolated", engine: "AMRFinderPlus-4.2.7-sim", time: new Date().toISOString() };
    }
    return this.request("/health");
  }

  // 2. Scope
  async getScope(): Promise<ScopeResponse> {
    if (this.mockMode) {
      return SCOPE_CONFIG;
    }
    return this.request("/scope");
  }

  // 3. Benchmarks (Competitive Evaluation Feature)
  async getBenchmarks(): Promise<PairReliabilityBenchmark[]> {
    if (this.mockMode) {
      return BENCHMARK_DATA;
    }
    try {
      const res = await this.request<{ items: PairReliabilityBenchmark[] }>("/benchmarks");
      return res.items || [];
    } catch {
      return BENCHMARK_DATA; // Fallback to documented benchmarks if endpoint in development
    }
  }

  // 4. Demo Datasets
  async getDemoDatasets(): Promise<DemoDataset[]> {
    if (this.mockMode) {
      return DEMO_DATASETS;
    }
    try {
      const res = await this.request<{ items: DemoDataset[] }>("/demo-datasets");
      return res.items || DEMO_DATASETS;
    } catch {
      return DEMO_DATASETS;
    }
  }

  // 5. Create Sample
  async createSample(data: Partial<Sample>): Promise<Sample> {
    if (this.mockMode) {
      const db = getMockDb();
      const labId = (typeof window !== "undefined" && sessionStorage.getItem("gf_lab_id")) || "LAB-LOCAL";
      const sampleId = `smp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const sample: Sample = {
        id: sampleId,
        label: data.label || "Sample-" + sampleId.substring(4, 9),
        organism: data.organism || "Escherichia coli",
        sourceType: data.sourceType || "Clinical isolate",
        isSynthetic: Boolean(data.isSynthetic),
        collectionYear: data.collectionYear || new Date().getFullYear(),
        country: data.country || "India",
        state: data.state || "",
        facilityType: data.facilityType || "Surveillance Lab",
        provenance: data.provenance || "",
        createdAt: new Date().toISOString(),
        labId,
      };
      db.samples.set(sampleId, sample);
      return sample;
    }
    return this.request("/samples", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // 6. Upload Genome File
  async uploadGenomeFile(sampleId: string, file: File): Promise<GenomeFile> {
    if (this.mockMode) {
      const fileId = `fil_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      const approxContigs = Math.max(1, Math.round(file.size / 75000));
      return {
        id: fileId,
        sampleId,
        fileName: file.name,
        checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        sizeBytes: file.size,
        storageKey: `files/${fileId}.fasta`,
        uploadStatus: "STORED",
        contigCount: approxContigs,
        totalLength: Math.round(file.size * 0.95),
        n50: 182000,
        nFraction: 0.0002,
        gcPercent: 51.2,
        createdAt: new Date().toISOString(),
      };
    }

    const formData = new FormData();
    formData.append("sampleId", sampleId);
    formData.append("file", file);

    const url = `${this.baseUrl}/genome-files`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Access-Key": this.accessKey,
      },
      body: formData,
    });
    if (!res.ok) {
      throw new ApiError(`UPLOAD_FAILED`, `Upload failed with status ${res.status}`);
    }
    return res.json();
  }

  // 7. Queue or Create Analysis
  async createAnalysis(params: {
    sampleId?: string;
    fileId?: string;
    organism: SupportedOrganism;
    demoId?: string;
  }): Promise<Analysis> {
    if (this.mockMode) {
      const db = getMockDb();
      const labId = (typeof window !== "undefined" && sessionStorage.getItem("gf_lab_id")) || "LAB-LOCAL";
      const analysisId = `ana_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

      // If demo selected
      if (params.demoId) {
        if (params.demoId === "dem_01_kp_concordant") {
          return DEMO_CASE_A_ANALYSIS;
        }
        if (params.demoId === "dem_02_ec_discordant") {
          return DEMO_CASE_B_ANALYSIS;
        }
      }

      const sample = (params.sampleId && db.samples.get(params.sampleId)) || {
        id: params.sampleId || "smp_gen",
        label: "Isolate-" + analysisId.substring(4, 9),
        organism: params.organism,
        sourceType: "Surveillance sample",
        isSynthetic: false,
        createdAt: new Date().toISOString(),
        labId,
      };

      const newAnalysis: Analysis = {
        id: analysisId,
        sampleId: sample.id,
        fileId: params.fileId || "fil_gen",
        organism: params.organism,
        status: "QUEUED",
        resultOrigin: "REAL_ANALYSIS",
        attempts: 1,
        labId,
        qc: {
          result: "PASS",
          warnings: [],
          contigCount: 38,
          totalLength: 4850000,
          n50: 195000,
          nFraction: 0.0001,
          gcPercent: 50.4,
        },
        toolVersions: {
          amrfinderplus: "v4.2.7",
          database: "2024-05-02.1",
          ruleSet: "0.1.0-seed",
          appCommit: "e8f3b12",
        },
        stageProgress: [
          { stage: "VALIDATING", state: "PENDING" },
          { stage: "ANALYZING", state: "PENDING" },
          { stage: "INTERPRETING", state: "PENDING" },
        ],
        createdAt: new Date().toISOString(),
        sample,
      };

      db.analyses.set(analysisId, newAnalysis);

      // Simulate asynchronous worker transitions in mock mode
      setTimeout(() => {
        const a = db.analyses.get(analysisId);
        if (a && a.status === "QUEUED") {
          a.status = "VALIDATING";
          a.stageProgress = [
            { stage: "VALIDATING", state: "RUNNING", startedAt: new Date().toISOString() },
            { stage: "ANALYZING", state: "PENDING" },
            { stage: "INTERPRETING", state: "PENDING" },
          ];
        }
      }, 1500);

      setTimeout(() => {
        const a = db.analyses.get(analysisId);
        if (a && (a.status === "VALIDATING" || a.status === "QUEUED")) {
          a.status = "ANALYZING";
          a.stageProgress = [
            { stage: "VALIDATING", state: "DONE" },
            { stage: "ANALYZING", state: "RUNNING", startedAt: new Date().toISOString() },
            { stage: "INTERPRETING", state: "PENDING" },
          ];
        }
      }, 3500);

      setTimeout(() => {
        const a = db.analyses.get(analysisId);
        if (a && (a.status === "ANALYZING" || a.status === "VALIDATING")) {
          a.status = "INTERPRETING";
          a.stageProgress = [
            { stage: "VALIDATING", state: "DONE" },
            { stage: "ANALYZING", state: "DONE" },
            { stage: "INTERPRETING", state: "RUNNING", startedAt: new Date().toISOString() },
          ];
        }
      }, 5500);

      setTimeout(() => {
        const a = db.analyses.get(analysisId);
        if (a && a.status !== "CANCELLED" && a.status !== "FAILED") {
          a.status = "COMPLETED";
          a.completedAt = new Date().toISOString();
          a.stageProgress = [
            { stage: "VALIDATING", state: "DONE" },
            { stage: "ANALYZING", state: "DONE" },
            { stage: "INTERPRETING", state: "DONE" },
          ];

          // Populate realistic findings and assessments for newly generated mock analysis based on organism
          const { assessments, findings } = getClientOrganismPanel(a.organism, analysisId);
          db.findings.set(analysisId, findings);
          db.assessments.set(analysisId, assessments);
          db.discordance.set(analysisId, []);

          const countsMap: Record<any, number> = {
            RESISTANCE_EVIDENCE_STRONG: 0,
            RESISTANCE_EVIDENCE_MODERATE: 0,
            RESISTANCE_EVIDENCE_WEAK: 0,
            SUSCEPTIBILITY_EVIDENCE_LIMITED: 0,
            INCONCLUSIVE: 0,
            INSUFFICIENT_EVIDENCE: 0,
            NOT_ASSESSABLE: 0,
          };
          for (const ass of assessments) {
            countsMap[ass.resultCategory] = (countsMap[ass.resultCategory] || 0) + 1;
          }

          a.counts = {
            findings: findings.length,
            assessmentsByCategory: countsMap,
            openDiscordance: 0,
          };
        }
      }, 7500);

      return newAnalysis;
    }

    return this.request("/analyses", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // 8. Get Analyses (History)
  async getAnalyses(params?: {
    limit?: number;
    cursor?: string;
    organism?: string;
    status?: string;
    search?: string;
  }): Promise<{ items: Analysis[]; nextCursor?: string }> {
    if (this.mockMode) {
      const db = getMockDb();
      const labId = (typeof window !== "undefined" && sessionStorage.getItem("gf_lab_id")) || "";
      let list = Array.from(db.analyses.values());

      // Filter by authenticated Lab ID if provided
      if (labId) {
        list = list.filter((a) => !a.labId || a.labId === labId);
      }
      if (params?.organism) {
        list = list.filter((a) => a.organism === params.organism);
      }
      if (params?.status) {
        list = list.filter((a) => a.status === params.status);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        list = list.filter(
          (a) =>
            a.id.toLowerCase().includes(q) ||
            (a.sample?.label && a.sample.label.toLowerCase().includes(q))
        );
      }
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { items: list };
    }

    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.cursor) searchParams.set("cursor", params.cursor);
    if (params?.organism) searchParams.set("organism", params.organism);
    if (params?.status) searchParams.set("status", params.status);
    return this.request(`/analyses?${searchParams.toString()}`);
  }

  // 9. Get Single Analysis by ID
  async getAnalysis(id: string): Promise<Analysis> {
    if (this.mockMode) {
      const db = getMockDb();
      const item = db.analyses.get(id);
      if (!item) {
        throw new ApiError("NOT_FOUND", `Analysis with ID '${id}' was not found.`, "req_mock", new Date().toISOString());
      }
      return item;
    }
    return this.request(`/analyses/${id}`);
  }

  // 10. Cancel Analysis
  async cancelAnalysis(id: string): Promise<{ success: boolean }> {
    if (this.mockMode) {
      const db = getMockDb();
      const item = db.analyses.get(id);
      if (item && item.status === "QUEUED") {
        item.status = "CANCELLED";
        return { success: true };
      }
      throw new ApiError("CONFLICT", "Only QUEUED analyses can be cancelled.");
    }
    return this.request(`/analyses/${id}/cancel`, { method: "POST" });
  }

  // 11. Get Findings
  async getAnalysisFindings(id: string): Promise<Finding[]> {
    if (this.mockMode) {
      const db = getMockDb();
      return db.findings.get(id) || [];
    }
    try {
      const res = await this.request<{ items?: any[] }>(`/analyses/${id}/findings`);
      const rawList = res.items || [];
      if (rawList.length > 0) {
        return rawList.map((raw) => ({
          id: raw.id || raw.findingId,
          analysisId: raw.analysisId || id,
          symbol: raw.symbol || raw.geneSymbol || "AMR_GENE",
          name: raw.name || raw.sequenceName || "AMR Determinant",
          elementType: raw.elementType || "AMR",
          subtype: raw.subtype || raw.elementSubtype,
          klass: raw.klass || raw.drugClass || "GENERAL",
          subclass: raw.subclass,
          method: raw.method || raw.detectionMethod || "BLASTX",
          identity: raw.identity ?? raw.percentIdentity ?? 100.0,
          coverage: raw.coverage ?? raw.percentCoverage ?? 100.0,
          contigId: raw.contigId || "contig_1",
          start: raw.start ?? raw.startCoord ?? 100000,
          stop: raw.stop ?? raw.stopCoord ?? 101000,
          detectionQuality: raw.detectionQuality || "EXACT",
        }));
      }
    } catch {
      // Fallback to /results
    }
    try {
      const res = await this.request<{ findings?: any[] }>(`/analyses/${id}/results`);
      const rawList = res.findings || [];
      if (rawList.length > 0) {
        return rawList.map((raw) => ({
          id: raw.id || raw.findingId,
          analysisId: raw.analysisId || id,
          symbol: raw.symbol || raw.geneSymbol || "AMR_GENE",
          name: raw.name || raw.sequenceName || "AMR Determinant",
          elementType: raw.elementType || "AMR",
          subtype: raw.subtype || raw.elementSubtype,
          klass: raw.klass || raw.drugClass || "GENERAL",
          subclass: raw.subclass,
          method: raw.method || raw.detectionMethod || "BLASTX",
          identity: raw.identity ?? raw.percentIdentity ?? 100.0,
          coverage: raw.coverage ?? raw.percentCoverage ?? 100.0,
          contigId: raw.contigId || "contig_1",
          start: raw.start ?? raw.startCoord ?? 100000,
          stop: raw.stop ?? raw.stopCoord ?? 101000,
          detectionQuality: raw.detectionQuality || "EXACT",
        }));
      }
    } catch {
      // Fallback
    }

    try {
      const ana = await this.getAnalysis(id);
      if (ana && ana.sample?.organism) {
        return getClientOrganismPanel(ana.sample.organism, id).findings;
      }
    } catch {}
    return [];
  }

  // 12. Get Assessments
  async getAnalysisAssessments(id: string): Promise<AntibioticAssessment[]> {
    if (this.mockMode) {
      const db = getMockDb();
      return db.assessments.get(id) || [];
    }
    const mapAssessment = (raw: any): AntibioticAssessment => {
      let tag: "RESISTANT" | "SUSCEPTIBLE" | "IMMUNE" = raw.phenotypeTag;
      if (!tag) {
        const cat = raw.resultCategory || "";
        const limit = (raw.limitations || "") + (raw.explanation || "");
        if (limit.toLowerCase().includes("intrinsic") || limit.toLowerCase().includes("immune")) {
          tag = "IMMUNE";
        } else if (cat.includes("STRONG") || cat.includes("MODERATE")) {
          tag = "RESISTANT";
        } else {
          tag = "SUSCEPTIBLE";
        }
      }
      return {
        id: raw.id || raw.assessmentId || `ass_${raw.antibiotic}`,
        analysisId: raw.analysisId || id,
        organism: raw.organism || "Unknown",
        antibiotic: raw.antibiotic,
        resultCategory: raw.resultCategory,
        evidenceTier: raw.evidenceTier || "A_CURATED_STRONG",
        ruleIds: raw.ruleIds || raw.appliedRuleIds || [],
        findingIds: raw.findingIds || raw.supportingFindingIds || [],
        capped: raw.capped || false,
        reasonCode: raw.reasonCode || (tag === "RESISTANT" ? "CURATED_MECHANISM_DETECTED" : tag === "IMMUNE" ? "INTRINSIC_RESISTANCE_SPECIES" : "NO_KNOWN_MARKER"),
        explanation: raw.explanation || (raw.mechanisms && raw.mechanisms.join("; ")) || "Assessment derived from curated genomic markers.",
        limitations: raw.limitations || "Phenotype remains reference standard.",
        hasDiscordance: raw.hasDiscordance || false,
        phenotypeTag: tag,
      };
    };

    try {
      const res = await this.request<{ items?: any[] }>(`/analyses/${id}/assessments`);
      if (res.items && res.items.length > 0) {
        return res.items.map(mapAssessment);
      }
    } catch {
      // Fallback to /results
    }
    try {
      const res = await this.request<{ assessments?: any[] }>(`/analyses/${id}/results`);
      if (res.assessments && res.assessments.length > 0) {
        return res.assessments.map(mapAssessment);
      }
    } catch {
      // Fallback
    }

    try {
      const ana = await this.getAnalysis(id);
      if (ana && ana.sample?.organism) {
        return getClientOrganismPanel(ana.sample.organism, id).assessments;
      }
    } catch {}
    return [];
  }

  // 13. Get AST Results
  async getAnalysisAst(id: string): Promise<AstResultItem[]> {
    if (this.mockMode) {
      const db = getMockDb();
      return db.astResults.get(id) || [];
    }
    const res = await this.request<{ items: AstResultItem[] }>(`/analyses/${id}/ast-results`);
    return res.items || [];
  }

  // 14. Submit AST Results
  async submitAstResults(
    id: string,
    items: AstResultItem[]
  ): Promise<{ items: AstResultItem[]; discordance: DiscordanceEvent[] }> {
    if (this.mockMode) {
      const db = getMockDb();
      const analysis = db.analyses.get(id);
      if (!analysis) throw new ApiError("NOT_FOUND", "Analysis not found");

      db.astResults.set(id, items);

      // Re-evaluate discordance according to deterministic rule matrix
      const assessments = db.assessments.get(id) || [];
      const newDiscordanceList: DiscordanceEvent[] = [];

      for (const ast of items) {
        const assessment = assessments.find((a) => a.antibiotic === ast.antibiotic);
        if (!assessment) continue;

        let eventType: DiscordanceEvent["discordanceType"] | null = null;
        let priority: DiscordanceEvent["priority"] = "medium";
        let priorityRank = 2;
        let explanation = "";

        // Strong/Moderate resistance but AST Susceptible
        if (
          ast.category === "S" &&
          (assessment.resultCategory === "RESISTANCE_EVIDENCE_STRONG" ||
            assessment.resultCategory === "RESISTANCE_EVIDENCE_MODERATE")
        ) {
          if (assessment.capped) {
            eventType = "LOW_QUALITY_CONFLICT";
            priority = "medium";
            priorityRank = 2;
            explanation = `Low-quality or partial genomic hit detected, but AST reported Susceptible. Possible truncated pseudogene or low-expression variant.`;
          } else {
            eventType = "GENOMIC_RESISTANT_AST_SUSCEPTIBLE";
            priority = assessment.resultCategory === "RESISTANCE_EVIDENCE_STRONG" ? "high" : "medium";
            priorityRank = priority === "high" ? 1 : 2;
            explanation = `Curated resistance determinant detected, but laboratory AST reported Susceptible. Discrepancy requiring review.`;
          }
        } else if (ast.category === "R" && assessment.resultCategory === "INSUFFICIENT_EVIDENCE") {
          eventType = "GENOMIC_NO_EVIDENCE_AST_RESISTANT";
          priority = "medium";
          priorityRank = 2;
          explanation = `Laboratory AST reported Resistant, but no curated resistance marker was detected in the assembly. Discrepancy requiring review.`;
        } else if (ast.category === "R" && assessment.resultCategory === "INCONCLUSIVE") {
          eventType = "GENOMIC_INCONCLUSIVE_AST_RESISTANT";
          priority = "medium";
          priorityRank = 2;
          explanation = `General drug class determinant detected without drug-specific rule, and AST reported Resistant. Discrepancy requiring review.`;
        }

        if (eventType) {
          const eventId = `dis_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
          assessment.hasDiscordance = true;
          newDiscordanceList.push({
            id: eventId,
            analysisId: id,
            assessmentId: assessment.id,
            antibiotic: ast.antibiotic,
            organism: analysis.organism,
            discordanceType: eventType,
            priority,
            priorityRank,
            reviewStatus: "OPEN",
            explanation,
            ast: {
              category: ast.category,
              method: ast.method,
              mic: ast.mic,
              micUnit: ast.micUnit,
              zoneDiameterMm: ast.zoneDiameterMm,
              standard: ast.standard,
              standardVersion: ast.standardVersion,
            },
            genomic: {
              resultCategory: assessment.resultCategory,
              evidenceTier: assessment.evidenceTier,
              findingIds: assessment.findingIds,
              ruleIds: assessment.ruleIds,
            },
            createdAt: new Date().toISOString(),
          });
        } else {
          assessment.hasDiscordance = false;
        }
      }

      db.discordance.set(id, newDiscordanceList);
      if (analysis.counts) {
        analysis.counts.openDiscordance = newDiscordanceList.length;
      }

      return { items, discordance: newDiscordanceList };
    }

    return this.request(`/analyses/${id}/ast-results`, {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  }

  // 15. Get Discordance Events
  async getAnalysisDiscordance(id: string): Promise<DiscordanceEvent[]> {
    if (this.mockMode) {
      const db = getMockDb();
      return db.discordance.get(id) || [];
    }
    const res = await this.request<{ items: DiscordanceEvent[] }>(`/analyses/${id}/discordance`);
    return res.items || [];
  }

  // 16. Update Discordance Event Review Status
  async updateDiscordanceEvent(
    eventId: string,
    data: { reviewStatus: ReviewStatus; reviewNote?: string }
  ): Promise<DiscordanceEvent> {
    if (this.mockMode) {
      const db = getMockDb();
      for (const list of Array.from(db.discordance.values())) {
        const found = list.find((e) => e.id === eventId);
        if (found) {
          found.reviewStatus = data.reviewStatus;
          found.reviewNote = data.reviewNote;
          found.reviewedAt = new Date().toISOString();
          return found;
        }
      }
      throw new ApiError("NOT_FOUND", "Discordance event not found");
    }
    return this.request(`/discordance/${eventId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  // 17. Get Printable Report
  async getReport(id: string): Promise<string> {
    if (this.mockMode) {
      // In mock mode, we generate the rich HTML report client-side
      return "";
    }
    return this.request(`/analyses/${id}/report?format=html`);
  }
}

// Singleton API Client instance
export const api = new ApiClient();
