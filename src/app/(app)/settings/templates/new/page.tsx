import Link from "next/link";
import { NewTemplateForm } from "@/components/templates/new-template-form";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/templates"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          New template
        </h1>
        <p className="text-sm text-muted-foreground">
          Name your template, then add sections and tasks on the next screen.
        </p>
      </div>

      <NewTemplateForm />
    </div>
  );
}
