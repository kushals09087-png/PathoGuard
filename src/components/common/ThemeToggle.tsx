"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = "",
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-panel-border bg-panel-raised/90 hover:bg-panel-border/40 text-foreground transition-all duration-300 hover:shadow-md hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Icon with smooth rotational transition */}
      <div className="relative w-4 h-4 flex items-center justify-center">
        <Sun
          className={`w-4 h-4 text-amber-500 absolute transition-all duration-500 transform ${
            isDark
              ? "opacity-0 rotate-90 scale-0 pointer-events-none"
              : "opacity-100 rotate-0 scale-100 text-amber-500 animate-spin-once"
          }`}
        />
        <Moon
          className={`w-4 h-4 text-teal-300 absolute transition-all duration-500 transform ${
            isDark
              ? "opacity-100 rotate-0 scale-100 text-teal-300"
              : "opacity-0 -rotate-90 scale-0 pointer-events-none"
          }`}
        />
      </div>

      {showLabel && (
        <span className="text-xs font-medium text-foreground-muted group-hover:text-foreground transition-colors">
          {isDark ? "Dark" : "Light"}
        </span>
      )}

      {/* Subtle indicator pill */}
      <span className="text-[10px] font-mono text-foreground-muted hidden sm:inline-block">
        {isDark ? "DARK" : "LIGHT"}
      </span>
    </button>
  );
};
