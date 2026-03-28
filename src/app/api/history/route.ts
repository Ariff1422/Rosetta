import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ history: [], user: null });
    }

    const { data, error } = await supabase
      .from("search_requests")
      .select("id,query,sections,status,result_count,created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ history: [], user: { email: user.email }, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      history: data ?? [],
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { history: [], user: null, error: error instanceof Error ? error.message : "Unable to load history" },
      { status: 500 }
    );
  }
}
