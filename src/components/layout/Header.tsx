"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldAlert,
  LogOut,
  Building2,
  ToggleLeft,
  ToggleRight,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { labProfile, logout, isMockMode, toggleMockMode, isAuthenticated } = useAuth();

  return (
    <header
      className="h-16 border-b border-panel-border bg-panel/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300"
      role="banner"
    >
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-control text-foreground-muted hover:text-foreground hover:bg-panel-border/30 transition-colors"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-control overflow-hidden border border-accent/40 bg-[#0B1120] flex items-center justify-center p-0.5 group-hover:border-accent transition-all duration-300 group-hover:shadow-[0_0_12px_rgba(45,212,191,0.35)] shrink-0">
            <Image
              src="/pathoguard-emblem.png"
              alt="PathoGuard Emblem"
              width={36}
              height={36}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          </div>
          <div>
            <span className="text-base font-bold text-foreground tracking-tight block leading-tight group-hover:text-accent transition-colors">
              PathoGuard
            </span>
            <span className="text-[10px] text-foreground-muted tracking-wide font-mono block">
              Explainable resistance-evidence review
            </span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Dark / Light Mode Switcher */}
        <ThemeToggle />

        {/* Mock/Live Environment Toggle Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-panel-raised border border-panel-border text-xs font-mono">
          <span className="text-foreground-muted text-[11px]">API:</span>
          <button
            type="button"
            onClick={() => toggleMockMode(!isMockMode)}
            className="flex items-center gap-1.5 text-foreground hover:text-accent transition-colors"
            title="Click to toggle between Mock Provider and Live FastAPI Backend"
            aria-label={`API Provider is currently ${isMockMode ? "Mock Simulator" : "Live FastAPI"}`}
          >
            {isMockMode ? (
              <>
                <ToggleRight className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-semibold text-[11px]">Mock Provider</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-teal-400" />
                <span className="text-teal-300 font-semibold text-[11px]">Live API (FastAPI)</span>
              </>
            )}
          </button>
        </div>

        {/* Authenticated Lab Profile Badge */}
        {isAuthenticated && labProfile ? (
          <div className="flex items-center gap-2 pl-2 border-l border-panel-border/60">
            <div className="hidden sm:block text-right">
              <span className="text-xs font-medium text-foreground block leading-tight">
                {labProfile.labName}
              </span>
              <span className="text-[10px] font-mono text-accent bg-accent-subtle px-1.5 py-0.2 rounded border border-accent/20 inline-block mt-0.5">
                {labProfile.labId}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-panel-raised border border-panel-border flex items-center justify-center text-accent">
              <Building2 className="w-4 h-4" />
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-control text-foreground-muted hover:text-red-400 hover:bg-red-950/20 transition-colors ml-1"
              title="Sign out of laboratory session"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-control bg-accent text-accent-foreground hover:bg-accent-hover transition-colors"
          >
            Sign In with Lab ID
          </Link>
        )}
      </div>
    </header>
  );
};
