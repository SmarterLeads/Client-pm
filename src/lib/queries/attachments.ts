import type {
  AttachmentEntityType,
  AttachmentListItem,
} from "@/lib/attachments/types";
import { pm } from "@/lib/supabase/pm";
import { createClient } from "@/lib/supabase/server";

export async function getAttachmentsForEntity(
  entityType: AttachmentEntityType,
  entityId: string,
): Promise<AttachmentListItem[]> {
  const supabase = await createClient();

  const { data, error } = await pm(supabase)
    .from("attachments")
    .select(
      `
      id,
      filename,
      file_size_bytes,
      mime_type,
      created_at,
      uploader:team_members(name)
    `,
    )
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAttachmentsForEntity]", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    filename: row.filename,
    file_size_bytes: row.file_size_bytes,
    mime_type: row.mime_type,
    created_at: row.created_at,
    uploaded_by_name: row.uploader?.name ?? null,
  }));
}
