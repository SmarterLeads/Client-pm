import { notFound } from "next/navigation";
import { MarketingClientInactive } from "@/components/marketing/marketing-client-inactive";
import { ClientMarketingReportView } from "@/components/marketing/report/client-marketing-report-view";
import { ReportSidebar } from "@/components/marketing/report/report-sidebar";
import { isMarketingChurnedClient } from "@/lib/marketing/client-status";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchPmReportSidebarGroups } from "@/lib/marketing/client-report-sidebar";
import { normalizeAgencyLogoUrl } from "@/lib/report/normalize-agency-logo-url";

export default async function MarketingClientReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    range?: string;
    start?: string;
    end?: string;
    view?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const supabase = createServiceClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, agency_id, report_slug, status, agencies(name, logo_url, primary_color)")
    .eq("report_slug", slug)
    .maybeSingle();

  if (!client?.report_slug) notFound();

  if (isMarketingChurnedClient(client.status)) {
    return <MarketingClientInactive clientName={client.name} />;
  }

  const agency = client.agencies as {
    name: string;
    logo_url: string | null;
    primary_color: string | null;
  } | null;

  const sidebarGroups = await fetchPmReportSidebarGroups(supabase, client.agency_id);

  return (
    <div className="-mx-4 -mb-4 flex min-h-[calc(100vh-3.5rem)] bg-white text-zinc-900 md:-mx-6 md:flex">
      <ReportSidebar
        groups={sidebarGroups}
        currentSlug={slug}
        logoUrl={normalizeAgencyLogoUrl(agency?.logo_url)}
        agencyName={agency?.name ?? "Agency"}
        primaryColor={agency?.primary_color ?? "#2563EB"}
      />
      <section className="w-full overflow-auto md:flex-1">
        <ClientMarketingReportView slug={slug} searchParams={sp} embedded />
      </section>
    </div>
  );
}
