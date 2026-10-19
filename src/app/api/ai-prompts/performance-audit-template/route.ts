import { NextResponse } from "next/server";
import { SMARTERLEADS_PERFORMANCE_AUDIT_PROMPT } from "@/lib/ai/smarterleads-audit-prompt";

export async function GET() {
  return NextResponse.json({
    name: "SmarterLeads performance diagnosis (browser + artifact)",
    platform: "google_ads",
    prompt_text: SMARTERLEADS_PERFORMANCE_AUDIT_PROMPT,
  });
}
