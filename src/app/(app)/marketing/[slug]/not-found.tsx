import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MarketingReportNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Report not found</h1>
      <p className="text-sm text-muted-foreground">
        No client matches this marketing report slug.
      </p>
      <Button render={<Link href="/marketing" />}>Back to marketing overview</Button>
    </div>
  );
}
