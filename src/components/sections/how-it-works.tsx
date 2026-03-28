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
    <section className="border-y border-border/50 bg-secondary/20">
      <div className="mx-auto max-w-6xl px-6 py-20">
        {/* Section header */}
        <div className="mb-14 flex items-start gap-10 md:items-center">
          <div className="shrink-0">
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
              How it works
            </p>
            <h2 className="font-serif text-3xl text-foreground md:text-4xl">
              Three steps to the real price
            </h2>
          </div>
          <div className="hidden h-px flex-1 bg-border md:block" />
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div key={num} className="group">
              {/* Number + icon */}
              <div className="mb-5 flex items-center gap-4">
                <span className="font-serif text-5xl leading-none text-border/80 select-none">
                  {num}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
