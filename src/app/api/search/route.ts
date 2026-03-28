import { NextRequest, NextResponse } from "next/server";
import { parseQuery, type ParsedSearchQuery, type SearchType } from "@/lib/parse-query";

export const runtime = "nodejs";

export interface SearchPayload {
  query: string;
}

export interface PriceResult {
  platform: string;
  platformColor: string;
  platformInitials: string;
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
}

export interface SearchResponse {
  results: PriceResult[];
  query: string;
  searchedAt: string;
}

const MAX_TARGETS_PER_SEARCH = 3;
const AGENT_TIMEOUT_MS = 45_000;

const FLIGHT_TARGETS = [
  { url: "https://www.skyscanner.com", name: "Skyscanner", color: "#0770CD", initials: "SK" },
  { url: "https://flights.google.com", name: "Google Flights", color: "#4285F4", initials: "GF" },
  { url: "https://www.kayak.com", name: "Kayak", color: "#FF690F", initials: "KY" },
  { url: "https://www.expedia.com", name: "Expedia", color: "#FBBC04", initials: "EX" },
  { url: "https://www.airasia.com", name: "AirAsia", color: "#E60026", initials: "AA" },
  { url: "https://www.flyscoot.com", name: "Scoot", color: "#FFD700", initials: "SC" },
];

const HOTEL_TARGETS = [
  { url: "https://www.booking.com", name: "Booking.com", color: "#003B95", initials: "BK" },
  { url: "https://www.agoda.com", name: "Agoda", color: "#7F4FD6", initials: "AG" },
  { url: "https://www.hotels.com", name: "Hotels.com", color: "#D32F2F", initials: "HT" },
  { url: "https://www.expedia.com", name: "Expedia Hotels", color: "#FBBC04", initials: "EX" },
];

const CAR_TARGETS = [
  { url: "https://www.rentalcars.com", name: "Rentalcars", color: "#FDB913", initials: "RC" },
  { url: "https://www.kayak.com/cars", name: "Kayak Cars", color: "#FF690F", initials: "KY" },
  { url: "https://www.expedia.com/Cars", name: "Expedia Cars", color: "#FBBC04", initials: "EX" },
];

type SearchTarget = {
  url: string;
  name: string;
  color: string;
  initials: string;
};

type TinyFishRawResult = {
  base_fare?: number | null;
  taxes_and_fees?: number | null;
  baggage_fee?: number | null;
  platform_service_fee?: number | null;
  service_fee?: number | null;
  total_checkout_price?: number | null;
  airline_name?: string | null;
  provider_name?: string | null;
  property_name?: string | null;
  vehicle_name?: string | null;
  flight_duration?: string | null;
  departure_time?: string | null;
  room_type?: string | null;
  pickup_time?: string | null;
  route?: string | null;
};

type TinyFishStreamEvent = {
  type: "STARTED" | "STREAMING_URL" | "PROGRESS" | "HEARTBEAT" | "COMPLETE";
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  result?: TinyFishRawResult;
  error?: { message?: string } | string;
};

type SearchEvent =
  | { type: "SEARCH_META"; query: string; parsedQuery: ParsedSearchQuery | null; activeTargets: string[] }
  | { type: "AGENT_START"; platform: string }
  | { type: "AGENT_DONE"; platform: string; result: PriceResult | null; error?: string }
  | { type: "SEARCH_DONE"; response: SearchResponse };

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function inferTypesFromQuery(query: string): SearchType[] {
  const lower = query.toLowerCase();
  const types: SearchType[] = [];

  if (/\b(fly|flight|airfare|plane|airport)\b/.test(lower)) {
    types.push("flights");
  }
  if (/\b(hotel|stay|resort|hostel|room|accommodation)\b/.test(lower)) {
    types.push("hotels");
  }
  if (/\b(car|rental|rent a car|vehicle|pickup)\b/.test(lower)) {
    types.push("cars");
  }

  return types.length > 0 ? types : ["flights"];
}

function getTargets(types: SearchType[]) {
  const targets: SearchTarget[] = [];

  if (types.includes("flights")) targets.push(...FLIGHT_TARGETS);
  if (types.includes("hotels")) targets.push(...HOTEL_TARGETS);
  if (types.includes("cars")) targets.push(...CAR_TARGETS);

  return targets.slice(0, MAX_TARGETS_PER_SEARCH);
}

function buildPrompt(searchQuery: string, parsedQuery: ParsedSearchQuery | null) {
  const normalized = parsedQuery?.normalizedQuery || searchQuery;

  return [
    `Search for the cheapest available travel option that matches this request: "${normalized}".`,
    parsedQuery?.origin ? `Origin: ${parsedQuery.origin}.` : "",
    parsedQuery?.destination ? `Destination: ${parsedQuery.destination}.` : "",
    parsedQuery?.departDate ? `Departure date: ${parsedQuery.departDate}.` : "",
    parsedQuery?.returnDate ? `Return date: ${parsedQuery.returnDate}.` : "",
    parsedQuery?.pax ? `Passengers: ${parsedQuery.pax}.` : "",
    "Navigate until the final checkout summary page before payment.",
    "Extract the cheapest qualifying option only.",
    "Return ONLY valid minified JSON with this exact shape:",
    '{"base_fare":number,"taxes_and_fees":number,"baggage_fee":number,"platform_service_fee":number,"service_fee":number,"total_checkout_price":number,"airline_name":string|null,"provider_name":string|null,"property_name":string|null,"vehicle_name":string|null,"flight_duration":string|null,"departure_time":string|null,"room_type":string|null,"pickup_time":string|null,"route":string|null}',
    "Use 0 for missing numeric fees and null for unknown strings.",
    "Do not include markdown, comments, or extra keys.",
  ]
    .filter(Boolean)
    .join(" ");
}

async function runTinyFishAgent(url: string, goal: string): Promise<TinyFishRawResult> {
  if (!process.env.TINYFISH_API_KEY) {
    throw new Error("TINYFISH_API_KEY is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("TinyFish agent timed out"), AGENT_TIMEOUT_MS);

  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: "stealth",
        api_integration: "rosetta",
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`TinyFish request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let lastResult: TinyFishRawResult | null = null;
    let terminalStatus: TinyFishStreamEvent["status"] | null = null;
    let terminalError: string | null = null;

    const parseMessage = (message: string) => {
      const dataLine = message
        .split("\n")
        .map((line) => line.trimStart())
        .find((line) => line.startsWith("data: "));

      if (!dataLine) return;

      try {
        const event = JSON.parse(dataLine.slice(6)) as TinyFishStreamEvent;
        if (event.type !== "COMPLETE") return;

        terminalStatus = event.status ?? null;
        if (typeof event.error === "string") {
          terminalError = event.error;
        } else if (event.error?.message) {
          terminalError = event.error.message;
        }

        if (event.status === "COMPLETED" && event.result) {
          lastResult = event.result;
        }
      } catch {
        return;
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split("\n\n");
      buffer = messages.pop() ?? "";

      for (const message of messages) {
        parseMessage(message);
      }
    }

    if (buffer.trim()) {
      parseMessage(buffer);
    }

    if (terminalStatus && terminalStatus !== "COMPLETED") {
      throw new Error(terminalError || `TinyFish run ended with status ${terminalStatus}`);
    }

    if (!lastResult) {
      throw new Error("TinyFish did not return a COMPLETE result");
    }

    return lastResult;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out after ${Math.round(AGENT_TIMEOUT_MS / 1000)}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackDetail(raw: TinyFishRawResult) {
  return raw.property_name || raw.provider_name || raw.airline_name || raw.vehicle_name || "";
}

function formatResult(target: SearchTarget, raw: TinyFishRawResult): PriceResult {
  const base = safeNumber(raw.base_fare);
  const taxes = safeNumber(raw.taxes_and_fees);
  const baggage = safeNumber(raw.baggage_fee);
  const platformFee = safeNumber(raw.platform_service_fee);
  const serviceFee = safeNumber(raw.service_fee);
  const total = safeNumber(raw.total_checkout_price) || base + taxes + baggage + platformFee + serviceFee;
  const provider = raw.airline_name || raw.provider_name || raw.property_name || raw.vehicle_name || "";

  const flags: string[] = [];
  if (platformFee > 0) flags.push(`Hidden platform fee: S$${platformFee}`);
  if (serviceFee > 0) flags.push(`Service fee added at checkout: S$${serviceFee}`);

  return {
    platform: provider ? `${target.name} -> ${provider}` : target.name,
    platformColor: target.color,
    platformInitials: target.initials,
    route: raw.route || raw.flight_duration || raw.room_type || raw.vehicle_name || "See checkout details",
    detail: raw.departure_time || raw.pickup_time || fallbackDetail(raw),
    headline: base,
    breakdown: {
      base,
      taxes,
      baggage: baggage || undefined,
      platformFee: platformFee || undefined,
      serviceFee: serviceFee || undefined,
    },
    total,
    flags: flags.length > 0 ? flags : undefined,
  };
}

function rankResults(results: PriceResult[]) {
  const ranked = [...results].sort((a, b) => a.total - b.total);
  if (ranked.length > 0) {
    ranked[0] = { ...ranked[0], isBest: true };
  }
  return ranked;
}

function encodeEvent(event: SearchEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  const { query }: SearchPayload = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  let parsedQuery: ParsedSearchQuery | null = null;
  try {
    parsedQuery = await parseQuery(query);
  } catch {
    parsedQuery = null;
  }

  const activeTypes = parsedQuery?.types?.length ? parsedQuery.types : inferTypesFromQuery(query);
  const activeTargets = getTargets(activeTypes);
  const goal = buildPrompt(parsedQuery?.normalizedQuery || query, parsedQuery);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const results: PriceResult[] = [];

      controller.enqueue(
        encoder.encode(
          encodeEvent({
            type: "SEARCH_META",
            query,
            parsedQuery,
            activeTargets: activeTargets.map((target) => target.name),
          }),
        ),
      );

      await Promise.all(
        activeTargets.map(async (target) => {
          controller.enqueue(encoder.encode(encodeEvent({ type: "AGENT_START", platform: target.name })));

          try {
            const raw = await runTinyFishAgent(target.url, goal);
            const result = formatResult(target, raw);
            results.push(result);

            controller.enqueue(
              encoder.encode(encodeEvent({ type: "AGENT_DONE", platform: target.name, result })),
            );
          } catch (error) {
            controller.enqueue(
              encoder.encode(
                encodeEvent({
                  type: "AGENT_DONE",
                  platform: target.name,
                  result: null,
                  error: error instanceof Error ? error.message : "Unknown TinyFish error",
                }),
              ),
            );
          }
        }),
      );

      const response: SearchResponse = {
        results: rankResults(results),
        query,
        searchedAt: new Date().toISOString(),
      };

      controller.enqueue(encoder.encode(encodeEvent({ type: "SEARCH_DONE", response })));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
