"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ClientForm } from "@/components/clients/client-form";
import { LogInteractionSheet } from "@/components/clients/log-interaction-sheet";
import { NewContactQuickSheet } from "@/components/app/quick-create/new-contact-quick-sheet";
import { NewTaskQuickSheet } from "@/components/app/quick-create/new-task-quick-sheet";
import { ProjectForm } from "@/components/projects/project-form";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { loadQuickCreateClientContacts, loadQuickCreateFormData } from "@/lib/actions/quick-create";
import {
  closeQuickCreate,
  getQuickCreateState,
  subscribeQuickCreate,
  type QuickCreateType,
} from "@/lib/stores/quick-create-store";
import type { AgencyListRow } from "@/lib/queries/agencies";
import type { SelectOption } from "@/lib/queries/projects";
import type { TemplateSelectOption } from "@/lib/templates/types";
import type { ClientContact, TeamMember } from "@/lib/types";

type QuickCreateFormData = {
  clients: SelectOption[];
  agencies: AgencyListRow[];
  teamMembers: Pick<TeamMember, "id" | "name" | "email" | "avatar_url">[];
  templates: TemplateSelectOption[];
};

type QuickCreateProviderProps = {
  teamMember: TeamMember;
  children: React.ReactNode;
};

export function QuickCreateProvider({
  teamMember,
  children,
}: QuickCreateProviderProps) {
  const pathname = usePathname() ?? "";

  const { active } = useSyncExternalStore(
    subscribeQuickCreate,
    getQuickCreateState,
    getQuickCreateState,
  );

  const [formData, setFormData] = useState<QuickCreateFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [interactionContacts, setInteractionContacts] = useState<ClientContact[]>(
    [],
  );

  useEffect(() => {
    closeQuickCreate();
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      setInteractionContacts([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    loadQuickCreateFormData()
      .then((data) => {
        if (!cancelled) setFormData(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [active]);

  function handleOpenChange(open: boolean) {
    if (!open) closeQuickCreate();
  }

  function handleInteractionClientSelect(clientId: string) {
    if (!clientId) {
      setInteractionContacts([]);
      return;
    }

    loadQuickCreateClientContacts(clientId).then(setInteractionContacts);
  }

  return (
    <>
      {children}

      <QuickCreateSheet
        type="client"
        active={active}
        open={active === "client"}
        onOpenChange={handleOpenChange}
        loading={loading}
      >
        {formData ? (
          formData.agencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No agencies are available. Create an agency before adding clients.
            </p>
          ) : (
            <ClientForm
              sheetMode
              teamMembers={formData.teamMembers}
              agencies={formData.agencies}
              agencyId={teamMember.agency_id}
              onCancel={() => closeQuickCreate()}
            />
          )
        ) : null}
      </QuickCreateSheet>

      {formData ? (
        <NewContactQuickSheet
          clients={formData.clients}
          open={active === "contact"}
          onOpenChange={handleOpenChange}
        />
      ) : null}

      <QuickCreateSheet
        type="project"
        active={active}
        open={active === "project"}
        onOpenChange={handleOpenChange}
        loading={loading}
      >
        {formData ? (
          <ProjectForm
            sheetMode
            clients={formData.clients}
            teamMembers={formData.teamMembers}
            templates={formData.templates}
            onCancel={() => closeQuickCreate()}
          />
        ) : null}
      </QuickCreateSheet>

      {formData ? (
        <NewTaskQuickSheet
          clients={formData.clients}
          teamMembers={formData.teamMembers}
          open={active === "task"}
          onOpenChange={handleOpenChange}
        />
      ) : null}

      {formData ? (
        <LogInteractionSheet
          clients={formData.clients}
          contacts={interactionContacts}
          open={active === "interaction"}
          onOpenChange={handleOpenChange}
          title="New interaction"
          onClientSelect={handleInteractionClientSelect}
        />
      ) : null}
    </>
  );
}

function QuickCreateSheet({
  type,
  active,
  open,
  onOpenChange,
  loading,
  children,
}: {
  type: QuickCreateType;
  active: QuickCreateType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  if (active !== type && !open) return null;

  const titles: Record<QuickCreateType, string> = {
    client: "New client",
    contact: "New contact",
    project: "New project",
    task: "New task",
    interaction: "New interaction",
  };

  const isLarge = type === "client" || type === "project";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size={isLarge ? "lg" : "default"}>
        <SheetHeader>
          <SheetTitle>{titles[type]}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex min-h-0 flex-1 flex-col py-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            children
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
