import { NextRequest, NextResponse } from "next/server";
import { parseQuery, parseSearchPlan, type ParsedSearchQuery, type SearchType } from "@/lib/parse-query";
import {
  buildSearchQuery,
  type SearchSectionsPayload,
  type TravelSectionPayload,
} from "@/lib/search-schema";

export const runtime = "nodejs";

type PlanSearchResponse = {
  query: string;
  normalizedQuery: string;
  sections: SearchSectionsPayload;
  missingFields?: string[];
  clarifications?: string[];
  message?: string;
};

type QueryHints = {
  origin: string | null;
  destination: string | null;
  pax: number | null;
  dateWindow: string | null;
  departDate: string | null;
  returnDate: string | null;
};

const PARSE_TIMEOUT_MS = 2_500;

function inferTypesFromQuery(query: string): SearchType[] {
  const lower = query.toLowerCase();
  const types: SearchType[] = [];

  if (/\b(fly|flight|airfare|plane|airport)\b/.test(lower)) types.push("flights");
  if (/\b(hotel|stay|resort|hostel|room|accommodation)\b/.test(lower)) types.push("hotels");
  if (/\b(car|rental|rent a car|vehicle|pickup)\b/.test(lower)) types.push("cars");

  return types.length > 0 ? types : ["flights"];
}

function cleanCapturedLocation(value: string | undefined) {
  if (!value) return null;
  return (
    value
      .replace(/\b(from|to|near|airport|the)\b/gi, (segment) => (segment.toLowerCase() === "the" ? "" : segment))
      .replace(/\s+/g, " ")
      .replace(/^[,\s]+|[,\s]+$/g, "")
      .trim() || null
  );
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
  const departDateMatch =
    query.match(/\b(?:depart(?:ing)?|leave|leaving|fly(?:ing)?|on)\s+([A-Za-z]+(?:\s+\d{1,2})?(?:\s+\d{4})?)\b/i) ??
    query.match(/\bfrom\s+([A-Za-z]+\s+\d{1,2}(?:\s+\d{4})?\s+to\s+[A-Za-z]+\s+\d{1,2}(?:\s+\d{4})?)\b/i);
  const returnDateMatch = query.match(/\breturn(?:ing)?\s+([A-Za-z]+(?:\s+\d{1,2})?(?:\s+\d{4})?)\b/i);

  const paxValue = paxMatch?.[1] ? Number.parseInt(paxMatch[1], 10) : null;
  const hasOtherAdults = /\b\d+\s+other\s+adults?\b/i.test(query);
  const passengerCount = paxValue === null || Number.isNaN(paxValue) ? null : hasOtherAdults ? paxValue + 1 : paxValue;

  return {
    origin: cleanCapturedLocation(originMatch?.[1]),
    destination: cleanCapturedLocation(destinationMatch?.[1]),
    pax: passengerCount,
    dateWindow: dateMatch?.[1]?.trim() ?? dateMatch?.[0]?.trim() ?? null,
    departDate: departDateMatch?.[1]?.trim() ?? null,
    returnDate: returnDateMatch?.[1]?.trim() ?? null,
  };
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

async function parseQueryWithTimeout(query: string) {
  return await Promise.race([
    parseQuery(query),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), PARSE_TIMEOUT_MS);
    }),
  ]);
}

async function parseSearchPlanWithTimeout(query: string) {
  return await Promise.race([
    parseSearchPlan(query),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), PARSE_TIMEOUT_MS);
    }),
  ]);
}

function buildSection(type: SearchType, parsed: ParsedSearchQuery | null, hints: QueryHints): TravelSectionPayload {
  const destination = parsed?.destination ?? hints.destination ?? undefined;
  const departDate = parsed?.departDate ?? hints.dateWindow ?? hints.departDate ?? undefined;
  const returnDate = parsed?.returnDate ?? hints.returnDate ?? undefined;
  const pax = parsed?.pax ?? hints.pax ?? undefined;

  if (type === "flights") {
    return {
      origin: parsed?.origin ?? hints.origin ?? undefined,
      destination,
      departDate,
      returnDate,
      pax,
      layoverPreference: inferLayoverPreference(parsed?.normalizedQuery ?? ""),
    };
  }

  if (type === "hotels") {
    return {
      destination,
      departDate,
      returnDate,
      pax,
    };
  }

  return {
    destination,
    departDate,
    returnDate,
  };
}

function inheritSharedDates(
  sections: SearchSectionsPayload,
  parsed: ParsedSearchQuery | null,
  query: string,
  hints: QueryHints
) {
  const sharedStartDate = parsed?.departDate ?? hints.dateWindow ?? hints.departDate ?? undefined;
  const sharedReturnDate = parsed?.returnDate ?? hints.returnDate ?? undefined;
  const mentionsSameDates = /\b(same dates|same date|for the same dates|for the same date)\b/i.test(query);

  if (!mentionsSameDates) return sections;

  const next = { ...sections };

  if (sharedStartDate) {
    if (next.hotels && !next.hotels.departDate) next.hotels = { ...next.hotels, departDate: sharedStartDate };
    if (next.cars && !next.cars.departDate) next.cars = { ...next.cars, departDate: sharedStartDate };
  }

  if (sharedReturnDate) {
    if (next.hotels && !next.hotels.returnDate) next.hotels = { ...next.hotels, returnDate: sharedReturnDate };
    if (next.cars && !next.cars.returnDate) next.cars = { ...next.cars, returnDate: sharedReturnDate };
  }

  return next;
}

function buildClarifications(type: SearchType, section: TravelSectionPayload) {
  const clarifications: string[] = [];

  if (type === "flights") {
    if (!section.origin?.trim()) clarifications.push("Where are you departing from?");
    if (!section.destination?.trim()) clarifications.push("Where are you flying to?");
    if (!section.departDate?.trim()) clarifications.push("What is your departure date or travel month?");
    if (!section.pax) clarifications.push("How many passengers are travelling?");
  }

  if (type === "hotels") {
    if (!section.destination?.trim()) clarifications.push("Which city, district, or airport area should the hotel be in?");
    if (!section.departDate?.trim()) clarifications.push("What is the hotel check-in date or month?");
    if (!section.returnDate?.trim()) clarifications.push("What is the hotel check-out date or month?");
    if (!section.pax) clarifications.push("How many hotel guests should I search for?");
  }

  if (type === "cars") {
    if (!section.destination?.trim()) clarifications.push("Where should the rental car be picked up?");
    if (!section.departDate?.trim()) clarifications.push("What is the car pickup date or month?");
    if (!section.returnDate?.trim()) clarifications.push("What is the car return date or month?");
  }

  return clarifications;
}

function buildMissingFields(type: SearchType, section: TravelSectionPayload) {
  const missing: string[] = [];

  if (type === "flights") {
    if (!section.origin?.trim()) missing.push("Flights: origin");
    if (!section.destination?.trim()) missing.push("Flights: destination");
    if (!section.departDate?.trim()) missing.push("Flights: departure date or month");
    if (!section.pax) missing.push("Flights: passenger count");
  }

  if (type === "hotels") {
    if (!section.destination?.trim()) missing.push("Hotels: destination or area");
    if (!section.departDate?.trim()) missing.push("Hotels: check-in date or month");
    if (!section.returnDate?.trim()) missing.push("Hotels: check-out date or month");
    if (!section.pax) missing.push("Hotels: guest count");
  }

  if (type === "cars") {
    if (!section.destination?.trim()) missing.push("Cars: pickup location");
    if (!section.departDate?.trim()) missing.push("Cars: pickup date or month");
    if (!section.returnDate?.trim()) missing.push("Cars: return date or month");
  }

  return missing;
}

export async function POST(req: NextRequest) {
  let body: { query?: string } | null = null;

  try {
    body = (await req.json()) as { query?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const query = body?.query?.trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  try {
    const aiPlan = await parseSearchPlanWithTimeout(query);
    if (aiPlan) {
      const response: PlanSearchResponse = {
        query,
        normalizedQuery: aiPlan.normalizedQuery,
        sections: aiPlan.sections,
      };

      if (aiPlan.missingFields.length > 0 || aiPlan.clarifications.length > 0) {
        response.missingFields = aiPlan.missingFields;
        response.clarifications = aiPlan.clarifications;
        response.message =
          aiPlan.missingFields.length > 0
            ? `Missing: ${aiPlan.missingFields.join(", ")}.`
            : "Add the missing details below, then search again.";
        return NextResponse.json(response, { status: 422 });
      }

      return NextResponse.json(response);
    }
  } catch {
    // Fall through to heuristic planning when AI planning is unavailable.
  }

  let parsed: ParsedSearchQuery | null = null;
  try {
    parsed = await parseQueryWithTimeout(query);
  } catch {
    parsed = null;
  }

  const hints = extractQueryHints(query);
  const types = parsed?.types?.length ? parsed.types : inferTypesFromQuery(query);
  let sections: SearchSectionsPayload = {};

  for (const type of types) {
    sections[type] = buildSection(type, parsed, hints);
  }

  sections = inheritSharedDates(sections, parsed, query, hints);

  const clarifications = types.flatMap((type) => buildClarifications(type, sections[type] ?? {}));
  const missingFields = types.flatMap((type) => buildMissingFields(type, sections[type] ?? {}));
  const normalizedQuery = buildSearchQuery(sections) || parsed?.normalizedQuery || query;

  const response: PlanSearchResponse = {
    query,
    normalizedQuery,
    sections,
  };

  if (clarifications.length > 0) {
    response.missingFields = missingFields;
    response.clarifications = clarifications;
    response.message = `Missing: ${missingFields.join(", ")}.`;
    return NextResponse.json(response, { status: 422 });
  }

  return NextResponse.json(response);
}
