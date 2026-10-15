"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  FilePlus2,
  History,
  GitCompare,
  BookOpen,
  Building,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const pathname = usePathname();
  const { labProfile, isMockMode } = useAuth();

  const navItems = [
    {
      label: "Overview",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "New Analysis",
      href: "/analyses/new",
      icon: FilePlus2,
      active: pathname === "/analyses/new",
    },
    {
      label: "Analysis History",
      href: "/analyses",
      icon: History,
      active: pathname === "/analyses" || (pathname.startsWith("/analyses/") && !pathname.includes("/new")),
    },
    {
      label: "Discordance Review",
      href: "/discordance",
      icon: GitCompare,
      active: pathname.startsWith("/discordance"),
      badge: "Differentiator",
    },
    {
      label: "Methodology & Scope",
      href: "/methodology",
      icon: BookOpen,
      active: pathname === "/methodology",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-panel border-r border-panel-border flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="navigation"
        aria-label="Main Navigation"
      >
        <div className="p-4 space-y-6">
          {/* Lab Context Identifier Card */}
          {labProfile && (
            <div className="p-3 rounded-card bg-panel-raised border border-panel-border/70 space-y-1">
              <div className="flex items-center gap-2 text-foreground-muted text-[11px] font-mono">
                <Building className="w-3.5 h-3.5 text-accent" />
                <span>LABORATORY WORKSPACE</span>
              </div>
              <div className="text-xs font-bold text-foreground truncate font-sans">
                {labProfile.labName}
              </div>
              <div className="flex items-center justify-between text-[10px] text-foreground-muted font-mono pt-1">
                <span>ID: {labProfile.labId}</span>
                <span className="text-teal-400 flex items-center gap-0.5">
                  <ShieldCheck className="w-3 h-3" /> Scoped
                </span>
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-foreground-muted px-3 py-1">
              Workflows
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-control text-xs font-medium transition-all ${
                    item.active
                      ? "bg-accent text-accent-foreground font-semibold shadow-sm"
                      : "text-foreground-muted hover:text-foreground hover:bg-panel-raised"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                        item.active
                          ? "bg-black/20 text-accent-foreground"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Mock Provider Warning if Active */}
          {isMockMode && (
            <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-200">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Simulated Dev Provider</span>
              </div>
              <p className="text-[10px] text-amber-300/80 leading-snug">
                Simulated provider active. Demonstrating realistic backend pipeline transitions and mock persistence.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar Footer: Mandatory Use Statement */}
        <div className="p-4 border-t border-panel-border/70 bg-panel-raised/40 space-y-2">
          <div className="text-[10px] font-mono leading-tight text-foreground-muted">
            For research and surveillance use only. Not for clinical diagnosis or treatment decisions.
          </div>
          <div className="text-[9px] text-foreground-muted/60 font-mono">
            Genome Firewall • Reference Scope MVP
          </div>
        </div>
      </aside>
    </>
  );
};
