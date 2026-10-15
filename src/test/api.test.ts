import { describe, it, expect } from "vitest";
import { api } from "@/lib/api";

describe("Central API Client & Mock Provider", () => {
  it("retrieves scope configuration with 3 supported organisms", async () => {
    const scope = await api.getScope();
    expect(scope.organisms).toHaveLength(3);
    const orgNames = scope.organisms.map((o) => o.name);
    expect(orgNames).toContain("Escherichia coli");
    expect(orgNames).toContain("Klebsiella pneumoniae");
    expect(orgNames).toContain("Staphylococcus aureus");
  });

  it("retrieves pair reliability benchmark data", async () => {
    const benchmarks = await api.getBenchmarks();
    expect(benchmarks.length).toBeGreaterThanOrEqual(3);
    const pairs = benchmarks.map((b) => `${b.organism}:${b.antibiotic}`);
    expect(pairs).toContain("Escherichia coli:meropenem");
    expect(pairs).toContain("Staphylococcus aureus:cefoxitin");
  });

  it("retrieves historical analyses scoped by lab session", async () => {
    const res = await api.getAnalyses();
    expect(res.items.length).toBeGreaterThan(0);
    const completed = res.items.find((a) => a.status === "COMPLETED");
    expect(completed).toBeDefined();
  });

  it("retrieves findings and assessments for completed analysis", async () => {
    const findings = await api.getAnalysisFindings("ana_01JBX3M8Q2N7V4K9R6T0YHE5ZC");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].symbol).toBeDefined();

    const assessments = await api.getAnalysisAssessments("ana_01JBX3M8Q2N7V4K9R6T0YHE5ZC");
    expect(assessments.length).toBeGreaterThan(0);
  });

  it("generates discordance events when AST contradicts genomic call", async () => {
    // Demo B has 2 discordances
    const discordance = await api.getAnalysisDiscordance("ana_02JBX7C91D3K4L5M6N7P8Q9R0S");
    expect(discordance.length).toBe(2);
    const types = discordance.map((d) => d.discordanceType);
    expect(types).toContain("GENOMIC_RESISTANT_AST_SUSCEPTIBLE");
    expect(types).toContain("GENOMIC_NO_EVIDENCE_AST_RESISTANT");
  });
});
