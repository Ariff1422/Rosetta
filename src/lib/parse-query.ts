import { buildSearchQuery, type LayoverPreference, type SearchSectionsPayload, type TravelType } from "@/lib/search-schema";

export type SearchType = "flights" | "hotels" | "cars";

export interface ParsedSearchQuery {
  origin: string | null;
  destination: string | null;
  departDate: string | null;
  returnDate: string | null;
  pax: number | null;
  types: SearchType[];
  normalizedQuery: string;
}

export interface ParsedSearchPlan {
  sections: SearchSectionsPayload;
  missingFields: string[];
  clarifications: string[];
  normalizedQuery: string;
}

function stripCodeFences(value: string) {
  return value.replace(/```json|```/gi, "").trim();
}

export async function parseQuery(query: string): Promise<ParsedSearchQuery> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "Parse travel search queries into structured JSON.",
            "Return only JSON with this exact shape:",
            '{ "origin": string|null, "destination": string|null, "departDate": string|null, "returnDate": string|null, "pax": number|null, "types": ["flights"|"hotels"|"cars"], "normalizedQuery": string }',
            "Use ISO dates when the user gives exact dates.",
            "If the user gives vague timing like mid April, preserve that wording in normalizedQuery and use null for exact dates.",
            "Infer types from intent. Flights are default when the query is clearly about flying.",
          ].join(" "),
        },
        {
          role: "user",
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI parsing failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty parsing response");
  }

  const parsed = JSON.parse(stripCodeFences(content)) as ParsedSearchQuery;

  return {
    origin: parsed.origin ?? null,
    destination: parsed.destination ?? null,
    departDate: parsed.departDate ?? null,
    returnDate: parsed.returnDate ?? null,
    pax: typeof parsed.pax === "number" && Number.isFinite(parsed.pax) ? parsed.pax : null,
    types: Array.isArray(parsed.types) && parsed.types.length > 0 ? parsed.types : ["flights"],
    normalizedQuery: parsed.normalizedQuery?.trim() || query.trim(),
  };
}

function sanitizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeDatePhrase(value: string | undefined) {
  if (!value) return undefined;

  const normalized = value
    .replace(/^(depart(?:ing)?|leave|leaving|fly(?:ing)?|on|from|return(?:ing)?|to)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || undefined;
}

function sanitizePax(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function sanitizeLayoverPreference(value: unknown): LayoverPreference | undefined {
  return value === "any" || value === "direct-only" || value === "max-1-stop" ? value : undefined;
}

function sanitizeSection(type: TravelType, value: unknown) {
  if (!value || typeof value !== "object") return undefined;

  const section = value as Record<string, unknown>;
  const destination = sanitizeText(section.destination);
  const departDate = normalizeDatePhrase(sanitizeText(section.departDate));
  const returnDate = normalizeDatePhrase(sanitizeText(section.returnDate));
  const notes = sanitizeText(section.notes);

  if (type === "flights") {
    return {
      origin: sanitizeText(section.origin),
      destination,
      departDate,
      returnDate,
      pax: sanitizePax(section.pax),
      layoverPreference: sanitizeLayoverPreference(section.layoverPreference),
      notes,
    };
  }

  if (type === "hotels") {
    return {
      destination,
      departDate,
      returnDate,
      pax: sanitizePax(section.pax),
      notes,
    };
  }

  return {
    destination,
    departDate,
    returnDate,
    notes,
  };
}

export async function parseSearchPlan(query: string): Promise<ParsedSearchPlan> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a travel planning parser for Rosetta.",
            "Convert one natural-language travel request into structured flight, hotel, and car search sections.",
            "Be conservative: do not invent missing fields.",
            "If the user says 'same dates' or clearly ties hotel/car to the flight dates, propagate the known flight dates into those sections.",
            "If the user only gives a return date, do not treat it as a departure date.",
            "If the user gives a month like 'May 2026', preserve it exactly as text instead of inventing a day.",
            "For flights, capture origin, destination, departDate, returnDate, pax, layoverPreference, notes.",
            "For hotels, capture destination, departDate, returnDate, pax, notes.",
            "For cars, capture destination, departDate, returnDate, notes. Do not require or infer passenger count for cars.",
            "Return only JSON with this exact shape:",
            '{"sections":{"flights":{"origin":string|null,"destination":string|null,"departDate":string|null,"returnDate":string|null,"pax":number|null,"layoverPreference":"any"|"direct-only"|"max-1-stop"|null,"notes":string|null}|"null","hotels":{"destination":string|null,"departDate":string|null,"returnDate":string|null,"pax":number|null,"notes":string|null}|"null","cars":{"destination":string|null,"departDate":string|null,"returnDate":string|null,"notes":string|null}|"null"},"missingFields":[string],"clarifications":[string],"normalizedQuery":string}',
            "Populate missingFields with explicit labels like 'Flights: departure date or month' or 'Hotels: check-out date or month'.",
            "Populate clarifications with user-facing questions that resolve those missing fields.",
          ].join(" "),
        },
        {
          role: "user",
          content: query,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI planning failed with status ${response.status}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty planner response");
  }

  const parsed = JSON.parse(stripCodeFences(content)) as {
    sections?: Record<string, unknown>;
    missingFields?: unknown;
    clarifications?: unknown;
    normalizedQuery?: unknown;
  };

  const sections: SearchSectionsPayload = {
    flights: sanitizeSection("flights", parsed.sections?.flights),
    hotels: sanitizeSection("hotels", parsed.sections?.hotels),
    cars: sanitizeSection("cars", parsed.sections?.cars),
  };

  return {
    sections,
    missingFields: Array.isArray(parsed.missingFields)
      ? parsed.missingFields.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    clarifications: Array.isArray(parsed.clarifications)
      ? parsed.clarifications.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    normalizedQuery: buildSearchQuery(sections) || (typeof parsed.normalizedQuery === "string" && parsed.normalizedQuery.trim() ? parsed.normalizedQuery.trim() : query.trim()),
  };
}
