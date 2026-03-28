"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Wordmark — serif, no icon */}
        <a href="/" className="flex items-baseline gap-0.5">
          <span className="font-serif text-2xl text-foreground tracking-tight leading-none">
            Rosetta
          </span>
          <span className="ml-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-primary opacity-80">
            beta
          </span>
        </a>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {["How it works", "Blog"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Button variant="ghost" size="sm" className="text-sm">
            Sign in
          </Button>
          <Button size="sm" className="text-sm">
            Try free
          </Button>
        </div>
      </div>
    </header>
  );
}
