"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchRequestPayload, TravelType } from "@/lib/search-schema";
import { cn } from "@/lib/utils";

type AgentStatus = "pending" | "scanning" | "done" | "error";
type SortMode = "true-total" | "headline" | "largest-gap";

type Agent = {
  name: string;
  section?: TravelType;
  status: AgentStatus;
  error?: string;
};

type Result = {
  section: TravelType;
  platform: string;
  platformColor: string;
  platformInitials: string;
  platformLogoUrl?: string;
  checkoutUrl?: string;
  route: string;
  detail: string;
  headline: number;
  breakdown: {
    base: number;
    taxes: number;
    baggage?: number;
    platformFee?: number;
    serviceFee?: number;
  };
  total: number;
  isBest?: boolean;
  flags?: string[];
};

type PriceContext = {
  totalLabel: string;
  headlineLabel: string;
};

type SearchResponse = {
  results: Result[];
  query?: string;
  searchedAt?: string;
  completedAgents?: number;
  failedAgents?: number;
  error?: string;
  clarifications?: string[];
  suggestedQuery?: string;
};

type StreamEventPayload = {
  type?: string;
  event?: string;
  query?: string;
  activeTargets?: Array<{ platform: string; section: TravelType }>;
  parsedQuery?: {
    origin?: string | null;
    destination?: string | null;
    departDate?: string | null;
    returnDate?: string | null;
    pax?: number | null;
    normalizedQuery?: string;
  } | null;
  platform?: string;
  section?: TravelType;
  error?: string;
  result?: Result | null;
  response?: SearchResponse;
};

const INITIAL_SKELETON_COUNT = 3;
const SECTION_LABELS: Record<TravelType, string> = {
  flights: "Flights",
  hotels: "Hotels",
  cars: "Cars",
};

function formatMoney(value: number) {
  return value.toFixed(2);
}

function buildPriceContext(search: SearchRequestPayload, section: TravelType): PriceContext {
  const pax = search.sections?.[section]?.pax;

  if (section === "cars") {
    return {
      totalLabel: "true total per vehicle",
      headlineLabel: "vehicle rate shown",
    };
  }

  if (section === "hotels") {
    return {
      totalLabel: pax ? `true total for ${pax} guest${pax === 1 ? "" : "s"}` : "true stay total",
      headlineLabel: "nightly/base rate shown",
    };
  }

  return {
    totalLabel: pax ? `true total for ${pax} pax` : "true flight total",
    headlineLabel: "headline fare shown",
  };
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-SG", { month: "short", day: "numeric" });
}

function buildQuerySummary(query: string, parsedQuery?: StreamEventPayload["parsedQuery"]) {
  if (!parsedQuery) return query;

  const parts: string[] = [];
  if (parsedQuery.origin && parsedQuery.destination) parts.push(`${parsedQuery.origin} -> ${parsedQuery.destination}`);
  else if (parsedQuery.destination) parts.push(parsedQuery.destination);
  else if (parsedQuery.origin) parts.push(parsedQuery.origin);

  if (parsedQuery.departDate && parsedQuery.returnDate) parts.push(`${formatDateLabel(parsedQuery.departDate)} - ${formatDateLabel(parsedQuery.returnDate)}`);
  else if (parsedQuery.departDate) parts.push(formatDateLabel(parsedQuery.departDate));

  if (parsedQuery.pax) parts.push(`${parsedQuery.pax} pax`);
  if (parts.length === 0 && parsedQuery.normalizedQuery) return parsedQuery.normalizedQuery;
  return parts.join(" · ") || query;
}

function normalizeResults(results: Result[]) {
  const grouped: Record<TravelType, Result[]> = { flights: [], hotels: [], cars: [] };
  results.forEach((result) => grouped[result.section].push(result));

  return (["flights", "hotels", "cars"] as const).flatMap((section) =>
    [...grouped[section]]
      .sort((a, b) => a.total - b.total)
      .map((result, index) => ({
        ...result,
        isBest: index === 0,
        flags: result.flags ?? [],
        breakdown: {
          base: result.breakdown?.base ?? 0,
          taxes: result.breakdown?.taxes ?? 0,
          baggage: result.breakdown?.baggage,
          platformFee: result.breakdown?.platformFee,
          serviceFee: result.breakdown?.serviceFee,
        },
      }))
  );
}

function upsertAgent(list: Agent[], next: Agent) {
  const index = list.findIndex((agent) => agent.name === next.name && agent.section === next.section);
  if (index === -1) return [...list, next];
  const copy = [...list];
  copy[index] = { ...copy[index], ...next };
  return copy;
}

function upsertResult(list: Result[], next: Result) {
  return normalizeResults([...list.filter((item) => item.platform !== next.platform || item.section !== next.section), next]);
}

function parseSseBlock(block: string) {
  const lines = block.split("\n");
  let eventName = "";
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }

  if (dataLines.length === 0) return null;

  try {
    const payload = JSON.parse(dataLines.join("\n")) as StreamEventPayload;
    return { type: payload.type ?? payload.event ?? eventName, payload };
  } catch {
    return null;
  }
}

function AgentChip({ agent }: { agent: Agent }) {
  return (
    <div
      title={agent.error ?? agent.name}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all",
        agent.status === "done" && "bg-success/10 text-success",
        agent.status === "scanning" && "bg-primary/10 text-primary",
        agent.status === "pending" && "bg-secondary text-muted-foreground",
        agent.status === "error" && "bg-destructive/10 text-destructive"
      )}
    >
      {agent.status === "done" && <CheckCircle2 className="h-3 w-3 shrink-0" />}
      {agent.status === "scanning" && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
      {agent.status === "pending" && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-30" />}
      {agent.status === "error" && <AlertTriangle className="h-3 w-3 shrink-0" />}
      {agent.name}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-secondary" />
            <div className="space-y-2">
              <div className="h-4 w-36 rounded-full bg-secondary" />
              <div className="h-3 w-44 rounded-full bg-secondary/80" />
            </div>
          </div>
          <div className="space-y-2 sm:text-right">
            <div className="h-3 w-20 rounded-full bg-secondary" />
            <div className="h-10 w-28 rounded-full bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  rank,
  bestTotal,
  worstTotal,
  priceContext,
}: {
  result: Result;
  rank: number;
  bestTotal: number;
  worstTotal: number;
  priceContext: PriceContext;
}) {
  const { base, taxes, baggage, platformFee, serviceFee } = result.breakdown;
  const hiddenFee = (platformFee ?? 0) + (serviceFee ?? 0);
  const savings = worstTotal - result.total;
  const premiumVsBest = result.total - bestTotal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ delay: rank * 0.12 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card transition-all duration-200 hover:shadow-lg",
        result.isBest ? "ring-2 ring-primary shadow-md" : "ring-1 ring-border shadow-sm"
      )}
    >
      {result.isBest && <div className="absolute left-0 top-0 h-full w-1 bg-primary" />}
      <div className={cn("flex flex-col gap-5 p-6", result.isBest && "pl-7")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
              style={{ background: result.platformColor }}
            >
              {result.platformLogoUrl ? (
                <img
                  src={result.platformLogoUrl}
                  alt={`${result.platform} logo`}
                  className="h-full w-full object-contain bg-white p-1"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    const sibling = event.currentTarget.nextElementSibling as HTMLElement | null;
                    if (sibling) sibling.style.display = "flex";
                  }}
                />
              ) : null}
              <span className={cn("items-center justify-center", result.platformLogoUrl ? "hidden" : "flex")}>{result.platformInitials}</span>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{result.platform}</span>
                {result.isBest ? <Badge variant="default" className="px-2 py-0 text-[10px]">Best deal</Badge> : null}
              </div>
              <div className="break-words text-sm text-muted-foreground sm:text-base">{result.route}</div>
              <div className="break-words text-xs text-muted-foreground/70">{result.detail}</div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="mb-0.5 text-sm text-muted-foreground line-through decoration-muted-foreground/60">from S${formatMoney(result.headline)}</div>
            <div className="font-serif text-4xl font-normal leading-none tracking-tight text-foreground">S${formatMoney(result.total)}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{priceContext.totalLabel}</div>
          </div>
        </div>

        <div className="rounded-xl bg-secondary/40 px-4 py-3">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">{priceContext.headlineLabel}</span><span className="font-medium text-foreground">S${formatMoney(base)}</span></div>
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Taxes &amp; fees</span><span className="font-medium text-foreground">S${formatMoney(taxes)}</span></div>
            {baggage ? <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Baggage</span><span className="font-medium text-foreground">S${formatMoney(baggage)}</span></div> : null}
            {(platformFee ?? 0) > 0 ? <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Platform fee</span><span className="font-medium text-destructive">+S${formatMoney(platformFee ?? 0)}</span></div> : null}
            {(serviceFee ?? 0) > 0 ? <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Service fee</span><span className="font-medium text-destructive">+S${formatMoney(serviceFee ?? 0)}</span></div> : null}
            {hiddenFee === 0 ? <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">No hidden fees</span><span className="font-medium text-success">OK</span></div> : null}
          </div>
        </div>

        {result.flags && result.flags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.flags.map((flag) => (
              <Badge key={flag} variant="warning" className="gap-1.5 text-xs">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                {flag}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {result.isBest && savings > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
              <TrendingDown className="h-4 w-4" />
              S${formatMoney(savings)} cheaper than the most expensive option
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">{premiumVsBest > 0 ? `S$${formatMoney(premiumVsBest)} more than the best deal` : "Best total price"}</div>
          )}
          {result.checkoutUrl ? (
            <Button asChild variant={result.isBest ? "default" : "outline"} size="sm" className="gap-1.5 self-start sm:self-auto">
              <a href={result.checkoutUrl} target="_blank" rel="noreferrer">
                Book now
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          ) : (
            <Button variant={result.isBest ? "default" : "outline"} size="sm" className="gap-1.5 self-start sm:self-auto" disabled>
              Checkout unavailable
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Results({ search }: { search: SearchRequestPayload }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [responseMeta, setResponseMeta] = useState<SearchResponse | null>(null);
  const [querySummary, setQuerySummary] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("true-total");
  const [showWarningsOnly, setShowWarningsOnly] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function runSearch() {
      setAgents([]);
      setResults([]);
      setError(null);
      setClarifications([]);
      setSuggestedQuery(null);
      setIsLoading(true);
      setHasCompleted(false);
      setResponseMeta(null);
      setQuerySummary(null);
      setSortMode("true-total");
      setShowWarningsOnly(false);

      try {
        const response = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(search),
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `Search failed with status ${response.status}`;
          try {
            const payload = (await response.json()) as SearchResponse;
            if (payload.error) message = payload.error;
            if (payload.clarifications?.length) setClarifications(payload.clarifications);
            if (payload.suggestedQuery) setSuggestedQuery(payload.suggestedQuery);
          } catch {}
          throw new Error(message);
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as SearchResponse;
          setResults(normalizeResults(payload.results ?? []));
          setResponseMeta(payload);
          setQuerySummary(payload.query ?? search.query);
          setAgents((payload.results ?? []).map((result) => ({ name: result.platform, section: result.section, status: "done" as AgentStatus })));
          setHasCompleted(true);
          return;
        }

        if (!response.body) throw new Error("Search stream is unavailable.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const parsed = parseSseBlock(block);
            if (!parsed) continue;

            const payload = parsed.payload;
            const type = (parsed.type ?? "").toUpperCase();

            if (type === "SEARCH_META") {
              setAgents((payload.activeTargets ?? []).map((target) => ({ name: target.platform, section: target.section, status: "pending" as AgentStatus })));
              setQuerySummary(buildQuerySummary(payload.query ?? search.query, payload.parsedQuery));
            } else if (type === "AGENT_START" && payload.platform) {
              const platformName = payload.platform;
              setAgents((current) => upsertAgent(current, { name: platformName, section: payload.section, status: "scanning" }));
            } else if (type === "AGENT_DONE" && payload.platform) {
              const platformName = payload.platform;
              setAgents((current) => upsertAgent(current, { name: platformName, section: payload.section, status: payload.error ? "error" : "done", error: payload.error }));
              if (payload.result) {
                const nextResult = payload.result as Result;
                setResults((current) => upsertResult(current, nextResult));
              }
              if (payload.error) setError((current) => current ?? payload.error ?? "Search failed.");
            } else if (type === "SEARCH_DONE" && payload.response) {
              setResults(normalizeResults(payload.response.results ?? []));
              setResponseMeta(payload.response);
              setHasCompleted(true);
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err);
          setError(message || "Unable to fetch results.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void runSearch();
    return () => controller.abort();
  }, [search]);

  const doneCount = agents.filter((agent) => agent.status === "done" || agent.status === "error").length;
  const allDone = hasCompleted || (agents.length > 0 && doneCount === agents.length && !isLoading);
  const errorAgents = agents.filter((agent) => agent.status === "error").length;
  const completedAgents = responseMeta?.completedAgents ?? doneCount;
  const failedAgents = responseMeta?.failedAgents ?? errorAgents;

  const displayedResults = useMemo(() => {
    const filtered = showWarningsOnly ? results.filter((result) => (result.flags?.length ?? 0) > 0) : results;
    const sorted = [...filtered];
    if (sortMode === "headline") sorted.sort((a, b) => a.headline - b.headline);
    else if (sortMode === "largest-gap") sorted.sort((a, b) => b.total - b.headline - (a.total - a.headline));
    else sorted.sort((a, b) => a.total - b.total);
    return normalizeResults(sorted);
  }, [results, showWarningsOnly, sortMode]);

  const cheapestHeadlineResult = useMemo(() => (results.length === 0 ? null : [...results].sort((a, b) => a.headline - b.headline)[0]), [results]);
  const bestTotal = displayedResults[0]?.total ?? 0;
  const worstTotal = displayedResults[displayedResults.length - 1]?.total ?? bestTotal;
  const insightDelta = cheapestHeadlineResult && bestTotal ? cheapestHeadlineResult.total - bestTotal : 0;
  const warningResultCount = results.filter((result) => (result.flags?.length ?? 0) > 0).length;
  const skeletonCount = Math.max(INITIAL_SKELETON_COUNT - results.length, 0);
  const sectionedResults = (["flights", "hotels", "cars"] as const).map((section) => ({
    section,
    label: SECTION_LABELS[section],
    results: displayedResults.filter((result) => result.section === section),
    agents: agents.filter((agent) => agent.section === section),
  }));

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <div className="mb-6 space-y-2 text-sm">
        <span className="text-muted-foreground">Results for</span>
        <div className="max-w-full rounded-2xl bg-secondary px-4 py-2 font-medium text-foreground whitespace-normal break-words">{search.query}</div>
      </div>

      {querySummary ? (
        <div className="mb-6 flex flex-col items-start gap-2">
          <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground/70">Interpreted trip</span>
          <div className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground whitespace-normal break-words">{querySummary}</div>
        </div>
      ) : null}

      <div className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            {allDone ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                All {agents.length} sites searched
              </>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                {agents.length > 0 ? `Searching ${agents.length} sites · ${doneCount} complete` : "Starting live search agents"}
              </>
            )}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{agents.length > 0 ? `${doneCount} / ${agents.length}` : isLoading ? "..." : "0 / 0"}</span>
        </div>

        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: agents.length > 0 ? `${(doneCount / agents.length) * 100}%` : isLoading ? "12%" : "0%" }} />
        </div>

        {agents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => <AgentChip key={`${agent.section ?? "unknown"}-${agent.name}`} agent={agent} />)}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Waiting for the first platform to report back.</div>
        )}
      </div>

      {hasCompleted && !isLoading ? (
        <div className="mb-4 rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
          {failedAgents > 0 && completedAgents === 0 ? (
            <>
              <span className="font-medium text-foreground">No live results.</span> All selected platforms timed out, were blocked, or failed before checkout.
            </>
          ) : failedAgents > 0 ? (
            <>
              <span className="font-medium text-foreground">Partial live coverage.</span> {completedAgents} platform{completedAgents === 1 ? "" : "s"} returned usable checkout data and {failedAgents} platform{failedAgents === 1 ? "" : "s"} timed out or were blocked.
            </>
          ) : agents.length > 0 ? (
            <>
              <span className="font-medium text-foreground">Live results verified.</span> All {agents.length} selected platforms completed successfully.
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          <div className="font-medium">{error}</div>
          {clarifications.length > 0 ? <ul className="mt-3 list-disc pl-5 text-sm">{clarifications.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          {suggestedQuery ? <div className="mt-3 rounded-xl border border-destructive/10 bg-background/60 p-3 text-xs text-foreground"><span className="font-medium">Try a more specific query:</span> {suggestedQuery}</div> : null}
        </div>
      ) : null}

      {isLoading || hasCompleted || results.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-serif text-xl text-foreground">Live search results</h2>
            <span className="text-sm text-muted-foreground">Ranked by true price</span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Sort by</span>
              {([
                { value: "true-total", label: "True total" },
                { value: "headline", label: "Advertised price" },
                { value: "largest-gap", label: "Biggest gap" },
              ] as const).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortMode(option.value)}
                  className={cn("rounded-full px-3 py-1.5 text-sm transition-colors", sortMode === option.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowWarningsOnly((current) => !current)}
              className={cn("inline-flex items-center rounded-full px-3 py-1.5 text-sm transition-colors", showWarningsOnly ? "bg-warning/15 text-warning-foreground ring-1 ring-warning/30" : "bg-secondary text-muted-foreground hover:text-foreground")}
            >
              {showWarningsOnly ? `Showing warnings only (${warningResultCount})` : `Show warnings only (${warningResultCount})`}
            </button>
          </div>

          {sectionedResults.map(({ section, label, results: sectionResults, agents: sectionAgents }) =>
            sectionResults.length > 0 || sectionAgents.length > 0 ? (
              <div key={section} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{label}</div>
                    <div className="text-xs text-muted-foreground">{sectionAgents.length > 0 ? `${sectionAgents.filter((agent) => agent.status === "done" || agent.status === "error").length} / ${sectionAgents.length} platforms reported` : "Waiting for platforms"}</div>
                  </div>
                  {sectionAgents.some((agent) => agent.status === "error") ? <div className="rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">{sectionAgents.filter((agent) => agent.status === "error").length} blocked or failed</div> : null}
                  {sectionAgents.length > 0 ? <div className="flex flex-wrap gap-2">{sectionAgents.map((agent) => <AgentChip key={`${section}-${agent.name}`} agent={agent} />)}</div> : null}
                </div>

                {sectionAgents.filter((agent) => agent.status === "error" && agent.error).length > 0 ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
                    {sectionAgents.filter((agent) => agent.status === "error" && agent.error).map((agent) => `${agent.name}: ${agent.error}`).join(" · ")}
                  </div>
                ) : null}

                <AnimatePresence initial={false}>
                  {sectionResults.map((result, index) => (
                    <ResultCard key={`${section}-${result.platform}`} result={result} rank={index} bestTotal={sectionResults[0]?.total ?? bestTotal} worstTotal={sectionResults[sectionResults.length - 1]?.total ?? worstTotal} priceContext={buildPriceContext(search, section)} />
                  ))}
                </AnimatePresence>
              </div>
            ) : null
          )}

          {isLoading ? Array.from({ length: skeletonCount }).map((_, index) => <ResultSkeleton key={`skeleton-${index}`} />) : null}

          {!isLoading && displayedResults.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              {showWarningsOnly ? "No results with warning flags matched the current filter." : "No results came back for this query."}
            </div>
          ) : null}

          {!isLoading && cheapestHeadlineResult && insightDelta > 0 ? (
            <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">The cheapest-looking option</span> ({cheapestHeadlineResult.platform} at S${formatMoney(cheapestHeadlineResult.headline)}) costs <span className="font-medium text-destructive">S${formatMoney(insightDelta)}</span> more at checkout than the best deal.
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
