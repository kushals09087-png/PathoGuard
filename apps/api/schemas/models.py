"""Pydantic v2 data models and API schemas for Genome Firewall."""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# -------------------------------------------------------------
# Auth
# -------------------------------------------------------------
class LoginRequest(BaseModel):
    labId: str
    password: Optional[str] = None
    accessKey: Optional[str] = None


class LabProfileResponse(BaseModel):
    labId: str
    name: str
    demoMode: bool = False


class LoginResponse(BaseModel):
    token: str
    lab: LabProfileResponse


# -------------------------------------------------------------
# Scope
# -------------------------------------------------------------
class ScopeResponse(BaseModel):
    organisms: List[str]
    antibiotics: List[str]
    pairs: Dict[str, List[str]]


# -------------------------------------------------------------
# Samples
# -------------------------------------------------------------
class CreateSampleRequest(BaseModel):
    sampleLabel: str
    organism: str
    collectionDate: Optional[str] = None
    source: Optional[str] = None


class SampleResponse(BaseModel):
    sampleId: str
    labId: str
    sampleLabel: str
    organism: str
    collectionDate: Optional[str] = None
    source: Optional[str] = None
    createdAt: str


# -------------------------------------------------------------
# Genome Upload
# -------------------------------------------------------------
class GenomeUploadResponse(BaseModel):
    fileId: str
    sampleId: str
    filename: str
    fileSize: int
    sha256: str
    validationStatus: str
    createdAt: str


# -------------------------------------------------------------
# Analyses
# -------------------------------------------------------------
class CreateAnalysisRequest(BaseModel):
    sampleId: str
    fileId: str
    idempotencyKey: Optional[str] = None


class AnalysisSummaryResponse(BaseModel):
    analysisId: str
    sampleId: str
    sampleLabel: str
    organism: str
    status: str
    stage: Optional[str] = None
    origin: str = "REAL_ANALYSIS"
    findingsCount: Optional[int] = 0
    discordanceCount: Optional[int] = 0
    createdAt: str
    completedAt: Optional[str] = None


class AnalysisStatusResponse(BaseModel):
    analysisId: str
    sampleId: str
    status: str
    stage: Optional[str] = None
    origin: str = "REAL_ANALYSIS"
    createdAt: str
    completedAt: Optional[str] = None
    errorCode: Optional[str] = None
    errorMessage: Optional[str] = None
    qcSummary: Optional[Dict[str, Any]] = None


class FindingModel(BaseModel):
    findingId: str
    geneSymbol: str
    sequenceName: str
    drugClass: str
    subclass: Optional[str] = None
    percentIdentity: float
    percentCoverage: float
    detectionMethod: str
    detectionQuality: str
    elementSubtype: str
    coreHit: bool
    evidenceTier: str
    sourceTool: str
    rawHit: Optional[Dict[str, Any]] = None


class AssessmentModel(BaseModel):
    assessmentId: str
    analysisId: str
    antibiotic: str
    resultCategory: str
    confidence: float
    supportingFindingIds: List[str] = []
    appliedRuleIds: List[str] = []
    mechanisms: List[str] = []
    limitations: str
    hybridLabel: Optional[str] = None
    mlPredictionRef: Optional[str] = None
    phenotypeTag: Optional[str] = None


class AnalysisResultsResponse(BaseModel):
    analysisId: str
    sampleId: str
    sampleLabel: str
    organism: str
    status: str
    origin: str
    qcSummary: Optional[Dict[str, Any]] = None
    findings: List[FindingModel] = []
    assessments: List[AssessmentModel] = []
    versions: Optional[Dict[str, str]] = None
    mlStatus: Optional[str] = "AVAILABLE"
    rawOutputAvailable: Optional[bool] = True
    disclaimer: str


# -------------------------------------------------------------
# AMRFinderPlus Status & Administration
# -------------------------------------------------------------
class AMRFinderStatusResponse(BaseModel):
    installed: bool
    executablePath: Optional[str] = None
    version: Optional[str] = None
    databaseVersion: Optional[str] = None
    databaseInstalled: bool
    error: Optional[str] = None


class AdminUpdateResponse(BaseModel):
    success: bool
    returncode: Optional[int] = 0
    output: str
    error: Optional[str] = None


# -------------------------------------------------------------
# Machine Learning Schemas
# -------------------------------------------------------------
class FeatureContributionModel(BaseModel):
    feature: str
    value: float
    weight: float
    contribution: float


class MLPredictionResponse(BaseModel):
    predictionId: str
    analysisId: str
    antibiotic: str
    organism: str
    status: str
    abstained: bool
    prediction: Optional[str] = None
    score: Optional[float] = None
    band: str
    modelId: Optional[str] = None
    modelVersion: Optional[str] = None
    topFeatures: List[FeatureContributionModel] = []
    hybridLabel: Optional[str] = None
    hybridExplanation: Optional[str] = None
    explanation: str
    createdAt: str


class ModelCardResponse(BaseModel):
    modelId: str
    organism: str
    antibiotic: str
    version: str
    algorithm: str
    sampleCount: int
    metrics: Dict[str, Any]
    abstentionBand: List[float]
    limitations: str
    status: str = "champion"


# -------------------------------------------------------------
# Evidence Links
# -------------------------------------------------------------
class EvidenceResponse(BaseModel):
    analysisId: str
    findings: List[FindingModel]
    links: List[Dict[str, Any]]


# -------------------------------------------------------------
# AST
# -------------------------------------------------------------
class CreateAstRequest(BaseModel):
    antibiotic: str
    category: str  # S, I, R
    mic: Optional[float] = None
    micUnit: Optional[str] = "mg/L"
    method: Optional[str] = "Broth Microdilution"
    standard: Optional[str] = "CLSI M100-ED34"
    standardVersion: Optional[str] = "2024"
    testDate: Optional[str] = None
    notes: Optional[str] = None


class AstResponse(BaseModel):
    astId: str
    analysisId: str
    sampleId: str
    antibiotic: str
    category: str
    mic: Optional[float] = None
    micUnit: Optional[str] = None
    method: Optional[str] = None
    standard: Optional[str] = None
    standardVersion: Optional[str] = None
    testDate: Optional[str] = None
    notes: Optional[str] = None
    createdAt: str


# -------------------------------------------------------------
# Discordance
# -------------------------------------------------------------
class DiscordanceEventResponse(BaseModel):
    discordanceId: str
    analysisId: str
    sampleId: str
    antibiotic: str
    discordanceType: str
    genomicCategory: str
    astCategory: str
    reviewStatus: str
    reviewNotes: Optional[str] = None
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[str] = None
    priorityScore: int
    explanation: str
    pairReliabilitySnapshot: Optional[Dict[str, Any]] = None
    createdAt: Optional[str] = None


class ReviewDiscordanceRequest(BaseModel):
    reviewStatus: str  # OPEN, REVIEWED_CONFIRMED, REVIEWED_DISMISSED
    reviewNotes: Optional[str] = None


# -------------------------------------------------------------
# Benchmarks
# -------------------------------------------------------------
class BenchmarkResponse(BaseModel):
    benchmarkId: str
    organism: str
    antibiotic: str
    sampleCount: int
    agreementRate: float
    ciLower: float
    ciUpper: float
    abstentionRate: float
    backgroundDiscordanceRate: float
    splitMethod: str
    evaluationDataset: str
    astStandard: str
    limitations: str


# -------------------------------------------------------------
# Demo Datasets
# -------------------------------------------------------------
class DemoDatasetResponse(BaseModel):
    datasetId: str
    label: str
    organism: str
    description: str
    origin: str
    qcMetrics: Dict[str, Any]
    findingsCount: int
    discordanceCount: int
    hasAst: bool
    analysisId: str


# -------------------------------------------------------------
# Health
# -------------------------------------------------------------
class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str
    database: str
    storage: str
    amrfinder: Optional[str] = "OK"
