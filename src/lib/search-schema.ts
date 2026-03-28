export type TravelType = "flights" | "hotels" | "cars";

export interface StructuredSearchPayload {
  type: TravelType;
  origin?: string;
  destination?: string;
  departDate?: string;
  returnDate?: string;
  pax?: number;
  notes?: string;
}

export interface SearchRequestPayload {
  query: string;
  structured?: StructuredSearchPayload;
}

export function buildSearchQuery(payload: StructuredSearchPayload) {
  const notes = payload.notes?.trim();

  if (payload.type === "hotels") {
    return [
      "Hotel search",
      payload.destination ? `in ${payload.destination}` : "",
      payload.departDate ? `from ${payload.departDate}` : "",
      payload.returnDate ? `to ${payload.returnDate}` : "",
      payload.pax ? `for ${payload.pax} guest${payload.pax === 1 ? "" : "s"}` : "",
      notes ? `notes: ${notes}` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  if (payload.type === "cars") {
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
    notes ? `notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
