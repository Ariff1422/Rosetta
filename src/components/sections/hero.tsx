"use client";

import { Fragment, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plane,
  Hotel,
  Car,
  ShieldCheck,
  Activity,
  Clock,
  DollarSign,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSearchHistory } from "@/hooks/use-search-history";
import {
  buildSearchQuery,
  type SearchRequestPayload,
  type StructuredSearchPayload,
  type TravelType,
} from "@/lib/search-schema";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "flights" as const, label: "Flights", icon: Plane },
  { value: "hotels" as const, label: "Hotels", icon: Hotel },
  { value: "cars" as const, label: "Cars", icon: Car },
];

const EXAMPLES: Record<TravelType, StructuredSearchPayload> = {
  flights: {
    type: "flights",
    origin: "Singapore",
    destination: "Tokyo",
    departDate: "June",
    returnDate: "",
    pax: 2,
    notes: "Carry-on only",
  },
  hotels: {
    type: "hotels",
    destination: "Bali",
    departDate: "July 10",
    returnDate: "July 17",
    pax: 2,
    notes: "Near Seminyak beach",
  },
  cars: {
    type: "cars",
    destination: "Kuala Lumpur",
    departDate: "June 12",
    returnDate: "June 15",
    pax: 2,
    notes: "Automatic transmission",
  },
};

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

const TRUST = [
  { icon: ShieldCheck, label: "Structured inputs reduce bad searches" },
  { icon: Activity, label: "Live data, not cached prices" },
  { icon: Clock, label: "Fewer retries, better latency" },
  { icon: DollarSign, label: "See real checkout costs" },
];

const INITIAL_FORM: StructuredSearchPayload = {
  type: "flights",
  origin: "",
  destination: "",
  departDate: "",
  returnDate: "",
  pax: 2,
  notes: "",
};

function historyToPayload(entry: string): StructuredSearchPayload {
  const lower = entry.toLowerCase();
  if (lower.startsWith("hotel search")) {
    return { ...INITIAL_FORM, type: "hotels", destination: entry, origin: "" };
  }
  if (lower.startsWith("car rental")) {
    return { ...INITIAL_FORM, type: "cars", destination: entry, origin: "" };
  }
  return { ...INITIAL_FORM, type: "flights", notes: entry };
}

export function Hero({ onSearch }: { onSearch?: (payload: SearchRequestPayload) => void }) {
  const [form, setForm] = useState<StructuredSearchPayload>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const { history, push } = useSearchHistory();

  const queryLabel = useMemo(() => buildSearchQuery(form), [form]);

  const setField = <K extends keyof StructuredSearchPayload>(
    key: K,
    value: StructuredSearchPayload[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyExample = (type: TravelType) => {
    setForm(EXAMPLES[type]);
    setError(null);
  };

  const validate = () => {
    if (form.type === "flights") {
      if (!form.origin?.trim()) return "Add an origin airport or city.";
      if (!form.destination?.trim()) return "Add a destination airport or city.";
      if (!form.departDate?.trim()) return "Add a departure month or date.";
      if (!form.pax || form.pax < 1) return "Add at least 1 passenger.";
      return null;
    }

    if (form.type === "hotels") {
      if (!form.destination?.trim()) return "Add a hotel destination.";
      if (!form.departDate?.trim()) return "Add a check-in date or month.";
      if (!form.returnDate?.trim()) return "Add a check-out date or month.";
      if (!form.pax || form.pax < 1) return "Add at least 1 guest.";
      return null;
    }

    if (!form.destination?.trim()) return "Add a pickup location.";
    if (!form.departDate?.trim()) return "Add a pickup date or month.";
    if (!form.returnDate?.trim()) return "Add a return date or month.";
    return null;
  };

  const handleSearch = () => {
    const validationError = validate();
    if (validationError || !onSearch) {
      setError(validationError);
      return;
    }

    const trimmed: StructuredSearchPayload = {
      ...form,
      origin: form.origin?.trim() || undefined,
      destination: form.destination?.trim() || undefined,
      departDate: form.departDate?.trim() || undefined,
      returnDate: form.returnDate?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
      pax: form.pax ?? undefined,
    };

    const query = buildSearchQuery(trimmed);
    push(query);
    setError(null);
    onSearch({ query, structured: trimmed });
  };

  const fromLabel =
    form.type === "flights"
      ? "From"
      : form.type === "cars"
        ? "Pickup Location"
        : "Destination";
  const toLabel = form.type === "flights" ? "To" : "Destination";
  const departLabel =
    form.type === "hotels"
      ? "Check-in"
      : form.type === "cars"
        ? "Pickup"
        : "Depart";
  const returnLabel =
    form.type === "hotels"
      ? "Check-out"
      : form.type === "cars"
        ? "Return"
        : "Return";
  const paxLabel = form.type === "hotels" ? "Guests" : "Passengers";

  return (
    <section>
      <div className="mx-auto max-w-5xl px-6 pb-12 pt-6 text-center md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0 }}
          className="mb-7 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3.5 py-1.5 text-sm font-medium text-primary"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Powered by AI web agents
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="font-serif mb-5 text-[clamp(36px,5vw,58px)] font-bold leading-[1.1] tracking-[-1.5px] text-foreground"
        >
          The price you see is
          <br />
          never the price you <em className="not-italic text-primary">pay.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mx-auto mb-12 max-w-[620px] text-lg font-light leading-relaxed text-muted-foreground"
        >
          Start with structured trip details so Rosetta can send cleaner instructions to live booking
          sites. Add plain-English notes only for preferences that do not fit the fields.
        </motion.p>

        <motion.div
          id="trip-planner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45 }}
          className="mx-auto max-w-[860px] rounded-3xl border border-border bg-card p-6 text-left shadow-[0_8px_40px_rgba(0,0,0,0.1)]"
        >
          <div className="mb-5 flex flex-wrap gap-2">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    type: value,
                    origin: value === "flights" ? current.origin : "",
                    returnDate:
                      value === "flights" || value === "hotels" || value === "cars"
                        ? current.returnDate
                        : "",
                  }))
                }
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  form.type === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {form.type === "flights" ? (
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                  {fromLabel}
                </span>
                <input
                  value={form.origin ?? ""}
                  onChange={(e) => setField("origin", e.target.value)}
                  placeholder="Singapore / SIN"
                  className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
                />
              </label>
            ) : null}

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                {form.type === "flights" ? toLabel : fromLabel}
              </span>
              <input
                value={form.destination ?? ""}
                onChange={(e) => setField("destination", e.target.value)}
                placeholder={
                  form.type === "flights"
                    ? "Tokyo / HND"
                    : form.type === "hotels"
                      ? "Bali"
                      : "Kuala Lumpur"
                }
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                {departLabel}
              </span>
              <input
                value={form.departDate ?? ""}
                onChange={(e) => setField("departDate", e.target.value)}
                placeholder="June / 2026-06-12"
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                {returnLabel}
              </span>
              <input
                value={form.returnDate ?? ""}
                onChange={(e) => setField("returnDate", e.target.value)}
                placeholder={form.type === "flights" ? "Optional / 2026-06-19" : "2026-06-19"}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <label className="space-y-2 md:max-w-[180px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                {paxLabel}
              </span>
              <input
                type="number"
                min={1}
                max={9}
                value={form.pax ?? 1}
                onChange={(e) => setField("pax", Number.parseInt(e.target.value || "1", 10))}
                className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <div className="md:col-span-2">
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                Notes
              </span>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSearch();
                }}
                placeholder="Optional preferences: carry-on only, near Shibuya, automatic transmission, city centre hotel."
                className="min-h-[92px] resize-none rounded-xl border-border bg-background px-4 py-4 text-sm leading-relaxed focus-visible:ring-primary placeholder:text-muted-foreground/50"
                rows={3}
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Search preview:</span> {queryLabel}
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => applyExample(value)}
                  className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                >
                  {label} example
                </button>
              ))}
            </div>
            <Button onClick={handleSearch} size="default" className="shrink-0 gap-2">
              <Search className="h-4 w-4" />
              Find true price
            </Button>
          </div>

          {history.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
                <History className="h-3 w-3" />
                Recent
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => {
                      setForm(historyToPayload(entry));
                      setError(null);
                    }}
                    className="max-w-[280px] truncate rounded-full border border-border bg-secondary px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    {entry}
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
          <span className="mr-2 text-xs uppercase tracking-widest text-muted-foreground/60">
            Comparing across
          </span>
          {PLATFORMS.map((platform) => (
            <span
              key={platform}
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
            >
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
