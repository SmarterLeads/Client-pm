"use server";

import { revalidatePath } from "next/cache";
import { getClientUser, getTeamMember } from "@/lib/auth/session";
import {
  assertValidAttachmentEntityType,
  type AttachmentEntityType,
} from "@/lib/attachments/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";
import {
  deleteAttachment as deleteAttachmentFromStorage,
  ensureAttachmentsBucket,
  getAttachmentUrl,
  uploadAttachment as uploadAttachmentToStorage,
} from "@/lib/storage";

async function requireTeamMember() {
  const teamMember = await getTeamMember();
  if (!teamMember) {
    throw new Error("You must be signed in as a team member.");
  }
  return teamMember;
}

async function getAttachmentRecord(attachmentId: string) {
  const supabase = await createClient();
  const { data, error } = await pm(supabase)
    .from("attachments")
    .select("id, entity_type, entity_id, storage_path, filename")
    .eq("id", attachmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Attachment not found.");
  return data;
}

async function attachmentBelongsToClient(
  clientId: string,
  entityType: string,
  entityId: string,
): Promise<boolean> {
  const supabase = await createClient();

  if (entityType === "client") {
    return entityId === clientId;
  }

  if (entityType === "project") {
    const { data } = await pm(supabase)
      .from("projects")
      .select("id")
      .eq("id", entityId)
      .eq("client_id", clientId)
      .maybeSingle();
    return Boolean(data);
  }

  if (entityType === "task") {
    const { data } = await pm(supabase)
      .from("tasks")
      .select("id, project:projects!inner(client_id)")
      .eq("id", entityId)
      .maybeSingle();
    return data?.project?.client_id === clientId;
  }

  if (entityType === "interaction") {
    const { data } = await pm(supabase)
      .from("interactions")
      .select("id")
      .eq("id", entityId)
      .eq("client_id", clientId)
      .maybeSingle();
    return Boolean(data);
  }

  return false;
}

async function verifyAttachmentAccess(attachmentId: string) {
  const record = await getAttachmentRecord(attachmentId);
  const teamMember = await getTeamMember();

  if (teamMember) {
    return record;
  }

  const clientUser = await getClientUser();
  if (!clientUser) {
    throw new Error("You must be signed in to access this file.");
  }

  const allowed = await attachmentBelongsToClient(
    clientUser.client_id,
    record.entity_type,
    record.entity_id,
  );

  if (!allowed) {
    throw new Error("You do not have access to this file.");
  }

  return record;
}

async function revalidateAttachmentPaths(
  entityType: string,
  entityId: string,
) {
  if (entityType === "client") {
    revalidatePath(`/clients/${entityId}`);
    return;
  }

  if (entityType === "project") {
    revalidatePath(`/projects/${entityId}`);
    return;
  }

  if (entityType === "task") {
    const supabase = await createClient();
    const { data } = await pm(supabase)
      .from("tasks")
      .select("project_id")
      .eq("id", entityId)
      .maybeSingle();
    if (data?.project_id) {
      revalidatePath(`/projects/${data.project_id}`);
    }
    revalidatePath("/tasks");
    return;
  }

  if (entityType === "interaction") {
    const supabase = await createClient();
    const { data } = await pm(supabase)
      .from("interactions")
      .select("client_id")
      .eq("id", entityId)
      .maybeSingle();
    if (data?.client_id) {
      revalidatePath(`/clients/${data.client_id}`);
    }
    revalidatePath("/interactions");
  }
}

export async function ensureAttachmentsBucketAction(): Promise<{
  error?: string;
  created?: boolean;
}> {
  try {
    const teamMember = await requireTeamMember();
    if (!teamMember) return { error: "Unauthorized" };

    const supabase = await import("@/lib/supabase/service").then((m) =>
      m.createServiceClient(),
    );
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();
    if (listError) throw new Error(listError.message);

    const exists = buckets?.some((bucket) => bucket.name === "attachments");
    if (exists) return { created: false };

    await ensureAttachmentsBucket();
    return { created: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to ensure bucket.",
    };
  }
}

export async function uploadAttachment(
  entityType: AttachmentEntityType,
  entityId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  try {
    const teamMember = await requireTeamMember();

    try {
      assertValidAttachmentEntityType(entityType);
    } catch (validationError) {
      return {
        error:
          validationError instanceof Error
            ? validationError.message
            : "Invalid entity type.",
      };
    }

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "No file provided." };
    }

    await uploadAttachmentToStorage(
      file,
      entityType,
      entityId,
      teamMember.id,
    );

    await revalidateAttachmentPaths(entityType, entityId);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to upload file.",
    };
  }
}

export async function deleteAttachment(
  attachmentId: string,
): Promise<{ error?: string }> {
  try {
    await requireTeamMember();
    const record = await getAttachmentRecord(attachmentId);

    await deleteAttachmentFromStorage(attachmentId);
    await revalidateAttachmentPaths(record.entity_type, record.entity_id);
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete file.",
    };
  }
}

export async function getAttachmentSignedUrl(
  attachmentId: string,
): Promise<string> {
  const record = await verifyAttachmentAccess(attachmentId);
  return getAttachmentUrl(record.storage_path, record.filename);
}
