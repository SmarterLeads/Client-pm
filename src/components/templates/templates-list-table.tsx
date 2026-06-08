"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleTemplateActive } from "@/lib/actions/templates";
import type { TemplateListRow } from "@/lib/templates/types";
import { toastError } from "@/lib/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TemplatesListTableProps = {
  templates: TemplateListRow[];
};

export function TemplatesListTable({ templates }: TemplatesListTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, checked: boolean) {
    startTransition(async () => {
      const result = await toggleTemplateActive(id, checked);
      if (result.error) {
        toastError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (templates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
        No templates yet. Create one to standardize project setup.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Sections</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Created by</TableHead>
            <TableHead>Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell>
                <Link
                  href={`/settings/templates/${template.id}`}
                  className="font-medium hover:underline"
                >
                  {template.name}
                </Link>
                {template.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {template.description}
                  </p>
                ) : null}
              </TableCell>
              <TableCell>{template.section_count}</TableCell>
              <TableCell>{template.task_count}</TableCell>
              <TableCell className="text-muted-foreground">
                {template.created_by_name ?? "—"}
              </TableCell>
              <TableCell>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={template.is_active}
                    disabled={isPending}
                    onChange={(e) =>
                      handleToggle(template.id, e.target.checked)
                    }
                    className="size-4 rounded"
                  />
                  <span className="sr-only">Active</span>
                </label>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
