"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, AlertTriangle, TrendingDown } from "lucide-react";
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
    platform: "Skyscanner → Scoot",
    platformColor: "#FF5A00",
    platformInitials: "SK",
    route: "SIN → BKK · 2h 15m · Non-stop",
    detail: "Scoot TR608 · Apr 18 → Apr 23",
    headline: 89,
    breakdown: { base: 89, taxes: 34, baggage: 42, platformFee: 0 },
    total: 254,
    isBest: true,
  },
  {
    platform: "Google Flights → AirAsia",
    platformColor: "#4285F4",
    platformInitials: "GF",
    route: "SIN → BKK · 2h 20m · Non-stop",
    detail: "AirAsia FD308 · Apr 18 → Apr 23",
    headline: 79,
    breakdown: { base: 79, taxes: 38, baggage: 60, platformFee: 18 },
    total: 274,
    flags: ["Hidden platform fee detected — S$18"],
  },
  {
    platform: "Expedia → Scoot",
    platformColor: "#FFB400",
    platformInitials: "EX",
    route: "SIN → BKK · 2h 15m · Non-stop",
    detail: "Scoot TR608 · Apr 18 → Apr 23",
    headline: 95,
    breakdown: { base: 95, taxes: 34, baggage: 42, serviceFee: 24 },
    total: 290,
    flags: ['"50% off" sale — price set 2 days ago'],
  },
];

function AgentChip({ agent }: { agent: Agent }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
      agent.status === "done"     && "border-success bg-success/10 text-success",
      agent.status === "scanning" && "border-primary bg-primary/10 text-primary",
      agent.status === "pending"  && "border-border bg-card text-muted-foreground"
    )}>
      {agent.status === "done"     && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
      {agent.status === "scanning" && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
      {agent.status === "pending"  && <span className="h-1.5 w-1.5 rounded-full bg-border" />}
      {agent.name}
    </div>
  );
}

function ResultCard({ result, pax = 2 }: { result: Result; rank: number; pax?: number }) {
  const { base, taxes, baggage, platformFee, serviceFee } = result.breakdown;
  const worstTotal = MOCK_RESULTS[MOCK_RESULTS.length - 1].total;
  const savings = worstTotal - result.total;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-card transition-all duration-200 hover:shadow-[0_2px_16px_rgba(0,0,0,0.08)]",
      result.isBest ? "border-success border-[1.5px]" : "border-border"
    )}>
      {result.isBest && (
        <div className="absolute left-0 top-0 rounded-br-xl bg-success px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          Best deal
        </div>
      )}

      <div className={cn(
        "grid items-center gap-4 p-6",
        "md:grid-cols-[1fr_auto]",
        result.isBest && "pt-9"
      )}>
        {/* LEFT — platform + breakdown */}
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: result.platformColor }}
            >
              {result.platformInitials}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{result.platform}</div>
              <div className="text-xs text-muted-foreground">{result.route}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-5 text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Base fare</span>
              <span className="text-foreground/80">S${base} × {pax}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Taxes</span>
              <span className="text-foreground/80">S${taxes}</span>
            </div>
            {baggage ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Baggage</span>
                <span className="text-foreground/80">S${baggage}</span>
              </div>
            ) : null}
            {(platformFee ?? 0) > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Platform fee</span>
                <span className="text-primary font-medium">S${platformFee} ⚠</span>
              </div>
            )}
            {(serviceFee ?? 0) > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Service fee</span>
                <span className="text-primary font-medium">S${serviceFee} ⚠</span>
              </div>
            )}
            {(platformFee ?? 0) === 0 && (serviceFee ?? 0) === 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Platform fee</span>
                <span className="text-foreground/80">S$0</span>
              </div>
            )}
          </div>

          {/* Flags */}
          {result.flags && result.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.flags.map((flag) => (
                <span
                  key={flag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning-foreground"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — price + cta */}
        <div className="flex flex-col items-end gap-3 md:items-end">
          <div className="text-right">
            <div className="mb-0.5 text-sm text-muted-foreground line-through">
              from S${result.headline * pax}
            </div>
            <div className="font-serif text-[28px] font-bold leading-none tracking-tight text-foreground">
              S${result.total}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.5px] text-muted-foreground">
              true total · {pax} pax
            </div>
          </div>

          <button
            className={cn(
              "rounded-full px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90",
              result.isBest ? "bg-success" : "bg-foreground"
            )}
          >
            {result.isBest ? "Book now →" : "View deal →"}
          </button>

          {result.isBest && savings > 0 && (
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <TrendingDown className="h-3.5 w-3.5" />
              S${savings} cheaper than worst
            </div>
          )}
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
    <section className="mx-auto max-w-4xl px-12 pb-24 pt-10">
      {/* Query echo */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Results for</span>
        <span className="rounded-full bg-secondary px-3 py-1 font-medium text-foreground">
          {query}
        </span>
      </div>

      {/* Agent status panel */}
      <div className="mb-8 rounded-2xl border border-border bg-secondary/30 p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {allDone ? (
              <><CheckCircle2 className="h-4 w-4 text-success" /> All {agents.length} sites searched</>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Agents searching — {doneCount} of {agents.length} complete
              </>
            )}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{doneCount} / {agents.length}</span>
        </div>
        <div className="mb-4 mt-3 h-1 w-full overflow-hidden rounded-full bg-border">
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
        <div className="space-y-3">
          <div className="flex items-baseline justify-between pb-1">
            <h2 className="font-serif text-xl font-bold text-foreground">
              Singapore → Bangkok · Apr 18–23 · 2 pax
            </h2>
            <span className="text-sm text-muted-foreground">Ranked by true price</span>
          </div>

          {MOCK_RESULTS.map((result, i) => (
            <ResultCard key={result.platform} result={result} rank={i + 1} pax={2} />
          ))}

          <div className="mt-2 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">The cheapest-looking option</span>
            {" "}(Google Flights at S$79) costs{" "}
            <span className="font-medium text-primary">S$20 more</span>
            {" "}at checkout than the best deal. Hidden platform fees add S$18 on top.
          </div>
        </div>
      )}
    </section>
  );
}
