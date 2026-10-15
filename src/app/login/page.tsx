"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, PRECONFIGURED_LABS } from "@/context/AuthContext";
import { UseStatement } from "@/components/common/UseStatement";
import {
  ShieldAlert,
  Building2,
  Key,
  ArrowRight,
  Loader2,
  AlertCircle,
  FlaskConical,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [labId, setLabId] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labId.trim()) {
      setErrorMessage("Please enter an assigned Laboratory Identifier (Lab ID).");
      return;
    }
    if (!accessKey.trim()) {
      setErrorMessage("Please enter an authorized Access Credential or Security Key.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const ok = await login(labId, accessKey);
      if (ok) {
        router.push("/");
      } else {
        setErrorMessage("Invalid Laboratory Identifier or Access Credential.");
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to authenticate laboratory session."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreconfiguredLab = (pLabId: string) => {
    const defaultKey = process.env.NEXT_PUBLIC_DEMO_ACCESS_KEY || "gf_demo_key_2026";
    setLabId(pLabId);
    setAccessKey(defaultKey);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md space-y-6">
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-control bg-accent-subtle border border-accent/40 flex items-center justify-center text-accent mx-auto">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Genome Firewall
            </h1>
            <p className="text-xs text-foreground-muted font-mono max-w-xs mx-auto">
              Explainable resistance-evidence review for clinical microbiology and public-health surveillance.
            </p>
          </div>

          {/* Research Use Banner */}
          <UseStatement variant="banner" />

          {/* Login Card */}
          <div className="rounded-card border border-panel-border bg-panel p-6 shadow-xl space-y-5">
            <div className="border-b border-panel-border/60 pb-3">
              <h2 className="text-sm font-semibold text-foreground">
                Laboratory Session Authorization
              </h2>
              <p className="text-xs text-foreground-muted">
                Enter your designated Lab ID and credential to access your laboratory's isolated analysis workspace.
              </p>
            </div>

            {errorMessage && (
              <div
                className="p-3 rounded-control border border-red-500/40 bg-red-950/30 text-xs text-red-300 flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="labId"
                  className="text-xs font-semibold text-foreground block font-mono"
                >
                  Assigned Lab ID
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
                  <input
                    id="labId"
                    type="text"
                    value={labId}
                    onChange={(e) => setLabId(e.target.value)}
                    placeholder="e.g. LAB-REF-AIIMS"
                    className="w-full pl-9 pr-3 py-2 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs font-mono placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="accessKey"
                  className="text-xs font-semibold text-foreground block font-mono"
                >
                  Access Credential / Security Key
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 text-foreground-muted absolute left-3 top-2.5" />
                  <input
                    id="accessKey"
                    type="password"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Enter assigned key"
                    className="w-full pl-9 pr-3 py-2 rounded-control bg-panel-raised border border-panel-border text-foreground text-xs font-mono placeholder:text-foreground-muted/50 focus:outline-none focus:border-accent"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-control bg-accent text-accent-foreground font-semibold text-xs hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Laboratory Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Lab Selector */}
            <div className="pt-3 border-t border-panel-border/60 space-y-2">
              <span className="text-[11px] font-mono text-foreground-muted uppercase tracking-wider block">
                Quick Demonstration Access Profiles:
              </span>
              <div className="space-y-1.5">
                {PRECONFIGURED_LABS.map((pLab) => (
                  <button
                    key={pLab.labId}
                    type="button"
                    onClick={() => handleSelectPreconfiguredLab(pLab.labId)}
                    className="w-full p-2 rounded-control text-left border border-panel-border/60 bg-panel-raised hover:bg-panel-border/40 transition-colors flex items-center justify-between text-xs group"
                  >
                    <div>
                      <span className="font-semibold text-foreground font-mono block">
                        {pLab.labId}
                      </span>
                      <span className="text-[11px] text-foreground-muted">
                        {pLab.labName} • {pLab.location}
                      </span>
                    </div>
                    <span className="text-xs text-accent font-mono group-hover:translate-x-0.5 transition-transform">
                      Fill →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md mx-auto w-full pt-4">
        <UseStatement variant="compact" className="text-center" />
      </div>
    </div>
  );
}
