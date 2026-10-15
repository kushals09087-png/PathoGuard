import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { MANDATORY_USE_STATEMENT } from "@/lib/mockData";

describe("Scientific Compliance & Forbidden Claims Linter (SW-LINT-01)", () => {
  const FORBIDDEN_PHRASES = [
    "Predicts whether antibiotics will work",
    "Replaces AST",
    "clinically validated",
    "AI-powered",
    "No gene found, therefore susceptible",
    "novel mechanism discovered",
  ];

  function getSourceFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        if (file !== "node_modules" && file !== ".next" && file !== "test") {
          getSourceFiles(filePath, fileList);
        }
      } else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  it("verifies mandatory research and surveillance use statement is defined exactly", () => {
    expect(MANDATORY_USE_STATEMENT).toBe(
      "For research and surveillance use only. Not for clinical diagnosis or treatment decisions."
    );
  });

  it("ensures no forbidden claims or uncalibrated marketing phrases exist in UI code", () => {
    const srcDir = path.resolve(__dirname, "../components");
    const appDir = path.resolve(__dirname, "../app");
    const allFiles = [...getSourceFiles(srcDir), ...getSourceFiles(appDir)];

    const violations: { file: string; phrase: string }[] = [];

    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf8");
      for (const phrase of FORBIDDEN_PHRASES) {
        if (content.toLowerCase().includes(phrase.toLowerCase())) {
          violations.push({ file: path.basename(file), phrase });
        }
      }
    }

    expect(
      violations,
      `Found forbidden scientific claim phrases in UI code: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });
});
