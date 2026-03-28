export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-12 py-8 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary block" />
          <span className="font-serif text-base font-bold text-foreground">Rosetta</span>
        </div>

        <span className="text-sm text-muted-foreground">
          © 2026 Rosetta. Built for the TinyFish Accelerator.
        </span>

        <ul className="flex gap-6">
          {["Privacy", "Terms", "Twitter", "Discord"].map((item) => (
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
    </footer>
  );
}
