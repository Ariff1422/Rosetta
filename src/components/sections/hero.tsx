"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plane,
  Hotel,
  Car,
  Loader2,
  ShieldCheck,
  Activity,
  Clock,
  DollarSign,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSearchHistory } from "@/hooks/use-search-history";
import { useAccountHistory } from "@/hooks/use-account-history";
import {
  buildSearchQuery,
  type SearchRequestPayload,
  type SearchSectionsPayload,
  type TravelSectionPayload,
  type TravelType,
} from "@/lib/search-schema";
import { cn } from "@/lib/utils";

type InputMode = "structured" | "prompt";

type PlanSearchResponse = {
  query: string;
  normalizedQuery: string;
  sections: SearchSectionsPayload;
  missingFields?: string[];
  clarifications?: string[];
  message?: string;
};

const SECTION_CONFIG: Array<{
  type: TravelType;
  label: string;
  icon: typeof Plane;
  summary: string;
}> = [
  { type: "flights", label: "Flights", icon: Plane, summary: "Origin, destination, dates, passengers, baggage notes" },
  { type: "hotels", label: "Hotels", icon: Hotel, summary: "Area, stay dates, guests, location preferences" },
  { type: "cars", label: "Cars", icon: Car, summary: "Pickup area, dates, transmission, rental notes" },
];

const TRUST = [
  { icon: ShieldCheck, label: "Structured inputs reduce bad searches" },
  { icon: Activity, label: "Live data, not cached prices" },
  { icon: Clock, label: "Separate searches run in parallel" },
  { icon: DollarSign, label: "See real checkout costs" },
];

const PLATFORMS = [
  "Skyscanner",
  "Google Flights",
  "Kayak",
  "Expedia",
  "Booking.com",
  "Agoda",
  "Hotels.com",
  "Rentalcars",
  "AirAsia",
  "Scoot",
  "Singapore Airlines",
  "Jetstar",
];

const INITIAL_SECTIONS: SearchSectionsPayload = {
  flights: {
    origin: "",
    destination: "",
    departDate: "",
    returnDate: "",
    pax: 2,
    layoverPreference: "any",
    notes: "",
  },
};

function ensureSectionValue(value?: TravelSectionPayload): TravelSectionPayload {
  return {
    origin: value?.origin ?? "",
    destination: value?.destination ?? "",
    departDate: value?.departDate ?? "",
    returnDate: value?.returnDate ?? "",
    pax: value?.pax ?? 2,
    layoverPreference: value?.layoverPreference ?? "any",
    notes: value?.notes ?? "",
  };
}

function buildValidationErrors(sections: SearchSectionsPayload) {
  const errors: string[] = [];

  if (sections.flights) {
    if (!sections.flights.origin?.trim()) errors.push("Add a flight origin.");
    if (!sections.flights.destination?.trim()) errors.push("Add a flight destination.");
    if (!sections.flights.departDate?.trim()) errors.push("Add a flight departure date or month.");
    if (!sections.flights.pax || sections.flights.pax < 1) errors.push("Add at least 1 flight passenger.");
  }

  if (sections.hotels) {
    if (!sections.hotels.destination?.trim()) errors.push("Add a hotel destination or area.");
    if (!sections.hotels.departDate?.trim()) errors.push("Add a hotel check-in date or month.");
    if (!sections.hotels.returnDate?.trim()) errors.push("Add a hotel check-out date or month.");
    if (!sections.hotels.pax || sections.hotels.pax < 1) errors.push("Add at least 1 hotel guest.");
  }

  if (sections.cars) {
    if (!sections.cars.destination?.trim()) errors.push("Add a car pickup location.");
    if (!sections.cars.departDate?.trim()) errors.push("Add a car pickup date or month.");
    if (!sections.cars.returnDate?.trim()) errors.push("Add a car return date or month.");
  }

  return errors;
}

function trimSection(section?: TravelSectionPayload) {
  if (!section) return undefined;

  return {
    origin: section.origin?.trim() || undefined,
    destination: section.destination?.trim() || undefined,
    departDate: section.departDate?.trim() || undefined,
    returnDate: section.returnDate?.trim() || undefined,
    notes: section.notes?.trim() || undefined,
    pax: section.pax ?? undefined,
    layoverPreference: section.layoverPreference ?? undefined,
  };
}

function SectionCard({
  type,
  label,
  icon: Icon,
  value,
  enabled,
  onToggle,
  onChange,
}: {
  type: TravelType;
  label: string;
  icon: typeof Plane;
  value: TravelSectionPayload;
  enabled: boolean;
  onToggle: () => void;
  onChange: <K extends keyof TravelSectionPayload>(key: K, value: TravelSectionPayload[K]) => void;
}) {
  const isFlight = type === "flights";
  const isHotel = type === "hotels";
  const titleDestination = isFlight ? "To" : isHotel ? "Location" : "Pickup location";
  const departLabel = isHotel ? "Check-in" : type === "cars" ? "Pickup" : "Depart";
  const returnLabel = isHotel ? "Check-out" : "Return";
  const paxLabel = isHotel ? "Guests" : "Passengers";

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-colors",
        enabled ? "border-primary/40 bg-card shadow-sm" : "border-border bg-card/70"
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full p-2", enabled ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <div className="font-medium text-foreground">{label}</div>
              <div className="text-xs text-muted-foreground">
                {type === "flights"
                  ? "Search live flight checkouts"
                  : type === "hotels"
                    ? "Search live hotel checkout totals"
                    : "Search live rental totals"}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            enabled ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          )}
        >
          {enabled ? "Included" : "Add"}
        </button>
      </div>

      <div className={cn("grid gap-4 md:grid-cols-2", !enabled && "opacity-50")}>
        {isFlight ? (
          <label className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">From</span>
            <input
              disabled={!enabled}
              value={value.origin ?? ""}
              onChange={(e) => onChange("origin", e.target.value)}
              placeholder="Singapore / SIN"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
        ) : null}

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">{titleDestination}</span>
          <input
            disabled={!enabled}
            value={value.destination ?? ""}
            onChange={(e) => onChange("destination", e.target.value)}
            placeholder={isFlight ? "Tokyo / HND" : isHotel ? "Haneda Airport / Tokyo" : "Tokyo / Haneda Airport"}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">{departLabel}</span>
          <input
            disabled={!enabled}
            value={value.departDate ?? ""}
            onChange={(e) => onChange("departDate", e.target.value)}
            placeholder="May 15 2026"
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">{returnLabel}</span>
          <input
            disabled={!enabled}
            value={value.returnDate ?? ""}
            onChange={(e) => onChange("returnDate", e.target.value)}
            placeholder={isFlight ? "May 27 2026 (optional)" : "May 27 2026"}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        <label className="space-y-2 md:max-w-[180px]">
          <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">{paxLabel}</span>
          <input
            type="number"
            min={1}
            max={9}
            disabled={!enabled}
            value={value.pax ?? 1}
            onChange={(e) => onChange("pax", Number.parseInt(e.target.value || "1", 10))}
            className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {isFlight ? (
          <label className="space-y-2 md:max-w-[220px]">
            <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">Layovers</span>
            <select
              disabled={!enabled}
              value={value.layoverPreference ?? "any"}
              onChange={(e) => onChange("layoverPreference", e.target.value as TravelSectionPayload["layoverPreference"])}
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="any">Any</option>
              <option value="direct-only">Direct only</option>
              <option value="max-1-stop">Max 1 stop</option>
            </select>
          </label>
        ) : null}

        <div className="md:col-span-2">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">Notes</span>
          <Textarea
            disabled={!enabled}
            value={value.notes ?? ""}
            onChange={(e) => onChange("notes", e.target.value)}
            placeholder={
              isFlight
                ? "Example: 30kg checked baggage for 1 adult on return, carry-on only otherwise."
                : isHotel
                  ? "Example: near Haneda Airport, breakfast included, refundable."
                  : "Example: automatic transmission, airport pickup, compact car."
            }
            className="min-h-[92px] resize-none rounded-xl border-border bg-background px-4 py-4 text-sm leading-relaxed focus-visible:ring-primary placeholder:text-muted-foreground/50 disabled:cursor-not-allowed disabled:opacity-60"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}

export function Hero({ onSearch }: { onSearch?: (payload: SearchRequestPayload) => void }) {
  const [inputMode, setInputMode] = useState<InputMode>("structured");
  const [sections, setSections] = useState<SearchSectionsPayload>(INITIAL_SECTIONS);
  const [promptQuery, setPromptQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [plannerBusy, setPlannerBusy] = useState(false);
  const [plannerQuestions, setPlannerQuestions] = useState<string[]>([]);
  const [plannerMissingFields, setPlannerMissingFields] = useState<string[]>([]);
  const [plannerPreview, setPlannerPreview] = useState<string | null>(null);
  const { history, push } = useSearchHistory();
  const { user, history: accountHistory } = useAccountHistory();

  const activeCount = useMemo(
    () => SECTION_CONFIG.filter(({ type }) => Boolean(sections[type])).length,
    [sections]
  );
  const queryLabel = useMemo(() => buildSearchQuery(sections), [sections]);

  const toggleSection = (type: TravelType) => {
    setSections((current) => {
      if (current[type]) {
        const next = { ...current };
        delete next[type];
        return next;
      }

      return {
        ...current,
        [type]: ensureSectionValue(),
      };
    });
    setError(null);
  };

  const updateSection = <K extends keyof TravelSectionPayload>(
    type: TravelType,
    key: K,
    value: TravelSectionPayload[K]
  ) => {
    setSections((current) => ({
      ...current,
      [type]: {
        ...ensureSectionValue(current[type]),
        [key]: value,
      },
    }));
  };

  const applyExample = () => {
    setSections({
      flights: {
        origin: "Singapore",
        destination: "Haneda",
        departDate: "May 15 2026",
        returnDate: "May 27 2026",
        pax: 3,
        layoverPreference: "direct-only",
        notes: "30kg checked baggage for 1 adult on the return flight.",
      },
      hotels: {
        destination: "Haneda Airport, Tokyo",
        departDate: "May 15 2026",
        returnDate: "May 27 2026",
        pax: 3,
        notes: "Near the airport and free cancellation if possible.",
      },
      cars: {
        destination: "Haneda Airport, Tokyo",
        departDate: "May 15 2026",
        returnDate: "May 27 2026",
        pax: 3,
        notes: "Automatic transmission, airport pickup.",
      },
    });
    setError(null);
    setPlannerQuestions([]);
    setPlannerMissingFields([]);
    setPlannerPreview(null);
  };

  const handleSearch = () => {
    if (inputMode === "prompt") {
      if (!promptQuery.trim()) {
        setError("Write your trip request first.");
        return;
      }

      if (!onSearch) {
        setError("Search is unavailable.");
        return;
      }

      setPlannerBusy(true);
      setError(null);
      setPlannerQuestions([]);
      setPlannerMissingFields([]);

      void (async () => {
        try {
          const response = await fetch("/api/plan-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: promptQuery.trim() }),
          });

          const payload = (await response.json()) as PlanSearchResponse;
          if (payload.sections) {
            setSections(payload.sections);
            setPlannerPreview(payload.normalizedQuery);
          }

          if (response.status === 422) {
            setPlannerMissingFields(payload.missingFields ?? []);
            setPlannerQuestions(payload.clarifications ?? []);
            setError(payload.message ?? "Add the missing trip details and try again.");
            return;
          }

          if (!response.ok) {
            throw new Error("Unable to analyse the prompt right now.");
          }

          push(promptQuery.trim());
          setPlannerQuestions([]);
          setPlannerMissingFields([]);
          setError(null);
          onSearch({ query: promptQuery.trim(), sections: payload.sections });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to analyse the prompt right now.";
          setError(message);
        } finally {
          setPlannerBusy(false);
        }
      })();
      return;
    }

    if (activeCount === 0) {
      setError("Enable at least one section before searching.");
      return;
    }

    const validationErrors = buildValidationErrors(sections);
    if (validationErrors.length > 0 || !onSearch) {
      setError(validationErrors[0] ?? "Search is unavailable.");
      return;
    }

    const trimmedSections: SearchSectionsPayload = {};
    if (sections.flights) trimmedSections.flights = trimSection(sections.flights);
    if (sections.hotels) trimmedSections.hotels = trimSection(sections.hotels);
    if (sections.cars) trimmedSections.cars = trimSection(sections.cars);

    const query = buildSearchQuery(trimmedSections);
    push(query);
    setError(null);
    setPlannerQuestions([]);
    setPlannerMissingFields([]);
    setPlannerPreview(null);
    onSearch({ query, sections: trimmedSections });
  };

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 pb-12 pt-6 text-center md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary"
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-primary" />
          Powered by AI web agents
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="font-serif mb-5 text-[clamp(36px,5vw,58px)] font-bold leading-[1.1] tracking-[-1.5px] text-foreground"
        >
          Plan flights, hotels, and cars
          <br />
          in one <em className="not-italic text-primary">structured</em> search.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mx-auto mb-12 max-w-[720px] text-lg font-light leading-relaxed text-muted-foreground"
        >
          Fill the sections you care about. Rosetta will split them into separate live searches so flights,
          hotels, and cars do not slow each other down. Or start with a prompt and let Rosetta turn it into a search plan.
        </motion.p>

        <motion.div
          id="trip-planner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mx-auto rounded-3xl border border-border bg-card p-6 text-left shadow-[0_8px_40px_rgba(0,0,0,0.1)]"
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {([
              { value: "structured", label: "Structured form" },
              { value: "prompt", label: "Natural language" },
            ] as const).map((mode) => (
              <button
                key={mode.value}
                type="button"
                  onClick={() => {
                    setInputMode(mode.value);
                    setError(null);
                    setPlannerQuestions([]);
                    setPlannerMissingFields([]);
                  }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  inputMode === mode.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {inputMode === "prompt" ? (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Prompt planner</div>
                  <div className="text-sm text-muted-foreground">Write the trip like a normal request. Rosetta will analyse it, ask for anything missing, then launch the live search.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPromptQuery("Fly from Singapore to Haneda on May 15 2026, return May 27 2026 for 3 adults. Book a hotel near Haneda Airport for the same dates and find a rental car with automatic transmission.");
                    setError(null);
                    setPlannerQuestions([]);
                    setPlannerMissingFields([]);
                  }}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  Fill example prompt
                </button>
              </div>

              <Textarea
                value={promptQuery}
                onChange={(e) => setPromptQuery(e.target.value)}
                placeholder="Example: I want to fly from Singapore to Haneda from May 15 to May 27 2026 for 3 adults, stay near the airport, and rent an automatic car for the same dates."
                className="min-h-[150px] resize-none rounded-2xl border-border bg-background px-4 py-4 text-sm leading-relaxed focus-visible:ring-primary placeholder:text-muted-foreground/50"
                rows={6}
              />

              {plannerPreview ? (
                <div className="mt-4 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Interpreted plan:</span> {plannerPreview}
                </div>
              ) : null}

              {plannerMissingFields.length > 0 ? (
                <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-foreground">
                  <div className="mb-2 font-medium text-destructive">Missing fields</div>
                  <div className="flex flex-wrap gap-2">
                    {plannerMissingFields.map((field) => (
                      <span key={field} className="rounded-full border border-destructive/20 bg-background px-3 py-1 text-xs text-destructive">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {plannerQuestions.length > 0 ? (
                <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 text-sm text-foreground">
                  <div className="mb-2 font-medium">Rosetta still needs:</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {plannerQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Trip planner</div>
                  <div className="text-sm text-muted-foreground">Enable one or more sections, then search them together.</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
                    {activeCount} section{activeCount === 1 ? "" : "s"} active
                  </span>
                  <button
                    type="button"
                    onClick={applyExample}
                    className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    Fill example trip
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {SECTION_CONFIG.map(({ type, label, icon, summary }) => (
                  <div key={type} className="space-y-2">
                    <div className="px-1 text-xs text-muted-foreground">{summary}</div>
                    <SectionCard
                      type={type}
                      label={label}
                      icon={icon}
                      value={ensureSectionValue(sections[type])}
                      enabled={Boolean(sections[type])}
                      onToggle={() => toggleSection(type)}
                      onChange={(key, value) => updateSection(type, key, value)}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Search preview:</span> {queryLabel || "Enable a section to start building the search."}
              </div>
            </>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {inputMode === "prompt"
                ? "The more specific the prompt is, the fewer follow-up questions Rosetta needs before searching."
                : "The more complete the fields are, the less time the agents waste guessing."}
            </div>
            <Button onClick={handleSearch} size="default" className="shrink-0 gap-2" disabled={plannerBusy}>
              {plannerBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {inputMode === "prompt" ? "Analyse and search" : "Find true price"}
            </Button>
          </div>

          {history.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                <History className="h-3 w-3" />
                Recent searches
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => onSearch?.({ query: entry })}
                    className="max-w-[320px] truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user && accountHistory.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                <History className="h-3 w-3" />
                Saved to account
              </div>
              <div className="flex flex-wrap gap-2">
                {accountHistory.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSearch?.({ query: entry.query })}
                    className="max-w-[320px] truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {entry.query}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 px-12 pb-16">
        {TRUST.map(({ icon: Icon, label }, index) => (
          <Fragment key={label}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 text-success" />
              {label}
            </div>
            {index < TRUST.length - 1 && <div className="hidden h-4 w-px bg-border md:block" />}
          </Fragment>
        ))}
      </div>

      <div className="border-t border-border/50 bg-secondary/20 py-4">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-6">
          <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground/60">Comparing across</span>
          {PLATFORMS.map((platform) => (
            <span key={platform} className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {platform}
            </span>
          ))}
          <span className="rounded-full border border-primary/30 bg-background px-3 py-1 text-xs font-medium text-primary">
            +8 more
          </span>
        </div>
      </div>

      <div className="h-px bg-border/50" />
    </section>
  );
}
