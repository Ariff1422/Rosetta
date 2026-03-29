import { NextRequest, NextResponse } from "next/server";
import { parseQuery, type ParsedSearchQuery, type SearchType } from "@/lib/parse-query";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildSectionSearchQuery,
  type LayoverPreference,
  type SearchRequestPayload,
  type SearchSectionsPayload,
  type StructuredSearchPayload,
  type TravelSectionPayload,
} from "@/lib/search-schema";

export const runtime = "nodejs";

export interface SearchPayload {
  query: string;
  structured?: StructuredSearchPayload;
}

export interface PriceResult {
  section: SearchType;
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
}

export interface SearchResponse {
  results: PriceResult[];
  query: string;
  searchedAt: string;
  completedAgents?: number;
  failedAgents?: number;
  savedRequestId?: string;
}

type ClarificationResponse = {
  error: string;
  clarifications: string[];
  suggestedQuery: string;
};
const PARSE_TIMEOUT_MS = 2_500;
const KEEPALIVE_INTERVAL_MS = 5_000;
const FLIGHT_TARGETS = [
  { url: "https://www.kayak.com", name: "Kayak", color: "#FF690F", initials: "KY", browserProfile: "lite" as const, searchType: "flights" as const },
  { url: "https://www.skyscanner.com", name: "Skyscanner", color: "#0770CD", initials: "SK", browserProfile: "lite" as const, searchType: "flights" as const },
  { url: "https://flights.google.com", name: "Google Flights", color: "#4285F4", initials: "GF", browserProfile: "lite" as const, searchType: "flights" as const },
  { url: "https://www.expedia.com", name: "Expedia", color: "#FBBC04", initials: "EX", browserProfile: "stealth" as const, searchType: "flights" as const },
  { url: "https://www.airasia.com", name: "AirAsia", color: "#E60026", initials: "AA", browserProfile: "lite" as const, searchType: "flights" as const },
  { url: "https://www.flyscoot.com", name: "Scoot", color: "#FFD700", initials: "SC", browserProfile: "lite" as const, searchType: "flights" as const },
];

const HOTEL_TARGETS = [
  { url: "https://www.booking.com", name: "Booking.com", color: "#003B95", initials: "BK", browserProfile: "lite" as const, searchType: "hotels" as const },
  { url: "https://www.agoda.com", name: "Agoda", color: "#7F4FD6", initials: "AG", browserProfile: "lite" as const, searchType: "hotels" as const },
  { url: "https://www.hotels.com", name: "Hotels.com", color: "#D32F2F", initials: "HT", browserProfile: "lite" as const, searchType: "hotels" as const },
  { url: "https://www.expedia.com", name: "Expedia Hotels", color: "#FBBC04", initials: "EX", browserProfile: "stealth" as const, searchType: "hotels" as const },
];

const CAR_TARGETS = [
  { url: "https://www.rentalcars.com", name: "Rentalcars", color: "#FDB913", initials: "RC", browserProfile: "lite" as const, searchType: "cars" as const },
  { url: "https://www.kayak.com/cars", name: "Kayak Cars", color: "#FF690F", initials: "KY", browserProfile: "lite" as const, searchType: "cars" as const },
  { url: "https://www.expedia.com/Cars", name: "Expedia Cars", color: "#FBBC04", initials: "EX", browserProfile: "stealth" as const, searchType: "cars" as const },
];

type SearchTarget = {
  url: string;
  name: string;
  color: string;
  initials: string;
  browserProfile: "lite" | "stealth";
  searchType: SearchType;
};

type SearchPreferences = {
  travelType: SearchType;
  tripType: "one-way" | "round-trip";
  cabin: string;
  baggageRequirement: string;
  layoverPreference: LayoverPreference;
  departDateOrWindow: string;
  returnDateOrWindow: string | null;
};

type QueryHints = {
  origin: string | null;
  destination: string | null;
  pax: number | null;
  dateWindow: string | null;
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
  checkout_url?: string | null;
  current_page_url?: string | null;
  logo_url?: string | null;
  original_price?: number | null;
  discount_label?: string | null;
};

type TinyFishStreamEvent = {
  type: "STARTED" | "STREAMING_URL" | "PROGRESS" | "HEARTBEAT" | "COMPLETE";
  status?: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  result?: TinyFishRawResult;
  error?: { message?: string } | string;
};

type SearchEvent =
  | { type: "SEARCH_META"; query: string; parsedQuery: ParsedSearchQuery | null; activeTargets: Array<{ platform: string; section: SearchType }> }
  | { type: "AGENT_START"; platform: string; section: SearchType }
  | { type: "AGENT_DONE"; platform: string; section: SearchType; result: PriceResult | null; error?: string }
  | { type: "SEARCH_DONE"; response: SearchResponse };

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function inferTypesFromQuery(query: string): SearchType[] {
  const lower = query.toLowerCase();
  const types: SearchType[] = [];

  if (/\b(fly|flight|airfare|plane|airport)\b/.test(lower)) types.push("flights");
  if (/\b(hotel|stay|resort|hostel|room|accommodation)\b/.test(lower)) types.push("hotels");
  if (/\b(car|rental|rent a car|vehicle|pickup)\b/.test(lower)) types.push("cars");

  return types.length > 0 ? types : ["flights"];
}

function buildParsedQueryFromStructured(structured: StructuredSearchPayload | undefined, query: string): ParsedSearchQuery | null {
  if (!structured) return null;

  return {
    origin: structured.origin?.trim() || null,
    destination: structured.destination?.trim() || null,
    departDate: structured.departDate?.trim() || null,
    returnDate: structured.returnDate?.trim() || null,
    pax: typeof structured.pax === "number" && Number.isFinite(structured.pax) ? structured.pax : null,
    types: [structured.type],
    normalizedQuery: query,
  };
}

function buildParsedQueryFromSection(
  type: SearchType,
  section: TravelSectionPayload | undefined,
  query: string
): ParsedSearchQuery | null {
  if (!section) return null;

  return {
    origin: section.origin?.trim() || null,
    destination: section.destination?.trim() || null,
    departDate: section.departDate?.trim() || null,
    returnDate: section.returnDate?.trim() || null,
    pax: typeof section.pax === "number" && Number.isFinite(section.pax) ? section.pax : null,
    types: [type],
    normalizedQuery: query,
  };
}

function getSectionPayload(sections: SearchSectionsPayload | undefined, type: SearchType) {
  return sections?.[type];
}

function resolveLayoverPreference(
  query: string,
  sectionPayload: TravelSectionPayload | undefined,
  structured: StructuredSearchPayload | undefined,
  type: SearchType
) {
  if (type !== "flights") return "any" as const;
  return sectionPayload?.layoverPreference ?? (type === structured?.type ? structured?.layoverPreference : undefined) ?? inferLayoverPreference(query);
}

function inferActiveTypesFromSections(sections: SearchSectionsPayload | undefined) {
  const activeTypes = (["flights", "hotels", "cars"] as const).filter((type) => Boolean(sections?.[type]));
  return activeTypes.length > 0 ? activeTypes : null;
}

function getTargets(types: SearchType[]) {
  if (types.length === 1) {
    if (types[0] === "flights") return [...FLIGHT_TARGETS];
    if (types[0] === "hotels") return [...HOTEL_TARGETS];
    return [...CAR_TARGETS];
  }

  const pools: Record<SearchType, SearchTarget[]> = {
    flights: FLIGHT_TARGETS,
    hotels: HOTEL_TARGETS,
    cars: CAR_TARGETS,
  };

  const selected: SearchTarget[] = [];
  let index = 0;

  while (true) {
    let addedInRound = false;
    for (const type of types) {
      const candidate = pools[type][index];
      if (!candidate) continue;
      if (selected.some((target) => target.name === candidate.name && target.url === candidate.url)) continue;
      selected.push(candidate);
      addedInRound = true;
    }
    if (!addedInRound) break;
    index += 1;
  }

  return selected;
}

function hasDateSignal(query: string) {
  return /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|today|tomorrow|weekend|next week|next month|mid|late|early|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/i.test(query);
}

function cleanCapturedLocation(value: string | undefined) {
  if (!value) return null;
  return value
    .replace(/\b(japan|singapore|malaysia|thailand|indonesia)\b/gi, (match) => match)
    .replace(/\b(from|to|near|airport|the)\b/gi, (segment) => (segment.toLowerCase() === "the" ? "" : segment))
    .replace(/\s+/g, " ")
    .replace(/^[,\s]+|[,\s]+$/g, "")
    .trim() || null;
}

function extractQueryHints(query: string): QueryHints {
  const originMatch = query.match(/\bfrom\s+([A-Za-z][A-Za-z\s.-]+?)(?=\s+\bto\b|\s+(?:on|from|for|with|return|returning|depart|departing|stay|hotel|near)\b|,|$)/i);
  const destinationMatch =
    query.match(/\bto\s+([A-Za-z][A-Za-z\s.-]+?)(?=\s+\bfrom\b|\s+(?:on|for|with|return|returning|depart|departing|stay|hotel|near)\b|,|$)/i) ??
    query.match(/\bhotel\s+near\s+([A-Za-z][A-Za-z\s.-]+?)(?=\s+(?:for|with|from|return|returning|on)\b|,|$)/i) ??
    query.match(/\bnear\s+([A-Za-z][A-Za-z\s.-]+?)(?=\s+(?:for|with|from|return|returning|on)\b|,|$)/i);
  const paxMatch =
    query.match(/\b(\d+)\s*(?:other\s+)?(?:adults?|people|passengers?|pax|guests?)\b/i) ??
    query.match(/\bfor\s+(\d+)\b/i);
  const dateMatch =
    query.match(/\bfrom\s+([A-Za-z]+\s+\d{1,2}(?:\s+\d{4})?\s+to\s+[A-Za-z]+\s+\d{1,2}(?:\s+\d{4})?)\b/i) ??
    query.match(/\b(mid|late|early)\s+[A-Za-z]+\b/i) ??
    query.match(/\b[A-Za-z]+\s+\d{1,2}\s*(?:-|to)\s*[A-Za-z]+\s+\d{1,2}(?:\s+\d{4})?\b/i);

  const paxValue = paxMatch?.[1] ? Number.parseInt(paxMatch[1], 10) : null;
  const hasOtherAdults = /\b\d+\s+other\s+adults?\b/i.test(query);
  const passengerCount = paxValue === null || Number.isNaN(paxValue) ? null : hasOtherAdults ? paxValue + 1 : paxValue;

  return {
    origin: cleanCapturedLocation(originMatch?.[1]),
    destination: cleanCapturedLocation(destinationMatch?.[1]),
    pax: passengerCount,
    dateWindow: dateMatch?.[1]?.trim() ?? dateMatch?.[0]?.trim() ?? null,
  };
}

function inferTripType(query: string, parsedQuery: ParsedSearchQuery | null) {
  if (parsedQuery?.returnDate) return "round-trip";
  return /\b(one[- ]way|one way)\b/i.test(query) ? "one-way" : "round-trip";
}

function inferCabin(query: string) {
  const lower = query.toLowerCase();
  if (/\b(business|biz)\b/.test(lower)) return "business";
  if (/\b(first class|first)\b/.test(lower)) return "first";
  if (/\b(premium economy)\b/.test(lower)) return "premium economy";
  if (/\b(economy)\b/.test(lower)) return "economy";
  return "any";
}

function inferBaggageRequirement(query: string) {
  const lower = query.toLowerCase();
  const checkedMatch = lower.match(/(\d+)\s*(kg|kilogram|kilograms)\b/);
  if (/\b(cabin only|carry[- ]on only|hand carry only|no checked bag)\b/.test(lower)) return "cabin baggage only";
  if (/\bchecked bag|checked baggage|luggage included|with baggage|with luggage\b/.test(lower)) {
    if (checkedMatch) return `1 checked bag up to ${checkedMatch[1]}kg`;
    return "1 checked bag";
  }
  if (checkedMatch) return `1 checked bag up to ${checkedMatch[1]}kg`;
  return "not specified, do not add bags";
}

function inferLayoverPreference(query: string) {
  const lower = query.toLowerCase();
  if (/\b(non[- ]stop|nonstop|direct only|direct flight only|no layover|without layover)\b/.test(lower)) {
    return "direct-only" as const;
  }
  if (/\b(max(?:imum)?\s*1\s*stop|1 stop max|up to 1 stop|one stop max)\b/.test(lower)) {
    return "max-1-stop" as const;
  }
  return "any" as const;
}

function buildSearchPreferences(
  query: string,
  parsedQuery: ParsedSearchQuery | null,
  hints: QueryHints,
  travelType: SearchType,
  layoverPreference?: LayoverPreference
): SearchPreferences {
  return {
    travelType,
    tripType: inferTripType(query, parsedQuery),
    cabin: inferCabin(query),
    baggageRequirement: inferBaggageRequirement(query),
    layoverPreference: layoverPreference ?? inferLayoverPreference(query),
    departDateOrWindow: parsedQuery?.departDate ?? hints.dateWindow ?? parsedQuery?.normalizedQuery ?? query.trim(),
    returnDateOrWindow: parsedQuery?.returnDate ?? null,
  };
}

function getMissingFields(query: string, parsedQuery: ParsedSearchQuery | null, travelType: SearchType, hints: QueryHints) {
  const missing: string[] = [];
  if (!parsedQuery?.destination && !hints.destination) missing.push(travelType === "cars" ? "pickup location" : "destination");
  if (travelType === "flights" && !parsedQuery?.origin && !hints.origin) missing.push("origin");
  if (!parsedQuery?.departDate && !hints.dateWindow && !hasDateSignal(query)) {
    missing.push(travelType === "hotels" ? "stay dates or month" : travelType === "cars" ? "pickup date or month" : "travel date or month");
  }
  if (!parsedQuery?.pax && !hints.pax && !/\b\d+\s*(pax|passengers|people|adults|guests|travellers|travelers)\b/i.test(query)) {
    missing.push(travelType === "hotels" ? "guest count" : "passenger count");
  }
  return missing;
}

function buildClarifications(missingFields: string[], travelType: SearchType) {
  return missingFields.map((field) => {
    if (field === "origin") return "Where are you departing from?";
    if (field === "destination") return travelType === "hotels" ? "Which city or area should the hotel be in?" : "Where are you going?";
    if (field === "pickup location") return "Where do you want to pick up the car?";
    if (field === "travel date or month") return "What is your departure date or at least the travel month?";
    if (field === "stay dates or month") return "What are the hotel stay dates or at least the month?";
    if (field === "pickup date or month") return "What is the pickup date or month?";
    if (field === "passenger count") return "How many passengers are travelling?";
    if (field === "guest count") return "How many guests is the hotel for?";
    return `Please provide ${field}.`;
  });
}

function buildSuggestedQuery(query: string, travelType: SearchType) {
  if (travelType === "hotels") {
    return `Hotel in Haneda for 3 guests, May 15 to May 27 2026, near the airport. Based on: ${query}`;
  }
  if (travelType === "cars") {
    return `Rental car in Tokyo, pickup May 15 2026, return May 27 2026, 3 travellers. Based on: ${query}`;
  }
  return `Flight from Singapore to Haneda, May 15 to May 27 2026, 3 adults, round trip, include 30kg checked baggage for 1 adult on the return flight. Based on: ${query}`;
}

function buildPrompt(searchQuery: string, parsedQuery: ParsedSearchQuery | null, preferences: SearchPreferences, hints: QueryHints) {
  const travelType = preferences.travelType;

  if (travelType === "hotels") {
    const destination = parsedQuery?.destination ?? hints.destination ?? "not specified";
    const guests = parsedQuery?.pax ?? hints.pax ?? 1;
    const dates = preferences.departDateOrWindow;
    const hotelSchema = `{"base_fare":120.00,"taxes_and_fees":18.50,"baggage_fee":0,"platform_service_fee":5.00,"service_fee":0,"total_checkout_price":143.50,"property_name":"Sample Hotel","departure_time":"2025-04-15","room_type":"Standard Double","route":"1 night","checkout_url":"https://example.com/checkout","current_page_url":"https://example.com/checkout","logo_url":"https://example.com/favicon.ico","airline_name":null,"provider_name":null,"vehicle_name":null,"flight_duration":null,"pickup_time":null,"original_price":220.00,"discount_label":"30% off"}`;

    return [
      `Find the cheapest hotel in ${destination} for ${guests} guest(s) checking in around ${dates}.`,
      "",
      "Steps:",
      `1. Go to the homepage. Dismiss any cookie banner or popup blocking the page.`,
      `2. Search for hotels in "${destination}" for ${guests} guest(s) with check-in around ${dates}. Wait for the search results list to fully load before proceeding.`,
      `3. Sort results by lowest price if that option is available.`,
      `4. Click on the single cheapest listed option to open its detail page. Wait for the page to load.`,
      `5. Click through to the booking/checkout summary page for that room. Stop before any payment or login screen.`,
      `6. Read the full price breakdown shown at checkout: base rate, taxes, fees, and the total. Record these values.`,
      "",
      "Stop immediately if you encounter: a login wall, CAPTCHA, access denied page, or the page fails to load after 15 seconds.",
      "Do not sign in, create an account, or enter any payment details.",
      "",
      "Return ONLY minified JSON in this exact shape (use real numbers, not strings):",
      hotelSchema,
      "Also return checkout_url as the exact URL of the final checkout summary page before payment if available, otherwise null. Return current_page_url as the current browser URL on the final page if available, otherwise null. Return logo_url as the site logo or favicon URL if clearly visible, otherwise null.",
      "Set original_price to the crossed-out or 'was' price shown on the page if visible, otherwise null. Set discount_label to the discount badge text (e.g. '30% off') if shown, otherwise null.",
      "If no valid result is found, return the same JSON with 0 for numeric fields and null for string fields.",
    ].join("\n");
  }

  if (travelType === "cars") {
    const pickup = parsedQuery?.destination ?? hints.destination ?? "not specified";
    const pickupDate = preferences.departDateOrWindow;
    const returnDate = preferences.returnDateOrWindow ?? "not specified";
    const carSchema = `{"base_fare":45.00,"taxes_and_fees":8.20,"baggage_fee":0,"platform_service_fee":3.00,"service_fee":0,"total_checkout_price":56.20,"vehicle_name":"Economy Hatchback","pickup_time":"09:00","route":"Economy class","checkout_url":"https://example.com/checkout","current_page_url":"https://example.com/checkout","logo_url":"https://example.com/favicon.ico","property_name":null,"airline_name":null,"provider_name":"Hertz","flight_duration":null,"departure_time":null,"room_type":null,"original_price":75.00,"discount_label":"40% off"}`;

    return [
      `Find the cheapest rental car available for pickup at ${pickup} from ${pickupDate} to ${returnDate}.`,
      "",
      "Steps:",
      `1. Go to the homepage. Dismiss any cookie banner or popup blocking the page.`,
      `2. Enter the pickup location "${pickup}", pickup date "${pickupDate}", and return date "${returnDate}". Submit the search. Wait for results to fully load.`,
      `3. Sort by lowest price if that option is available.`,
      `4. Select the single cheapest car option. Wait for the detail page to load.`,
      `5. Proceed to the checkout/booking summary page. Stop before any payment or login screen.`,
      `6. Read the full price breakdown: base rental rate, taxes, fees, and total. Record these values.`,
      "",
      "Stop immediately if you encounter: a login wall, CAPTCHA, access denied page, or the page fails to load after 15 seconds.",
      "Do not sign in, create an account, or enter any payment details.",
      "",
      "Return ONLY minified JSON in this exact shape (use real numbers, not strings):",
      carSchema,
      "Also return checkout_url as the exact URL of the final checkout summary page before payment if available, otherwise null. Return current_page_url as the current browser URL on the final page if available, otherwise null. Return logo_url as the site logo or favicon URL if clearly visible, otherwise null.",
      "Set original_price to the crossed-out or 'was' price shown on the page if visible, otherwise null. Set discount_label to the discount badge text (e.g. '40% off') if shown, otherwise null.",
      "If no valid result is found, return the same JSON with 0 for numeric fields and null for string fields.",
    ].join("\n");
  }

  const origin = parsedQuery?.origin ?? hints.origin ?? "not specified";
  const destination = parsedQuery?.destination ?? hints.destination ?? "not specified";
  const pax = parsedQuery?.pax ?? hints.pax ?? 1;
  const departDate = preferences.departDateOrWindow;
  const returnDate = preferences.returnDateOrWindow;
  const tripType = preferences.tripType;
  const cabin = preferences.cabin;
  const baggage = preferences.baggageRequirement;
  const layovers =
    preferences.layoverPreference === "direct-only"
      ? "Direct flights only. Do not choose any itinerary with a stop."
      : preferences.layoverPreference === "max-1-stop"
        ? "Allow at most 1 stop. Do not choose any itinerary with 2 or more stops."
        : "Layovers: any.";
  const flightSchema = `{"base_fare":85.00,"taxes_and_fees":32.50,"baggage_fee":15.00,"platform_service_fee":4.90,"service_fee":0,"total_checkout_price":137.40,"airline_name":"Scoot","flight_duration":"2h 15m","departure_time":"08:45","route":"SIN-BKK","checkout_url":"https://example.com/checkout","current_page_url":"https://example.com/checkout","logo_url":"https://example.com/favicon.ico","provider_name":null,"property_name":null,"vehicle_name":null,"room_type":null,"pickup_time":null,"original_price":150.00,"discount_label":"50% off"}`;

  return [
    `Find the cheapest ${tripType} ${cabin === "any" ? "" : `${cabin} class `}flight from ${origin} to ${destination} departing around ${departDate}${returnDate ? `, returning around ${returnDate}` : ""} for ${pax} passenger(s).`,
    `Baggage: ${baggage}.`,
    layovers,
    "",
    "Steps:",
    `1. Go to the homepage. Dismiss any cookie banner or popup blocking the page.`,
    `2. Set trip type to "${tripType}". Enter origin "${origin}", destination "${destination}", departure date around "${departDate}"${returnDate ? `, return date around "${returnDate}"` : ""}. Set passenger count to ${pax}${cabin !== "any" ? `. Select cabin class "${cabin}"` : ""}. Submit the search. Wait for the flight results list to fully load before proceeding.`,
    `3. Sort results by lowest price if that option is available.`,
    `4. Select the single cheapest flight option. ${baggage !== "not specified, do not add bags" ? `Add baggage: ${baggage}.` : "Do not add any checked baggage."} Wait for the detail/booking page to load.`,
    `5. Proceed through to the final checkout summary page showing the complete price breakdown. Stop before any payment input or login screen.`,
    `6. Read the full price breakdown: base fare, taxes and fees, baggage fees, platform or service fees, and the total checkout price. Record all values.`,
    "",
    "Stop immediately if you encounter: a login wall, CAPTCHA, access denied page, or the page fails to load after 15 seconds.",
    "Do not sign in, create an account, or enter any payment details.",
    "",
    "Return ONLY minified JSON in this exact shape (use real numbers, not strings):",
    flightSchema,
    "Also return checkout_url as the exact URL of the final checkout summary page before payment if available, otherwise null. Return current_page_url as the current browser URL on the final page if available, otherwise null. Return logo_url as the site logo or favicon URL if clearly visible, otherwise null.",
    "Set original_price to the crossed-out or 'was' price shown on the page if visible, otherwise null. Set discount_label to the discount badge text (e.g. '50% off') if shown, otherwise null.",
    "If no valid result is found, return the same JSON with 0 for numeric fields and null for string fields.",
  ].join("\n");
}

function buildTargetGoal(
  target: SearchTarget,
  query: string,
  parsedQuery: ParsedSearchQuery | null,
  hints: QueryHints,
  layoverPreference?: LayoverPreference
) {
  const preferences = buildSearchPreferences(query, parsedQuery, hints, target.searchType, layoverPreference);
  return buildPrompt(parsedQuery?.normalizedQuery || query, parsedQuery, preferences, hints);
}

async function runTinyFishAgent(target: SearchTarget, goal: string): Promise<TinyFishRawResult> {
  if (!process.env.TINYFISH_API_KEY) {
    throw new Error("TINYFISH_API_KEY is not configured");
  }

  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: target.url,
        goal,
        browser_profile: target.browserProfile,
        api_integration: "rosetta",
      }),
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

      for (const message of messages) parseMessage(message);
    }

    if (buffer.trim()) parseMessage(buffer);

    if (terminalStatus && terminalStatus !== "COMPLETED") {
      throw new Error(terminalError || `TinyFish run ended with status ${terminalStatus}`);
    }

    if (!lastResult) {
      throw new Error("TinyFish did not return a COMPLETE result");
    }

    return lastResult;
  } catch (error) {
    throw error;
  }
}

async function parseQueryWithTimeout(query: string) {
  return await Promise.race([
    parseQuery(query),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), PARSE_TIMEOUT_MS);
    }),
  ]);
}

function fallbackDetail(raw: TinyFishRawResult) {
  return raw.property_name || raw.provider_name || raw.airline_name || raw.vehicle_name || "";
}

function classifyAgentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("timed out") || lower.includes("timeout")) return "Timed out before checkout";
  if (lower.includes("429")) return "Rate limited by platform or provider";
  if (lower.includes("403") || lower.includes("access denied")) return "Blocked by platform";
  if (lower.includes("captcha")) return "Blocked by CAPTCHA";
  if (lower.includes("login")) return "Stopped at login wall";
  if (lower.includes("status 5")) return "Platform returned a server error";
  if (lower.includes("did not return a complete result")) return "No usable checkout result returned";

  return message || "Unknown TinyFish error";
}

function resolveUrl(value: string | null | undefined, base?: string) {
  if (!value) return undefined;

  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

function buildFaviconUrl(target: SearchTarget, checkoutUrl?: string) {
  const source = resolveUrl(checkoutUrl, target.url) ?? resolveUrl(target.url);
  if (!source) return undefined;

  try {
    const origin = new URL(source).origin;
    return `${origin}/favicon.ico`;
  } catch {
    return undefined;
  }
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
  if (raw.original_price && raw.discount_label && base > 0) {
    const inflationRatio = raw.original_price / base;
    if (inflationRatio > 1.4) {
      flags.push(`"${raw.discount_label}" - original price may be inflated`);
    }
  }

  const currentPageUrl = resolveUrl(raw.current_page_url, target.url);
  const checkoutUrl =
    resolveUrl(raw.checkout_url, currentPageUrl ?? target.url) ??
    currentPageUrl ??
    resolveUrl(target.url);
  const platformLogoUrl = resolveUrl(raw.logo_url, checkoutUrl ?? target.url) ?? buildFaviconUrl(target, checkoutUrl);

  return {
    section: target.searchType,
    platform: provider ? `${target.name} -> ${provider}` : target.name,
    platformColor: target.color,
    platformInitials: target.initials,
    platformLogoUrl,
    checkoutUrl,
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
  const grouped = results.reduce<Record<SearchType, PriceResult[]>>(
    (acc, result) => {
      acc[result.section].push(result);
      return acc;
    },
    { flights: [], hotels: [], cars: [] }
  );

  return (["flights", "hotels", "cars"] as const).flatMap((section) => {
    const ranked = [...grouped[section]].sort((a, b) => a.total - b.total);
    if (ranked.length > 0) ranked[0] = { ...ranked[0], isBest: true };
    return ranked;
  });
}

function encodeEvent(event: SearchEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function POST(req: NextRequest) {
  let payload: SearchRequestPayload | null = null;

  try {
    payload = (await req.json()) as SearchRequestPayload;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const query = payload?.query;
  const sections = payload?.sections;
  const structured = payload?.structured;
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const sectionTypes = inferActiveTypesFromSections(sections);
  let parsedQuery =
    sectionTypes?.length === 1
      ? buildParsedQueryFromSection(sectionTypes[0], getSectionPayload(sections, sectionTypes[0]), query)
      : buildParsedQueryFromStructured(structured, query);
  if (!parsedQuery) {
    try {
      parsedQuery = await parseQueryWithTimeout(query);
    } catch {
      parsedQuery = null;
    }
  }

  const activeTypes =
    sectionTypes?.length
      ? sectionTypes
      : structured?.type
      ? [structured.type]
      : parsedQuery?.types?.length
        ? parsedQuery.types
        : inferTypesFromQuery(query);
  const baseHints = extractQueryHints(query);

  for (const type of activeTypes) {
    const sectionPayload = getSectionPayload(sections, type);
    const scopedQuery = sectionPayload ? buildSectionSearchQuery(type, sectionPayload) : query;
    const scopedParsedQuery =
      buildParsedQueryFromSection(type, sectionPayload, scopedQuery) ??
      (parsedQuery?.types?.includes(type) ? parsedQuery : null);
    const hints = {
      ...baseHints,
      origin: sectionPayload?.origin?.trim() || (type === structured?.type ? structured?.origin?.trim() : "") || baseHints.origin,
      destination: sectionPayload?.destination?.trim() || (type === structured?.type ? structured?.destination?.trim() : "") || baseHints.destination,
      pax: sectionPayload?.pax ?? (type === structured?.type ? structured?.pax : undefined) ?? baseHints.pax,
      dateWindow:
        sectionPayload?.departDate?.trim() ||
        sectionPayload?.returnDate?.trim() ||
        (type === structured?.type ? structured?.departDate?.trim() || structured?.returnDate?.trim() : "") ||
        baseHints.dateWindow,
    };
    const missingFields = getMissingFields(scopedQuery, scopedParsedQuery, type, hints);
    if (missingFields.length > 0) {
      const clarificationResponse: ClarificationResponse = {
        error: `Add the missing ${type} trip details before searching: ${missingFields.join(", ")}.`,
        clarifications: buildClarifications(missingFields, type),
        suggestedQuery: buildSuggestedQuery(scopedQuery, type),
      };
      return NextResponse.json(clarificationResponse, { status: 422 });
    }
  }

  let requestRowId: string | null = null;
  let authedUserId: string | null = null;

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      authedUserId = user.id;
      const { data } = await supabase
        .from("search_requests")
        .insert({
          user_id: user.id,
          query,
          sections: sections ?? structured ?? null,
          status: "running",
          result_count: 0,
        })
        .select("id")
        .single();

      requestRowId = data?.id ?? null;
    }
  } catch {
    requestRowId = null;
  }

  const activeTargets = getTargets(activeTypes);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const results: PriceResult[] = [];
      let failedAgents = 0;

      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, KEEPALIVE_INTERVAL_MS);

      try {
        controller.enqueue(
          encoder.encode(
            encodeEvent({
              type: "SEARCH_META",
              query,
              parsedQuery,
              activeTargets: activeTargets.map((target) => ({ platform: target.name, section: target.searchType })),
            })
          )
        );

        await Promise.all(
          activeTargets.map(async (target) => {
            const sectionPayload = getSectionPayload(sections, target.searchType);
            const sectionQuery = sectionPayload ? buildSectionSearchQuery(target.searchType, sectionPayload) : query;
            const sectionParsedQuery =
              buildParsedQueryFromSection(target.searchType, sectionPayload, sectionQuery) ??
              (parsedQuery?.types?.includes(target.searchType) ? parsedQuery : null);
            const scopedHints = {
              ...baseHints,
              origin:
                sectionPayload?.origin?.trim() ||
                (target.searchType === structured?.type ? structured?.origin?.trim() : "") ||
                baseHints.origin,
              destination:
                sectionPayload?.destination?.trim() ||
                (target.searchType === structured?.type ? structured?.destination?.trim() : "") ||
                baseHints.destination,
              pax:
                sectionPayload?.pax ??
                (target.searchType === structured?.type ? structured?.pax : undefined) ??
                baseHints.pax,
              dateWindow:
                sectionPayload?.departDate?.trim() ||
                sectionPayload?.returnDate?.trim() ||
                (target.searchType === structured?.type
                  ? structured?.departDate?.trim() || structured?.returnDate?.trim()
                  : "") ||
                baseHints.dateWindow,
            };
            const layoverPreference = resolveLayoverPreference(sectionQuery, sectionPayload, structured, target.searchType);

            controller.enqueue(
              encoder.encode(encodeEvent({ type: "AGENT_START", platform: target.name, section: target.searchType }))
            );

            try {
              const goal = buildTargetGoal(target, sectionQuery, sectionParsedQuery, scopedHints, layoverPreference);
              const raw = await runTinyFishAgent(target, goal);
              const result = formatResult(target, raw);
              if (result.total > 0) {
                results.push(result);
              } else {
                failedAgents += 1;
              }

              controller.enqueue(
                encoder.encode(
                  encodeEvent({
                    type: "AGENT_DONE",
                    platform: target.name,
                    section: target.searchType,
                    result: result.total > 0 ? result : null,
                  })
                )
              );
            } catch (error) {
              failedAgents += 1;
              controller.enqueue(
                encoder.encode(
                  encodeEvent({
                    type: "AGENT_DONE",
                    platform: target.name,
                    section: target.searchType,
                    result: null,
                    error: classifyAgentError(error),
                  })
                )
              );
            }
          })
        );

        const response: SearchResponse = {
          results: rankResults(results),
          query,
          searchedAt: new Date().toISOString(),
          completedAgents: results.length,
          failedAgents,
          savedRequestId: requestRowId ?? undefined,
        };

        if (requestRowId && authedUserId) {
          try {
            const supabase = await getSupabaseServerClient();
            await supabase
              .from("search_requests")
              .update({
                status: results.length > 0 ? (failedAgents > 0 ? "partial" : "completed") : "failed",
                result_count: results.length,
              })
              .eq("id", requestRowId)
              .eq("user_id", authedUserId);
          } catch {
            // Ignore persistence failures so SSE can complete.
          }
        }

        controller.enqueue(encoder.encode(encodeEvent({ type: "SEARCH_DONE", response })));
      } finally {
        clearInterval(keepalive);
        controller.close();
      }
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
