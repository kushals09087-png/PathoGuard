"use client";

import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UseStatement } from "../common/UseStatement";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import Image from "next/image";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // If on login page, render plain without sidebar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Session resolution state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground-muted space-y-4">
        <div className="relative w-16 h-16 rounded-2xl bg-[#0B1120] border border-accent/40 flex items-center justify-center p-2 shadow-xl shadow-accent/10">
          <Image
            src="/pathoguard-emblem.png"
            alt="PathoGuard"
            width={64}
            height={64}
            className="w-full h-full object-contain animate-pulse-subtle"
          />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent"></span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-accent">
          <Loader2 className="w-4 h-4 animate-spin text-accent" />
          <span>Initializing PathoGuard Workspace...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated && typeof window !== "undefined") {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
          <div className="max-w-content mx-auto w-full space-y-6">
            {children}
          </div>
          <div className="max-w-content mx-auto w-full pt-10">
            <UseStatement variant="footer" className="rounded-card border" />
          </div>
        </main>
      </div>
    </div>
  );
};
