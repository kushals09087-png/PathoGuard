import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        panel: {
          DEFAULT: "var(--panel)",
          raised: "var(--panel-raised)",
          border: "var(--panel-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          hover: "var(--accent-hover)",
        },
        evidence: {
          strong: "var(--evidence-strong)",
          moderate: "var(--evidence-moderate)",
          weak: "var(--evidence-weak)",
          inconclusive: "var(--evidence-inconclusive)",
          insufficient: "var(--evidence-insufficient)",
          unassessable: "var(--evidence-unassessable)",
          discordance: "var(--evidence-discordance)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Courier New", "monospace"],
      },
      borderRadius: {
        control: "6px",
        card: "10px",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
