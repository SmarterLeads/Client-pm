import { NextRequest, NextResponse } from "next/server";
import {
  clientAiPromptsTable,
  listClientAiPrompts,
  type ClientAiPrompt,
} from "@/lib/ai/client-ai-prompts-db";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  const { data, error } = await listClientAiPrompts(clientId);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name;
  const platform = body.platform;
  const prompt_text = body.prompt_text;
  const is_default = body.is_default;

  if (typeof name !== "string" || typeof prompt_text !== "string") {
    return NextResponse.json(
      { error: "name and prompt_text are required" },
      { status: 400 },
    );
  }

  const platformValue =
    typeof platform === "string" && platform.trim()
      ? platform.trim()
      : "google_ads";

  if (is_default === true) {
    await clientAiPromptsTable("client_ai_prompts")
      .update({
        is_default: false,
        updated_at: new Date().toISOString(),
      })
      .eq("client_id", clientId)
      .eq("platform", platformValue)
      .eq("is_default", true);
  }

  const { data, error } = await clientAiPromptsTable("client_ai_prompts")
    .insert({
      client_id: clientId,
      name: name.trim(),
      platform: platformValue,
      prompt_text,
      is_default: is_default === true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data as ClientAiPrompt, { status: 201 });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { clientId } = await context.params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string") updates.name = body.name.trim();
  if (typeof body.platform === "string") updates.platform = body.platform.trim();
  if (typeof body.prompt_text === "string") updates.prompt_text = body.prompt_text;
  if (typeof body.is_default === "boolean") updates.is_default = body.is_default;

  if (body.is_default === true) {
    const existing = await clientAiPromptsTable("client_ai_prompts")
      .select("platform")
      .eq("id", id)
      .eq("client_id", clientId)
      .maybeSingle();

    const platform =
      typeof body.platform === "string"
        ? body.platform.trim()
        : (existing.data as { platform?: string } | null)?.platform;

    if (platform) {
      await clientAiPromptsTable("client_ai_prompts")
        .update({
          is_default: false,
          updated_at: new Date().toISOString(),
        })
        .eq("client_id", clientId)
        .eq("platform", platform)
        .neq("id", id)
        .eq("is_default", true);
    }
  }

  const { data, error } = await clientAiPromptsTable("client_ai_prompts")
    .update(updates)
    .eq("id", id)
    .eq("client_id", clientId)
    .select()
    .single();

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

  const { error } = await clientAiPromptsTable("client_ai_prompts")
    .delete()
    .eq("client_id", clientId)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
