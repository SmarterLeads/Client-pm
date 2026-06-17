"use server";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTeamMember } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import {
  insertClientContactWithTeamMemberContext,
  insertClientWithTeamMemberContext,
  insertInteractionWithTeamMemberContext,
  updateInteractionWithTeamMemberContext,
  deleteInteractionWithTeamMemberContext,
  updateClientContactWithTeamMemberContext,
  updateClientWithTeamMemberContext,
  upsertPlatformConnectionWithTeamMemberContext,
} from "@/lib/supabase/with-team-member-context";
import {
  contactFormSchema,
  createClientSchema,
  createInteractionSchema,
  updateInteractionSchema,
  archiveClientStatusSchema,
  updateClientFieldSchema,
  updateClientOverviewFieldsSchema,
  updateClientSchema,
  updateContactFieldsSchema,
  updateMarketingBriefSchema,
  updateMarketingChannelsSchema,
  updatePlatformConnectionSchema,
  type InteractionAttendeeInput,
} from "@/lib/validations/client";
import type { ClientStatus } from "@/lib/pm/constants";
import { buildStoredMarketingChannel } from "@/lib/updates/display";
import { pm } from "@/lib/supabase/pm";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClientUpdateSchema } from "@/lib/validations/client-update";
import type { ClientInsert, ClientContact, RagStatus } from "@/lib/types";
import type { z } from "zod";

export type ClientFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  clientId?: string;
};

function zodFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = [];
    out[key].push(issue.message);
  }
  return out;
}

function emptyToNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function parseInteractionForm(formData: FormData) {
  return {
    type: formData.get("type"),
    channel: formData.get("channel"),
    summary: formData.get("summary"),
    body: formData.get("body"),
    occurred_at: formData.get("occurred_at"),
    contact_ids: formData.getAll("contact_ids"),
    attendees: formData.get("attendees_json"),
  };
}

async function insertInteractionAttendees(
  interactionId: string,
  attendees: InteractionAttendeeInput[],
) {
  if (attendees.length === 0) return;

  const service = createServiceClient();
  const { error } = await pm(service).from("interaction_attendees").insert(
    attendees.map((attendee) => ({
      interaction_id: interactionId,
      name: attendee.name,
      email: attendee.email ?? null,
      company: attendee.company ?? null,
    })),
  );

  if (error) throw new Error(error.message);
}

async function replaceInteractionAttendees(
  interactionId: string,
  attendees: InteractionAttendeeInput[],
) {
  const service = createServiceClient();
  const { error: deleteError } = await pm(service)
    .from("interaction_attendees")
    .delete()
    .eq("interaction_id", interactionId);

  if (deleteError) throw new Error(deleteError.message);

  await insertInteractionAttendees(interactionId, attendees);
}

function parseCreateClientForm(formData: FormData) {
  return {
    name: formData.get("name"),
    agency_id: formData.get("agency_id"),
    status: formData.get("status"),
    rag_status: formData.get("rag_status"),
    account_manager_id: formData.get("account_manager_id"),
    notes: formData.get("notes"),
    website_url: formData.get("website_url"),
    gmb_url: formData.get("gmb_url"),
    business_phone: formData.get("business_phone"),
    marketing_channels: formData.getAll("marketing_channels"),
    primary_contact: {
      first_name: formData.get("contact_first_name"),
      last_name: formData.get("contact_last_name"),
      email: formData.get("contact_email"),
      phone: formData.get("contact_phone"),
      job_title: formData.get("contact_job_title"),
    },
  };
}

function parseContactForm(formData: FormData) {
  return {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    job_title: formData.get("job_title"),
    notes: formData.get("notes"),
    preferred_contact_method: formData.get("preferred_contact_method"),
    is_primary: formData.get("is_primary"),
  };
}

function parseClientOnlyForm(formData: FormData) {
  return {
    name: formData.get("name"),
    status: formData.get("status"),
    rag_status: formData.get("rag_status"),
    account_manager_id: formData.get("account_manager_id"),
    notes: formData.get("notes"),
  };
}

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

function revalidateClient(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  revalidatePath("/contacts");
  revalidatePath("/interactions");
}

export async function createClient(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  console.log("[createClient] action invoked");

  let teamMember;
  try {
    teamMember = await requireTeamMember();
  } catch (err) {
    console.error("[createClient] auth failed:", err);
    return {
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  const agencyIdRaw = formData.get("agency_id");
  const agencyId =
    typeof agencyIdRaw === "string" && agencyIdRaw.trim() !== ""
      ? agencyIdRaw
      : teamMember.agency_id;

  const parsed = createClientSchema.safeParse({
    ...parseCreateClientForm(formData),
    agency_id: agencyId,
  });

  if (!parsed.success) {
    console.log("[createClient] validation failed:", parsed.error.flatten());
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const clientPayload: ClientInsert = {
    name: parsed.data.name,
    agency_id: parsed.data.agency_id,
    status: parsed.data.status,
    rag_status: parsed.data.rag_status,
    account_manager_id: parsed.data.account_manager_id ?? null,
    pm_notes: parsed.data.notes ?? null,
    website_url: parsed.data.website_url ?? null,
    gmb_url: parsed.data.gmb_url ?? null,
    business_phone: parsed.data.business_phone ?? null,
  };

  const contactPayload = {
    first_name: parsed.data.primary_contact.first_name,
    last_name: parsed.data.primary_contact.last_name ?? null,
    email: parsed.data.primary_contact.email ?? null,
    phone: parsed.data.primary_contact.phone ?? null,
    job_title: parsed.data.primary_contact.job_title ?? null,
    is_primary: true,
    pm_notes: null,
  };

  try {
    const clientId = await insertClientWithTeamMemberContext(
      teamMember.id,
      clientPayload,
      contactPayload,
    );

    const marketingChannels = normalizeMarketingChannelsPayload(
      parsed.data.marketing_channels,
    );
    if (marketingChannels.length > 0) {
      await updateClientWithTeamMemberContext(teamMember.id, clientId, {
        marketing_channels: marketingChannels,
      });
    }

    console.log("[createClient] created client:", clientId);
    revalidateClient(clientId);
    return { success: true, clientId };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[createClient] insert failed:", err);
    return {
      error:
        err instanceof Error ? err.message : "Failed to create client.",
    };
  }
}

export async function updateClient(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  let teamMember;
  try {
    teamMember = await requireTeamMember();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Unauthorized",
    };
  }

  const parsed = updateClientSchema.safeParse(parseClientOnlyForm(formData));

  if (!parsed.success) {
    return { fieldErrors: zodFieldErrors(parsed.error) };
  }

  const payload: Record<string, unknown> = {
    name: parsed.data.name,
    status: parsed.data.status,
    rag_status: parsed.data.rag_status,
    account_manager_id: parsed.data.account_manager_id ?? null,
    pm_notes: parsed.data.notes ?? null,
  };

  try {
    await updateClientWithTeamMemberContext(teamMember.id, clientId, payload);
    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update client.",
    };
  }
}

export async function updateClientFields(
  clientId: string,
  updates: {
    status?: ClientStatus;
    rag_status?: RagStatus;
    account_manager_id?: string | null;
  },
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateClientFieldSchema.safeParse(updates);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid field value.";
      return { error: message };
    }

    const payload: Record<string, unknown> = {};

    if (parsed.data.status !== undefined) {
      payload.status = parsed.data.status;
    }
    if (parsed.data.rag_status !== undefined) {
      payload.rag_status = parsed.data.rag_status;
    }
    if (parsed.data.account_manager_id !== undefined) {
      payload.account_manager_id = parsed.data.account_manager_id;
    }

    if (Object.keys(payload).length === 0) {
      return { error: "No fields to update." };
    }

    await updateClientWithTeamMemberContext(teamMember.id, clientId, payload);
    revalidateClient(clientId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update.",
    };
  }
}

export async function updateClientOverviewFields(
  clientId: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateClientOverviewFieldsSchema.safeParse(updates);

    if (!parsed.success) {
      console.error(
        "[updateClientOverviewFields] validation failed:",
        JSON.stringify(parsed.error.flatten()),
      );
      const message =
        parsed.error.issues[0]?.message ?? "Invalid field value.";
      return { error: message };
    }

    const payload = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;

    if (payload.marketing_channels !== undefined) {
      payload.marketing_channels = normalizeMarketingChannelsPayload(
        payload.marketing_channels,
      );
    }

    if (Object.keys(payload).length === 0) {
      return { error: "No fields to update." };
    }

    await updateClientWithTeamMemberContext(teamMember.id, clientId, payload);
    revalidateClient(clientId);
    return {};
  } catch (err) {
    console.error("[updateClientOverviewFields] error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to update client.",
    };
  }
}

export async function updateClientMarketingChannels(
  clientId: string,
  channels: string[],
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const marketing_channels = normalizeMarketingChannelsPayload(channels);

    const parsed = updateMarketingChannelsSchema.safeParse({
      marketing_channels,
    });

    if (!parsed.success) {
      console.error(
        "[updateClientMarketingChannels] validation failed:",
        JSON.stringify(parsed.error.flatten()),
      );
      const message =
        parsed.error.issues[0]?.message ?? "Invalid marketing channels.";
      return { error: message };
    }

    const payload = { marketing_channels: parsed.data.marketing_channels };

    console.error(
      "[updateClientMarketingChannels] saving payload:",
      JSON.stringify(payload),
    );

    await updateClientWithTeamMemberContext(teamMember.id, clientId, payload);
    revalidateClient(clientId);
    return {};
  } catch (err) {
    console.error("[updateClientMarketingChannels] error:", err);
    return {
      error:
        err instanceof Error
          ? err.message
          : "Failed to update marketing channels.",
    };
  }
}

function normalizeMarketingChannelsPayload(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((item): item is string => typeof item === "string"))];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
    return [trimmed];
  }

  return [];
}

export async function updatePlatformConnection(
  clientId: string,
  platform: string,
  externalAccountId: string | null,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updatePlatformConnectionSchema.safeParse({
      platform,
      externalAccountId,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid platform connection.";
      return { error: message };
    }

    await upsertPlatformConnectionWithTeamMemberContext(
      teamMember.id,
      clientId,
      parsed.data.platform,
      parsed.data.externalAccountId ?? "",
    );
    revalidateClient(clientId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save platform ID.",
    };
  }
}

export async function updateMarketingBrief(
  clientId: string,
  brief: string | null,
): Promise<{ error?: string; success?: boolean }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateMarketingBriefSchema.safeParse({ brief });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid marketing brief.";
      return { error: message };
    }

    const normalized =
      typeof parsed.data.brief === "string" ? parsed.data.brief.trim() : "";

    await updateClientWithTeamMemberContext(teamMember.id, clientId, {
      marketing_brief: normalized || null,
    });
    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to save marketing brief.",
    };
  }
}

export async function createContact(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = contactFormSchema.safeParse(parseContactForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await insertClientContactWithTeamMemberContext(teamMember.id, {
      client_id: clientId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      job_title: parsed.data.job_title ?? null,
      pm_notes: parsed.data.notes ?? null,
      preferred_contact_method: parsed.data.preferred_contact_method ?? null,
      is_primary: parsed.data.is_primary ?? false,
    });

    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to create contact.",
    };
  }
}

export async function updateContact(
  clientId: string,
  contactId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = contactFormSchema.safeParse(parseContactForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    await updateClientContactWithTeamMemberContext(teamMember.id, contactId, {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      email: parsed.data.email ?? null,
      phone: parsed.data.phone ?? null,
      job_title: parsed.data.job_title ?? null,
      pm_notes: parsed.data.notes ?? null,
      preferred_contact_method: parsed.data.preferred_contact_method ?? null,
      is_primary: parsed.data.is_primary ?? false,
    });

    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to update contact.",
    };
  }
}

export async function updateContactFields(
  clientId: string,
  contactId: string,
  updates: Record<string, unknown>,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = updateContactFieldsSchema.safeParse(updates);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "Invalid field value.";
      return { error: message };
    }

    const payload = Object.fromEntries(
      Object.entries(parsed.data).filter(([, value]) => value !== undefined),
    ) as Record<string, unknown>;

    if (Object.keys(payload).length === 0) {
      return { error: "No fields to update." };
    }

    await updateClientContactWithTeamMemberContext(
      teamMember.id,
      contactId,
      payload,
    );
    revalidateClient(clientId);
    return {};
  } catch (err) {
    console.error("[updateContactFields] error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to update contact.",
    };
  }
}

export async function archiveClient(
  clientId: string,
  status: "active" | "on_hold" | "churned",
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const parsed = archiveClientStatusSchema.safeParse(status);

    if (!parsed.success) {
      return { error: "Invalid client status." };
    }

    await updateClientWithTeamMemberContext(teamMember.id, clientId, {
      status: parsed.data,
    });
    revalidateClient(clientId);
    redirect("/clients");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to update client status.",
    };
  }
}

export async function deleteClient(
  clientId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();

    if (!isAdmin(teamMember.role)) {
      return { error: "Only admins can delete clients." };
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("clients").delete().eq("id", clientId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/clients");
    revalidatePath("/contacts");
    revalidatePath("/interactions");
    revalidatePath("/projects");
    redirect("/clients");
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return {
      error: err instanceof Error ? err.message : "Failed to delete client.",
    };
  }
}

export async function getContactsForDeleteDialog(
  clientId: string,
): Promise<
  Pick<ClientContact, "id" | "first_name" | "last_name" | "is_primary">[]
> {
  await requireTeamMember();
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("client_contacts")
    .select("id, first_name, last_name, is_primary")
    .eq("client_id", clientId)
    .eq("is_active", true)
    .order("first_name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function deleteContact(
  contactId: string,
  newPrimaryContactId?: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    const supabase = await createSupabaseClient();

    const { data: contact, error: contactError } = await supabase
      .from("client_contacts")
      .select("id, client_id, is_primary, is_active")
      .eq("id", contactId)
      .maybeSingle();

    if (contactError) {
      throw new Error(contactError.message);
    }

    if (!contact || !contact.is_active) {
      return { error: "Contact not found." };
    }

    const { data: siblings, error: siblingsError } = await supabase
      .from("client_contacts")
      .select("id, is_primary")
      .eq("client_id", contact.client_id)
      .eq("is_active", true);

    if (siblingsError) {
      throw new Error(siblingsError.message);
    }

    const activeContacts = siblings ?? [];

    if (activeContacts.length <= 1) {
      return {
        error:
          "Cannot delete the only contact. Add another contact first or delete the client.",
      };
    }

    if (contact.is_primary) {
      if (!newPrimaryContactId) {
        return { error: "Select a new primary contact before deleting." };
      }

      const isValidReplacement = activeContacts.some(
        (row) => row.id === newPrimaryContactId && row.id !== contactId,
      );

      if (!isValidReplacement) {
        return { error: "Invalid primary contact selection." };
      }

      await updateClientContactWithTeamMemberContext(
        teamMember.id,
        newPrimaryContactId,
        { is_primary: true },
      );
    }

    const service = createServiceClient();
    const { error: deleteError } = await service
      .from("client_contacts")
      .delete()
      .eq("id", contactId);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidateClient(contact.client_id);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete contact.",
    };
  }
}

export async function createInteraction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const teamMember = await requireTeamMember();

    const parsed = createInteractionSchema.safeParse(parseInteractionForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const contactIds = parsed.data.contact_ids;

    const interactionId = await insertInteractionWithTeamMemberContext(teamMember.id, {
      client_id: clientId,
      contact_ids: contactIds,
      contact_id: contactIds[0] ?? null,
      type: parsed.data.type,
      channel: parsed.data.channel ?? null,
      summary: parsed.data.summary,
      body: parsed.data.body ?? null,
      occurred_at: new Date(parsed.data.occurred_at).toISOString(),
    });

    await insertInteractionAttendees(interactionId, parsed.data.attendees);

    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to log interaction.",
    };
  }
}

export async function updateInteraction(
  clientId: string,
  interactionId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const teamMember = await requireTeamMember();

    const parsed = updateInteractionSchema.safeParse(parseInteractionForm(formData));

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const contactIds = parsed.data.contact_ids;

    await updateInteractionWithTeamMemberContext(teamMember.id, interactionId, {
      contact_ids: contactIds,
      contact_id: contactIds[0] ?? null,
      type: parsed.data.type,
      channel: parsed.data.channel ?? null,
      summary: parsed.data.summary,
      body: parsed.data.body ?? null,
      occurred_at: new Date(parsed.data.occurred_at).toISOString(),
    });

    await replaceInteractionAttendees(interactionId, parsed.data.attendees);

    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to update interaction.",
    };
  }
}

export async function deleteInteraction(
  clientId: string,
  interactionId: string,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();
    await deleteInteractionWithTeamMemberContext(teamMember.id, interactionId);
    revalidateClient(clientId);
    return {};
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to delete interaction.",
    };
  }
}

export async function createClientUpdate(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  try {
    const teamMember = await requireTeamMember();

    const parsed = createClientUpdateSchema.safeParse({
      marketing_channel: formData.get("marketing_channel"),
      other_detail: formData.get("other_detail"),
      summary: formData.get("summary"),
      occurred_at: formData.get("occurred_at"),
    });

    if (!parsed.success) {
      return { fieldErrors: zodFieldErrors(parsed.error) };
    }

    const marketing_channel = buildStoredMarketingChannel(
      parsed.data.marketing_channel,
      parsed.data.other_detail,
    );

    const supabase = await createSupabaseClient();
    const { error } = await pm(supabase).from("client_updates").insert({
      client_id: clientId,
      logged_by: teamMember.id,
      marketing_channel,
      summary: parsed.data.summary,
      occurred_at: new Date(parsed.data.occurred_at).toISOString(),
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidateClient(clientId);
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to log update.",
    };
  }
}
