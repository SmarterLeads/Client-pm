import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClientNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold">Client not found</h1>
      <p className="text-sm text-muted-foreground">
        This client may have been removed or you do not have access.
      </p>
      <Button render={<Link href="/clients" />}>Back to clients</Button>
    </div>
  );
}
