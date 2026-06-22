import type { Json } from "@/lib/types/database";

export type GhlPipelineStageIds = {
  booked?: string;
  closed?: string;
};

export type GhlPipelineConfig = {
  pipeline_id: string;
  pipeline_name?: string;
  stages?: GhlPipelineStageIds;
  stage_labels?: Record<string, string>;
  /** Contact tag for Appointments Booked via ghl_contact_tag_events (case-insensitive). */
  booked_tag?: string;
  /** When set, Customers counts contacts with this tag (case-insensitive) by date_added. */
  closed_tag?: string;
};

/** Canonical stage name stored in ghl_opportunity_stage_history for booked appointments. */
export const BOOKED_APPOINTMENT_STAGE_NAME = "Booked Appointment";

/** Default contact tag for Appointments Booked via ghl_contact_tag_events. */
export const BOOKED_APPOINTMENT_TAG = "booked appointment";

export function bookedAppointmentTag(config: GhlPipelineConfig): string {
  return config.booked_tag?.trim() || BOOKED_APPOINTMENT_TAG;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** Parse `clients.ghl_pipeline_config` jsonb. Returns null when invalid or incomplete. */
export function parseGhlPipelineConfig(raw: Json | unknown | null | undefined): GhlPipelineConfig | null {
  if (raw == null) return null;
  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) return null;
      obj = parsed;
    } catch {
      return null;
    }
  } else if (isRecord(raw)) {
    obj = raw;
  } else {
    return null;
  }

  const pipeline_id = readString(obj, "pipeline_id");
  if (!pipeline_id) return null;

  const booked_tag = readString(obj, "booked_tag") ?? undefined;
  const closed_tag = readString(obj, "closed_tag") ?? undefined;

  let bookedStage: string | undefined;
  let closedStage: string | undefined;
  const stagesRaw = obj.stages;
  if (isRecord(stagesRaw)) {
    bookedStage = readString(stagesRaw, "booked") ?? undefined;
    closedStage = readString(stagesRaw, "closed") ?? undefined;
  }

  const hasBookedMetric = Boolean(bookedStage || booked_tag);
  const hasClosedMetric = Boolean(closedStage || closed_tag);
  if (!hasBookedMetric && !hasClosedMetric) return null;

  const pipeline_name = readString(obj, "pipeline_name") ?? undefined;

  let stage_labels: Record<string, string> | undefined;
  const labelsRaw = obj.stage_labels;
  if (isRecord(labelsRaw)) {
    stage_labels = {};
    for (const [k, v] of Object.entries(labelsRaw)) {
      if (typeof v === "string" && v.trim()) stage_labels[k] = v.trim();
    }
    if (Object.keys(stage_labels).length === 0) stage_labels = undefined;
  }

  const stages: GhlPipelineStageIds = {};
  if (bookedStage) stages.booked = bookedStage;
  if (closedStage) stages.closed = closedStage;

  return {
    pipeline_id,
    pipeline_name,
    stages: Object.keys(stages).length > 0 ? stages : undefined,
    stage_labels,
    booked_tag,
    closed_tag,
  };
}

export function stageLabel(config: GhlPipelineConfig, stageId: string | null | undefined): string {
  if (!stageId) return "Unknown";
  return config.stage_labels?.[stageId] ?? stageId;
}
