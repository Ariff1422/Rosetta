"use client";

import { useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuthSession } from "@/hooks/use-auth-session";

export function AuthControls() {
  const { user, loading } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const emailLabel = useMemo(() => user?.email ?? "Signed in", [user?.email]);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Button size="sm" variant="outline" disabled>
        Loading
      </Button>
    );
  }

  if (!user) {
    return (
      <Button size="sm" variant="outline" onClick={handleSignIn} disabled={busy}>
        {busy ? "Connecting..." : "Sign in with Google"}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[180px] truncate text-xs text-muted-foreground">{emailLabel}</span>
      <Button size="sm" variant="outline" onClick={handleSignOut} disabled={busy} className="gap-1.5">
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </Button>
    </div>
  );
}
