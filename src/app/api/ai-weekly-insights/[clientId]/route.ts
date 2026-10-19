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

type PatchBody = {
  id: string;
  artifact_url?: string | null;
  report_markdown?: string | null;
  status?: string;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const patch: {
    updated_at: string;
    artifact_url?: string | null;
    report_markdown?: string | null;
    status?: string;
  } = { updated_at: new Date().toISOString() };
  if (body.artifact_url !== undefined) patch.artifact_url = body.artifact_url;
  if (body.report_markdown !== undefined) {
    patch.report_markdown = body.report_markdown;
  }
  if (body.status !== undefined) patch.status = body.status;

  const { data, error } = await supabasePM
    .from("client_ai_weekly_insights")
    .update(patch as never)
    .eq("client_id", clientId)
    .eq("id", body.id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
