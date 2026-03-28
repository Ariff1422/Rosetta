"use client";

import { useEffect, useState } from "react";
import { useAuthSession } from "./use-auth-session";

type SavedSearch = {
  id: string;
  query: string;
  status: string;
  result_count: number;
  created_at: string;
};

export function useAccountHistory() {
  const { user, loading: authLoading } = useAuthSession();
  const [history, setHistory] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch("/api/history")
      .then(async (response) => {
        if (!response.ok) return { history: [] as SavedSearch[] };
        return (await response.json()) as { history?: SavedSearch[] };
      })
      .then((payload) => {
        if (cancelled) return;
        setHistory(payload.history ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setHistory([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  return { user, history, loading: authLoading || loading };
}
