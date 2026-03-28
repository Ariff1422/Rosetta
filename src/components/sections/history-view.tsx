"use client";

import { History } from "lucide-react";
import { useAccountHistory } from "@/hooks/use-account-history";

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HistoryView() {
  const { user, history, loading } = useAccountHistory();

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Loading account history...
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-2 flex items-center gap-2 text-foreground">
            <History className="h-4 w-4" />
            <span className="font-medium">Search history</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in with Google to save and view your previous Rosetta searches.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-6 pb-24 pt-12">
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-foreground">History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Saved searches for {user.email ?? "your account"}.
        </p>
      </div>

      {history.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No saved searches yet. Run a search from the homepage while signed in and it will appear here.
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                    Saved search
                  </div>
                  <div className="mt-2 whitespace-normal break-words text-base font-medium text-foreground">
                    {entry.query}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                    {entry.status}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-muted-foreground">
                    {entry.result_count} result{entry.result_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="mt-4 text-xs text-muted-foreground">
                {formatDate(entry.created_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
