"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeProviderContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeProviderContext = createContext<ThemeProviderContextValue | undefined>(undefined);

const STORAGE_KEY = "dominico-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as Theme | null) : null;
    const initialTheme = stored ?? defaultTheme;
    setThemeState(initialTheme);
    const resolved = initialTheme === "system" ? getSystemTheme() : initialTheme;
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
    setMounted(true);
  }, [defaultTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newTheme);
    }
    const resolved = newTheme === "system" ? getSystemTheme() : newTheme;
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
  };

  // Listen to system theme changes when theme is "system"
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
