import { NextRequest, NextResponse } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchPayload {
  query: string; // Raw NLP query from user
}

export interface PriceResult {
  platform: string;
  platformColor: string;
  platformInitials: string;
  route: string;
  detail: string;
  headline: number;   // Advertised "from" price
  breakdown: {
    base: number;
    taxes: number;
    baggage?: number;
    platformFee?: number;
    serviceFee?: number;
  };
  total: number;      // True all-in price
  isBest?: boolean;
  flags?: string[];   // e.g. "Hidden platform fee", "Fake discount detected"
}

export interface SearchResponse {
  results: PriceResult[];
  query: string;
  searchedAt: string;
}

// ─── TinyFish targets ────────────────────────────────────────────────────────
//
// On hackathon day, populate this list and uncomment the real call below.
// Each entry is one TinyFish agent invocation.
//
const FLIGHT_TARGETS = [
  { url: "https://www.skyscanner.com", name: "Skyscanner", color: "#0770CD", initials: "SK" },
  { url: "https://flights.google.com",  name: "Google Flights", color: "#4285F4", initials: "GF" },
  { url: "https://www.kayak.com",       name: "Kayak",          color: "#FF690F", initials: "KY" },
  { url: "https://www.expedia.com",     name: "Expedia",        color: "#FBBC04", initials: "EX" },
  { url: "https://www.airasia.com",     name: "AirAsia",        color: "#E60026", initials: "AA" },
  { url: "https://www.flyscoot.com",    name: "Scoot",          color: "#FFD700", initials: "SC" },
];

// ─── Helper: call one TinyFish agent ─────────────────────────────────────────

async function runTinyFishAgent(
  url: string,
  goal: string
): Promise<string> {
  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal, browser_profile: "stealth" }),
  });

  // SSE stream — collect all data events, return last COMPLETE result
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let lastResult = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
    for (const line of lines) {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.type === "COMPLETE" && event.result) {
          lastResult = JSON.stringify(event.result);
        }
      } catch {
        // partial chunk, skip
      }
    }
  }

  return lastResult;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { query }: SearchPayload = await req.json();

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  // ── STUB: return mock data while building UI ──────────────────────────────
  // Delete this block on hackathon day and uncomment the real call below.
  const STUB_RESULTS: PriceResult[] = [
    {
      platform: "Skyscanner → Scoot",
      platformColor: "#0770CD",
      platformInitials: "SK",
      route: "SIN → BKK · Non-stop · 2h 15m",
      detail: "Departing Apr 18 · Returning Apr 23",
      headline: 89,
      breakdown: { base: 89, taxes: 34, baggage: 42, platformFee: 0 },
      total: 254,
      isBest: true,
    },
    {
      platform: "Google Flights → AirAsia",
      platformColor: "#4285F4",
      platformInitials: "GF",
      route: "SIN → BKK · Non-stop · 2h 20m",
      detail: "Departing Apr 18 · Returning Apr 23",
      headline: 79,
      breakdown: { base: 79, taxes: 38, baggage: 60, platformFee: 18 },
      total: 274,
      flags: ["Hidden platform fee detected"],
    },
    {
      platform: "Expedia → Scoot",
      platformColor: "#FBBC04",
      platformInitials: "EX",
      route: "SIN → BKK · Non-stop · 2h 15m",
      detail: "Departing Apr 18 · Returning Apr 23",
      headline: 95,
      breakdown: { base: 95, taxes: 34, baggage: 42, serviceFee: 24 },
      total: 290,
      flags: ['"50% off" — original price set 2 days ago'],
    },
  ];

  return NextResponse.json({
    results: STUB_RESULTS,
    query,
    searchedAt: new Date().toISOString(),
  } satisfies SearchResponse);
  // ── END STUB ───────────────────────────────────────────────────────────────


  /* ── REAL CALL (uncomment on hackathon day) ────────────────────────────────

  // Build a structured goal from the NLP query
  // TODO: use OpenAI to parse query → { origin, destination, departDate, returnDate, pax }
  const goal = `
    Search for flights matching this travel request: "${query}".
    Navigate to the flight search results, select the cheapest available option,
    proceed to checkout WITHOUT purchasing, and extract:
    - base_fare (per person, numeric)
    - taxes_and_fees (total, numeric)
    - baggage_fee (if any, numeric, else 0)
    - platform_service_fee (if any, numeric, else 0)
    - total_checkout_price (numeric)
    - airline_name (string)
    - flight_duration (string)
    - departure_time (string)
    Return ONLY valid JSON in this exact shape:
    { base_fare, taxes_and_fees, baggage_fee, platform_service_fee, total_checkout_price, airline_name, flight_duration, departure_time }
  `;

  // Run all agents in parallel
  const settled = await Promise.allSettled(
    FLIGHT_TARGETS.map((t) => runTinyFishAgent(t.url, goal))
  );

  const results: PriceResult[] = settled
    .map((outcome, i) => {
      if (outcome.status === "rejected") return null;
      try {
        const raw = JSON.parse(outcome.value);
        const total =
          (raw.base_fare ?? 0) +
          (raw.taxes_and_fees ?? 0) +
          (raw.baggage_fee ?? 0) +
          (raw.platform_service_fee ?? 0);
        const flags: string[] = [];
        if ((raw.platform_service_fee ?? 0) > 0)
          flags.push(`Hidden platform fee: S$${raw.platform_service_fee}`);
        const target = FLIGHT_TARGETS[i];
        return {
          platform: `${target.name} → ${raw.airline_name ?? ""}`.trim(),
          platformColor: target.color,
          platformInitials: target.initials,
          route: `${raw.flight_duration ?? ""} · Non-stop`,
          detail: raw.departure_time ?? "",
          headline: raw.base_fare ?? 0,
          breakdown: {
            base: raw.base_fare ?? 0,
            taxes: raw.taxes_and_fees ?? 0,
            baggage: raw.baggage_fee,
            platformFee: raw.platform_service_fee,
          },
          total,
          flags,
        } satisfies PriceResult;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as PriceResult[];

  // Mark cheapest as best
  if (results.length > 0) {
    const minIdx = results.reduce(
      (best, r, i) => (r.total < results[best].total ? i : best),
      0
    );
    results[minIdx].isBest = true;
  }

  // Sort cheapest first
  results.sort((a, b) => a.total - b.total);

  return NextResponse.json({
    results,
    query,
    searchedAt: new Date().toISOString(),
  } satisfies SearchResponse);

  ── END REAL CALL ─────────────────────────────────────────────────────────── */
}
