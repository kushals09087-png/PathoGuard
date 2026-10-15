"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 2400,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [statusText, setStatusText] = useState("Initializing PathoGuard Defense Engine...");

  useEffect(() => {
    const intervalTime = 40;
    const step = 100 / (durationMs / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + step, 100);

        if (next < 35) {
          setStatusText("Initializing PathoGuard Core Engine...");
        } else if (next < 70) {
          setStatusText("Verifying Antimicrobial Matrix & Models...");
        } else if (next < 95) {
          setStatusText("Configuring Laboratory Security Isolation...");
        } else {
          setStatusText("PathoGuard System Ready.");
        }

        if (next >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsFadingOut(true);
            setTimeout(onComplete, 500);
          }, 300);
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(onComplete, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#090D1A] flex flex-col items-center justify-between p-6 select-none transition-opacity duration-500 ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      role="dialog"
      aria-label="PathoGuard Launch Screen"
    >
      {/* Background ambient glowing lights */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-teal-500/15 blur-[120px] pointer-events-none animate-pulse-subtle" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      {/* Top Bar with Skip */}
      <div className="w-full max-w-4xl flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-xs font-mono text-teal-400/80">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>PATHOGUARD BIOSURVEILLANCE</span>
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-mono text-slate-400 hover:text-teal-300 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-800 bg-slate-900/60 hover:border-teal-500/40"
        >
          <span>Skip to Login</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Logo & Branding Showcase */}
      <div className="flex flex-col items-center text-center space-y-6 z-10 max-w-lg my-auto animate-fade-in-up">
        {/* Glowing Logo Container */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-teal-500/20 to-emerald-500/20 rounded-3xl blur-xl transition-all duration-700 group-hover:blur-2xl" />
          <div className="relative rounded-2xl border border-teal-500/30 bg-[#0B1120]/80 p-4 shadow-2xl backdrop-blur-md">
            <Image
              src="/pathoguard-logo.png"
              alt="PathoGuard Logo"
              width={380}
              height={240}
              priority
              className="w-72 sm:w-84 md:w-96 h-auto drop-shadow-[0_0_25px_rgba(45,212,191,0.35)] transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
        </div>

        {/* Subtitle & Mission Statement */}
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-mono text-slate-400 max-w-md mx-auto leading-relaxed">
            Explainable genomic resistance-evidence review for clinical microbiology and public-health surveillance.
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/60 border border-teal-500/30 text-[11px] font-mono text-teal-300">
            <Sparkles className="w-3 h-3 text-teal-400" />
            <span>Deterministic AMR Interpretation & Calibrated Machine Learning</span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full max-w-xs space-y-2 pt-2">
          <div className="w-full h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(45,212,191,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="truncate pr-2">{statusText}</span>
            <span className="font-semibold text-teal-400">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Footer Mandatory Research Statement */}
      <div className="text-center z-10 pb-2">
        <p className="text-[11px] font-mono text-slate-500 max-w-md">
          For research and surveillance use only. Not for clinical diagnosis or treatment decisions.
        </p>
      </div>
    </div>
  );
};
