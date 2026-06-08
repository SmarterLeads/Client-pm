import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProjectNotFound() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Project not found</h1>
      <p className="text-sm text-muted-foreground">
        This project may have been removed or you do not have access.
      </p>
      <Button render={<Link href="/projects" />}>Back to projects</Button>
    </div>
  );
}
