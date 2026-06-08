export const ATTACHMENT_ENTITY_TYPES = [
  "client",
  "project",
  "task",
  "interaction",
] as const;

export type AttachmentEntityType = (typeof ATTACHMENT_ENTITY_TYPES)[number];

export function assertValidAttachmentEntityType(
  entityType: string,
): asserts entityType is AttachmentEntityType {
  if (
    !ATTACHMENT_ENTITY_TYPES.includes(entityType as AttachmentEntityType)
  ) {
    throw new Error(
      `Invalid entity_type "${entityType}". Must be one of: ${ATTACHMENT_ENTITY_TYPES.join(", ")}`,
    );
  }
}

export type AttachmentListItem = {
  id: string;
  filename: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  created_at: string;
  uploaded_by_name: string | null;
};
