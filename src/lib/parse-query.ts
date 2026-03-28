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
