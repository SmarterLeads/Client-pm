import { NextRequest, NextResponse } from "next/server";
import { supabasePM } from "@/lib/supabase-pm";

type RouteContext = { params: Promise<{ clientId: string }> };

const listColumns =
  "id, client_id, prompt_id, week_start, week_end, prev_week_start, prev_week_end, status, error_message, generated_by, google_ads_customer_id, created_at, updated_at";

export async function GET(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const { data, error } = await supabasePM
      .from("client_ai_weekly_insights")
      .select("*")
      .eq("client_id", clientId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  }

  const { data, error } = await supabasePM
    .from("client_ai_weekly_insights")
    .select(listColumns)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const { error } = await supabasePM
    .from("client_ai_weekly_insights")
    .delete()
    .eq("client_id", clientId)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
