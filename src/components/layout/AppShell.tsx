"use client";

import React, { useState } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UseStatement } from "../common/UseStatement";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

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
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground-muted">
        <Loader2 className="w-8 h-8 text-accent animate-spin mb-3" />
        <span className="text-xs font-mono">Initializing Laboratory Session...</span>
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
