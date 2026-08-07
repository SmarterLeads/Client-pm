import {
  updateClientWithTeamMemberContext,
  upsertPlatformConnectionWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";

export type ClientMarketingDashboardSetupData = {
  show_in_dashboard: boolean;
  report_slug?: string | null;
  whatconverts_profile_id?: string | null;
  client_type?: string;
  platform_google?: string | null;
  platform_meta?: string | null;
  platform_microsoft?: string | null;
  platform_tiktok?: string | null;
};

export async function applyClientMarketingDashboardSetup(
  teamMemberId: string,
  clientId: string,
  data: ClientMarketingDashboardSetupData,
) {
  const marketingPayload: Record<string, unknown> = {
    show_in_dashboard: data.show_in_dashboard,
    report_slug: data.report_slug?.trim() || null,
    whatconverts_profile_id: data.whatconverts_profile_id?.trim() || null,
  };

  if (data.client_type) {
    marketingPayload.client_type = data.client_type;
  }

  await updateClientWithTeamMemberContext(teamMemberId, clientId, marketingPayload);

  const platformEntries: Array<{ platform: string; accountId: string | null | undefined }> =
    [
      { platform: "google", accountId: data.platform_google },
      { platform: "meta", accountId: data.platform_meta },
      { platform: "microsoft", accountId: data.platform_microsoft },
      { platform: "tiktok", accountId: data.platform_tiktok },
      { platform: "whatconverts", accountId: data.whatconverts_profile_id },
    ];

  for (const entry of platformEntries) {
    await upsertPlatformConnectionWithTeamMemberContext(
      teamMemberId,
      clientId,
      entry.platform,
      entry.accountId?.trim() ?? "",
    );
  }
}
