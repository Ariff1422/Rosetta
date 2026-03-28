"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetClose, SheetContent } from "@/components/ui/sheet";

const NAV_LINKS = ["How it works", "Pricing", "Blog"];

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-12">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary block" />
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Rosetta
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Button variant="ghost" size="sm">Sign in</Button>
          <Button size="sm">Try for free</Button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex h-full flex-col p-6">
                <div className="flex items-center justify-between">
                  <a href="/" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary block" />
                    <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                      Rosetta
                    </span>
                  </a>
                  <SheetClose asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Close menu"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </SheetClose>
                </div>

                <nav className="mt-8 flex flex-col gap-1">
                  {NAV_LINKS.map((item) => (
                    <SheetClose asChild key={item}>
                      <a
                        href="#"
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {item}
                      </a>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2">
                  <Button variant="outline" size="sm" className="w-full">Sign in</Button>
                  <Button size="sm" className="w-full">Try for free</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
