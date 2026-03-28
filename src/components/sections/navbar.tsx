"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger, SheetClose, SheetContent } from "@/components/ui/sheet";
import { AuthControls } from "@/components/sections/auth-controls";

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "History", href: "/history" },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 md:px-12">
        <Link href="/" className="justify-self-start flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary block" />
          <span className="font-serif text-xl font-bold tracking-tight text-foreground">
            Rosetta
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-8 md:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end gap-2 md:flex">
          <AuthControls />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>
          <Button size="sm" asChild>
            <Link href="/#trip-planner">Try for free</Link>
          </Button>
        </div>

        <div className="flex items-center justify-self-end gap-1 md:hidden">
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
                  <Link href="/" className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary block" />
                    <span className="font-serif text-lg font-bold tracking-tight text-foreground">
                      Rosetta
                    </span>
                  </Link>
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
                    <SheetClose asChild key={item.label}>
                      <Link
                        href={item.href}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto flex flex-col gap-2">
                  <div className="pb-2">
                    <AuthControls />
                  </div>
                  <SheetClose asChild>
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/#trip-planner">Try for free</Link>
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
