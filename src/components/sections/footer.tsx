const LINKS = {
  Product: ["How it works", "Changelog", "Roadmap"],
  Company: ["About", "Blog", "Careers"],
  Legal: ["Privacy", "Terms", "Cookies"],
};

export function Footer() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <span className="font-serif text-xl text-foreground">Rosetta</span>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The real price of travel, revealed before you click.
            </p>
            <p className="mt-4 text-xs text-muted-foreground/50">
              Built for TinyFish Accelerator · 2026
            </p>
          </div>

          {Object.entries(LINKS).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-foreground/60">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/50 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground/60">
            © 2026 Rosetta. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["X / Twitter", "Discord", "GitHub"].map((s) => (
              <a key={s} href="#" className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
