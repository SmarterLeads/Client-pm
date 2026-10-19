import { NextRequest, NextResponse } from "next/server";
import { supabasePM } from "@/lib/supabase-pm";
import type { TablesUpdate } from "@/lib/types";

type AiPromptUpdate = TablesUpdate<{ schema: "pm" }, "ai_prompts">;

export async function GET() {
  const { data, error } = await supabasePM
    .from("ai_prompts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, platform, prompt_text, is_default } = body as Record<
    string,
    unknown
  >;

  if (
    typeof name !== "string" ||
    typeof platform !== "string" ||
    typeof prompt_text !== "string"
  ) {
    return NextResponse.json(
      { error: "name, platform, and prompt_text are required" },
      { status: 400 },
    );
  }

  if (is_default === true) {
    await supabasePM
      .from("ai_prompts")
      .update({
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq("platform", platform)
      .eq("is_default", true);
  }

  const { data, error } = await supabasePM
    .from("ai_prompts")
    .insert({
      name,
      platform,
      prompt_text,
      is_default: is_default === true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { id, ...rest } = body as Record<string, unknown>;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: AiPromptUpdate = {
    updated_at: new Date().toISOString(),
  };
  if (typeof rest.name === "string") updates.name = rest.name;
  if (typeof rest.platform === "string") updates.platform = rest.platform;
  if (typeof rest.prompt_text === "string") {
    updates.prompt_text = rest.prompt_text;
  }
  if (typeof rest.is_default === "boolean") {
    updates.is_default = rest.is_default;
  }

  if (rest.is_default === true) {
    const platform =
      typeof rest.platform === "string"
        ? rest.platform
        : (
            await supabasePM
              .from("ai_prompts")
              .select("platform")
              .eq("id", id)
              .maybeSingle()
          ).data?.platform;

    if (platform) {
      await supabasePM
        .from("ai_prompts")
        .update({
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq("platform", platform)
        .neq("id", id)
        .eq("is_default", true);
    }
  }

  const { data, error } = await supabasePM
    .from("ai_prompts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const { error } = await supabasePM.from("ai_prompts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
