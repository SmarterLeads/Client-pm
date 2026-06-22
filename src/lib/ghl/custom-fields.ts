const GHL_API_BASE = (
  process.env.GHL_API_BASE_URL ?? "https://services.leadconnectorhq.com"
).replace(/\/+$/, "");
const GHL_VERSION = process.env.GHL_API_VERSION ?? "2021-07-28";

export type GhlCustomFieldDef = {
  id: string;
  name: string;
  fieldKey: string;
  dataType: string;
  /** Additional id-like values from the GHL definition payload. */
  alternateIds: string[];
};

export type GhlCustomFieldValue = {
  id?: string;
  fieldKey?: string;
  type?: string;
  fieldValue?: unknown;
  fieldValueDate?: number | string;
  fieldValueString?: string;
};

const definitionCache = new Map<string, GhlCustomFieldDef[]>();

function cacheKey(locationId: string, model: "opportunity" | "contact"): string {
  return `${locationId.trim()}:${model}`;
}

function normalizeFieldLabel(value: string): string {
  return value.trim().toLowerCase();
}

function collectAlternateIds(rec: Record<string, unknown>, primaryId: string): string[] {
  const ids = new Set<string>();
  if (primaryId) ids.add(primaryId);
  for (const key of ["fieldId", "customFieldId", "customFieldRefId", "_id"]) {
    const raw = rec[key];
    if (raw == null) continue;
    const text = String(raw).trim();
    if (text) ids.add(text);
  }
  return Array.from(ids);
}

async function ghlGet<T>(
  accessToken: string,
  locationId: string,
  path: string,
): Promise<T> {
  const loc = locationId.trim();
  const res = await fetch(`${GHL_API_BASE}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Version: GHL_VERSION,
      Accept: "application/json",
      "Location-Id": loc,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GHL ${path} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  return (await res.json()) as T;
}

/** Clears in-memory custom field definition cache (tests / fresh sync). */
export function clearGhlCustomFieldDefinitionCache(): void {
  definitionCache.clear();
}

export async function fetchLocationCustomFields(
  accessToken: string,
  locationId: string,
  model: "opportunity" | "contact",
): Promise<GhlCustomFieldDef[]> {
  const key = cacheKey(locationId, model);
  const cached = definitionCache.get(key);
  if (cached) return cached;

  const loc = encodeURIComponent(locationId.trim());
  const json = await ghlGet<{ customFields?: unknown[] }>(
    accessToken,
    locationId,
    `/locations/${loc}/customFields?model=${model}`,
  );

  const defs: GhlCustomFieldDef[] = [];
  for (const raw of json.customFields ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const rec = raw as Record<string, unknown>;
    const id = rec.id != null ? String(rec.id).trim() : "";
    if (!id) continue;
    defs.push({
      id,
      name: rec.name != null ? String(rec.name) : "",
      fieldKey: rec.fieldKey != null ? String(rec.fieldKey) : "",
      dataType: rec.dataType != null ? String(rec.dataType) : "",
      alternateIds: collectAlternateIds(rec, id),
    });
  }

  definitionCache.set(key, defs);
  return defs;
}

/** Map any known custom-field id (definition or payload) back to its definition row. */
export function buildCustomFieldDefIndex(
  defs: GhlCustomFieldDef[],
): Map<string, GhlCustomFieldDef> {
  const index = new Map<string, GhlCustomFieldDef>();
  for (const def of defs) {
    for (const id of def.alternateIds) {
      index.set(id, def);
    }
    if (def.fieldKey.trim()) {
      index.set(def.fieldKey.trim(), def);
    }
  }
  return index;
}

function extractCustomFieldValue(field: GhlCustomFieldValue): string | null {
  if (field.fieldValueDate != null && field.fieldValueDate !== "") {
    const ms = Number(field.fieldValueDate);
    if (Number.isFinite(ms)) {
      return new Date(ms).toISOString();
    }
  }

  if (field.fieldValueString != null) {
    const trimmed = field.fieldValueString.trim();
    if (trimmed.length > 0) return trimmed;
  }

  return stringifyCustomFieldValue(field.fieldValue);
}

export function getCustomFieldValue(
  customFields: unknown,
  fieldId: string,
  fieldKey?: string | null,
): string | null {
  if (!Array.isArray(customFields)) return null;
  const idNeedle = fieldId.trim();
  const keyNeedle = fieldKey?.trim() ?? "";
  if (!idNeedle && !keyNeedle) return null;

  for (const raw of customFields) {
    if (!raw || typeof raw !== "object") continue;
    const field = raw as GhlCustomFieldValue;
    const idMatch = idNeedle && String(field.id ?? "") === idNeedle;
    const keyMatch = keyNeedle && String(field.fieldKey ?? "") === keyNeedle;
    if (!idMatch && !keyMatch) continue;
    return extractCustomFieldValue(field);
  }
  return null;
}

export function getCustomFieldValueByIds(
  customFields: unknown,
  fieldIds: string[],
  fieldKey?: string | null,
): string | null {
  for (const fieldId of fieldIds) {
    const value = getCustomFieldValue(customFields, fieldId, fieldKey);
    if (value) return value;
  }
  if (fieldKey?.trim()) {
    return getCustomFieldValue(customFields, "", fieldKey);
  }
  return null;
}

function stringifyCustomFieldValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (Array.isArray(value)) {
    const parts = value
      .map((v) => stringifyCustomFieldValue(v))
      .filter((v): v is string => Boolean(v));
    return parts.length > 0 ? parts.join(", ") : null;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const nested =
      rec.value ?? rec.date ?? rec.iso ?? rec.timestamp ?? rec.fieldValue;
    if (nested != null) return stringifyCustomFieldValue(nested);
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

/** Parse GHL custom field text into ISO timestamptz (UTC) or null. */
export function parseGhlCustomFieldDate(raw: string | null | undefined): string | null {
  const text = raw?.trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const dt = new Date(text);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  if (/^\d{10,13}$/.test(text)) {
    const n = Number(text);
    const ms = text.length <= 10 ? n * 1000 : n;
    const dt = new Date(ms);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (ymd) {
    const dt = new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])));
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  const dt = new Date(text);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString();
}

export function extractGhlCustomFieldsArray(
  rec: Record<string, unknown>,
): GhlCustomFieldValue[] {
  const raw = rec.customFields ?? rec.custom_fields;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item === "object") as GhlCustomFieldValue[];
}

function definitionMatchesName(def: GhlCustomFieldDef, displayName: string): boolean {
  return normalizeFieldLabel(def.name) === normalizeFieldLabel(displayName);
}

function definitionMatchesFieldKeyHint(def: GhlCustomFieldDef, hint: string): boolean {
  const normalizedHint = normalizeFieldLabel(hint).replace(/_/g, " ");
  const fieldKey = normalizeFieldLabel(def.fieldKey);
  return fieldKey.includes(normalizedHint) || fieldKey.includes(normalizeFieldLabel(hint));
}

export type BackClinicsFieldLookup = {
  ids: string[];
  fieldKey: string | null;
};

export type BackClinicsCustomFieldKey =
  | "appointment_booked_date"
  | "customer_won_date"
  | "consultation_attended_date"
  | "utm_source"
  | "utm_medium";

function getCustomFieldDateByDefinitionName(
  customFields: GhlCustomFieldValue[],
  defIndex: Map<string, GhlCustomFieldDef>,
  displayName: string,
  fieldKeyHint: string,
  fallbackIds: string[],
  fallbackFieldKey: string | null,
): string | null {
  for (const field of customFields) {
    const payloadId = String(field.id ?? "").trim();
    if (!payloadId) continue;

    const def = defIndex.get(payloadId);
    if (
      def &&
      (definitionMatchesName(def, displayName) ||
        definitionMatchesFieldKeyHint(def, fieldKeyHint))
    ) {
      const parsed = parseGhlCustomFieldDate(extractCustomFieldValue(field));
      if (parsed) return parsed;
    }
  }

  const direct = getCustomFieldValueByIds(
    customFields,
    fallbackIds,
    fallbackFieldKey,
  );
  return parseGhlCustomFieldDate(direct);
}

function getCustomFieldStringByDefinitionName(
  customFields: GhlCustomFieldValue[],
  defIndex: Map<string, GhlCustomFieldDef>,
  displayName: string,
  fieldKeyHint: string,
  fallbackIds: string[],
  fallbackFieldKey: string | null,
): string | null {
  for (const field of customFields) {
    const payloadId = String(field.id ?? "").trim();
    if (!payloadId) continue;

    const def = defIndex.get(payloadId);
    if (
      def &&
      (definitionMatchesName(def, displayName) ||
        definitionMatchesFieldKeyHint(def, fieldKeyHint))
    ) {
      const value = extractCustomFieldValue(field);
      if (value) return value;
    }
  }

  return getCustomFieldValueByIds(customFields, fallbackIds, fallbackFieldKey);
}

export type ParsedBackClinicsCustomFields = {
  appointment_booked_date: string | null;
  customer_won_date: string | null;
  consultation_attended_date: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  custom_fields: GhlCustomFieldValue[];
};

/** @deprecated Use ParsedBackClinicsCustomFields */
export type ParsedBackClinicsCustomDates = ParsedBackClinicsCustomFields;

export function parseBackClinicsCustomFields(
  rec: Record<string, unknown>,
  fieldLookups: Record<BackClinicsCustomFieldKey, BackClinicsFieldLookup>,
  defIndex: Map<string, GhlCustomFieldDef>,
  dateDisplayNames: Record<
    "appointment_booked_date" | "customer_won_date" | "consultation_attended_date",
    string
  >,
  utmDisplayNames: Record<"utm_source" | "utm_medium", string>,
): ParsedBackClinicsCustomFields {
  const custom_fields = extractGhlCustomFieldsArray(rec);
  const readDate = (
    key: "appointment_booked_date" | "customer_won_date" | "consultation_attended_date",
  ): string | null =>
    getCustomFieldDateByDefinitionName(
      custom_fields,
      defIndex,
      dateDisplayNames[key],
      key,
      fieldLookups[key].ids,
      fieldLookups[key].fieldKey,
    );

  const readString = (key: "utm_source" | "utm_medium"): string | null =>
    getCustomFieldStringByDefinitionName(
      custom_fields,
      defIndex,
      utmDisplayNames[key],
      key,
      fieldLookups[key].ids,
      fieldLookups[key].fieldKey,
    );

  return {
    appointment_booked_date: readDate("appointment_booked_date"),
    customer_won_date: readDate("customer_won_date"),
    consultation_attended_date: readDate("consultation_attended_date"),
    utm_source: readString("utm_source"),
    utm_medium: readString("utm_medium"),
    custom_fields,
  };
}

export function parseBackClinicsCustomDates(
  rec: Record<string, unknown>,
  fieldLookups: Record<
    "appointment_booked_date" | "customer_won_date" | "consultation_attended_date",
    BackClinicsFieldLookup
  >,
  defIndex: Map<string, GhlCustomFieldDef>,
  displayNames: Record<
    "appointment_booked_date" | "customer_won_date" | "consultation_attended_date",
    string
  >,
): ParsedBackClinicsCustomFields {
  const emptyUtm: BackClinicsFieldLookup = { ids: [], fieldKey: null };
  return parseBackClinicsCustomFields(
    rec,
    {
      ...fieldLookups,
      utm_source: emptyUtm,
      utm_medium: emptyUtm,
    },
    defIndex,
    displayNames,
    { utm_source: "UTM Source", utm_medium: "UTM Medium" },
  );
}
