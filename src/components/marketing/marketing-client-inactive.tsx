import Link from "next/link";
import { Button } from "@/components/ui/button";

type MarketingClientInactiveProps = {
  clientName?: string;
  backHref?: string;
};

export function MarketingClientInactive({
  clientName,
  backHref = "/marketing",
}: MarketingClientInactiveProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 px-4 py-16">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          This client is no longer active
        </h1>
        <p className="text-sm text-muted-foreground">
          {clientName
            ? `${clientName} has been marked as churned and is hidden from marketing dashboards.`
            : "This client has been marked as churned and is hidden from marketing dashboards."}
        </p>
      </div>
      {backHref ? (
        <Button render={<Link href={backHref} />}>Back to marketing</Button>
      ) : null}
    </div>
  );
}
