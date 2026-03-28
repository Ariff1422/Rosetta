import OpenAI from "openai";

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

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function stripCodeFences(value: string) {
  return value.replace(/```json|```/gi, "").trim();
}

export async function parseQuery(query: string): Promise<ParsedSearchQuery> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await openai.chat.completions.create({
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
  });

  const content = response.choices[0]?.message?.content;
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
