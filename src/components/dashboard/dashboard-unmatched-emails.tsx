"use client";

import { useState } from "react";
import { formatNotificationTime } from "@/lib/notifications/display";
import type { EmailLog } from "@/lib/types";
import type { SelectOption } from "@/lib/queries/projects";
import { AssignEmailSheet } from "@/components/dashboard/assign-email-sheet";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

type DashboardUnmatchedEmailsProps = {
  emails: EmailLog[];
  clients: SelectOption[];
};

export function DashboardUnmatchedEmails({
  emails,
  clients,
}: DashboardUnmatchedEmailsProps) {
  const [assignEmail, setAssignEmail] = useState<EmailLog | null>(null);

  if (emails.length === 0) {
    return null;
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Mail className="size-4 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">Unmatched Emails</h2>
          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
            {emails.length}
          </span>
        </div>

        <ul className="divide-y divide-border">
          {emails.map((email) => (
            <li
              key={email.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {email.subject?.trim() || "(No subject)"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  From {email.from_email}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatNotificationTime(email.received_at)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setAssignEmail(email)}
              >
                Assign to client
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <AssignEmailSheet
        email={assignEmail}
        clients={clients}
        open={assignEmail !== null}
        onOpenChange={(open) => {
          if (!open) setAssignEmail(null);
        }}
      />
    </>
  );
}
