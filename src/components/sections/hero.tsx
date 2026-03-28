"use client";

import { useState, Fragment } from "react";
import { motion } from "framer-motion";
import { Search, Plane, Hotel, Car, ShieldCheck, Activity, Clock, DollarSign, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSearchHistory } from "@/hooks/use-search-history";

const EXAMPLES = [
  { icon: Plane, label: "✈ SG → Tokyo, 2 pax, June" },
  { icon: Hotel, label: "🏨 Bali resort, 1 week" },
  { icon: Car,   label: "🚗 Rent a car in KL" },
];

const PLATFORMS = [
  "Skyscanner", "Google Flights", "Kayak", "Expedia",
  "Booking.com", "Agoda", "Hotels.com", "Rentalcars",
  "AirAsia", "Scoot", "Singapore Airlines", "Jetstar",
];

const TRUST = [
  { icon: ShieldCheck, label: "No account needed to compare" },
  { icon: Activity,    label: "Live data, not cached prices" },
  { icon: Clock,       label: "Results in under 60 seconds" },
  { icon: DollarSign,  label: "Free for 5 searches/month" },
];

export function Hero({ onSearch }: { onSearch?: (query: string) => void }) {
  const [query, setQuery] = useState("");
  const { history, push } = useSearchHistory();

  const handleSearch = () => {
    if (!query.trim() || !onSearch) return;
    push(query.trim());
    onSearch(query.trim());
  };

  const fillQuery = (q: string) => {
    setQuery(q);
  };

  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 pb-12 pt-6 text-center md:px-12">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Powered by AI web agents
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="font-serif mb-5 text-[clamp(36px,5vw,58px)] font-bold leading-[1.1] tracking-[-1.5px] text-foreground"
        >
          The price you see is<br />never the price you{" "}
          <em className="not-italic text-primary">pay.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mx-auto mb-12 max-w-[560px] text-lg font-light leading-relaxed text-muted-foreground"
        >
          Describe your trip in plain English. Rosetta sends AI agents to every
          booking site, navigates all the way to checkout, and shows you the true
          all-in price — before you waste time finding out at the end.
        </motion.p>

        {/* Search box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mx-auto max-w-[760px] rounded-3xl border border-border bg-card p-6 shadow-[0_8px_40px_rgba(0,0,0,0.1)] text-left"
        >
          <span className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
            Describe your trip
          </span>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
            }}
            placeholder="e.g. I want to fly from Singapore to Bangkok in mid April, 2 people, 5 nights. Need a hotel near the city centre, maybe a car rental for day trips too."
            className="min-h-[100px] resize-none rounded-xl border-border bg-background px-4 py-4 text-sm leading-relaxed focus-visible:ring-primary placeholder:text-muted-foreground/50"
            rows={3}
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => fillQuery(label.replace(/^[^\s]+ /, ""))}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              onClick={handleSearch}
              disabled={!query.trim()}
              size="default"
              className="shrink-0 gap-2"
            >
              <Search className="h-4 w-4" />
              Find true price
            </Button>
          </div>

          {/* Recent searches */}
          {history.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                <History className="h-3 w-3" />
                Recent
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((q) => (
                  <button
                    key={q}
                    onClick={() => fillQuery(q)}
                    className="max-w-[240px] truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Trust row */}
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pb-16 px-12">
        {TRUST.map(({ icon: Icon, label }, i) => (
          <Fragment key={label}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 text-success" />
              {label}
            </div>
            {i < TRUST.length - 1 && (
              <div className="hidden h-4 w-px bg-border md:block" />
            )}
          </Fragment>
        ))}
      </div>

      {/* Platform list */}
      <div className="border-t border-border/50 bg-secondary/20 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-6">
          <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground/60">
            Comparing across
          </span>
          {PLATFORMS.map((p) => (
            <span key={p} className="rounded-full bg-background px-3 py-1 text-xs text-muted-foreground border border-border">
              {p}
            </span>
          ))}
          <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-primary border border-primary/30">
            +8 more
          </span>
        </div>
      </div>

      <div className="h-px bg-border/50" />
    </section>
  );
}
