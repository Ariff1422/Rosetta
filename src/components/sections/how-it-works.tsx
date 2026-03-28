import { MessageSquare, Bot, BarChart3 } from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    num: "01",
    title: "Describe your trip",
    desc: "Type your travel plan in plain English — destination, dates, passengers. No dropdowns, no rigid forms.",
  },
  {
    icon: Bot,
    num: "02",
    title: "Agents navigate to checkout",
    desc: "Parallel AI agents browse every booking site all the way to the final payment screen — not just search results.",
  },
  {
    icon: BarChart3,
    num: "03",
    title: "See what you'd actually pay",
    desc: "Every fee broken down and ranked. Base fare, taxes, baggage, platform surcharges — no checkout surprises.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-y border-border/50">
      <div className="mx-auto max-w-5xl px-12 py-16">
        {/* Header */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-primary">
          How it works
        </p>
        <h2 className="font-serif mb-12 text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-foreground">
          Three steps to the real price
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div
              key={num}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
            >
              {/* Ghost number */}
              <span className="pointer-events-none absolute right-5 top-4 select-none font-serif text-5xl font-bold leading-none text-foreground/[0.05]">
                {num}
              </span>

              {/* Icon */}
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="font-serif mb-2 text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
