import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "S$0",
    period: "forever",
    description: "Try it out, no strings attached.",
    features: [
      "5 searches per month",
      "Flights & Hotels",
      "True price breakdown",
      "Fake discount detection",
    ],
    cta: "Get started free",
    variant: "outline" as const,
    featured: false,
  },
  {
    name: "Pro",
    price: "S$9",
    period: "per month",
    description: "For frequent travellers who hate surprises.",
    features: [
      "Unlimited searches",
      "Flights, Hotels & Car rentals",
      "Price drop alerts",
      "Historical price audit",
      "Auto-book at target price",
      "Priority support",
    ],
    cta: "Start free trial",
    variant: "default" as const,
    featured: true,
  },
  {
    name: "Teams",
    price: "S$29",
    period: "per month · up to 5",
    description: "For companies managing corporate travel.",
    features: [
      "Everything in Pro",
      "API access",
      "Corporate travel reports",
      "SSO & team management",
      "Dedicated account manager",
    ],
    cta: "Contact us",
    variant: "outline" as const,
    featured: false,
  },
];

export function Pricing() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-4 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Simple, honest pricing
          </h2>
          <p className="mt-3 text-muted-foreground">
            Because it&apos;d be ironic to hide fees on a product about hidden fees.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1",
                plan.featured
                  ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card hover:shadow-md"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  {plan.name}
                </p>
                <div className="flex items-end gap-1.5">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">
                    /{plan.period}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-foreground/80"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} className="w-full">
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
