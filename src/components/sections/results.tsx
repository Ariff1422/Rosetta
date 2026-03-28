"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SearchRequestPayload } from "@/lib/search-schema";
import { cn } from "@/lib/utils";

type AgentStatus = "pending" | "scanning" | "done" | "error";

interface Agent {
  name: string;
  status: AgentStatus;
}

interface PriceBreakdown {
  base: number;
  taxes: number;
  baggage?: number;
  platformFee?: number;
  serviceFee?: number;
}

interface Result {
  platform: string;
  platformColor: string;
  platformInitials: string;
  route: string;
  detail: string;
  headline: number;
  breakdown: PriceBreakdown;
  total: number;
  isBest?: boolean;
  flags?: string[];
}

interface SearchResponse {
  results: Result[];
  query?: string;
  searchedAt?: string;
  error?: string;
  clarifications?: string[];
  suggestedQuery?: string;
}

interface SearchMetaEvent {
  type: "SEARCH_META";
  query: string;
  activeTargets?: string[];
}

interface AgentStartEvent {
  type: "AGENT_START";
  platform: string;
}

interface AgentDoneEvent {
  type: "AGENT_DONE";
  platform: string;
  result: Result | null;
  error?: string;
}

interface SearchDoneEvent {
  type: "SEARCH_DONE";
  response: SearchResponse;
}

type StreamEventPayload =
  | SearchMetaEvent
  | AgentStartEvent
  | AgentDoneEvent
  | SearchDoneEvent
  | {
      type?: string;
      event?: string;
      platform?: string;
      message?: string;
      results?: Result[];
      result?: Result | null;
    };

const INITIAL_SKELETON_COUNT = 3;

function normalizeResults(results: Result[]): Result[] {
  const sorted = [...results].sort((a, b) => a.total - b.total);

  return sorted.map((result, index) => ({
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
  }));
}

function upsertAgent(list: Agent[], name: string, status: AgentStatus) {
  const trimmed = name.trim();
  if (!trimmed) return list;

  const index = list.findIndex((agent) => agent.name === trimmed);
  if (index === -1) return [...list, { name: trimmed, status }];

  const next = [...list];
  next[index] = { ...next[index], status };
  return next;
}

function upsertResult(list: Result[], nextResult: Result) {
  const filtered = list.filter((item) => item.platform !== nextResult.platform);
  return normalizeResults([...filtered, nextResult]);
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

  const rawData = dataLines.join("\n");

  try {
    const parsed = JSON.parse(rawData) as StreamEventPayload;
    return {
      type: parsed.type ?? parsed.event ?? eventName,
      payload: parsed,
    };
  } catch {
    return null;
  }
}

function applyStreamEvent(
  payload: StreamEventPayload,
  setAgents: Dispatch<SetStateAction<Agent[]>>,
  setResults: Dispatch<SetStateAction<Result[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setHasCompleted: Dispatch<SetStateAction<boolean>>
) {
  const type = (payload.type ?? payload.event ?? "").toUpperCase();

  if (type === "SEARCH_META" && "activeTargets" in payload) {
    const targets = payload.activeTargets ?? [];
    setAgents(targets.map((name) => ({ name, status: "pending" as AgentStatus })));
    return;
  }

  const platform = "platform" in payload && typeof payload.platform === "string"
    ? payload.platform
    : "";
  const agentError = "error" in payload && typeof payload.error === "string"
    ? payload.error
    : undefined;
  const agentResult = "result" in payload ? payload.result : undefined;

  if (type === "AGENT_START" && platform) {
    setAgents((current) => upsertAgent(current, platform, "scanning"));
    return;
  }

  if (type === "AGENT_DONE" && platform) {
    setAgents((current) =>
      upsertAgent(current, platform, agentError ? "error" : "done")
    );

    if (agentResult) {
      setResults((current) => upsertResult(current, agentResult as Result));
    }

    if (agentError) {
      setError((current) => current ?? agentError ?? "Search failed.");
    }
    return;
  }

  if (type === "SEARCH_DONE" && "response" in payload) {
    setResults(normalizeResults(payload.response.results ?? []));
    setHasCompleted(true);
    return;
  }

  if (type === "RESULTS" && "results" in payload && Array.isArray(payload.results)) {
    setResults(normalizeResults(payload.results));
    setHasCompleted(true);
    return;
  }

  if (type === "ERROR") {
    setError("message" in payload && payload.message ? payload.message : "Search failed.");
  }
}

function AgentChip({ agent }: { agent: Agent }) {
  return (
    <div
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
      {agent.status === "pending" && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-30" />
      )}
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
              <div className="h-3 w-28 rounded-full bg-secondary/70" />
            </div>
          </div>
          <div className="space-y-2 sm:text-right">
            <div className="h-3 w-20 rounded-full bg-secondary" />
            <div className="h-10 w-28 rounded-full bg-secondary" />
            <div className="h-3 w-24 rounded-full bg-secondary/80" />
          </div>
        </div>

        <div className="rounded-xl bg-secondary/40 px-4 py-3">
          <div className="flex flex-wrap gap-3">
            <div className="h-4 w-28 rounded-full bg-secondary" />
            <div className="h-4 w-32 rounded-full bg-secondary" />
            <div className="h-4 w-24 rounded-full bg-secondary" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-40 rounded-full bg-secondary" />
          <div className="h-8 w-24 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}

function ResultCard({
  result,
  rank,
  pax = 2,
  bestTotal,
  worstTotal,
}: {
  result: Result;
  rank: number;
  pax?: number;
  bestTotal: number;
  worstTotal: number;
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
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
              style={{ background: result.platformColor }}
            >
              {result.platformInitials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{result.platform}</span>
                {result.isBest && (
                  <Badge variant="default" className="px-2 py-0 text-[10px]">
                    Best deal
                  </Badge>
                )}
              </div>
              <div className="truncate text-sm text-muted-foreground sm:text-base">
                {result.route}
              </div>
              <div className="truncate text-xs text-muted-foreground/70">{result.detail}</div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <div className="mb-0.5 text-sm text-muted-foreground line-through decoration-muted-foreground/60">
              from S${result.headline * pax}
            </div>
            <div className="font-serif text-4xl font-normal leading-none tracking-tight text-foreground">
              S${result.total}
            </div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
              true total · {pax} pax
            </div>
          </div>
        </div>

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {result.isBest && savings > 0 ? (
            <div className="flex items-center gap-1.5 text-sm font-medium text-success">
              <TrendingDown className="h-4 w-4" />
              S${savings} cheaper than the most expensive option
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              {premiumVsBest > 0 ? `S$${premiumVsBest} more than the best deal` : "Best total price"}
            </div>
          )}
          <Button
            variant={result.isBest ? "default" : "outline"}
            size="sm"
            className="gap-1.5 self-start sm:self-auto"
          >
            Book now
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function Results({ search }: { search: SearchRequestPayload }) {
  const query = search.query;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [suggestedQuery, setSuggestedQuery] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

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
            if (payload.error) {
              message = payload.error;
            }
            if (payload.clarifications?.length) {
              setClarifications(payload.clarifications);
            }
            if (payload.suggestedQuery) {
              setSuggestedQuery(payload.suggestedQuery);
            }
          } catch {
            // Ignore JSON parsing errors and keep the status fallback.
          }
          throw new Error(message);
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as SearchResponse;
          setResults(normalizeResults(payload.results ?? []));
          setAgents(
            (payload.results ?? []).map((result) => ({
              name: result.platform,
              status: "done" as AgentStatus,
            }))
          );
          setHasCompleted(true);
          return;
        }

        if (!response.body) {
          throw new Error("Search stream is unavailable.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // Cancel the reader if no data arrives within 90 seconds (backend timeout is 60s per agent)
        const STREAM_IDLE_TIMEOUT_MS = 90_000;
        let idleTimer: ReturnType<typeof setTimeout> | null = null;

        const resetIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => reader.cancel("stream idle timeout"), STREAM_IDLE_TIMEOUT_MS);
        };

        resetIdleTimer();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            resetIdleTimer();
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() ?? "";

            for (const block of blocks) {
              const parsed = parseSseBlock(block);
              if (!parsed) continue;
              applyStreamEvent(parsed.payload, setAgents, setResults, setError, setHasCompleted);
            }
          }
        } finally {
          if (idleTimer) clearTimeout(idleTimer);
        }

        if (buffer.trim()) {
          const parsed = parseSseBlock(buffer);
          if (parsed) {
            applyStreamEvent(parsed.payload, setAgents, setResults, setError, setHasCompleted);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        // Ignore idle timeout cancellations — we already have whatever results arrived
        const message = err instanceof Error ? err.message : String(err);
        if (message === "stream idle timeout") {
          setHasCompleted(true);
        } else {
          setError(message || "Unable to fetch results.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void runSearch();
    return () => controller.abort();
  }, [query, search]);

  const doneCount = agents.filter((agent) => agent.status === "done" || agent.status === "error").length;
  const allDone = hasCompleted || (agents.length > 0 && agents.every((agent) => agent.status === "done" || agent.status === "error") && !isLoading);
  const bestTotal = results[0]?.total ?? 0;
  const worstTotal = results[results.length - 1]?.total ?? bestTotal;
  const cheapestHeadlineResult = useMemo(
    () =>
      results.length === 0
        ? null
        : [...results].sort((a, b) => a.headline - b.headline)[0],
    [results]
  );
  const insightDelta =
    cheapestHeadlineResult && bestTotal
      ? cheapestHeadlineResult.total - bestTotal
      : 0;
  const skeletonCount = Math.max(INITIAL_SKELETON_COUNT - results.length, 0);

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">Results for</span>
        <span className="rounded-full bg-secondary px-3 py-1 font-medium text-foreground">
          {query}
        </span>
      </div>

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
                {agents.length > 0
                  ? `Searching ${agents.length} sites · ${doneCount} complete`
                  : "Starting live search agents"}
              </>
            )}
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {agents.length > 0
              ? `${doneCount} / ${agents.length}`
              : isLoading
                ? "…"
                : "0 / 0"}
          </span>
        </div>

        <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{
              width:
                agents.length > 0
                  ? `${(doneCount / agents.length) * 100}%`
                  : isLoading
                    ? "12%"
                    : "0%",
            }}
          />
        </div>

        {agents.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {agents.map((agent) => (
              <AgentChip key={agent.name} agent={agent} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            Waiting for the first platform to report back.
          </div>
        )}
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          <div className="font-medium">{error}</div>
          {clarifications.length > 0 ? (
            <ul className="mt-3 list-disc pl-5 text-sm">
              {clarifications.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {suggestedQuery ? (
            <div className="mt-3 rounded-xl border border-destructive/10 bg-background/60 p-3 text-xs text-foreground">
              <span className="font-medium">Try a more specific query:</span> {suggestedQuery}
            </div>
          ) : null}
        </div>
      ) : null}

      {(isLoading || hasCompleted || results.length > 0) && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 pb-1 sm:flex-row sm:items-baseline sm:justify-between">
            <h2 className="font-serif text-xl text-foreground">Live search results</h2>
            <span className="text-sm text-muted-foreground">Ranked by true price</span>
          </div>

          <AnimatePresence initial={false}>
            {results.map((result, index) => (
              <ResultCard
                key={result.platform}
                result={result}
                rank={index}
                pax={2}
                bestTotal={bestTotal}
                worstTotal={worstTotal}
              />
            ))}
          </AnimatePresence>

          {isLoading &&
            Array.from({ length: skeletonCount }).map((_, index) => (
              <ResultSkeleton key={`skeleton-${index}`} />
            ))}

          {!isLoading && results.length === 0 ? (
            <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
              No results came back for this query.
            </div>
          ) : null}

          {!isLoading && cheapestHeadlineResult && insightDelta > 0 ? (
            <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">The cheapest-looking option</span>{" "}
              ({cheapestHeadlineResult.platform} at S${cheapestHeadlineResult.headline * 2}) costs{" "}
              <span className="font-medium text-destructive">S${insightDelta} more</span> at
              checkout than the best deal.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
