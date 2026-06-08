import Link from "next/link";
import { TemplatesListTable } from "@/components/templates/templates-list-table";
import { Button } from "@/components/ui/button";
import { getTemplates } from "@/lib/queries/templates";

export default async function SettingsTemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Project templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Reusable section and task layouts for new projects.
          </p>
        </div>
        <Button render={<Link href="/settings/templates/new" />}>
          New template
        </Button>
      </div>

      <TemplatesListTable templates={templates} />
    </div>
  );
}
