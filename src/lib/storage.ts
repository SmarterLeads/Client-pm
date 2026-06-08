import { randomUUID } from "crypto";
import { assertValidAttachmentEntityType } from "@/lib/attachments/types";
import { pm } from "@/lib/supabase/pm";
import { createServiceClient } from "@/lib/supabase/service";
import type { Attachment } from "@/lib/types";

export const ATTACHMENTS_BUCKET = "attachments";
const SIGNED_URL_EXPIRY_SECONDS = 3600;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildStoragePath(
  entityType: string,
  entityId: string,
  filename: string,
) {
  return `${entityType}/${entityId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

export async function ensureAttachmentsBucket() {
  const supabase = createServiceClient();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === ATTACHMENTS_BUCKET);
  if (exists) return;

  const { error: createError } = await supabase.storage.createBucket(
    ATTACHMENTS_BUCKET,
    { public: false },
  );

  if (createError) {
    throw new Error(`Failed to create attachments bucket: ${createError.message}`);
  }
}

export async function uploadAttachment(
  file: File,
  entityType: string,
  entityId: string,
  uploadedById: string,
): Promise<Attachment> {
  assertValidAttachmentEntityType(entityType);

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File exceeds the 50 MB size limit.");
  }

  await ensureAttachmentsBucket();

  const supabase = createServiceClient();
  const storagePath = buildStoragePath(entityType, entityId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  const { data, error: insertError } = await pm(supabase)
    .from("attachments")
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      uploaded_by: uploadedById,
    })
    .select()
    .single();

  if (insertError || !data) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    throw new Error(
      insertError?.message ?? "Failed to save attachment metadata.",
    );
  }

  return data;
}

export async function getAttachmentUrl(
  storagePath: string,
  downloadFilename?: string,
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(
      storagePath,
      SIGNED_URL_EXPIRY_SECONDS,
      downloadFilename ? { download: downloadFilename } : undefined,
    );

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Failed to create download URL.");
  }

  return data.signedUrl;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: row, error: fetchError } = await pm(supabase)
    .from("attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!row) {
    throw new Error("Attachment not found.");
  }

  const { error: storageError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .remove([row.storage_path]);

  if (storageError) {
    throw new Error(`Failed to delete file: ${storageError.message}`);
  }

  const { error: dbError } = await pm(supabase)
    .from("attachments")
    .delete()
    .eq("id", attachmentId);

  if (dbError) {
    throw new Error(`Failed to delete attachment record: ${dbError.message}`);
  }
}
