import {
  MessageSquare,
  Bot,
  BarChart3,
  BadgeAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    icon: MessageSquare,
    num: "01",
    title: "Describe your trip naturally",
    desc: "Type the way you actually think: route, dates, passenger count, hotel preferences, even whether you may want a car. Rosetta turns one messy prompt into structured travel intent.",
  },
  {
    icon: Bot,
    num: "02",
    title: "Agents push past the teaser price",
    desc: "Rosetta launches site-specific agents across booking platforms and drives each one to the last checkout summary before payment, where the real price finally appears.",
  },
  {
    icon: BarChart3,
    num: "03",
    title: "Compare true totals, not bait fares",
    desc: "Each option is ranked by what you would actually pay after taxes, baggage, platform fees, and service fees, so the cheapest-looking card does not win by default.",
  },
];

const DETAILS = [
  {
    icon: ShieldCheck,
    title: "Checkout-level pricing",
    desc: "The system captures pricing where travel sites usually stop hiding fees, not at the optimistic search-results stage.",
  },
  {
    icon: BadgeAlert,
    title: "Trap detection",
    desc: "Results can surface hidden fees and suspicious discount messaging so you can spot bad deals faster.",
  },
  {
    icon: Sparkles,
    title: "One prompt, many sites",
    desc: "You describe the trip once. Rosetta handles parsing, target selection, and parallel agent runs in the background.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-border/50">
      <div className="mx-auto max-w-5xl px-6 py-16 md:px-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[1px] text-primary">
          How it works
        </p>
        <h2 className="mb-4 font-serif text-[clamp(26px,3vw,36px)] font-bold tracking-tight text-foreground">
          Rosetta checks what the trip really costs before you waste time at checkout
        </h2>
        <p className="mb-12 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
          Most booking sites optimize for the first number you see. Rosetta optimizes for the last
          number you pay. It takes a plain-English travel prompt, sends agents across booking
          platforms, and brings the results back in one ranked view with the true totals exposed.
        </p>

        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, num, title, desc }) => (
            <div
              key={num}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.12)]"
            >
              <span className="pointer-events-none absolute right-5 top-4 select-none font-serif text-5xl font-bold leading-none text-foreground/[0.05]">
                {num}
              </span>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-serif text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 rounded-3xl border border-border bg-secondary/30 p-6 md:grid-cols-3">
          {DETAILS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl bg-background/70 p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 font-medium text-foreground">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
