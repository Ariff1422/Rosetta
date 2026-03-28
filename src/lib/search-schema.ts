export type TravelType = "flights" | "hotels" | "cars";
export type LayoverPreference = "any" | "direct-only" | "max-1-stop";

export interface TravelSectionPayload {
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  pax?: number;
  layoverPreference?: LayoverPreference;
  notes?: string;
}

export interface SearchSectionsPayload {
  flights?: TravelSectionPayload;
  hotels?: TravelSectionPayload;
  cars?: TravelSectionPayload;
}

export interface StructuredSearchPayload extends TravelSectionPayload {
  type: TravelType;
}

export interface SearchRequestPayload {
  query: string;
  sections?: SearchSectionsPayload;
  structured?: StructuredSearchPayload;
}

function formatGuests(label: string, pax?: number) {
  if (!pax) return "";
  return `for ${pax} ${label}${pax === 1 ? "" : "s"}`;
}

export function buildSectionSearchQuery(type: TravelType, payload: TravelSectionPayload) {
  const notes = payload.notes?.trim();

  if (type === "hotels") {
    return [
      "Hotel search",
      payload.destination ? `in ${payload.destination}` : "",
      payload.departDate ? `from ${payload.departDate}` : "",
      payload.returnDate ? `to ${payload.returnDate}` : "",
      formatGuests("guest", payload.pax),
      notes ? `notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (type === "cars") {
    return [
      "Car rental",
      payload.destination ? `in ${payload.destination}` : "",
      payload.departDate ? `from ${payload.departDate}` : "",
      payload.returnDate ? `to ${payload.returnDate}` : "",
      notes ? `notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    "Flight search",
    payload.origin ? `from ${payload.origin}` : "",
    payload.destination ? `to ${payload.destination}` : "",
      payload.departDate ? `departing ${payload.departDate}` : "",
      payload.returnDate ? `returning ${payload.returnDate}` : "",
      payload.pax ? `for ${payload.pax} pax` : "",
      payload.layoverPreference && payload.layoverPreference !== "any"
        ? payload.layoverPreference === "direct-only"
          ? "direct flights only"
          : "maximum 1 stop"
        : "",
      notes ? `notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function normalizeStructuredToSections(structured?: StructuredSearchPayload): SearchSectionsPayload | undefined {
  if (!structured) return undefined;

  const { type, ...rest } = structured;
  return { [type]: rest };
}

export function buildSearchQuery(input: SearchSectionsPayload | StructuredSearchPayload) {
  if ("type" in input) {
    return buildSectionSearchQuery(input.type, input);
  }

  const parts: string[] = [];

  if (input.flights) parts.push(buildSectionSearchQuery("flights", input.flights));
  if (input.hotels) parts.push(buildSectionSearchQuery("hotels", input.hotels));
  if (input.cars) parts.push(buildSectionSearchQuery("cars", input.cars));

  return parts.join(" | ");
}
