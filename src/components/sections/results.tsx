"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, AlertTriangle, TrendingDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AgentStatus = "pending" | "scanning" | "done";
interface Agent { name: string; status: AgentStatus; }
interface PriceBreakdown {
  base: number; taxes: number; baggage?: number;
  platformFee?: number; serviceFee?: number;
}
interface Result {
  platform: string; platformColor: string; platformInitials: string;
  route: string; detail: string; headline: number;
  breakdown: PriceBreakdown; total: number;
  isBest?: boolean; flags?: string[];
}

const MOCK_AGENTS: Agent[] = [
  { name: "Skyscanner",         status: "done" },
  { name: "Google Flights",     status: "done" },
  { name: "Kayak",              status: "done" },
  { name: "Expedia",            status: "done" },
  { name: "Booking.com",        status: "done" },
  { name: "Agoda",              status: "scanning" },
  { name: "Singapore Airlines", status: "scanning" },
  { name: "AirAsia",            status: "pending" },
];

const MOCK_RESULTS: Result[] = [
  {
    platform: "Skyscanner",
    platformColor: "#0770CD",
    platformInitials: "SK",
    route: "SIN → BKK · Non-stop · 2h 15m",
    detail: "Scoot TR608 · Apr 18 → Apr 23",
    headline: 89,
    breakdown: { base: 89, taxes: 34, baggage: 42, platformFee: 0 },
    total: 254,
    isBest: true,
  },
  {
    platform: "Google Flights",
    platformColor: "#4285F4",
    platformInitials: "GF",
    route: "SIN → BKK · Non-stop · 2h 20m",
    detail: "AirAsia FD308 · Apr 18 → Apr 23",
    headline: 79,
    breakdown: { base: 79, taxes: 38, baggage: 60, platformFee: 18 },
    total: 274,
    flags: ["Hidden platform fee detected — S$18"],
  },
  {
    platform: "Expedia",
    platformColor: "#FFB700",
    platformInitials: "EX",
    route: "SIN → BKK · Non-stop · 2h 15m",
    detail: "Scoot TR608 · Apr 18 → Apr 23",
    headline: 95,
    breakdown: { base: 95, taxes: 34, baggage: 42, serviceFee: 24 },
    total: 290,
    flags: ['"50% off" — original price set 2 days ago'],
  },
];

function AgentChip({ agent }: { agent: Agent }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all",
      agent.status === "done"     && "bg-success/10 text-success",
      agent.status === "scanning" && "bg-primary/10 text-primary",
      agent.status === "pending"  && "bg-secondary text-muted-foreground"
    )}>
      {agent.status === "done"     && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {agent.status === "scanning" && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
      {agent.status === "pending"  && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-30" />}
      {agent.name}
    </div>
  );
}

function ResultCard({ result, rank, pax = 2 }: { result: Result; rank: number; pax?: number }) {
  const { base, taxes, baggage, platformFee, serviceFee } = result.breakdown;
  const hiddenFee = (platformFee ?? 0) + (serviceFee ?? 0);
  const worstTotal = MOCK_RESULTS[MOCK_RESULTS.length - 1].total;
  const savings = worstTotal - result.total;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl bg-card transition-all duration-200 hover:shadow-lg",
      result.isBest
        ? "ring-2 ring-primary shadow-md"
        : "ring-1 ring-border shadow-sm"
    )}>
      {/* Best deal bar */}
      {result.isBest && (
        <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
      )}

      <div className={cn("flex flex-col gap-5 p-6", result.isBest && "pl-7")}>
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          {/* Platform + route */}
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: result.platformColor }}
            >
              {result.platformInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{result.platform}</span>
                {result.isBest && (
                  <Badge variant="default" className="text-[10px] py-0 px-2">
                    Best deal
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">{result.route}</div>
              <div className="text-xs text-muted-foreground/70">{result.detail}</div>
            </div>
          </div>

          {/* Price — the star of the show */}
          <div className="shrink-0 text-right">
            {/* Advertised "from" price — struck through, visually dead */}
            <div className="mb-0.5 text-sm text-muted-foreground line-through decoration-muted-foreground/60">
              from S${result.headline * pax}
            </div>
            {/* Real price — large, bold, unavoidable */}
            <div className="font-serif text-4xl font-normal leading-none tracking-tight text-foreground">
              S${result.total}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              true total · {pax} pax
            </div>
          </div>
        </div>

        {/* Fee breakdown — the receipt */}
        <div className="rounded-xl bg-secondary/40 px-4 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Base fare</span>
              <span className="font-medium text-foreground">S${base * pax}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Taxes &amp; fees</span>
              <span className="font-medium text-foreground">S${taxes}</span>
            </div>
            {baggage ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Baggage</span>
                <span className="font-medium text-foreground">S${baggage}</span>
              </div>
            ) : null}
            {(platformFee ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="font-medium text-destructive">+S${platformFee} ⚠</span>
              </div>
            )}
            {(serviceFee ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Service fee</span>
                <span className="font-medium text-destructive">+S${serviceFee} ⚠</span>
              </div>
            )}
            {hiddenFee === 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">No hidden fees</span>
                <span className="font-medium text-success">✓</span>
              </div>
            )}
          </div>
        </div>

        {/* Warning flags */}
        {result.flags && result.flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {result.flags.map((flag) => (
              <Badge key={flag} variant="warning" className="gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {flag}
              </Badge>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between">
          {result.isBest && savings > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
              <TrendingDown className="h-4 w-4" />
              S${savings} cheaper than the most expensive option
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              S${result.total - MOCK_RESULTS[0].total} more than the best deal
            </div>
          )}
          <Button
            variant={result.isBest ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
          >
            Book now
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Results({ query }: { query: string }) {
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setAgents((p) => p.map((a) => a.name === "Agoda" ? { ...a, status: "done" as AgentStatus } : a));
    }, 1800);
    const t2 = setTimeout(() => {
      setAgents((p) => p.map((a) => a.status === "scanning" ? { ...a, status: "done" as AgentStatus } : a));
      setShowResults(true);
    }, 3200);
    const t3 = setTimeout(() => {
      setAgents((p) => p.map((a) => a.name === "AirAsia" ? { ...a, status: "done" as AgentStatus } : a));
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [query]);

  const doneCount = agents.filter((a) => a.status === "done").length;
  const allDone = doneCount === agents.length;

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      {/* Query echo */}
      <div className="mb-6 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Results for</span>
        <span className="rounded-full bg-secondary px-3 py-1 font-medium text-foreground">
          {query}
        </span>
      </div>

      {/* Agent status panel */}
      <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {allDone ? (
              <><CheckCircle2 className="h-4 w-4 text-success" />
              All {agents.length} sites searched</>
            ) : (
              <><Loader2 className="h-4 w-4 animate-spin text-primary" />
              Searching {agents.length} sites — {doneCount} complete</>
            )}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {doneCount} / {agents.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${(doneCount / agents.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {agents.map((agent) => <AgentChip key={agent.name} agent={agent} />)}
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-4">
          {/* Results header */}
          <div className="flex items-baseline justify-between pb-1">
            <h2 className="font-serif text-xl text-foreground">
              Singapore → Bangkok · Apr 18–23 · 2 pax
            </h2>
            <span className="text-sm text-muted-foreground">
              Ranked by true price
            </span>
          </div>

          {MOCK_RESULTS.map((result, i) => (
            <ResultCard key={result.platform} result={result} rank={i + 1} pax={2} />
          ))}

          {/* Insight callout */}
          <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">The cheapest-looking option</span>
            {" "}(Google Flights at S$79) costs{" "}
            <span className="font-medium text-destructive">S$20 more</span>
            {" "}at checkout than the best deal. Hidden platform fees add S$18 on top.
          </div>
        </div>
      )}
    </section>
  );
}
