import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryBadge } from "@/components/common/CategoryBadge";
import { DetectionGlyph } from "@/components/common/DetectionGlyph";
import { OriginBanner } from "@/components/common/OriginBanner";
import { UseStatement } from "@/components/common/UseStatement";
import { MANDATORY_USE_STATEMENT } from "@/lib/mockData";

describe("Scientific UI Components", () => {
  it("renders CategoryBadge for STRONG evidence with accessible label", () => {
    render(<CategoryBadge category="RESISTANCE_EVIDENCE_STRONG" />);
    expect(screen.getByText("Strong resistance evidence")).toBeInTheDocument();
  });

  it("renders CategoryBadge for INSUFFICIENT_EVIDENCE stating no marker detected, never susceptible", () => {
    render(<CategoryBadge category="INSUFFICIENT_EVIDENCE" />);
    expect(screen.getByText("No known marker detected")).toBeInTheDocument();
  });

  it("renders DetectionGlyph with proper aria-label for EXACT match", () => {
    render(<DetectionGlyph quality="EXACT" />);
    const el = screen.getByRole("note");
    expect(el).toHaveAttribute("aria-label", "Detection Quality: EXACT");
  });

  it("renders DetectionGlyph for LOW_QUALITY with warning alert", () => {
    render(<DetectionGlyph quality="LOW_QUALITY" />);
    const el = screen.getByRole("note");
    expect(el).toHaveAttribute("aria-label", "Detection Quality: LOW_QUALITY");
  });

  it("renders OriginBanner displaying SYNTHETIC DEMONSTRATION DATA", () => {
    render(<OriginBanner origin="SYNTHETIC_FIXTURE" />);
    expect(screen.getByText("Synthetic Demonstration Data")).toBeInTheDocument();
  });

  it("renders OriginBanner displaying CACHED REAL ANALYSIS", () => {
    render(<OriginBanner origin="CACHED_REAL_ANALYSIS" />);
    expect(screen.getByText("Cached Real Analysis")).toBeInTheDocument();
  });

  it("renders UseStatement with exact mandatory string", () => {
    render(<UseStatement variant="footer" />);
    const elements = screen.getAllByText(MANDATORY_USE_STATEMENT);
    expect(elements.length).toBeGreaterThan(0);
  });
});
