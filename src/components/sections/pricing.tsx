import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "S$0",
    period: "forever",
    features: [
      "5 searches per month",
      "Flights & Hotels",
      "True price breakdown",
      "Fake discount detection",
    ],
    cta: "Get started free",
    featured: false,
  },
  {
    name: "Pro",
    price: "S$9",
    period: "per month",
    features: [
      "Unlimited searches",
      "Flights, Hotels & Car rentals",
      "Price drop alerts",
      "Historical price audit",
      "Auto-book at target price",
      "Priority support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Teams",
    price: "S$29",
    period: "per month · up to 5",
    features: [
      "Everything in Pro",
      "API access",
      "Corporate travel reports",
      "SSO & team management",
      "Dedicated account manager",
    ],
    cta: "Contact us",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-12 py-20 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-primary">
          Pricing
        </p>
        <h2 className="font-serif mb-2 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-foreground">
          Simple, honest pricing
        </h2>
        <p className="text-base text-muted-foreground">
          Because it&apos;d be ironic to hide fees on a product about hidden fees.
        </p>

        <div className="mt-12 grid gap-5 text-left md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all duration-200 hover:-translate-y-1",
                plan.featured
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
              )}
            >
              <p className={cn(
                "mb-3 text-xs font-semibold uppercase tracking-[1px]",
                plan.featured ? "text-background/50" : "text-muted-foreground"
              )}>
                {plan.name}
              </p>

              <div className="mb-6">
                <span className={cn(
                  "font-serif text-[42px] font-bold leading-none tracking-[-1.5px]",
                  plan.featured ? "text-background" : "text-foreground"
                )}>
                  {plan.price}
                </span>
                <p className={cn(
                  "mt-1 text-sm",
                  plan.featured ? "text-background/50" : "text-muted-foreground"
                )}>
                  {plan.period}
                </p>
              </div>

              <ul className="mb-8 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className={cn(
                    "flex items-start gap-2 text-sm",
                    plan.featured ? "text-background/75" : "text-foreground/80"
                  )}>
                    <Check className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      plan.featured ? "text-emerald-400" : "text-success"
                    )} />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={cn(
                  "w-full rounded-full border py-3 text-sm font-medium transition-all",
                  plan.featured
                    ? "border-primary bg-primary text-white hover:bg-primary/90"
                    : "border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background"
                )}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
