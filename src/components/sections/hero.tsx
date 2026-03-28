"use client";

import { useState } from "react";
import { ArrowRight, Plane, Hotel, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  { icon: Plane, label: "Singapore → Tokyo, 2 pax, June" },
  { icon: Hotel, label: "Bali resort, 1 week, July" },
  { icon: Car,   label: "Car hire in KL, 3 days" },
];

const PLATFORMS = [
  "Skyscanner", "Google Flights", "Kayak", "Expedia",
  "Booking.com", "Agoda", "Hotels.com", "Rentalcars",
  "AirAsia", "Scoot", "Singapore Airlines", "Jetstar",
];

export function Hero({ onSearch }: { onSearch?: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const handleSearch = () => {
    if (query.trim() && onSearch) onSearch(query.trim());
  };

  return (
    <section className="relative overflow-hidden">
      {/* Subtle grain texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      <div className="mx-auto max-w-5xl px-6 pb-20 pt-8 md:pt-12">
        {/* Eyebrow */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-primary/40" />
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-primary">
            Powered by TinyFish AI web agents
          </span>
          <div className="h-px w-12 bg-primary/40" />
        </div>

        {/* Headline — the centrepiece */}
        <h1 className="font-serif mx-auto mb-8 max-w-3xl text-center text-5xl leading-[1.1] text-foreground md:text-6xl lg:text-7xl">
          The price you see is{" "}
          <span className="relative inline-block">
            {/* Italic serif "never" in terracotta */}
            <span className="italic text-primary">never</span>
            {/* Wavy underline drawn in SVG — handcrafted feel */}
            <svg
              className="absolute -bottom-1 left-0 w-full overflow-visible"
              height="8"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M0,5 C15,1 30,8 50,4 C70,0 85,7 100,3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="text-primary/50"
              />
            </svg>
          </span>{" "}
          the price you pay.
        </h1>

        <p className="mx-auto mb-14 max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          Describe your trip in plain English. Our agents navigate every booking
          site all the way to checkout and surface the{" "}
          <span className="font-medium text-foreground">true all-in cost</span>.
        </p>

        {/* Search box — clean, confident */}
        <div className="mx-auto max-w-2xl">
          <div
            className={cn(
              "relative rounded-2xl bg-card transition-all duration-200",
              focused
                ? "shadow-[0_0_0_2px] shadow-primary ring-0"
                : "shadow-[0_2px_24px_-4px] shadow-foreground/12 ring-1 ring-border"
            )}
          >
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
              }}
              placeholder="Where are you going? Flights, hotels, cars — just describe your trip…"
              className="min-h-[90px] resize-none rounded-2xl rounded-b-none border-0 bg-transparent px-5 pt-5 pb-3 text-base focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
              rows={3}
            />

            {/* Bottom action bar */}
            <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border/60 bg-secondary/30 px-4 py-3">
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    onClick={() => setQuery(label)}
                    className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground ring-1 ring-border transition-all hover:ring-primary/40 hover:text-foreground"
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              <Button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="shrink-0 gap-2 rounded-xl"
              >
                Search
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            Ctrl + Enter to search
          </p>
        </div>

        {/* Stats */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {[
            { val: "< 60s", label: "True price returned" },
            { val: "20+", label: "Sites searched simultaneously" },
            { val: "100%", label: "Live checkout data" },
          ].map(({ val, label }) => (
            <div key={label} className="flex items-baseline gap-2">
              <span className="font-serif text-2xl text-foreground">{val}</span>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Platform list */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
            Comparing prices across
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground"
              >
                {p}
              </span>
            ))}
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
              +8 more
            </span>
          </div>
        </div>
      </div>

      {/* Bottom edge divider — diagonal */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  );
}
