import {
  buildCustomFieldDefIndex,
  type BackClinicsFieldLookup,
  type GhlCustomFieldDef,
} from "@/lib/ghl/custom-fields";

export const BACK_CLINICS_CLIENT_ID = "57c8204e-83cc-45cb-ba7f-5cc8f5832024";
export const BACK_CLINICS_LOCATION_ID = "OoAseB5rcVPKhbsxvQyA";

export type BackClinicsDateFieldKey =
  | "appointment_booked_date"
  | "customer_won_date"
  | "consultation_attended_date";

export type BackClinicsUtmFieldKey = "utm_source" | "utm_medium";

export type BackClinicsCustomFieldKey = BackClinicsDateFieldKey | BackClinicsUtmFieldKey;

export const BACK_CLINICS_DATE_FIELD_NAMES: Record<BackClinicsDateFieldKey, string> =
  {
    appointment_booked_date: "Appointment Booked Date",
    customer_won_date: "Customer Won Date",
    consultation_attended_date: "Consultation Attended Date",
  };

/** @deprecated Use BACK_CLINICS_DATE_FIELD_NAMES */
export const BACK_CLINICS_CUSTOM_FIELD_NAMES = BACK_CLINICS_DATE_FIELD_NAMES;

/** GHL API field names + fieldKeys (confirmed via /locations/.../customFields). */
export const BACK_CLINICS_UTM_FIELD_RESOLUTION = {
  contact: {
    utm_source: { name: "UTM Source", fieldKey: "contact.utm_source" },
    utm_medium: { name: "UTM Medium", fieldKey: "contact.utm_medium" },
  },
  opportunity: {
    utm_source: { name: "utm source", fieldKey: "opportunity.utm_source" },
    utm_medium: { name: "UTM-Medium", fieldKey: "opportunity.utmmedium" },
  },
} as const;

export type BackClinicsFieldIdMap = Record<
  BackClinicsCustomFieldKey,
  BackClinicsFieldLookup
>;

export type BackClinicsCustomFieldConfig = {
  location_id: string;
  opportunity: BackClinicsFieldIdMap;
  contact: BackClinicsFieldIdMap;
  opportunityDefIndex: Map<string, GhlCustomFieldDef>;
  contactDefIndex: Map<string, GhlCustomFieldDef>;
};

const EMPTY_LOOKUP: BackClinicsFieldLookup = { ids: [], fieldKey: null };

export const BACK_CLINICS_CUSTOM_FIELDS: BackClinicsCustomFieldConfig = {
  location_id: BACK_CLINICS_LOCATION_ID,
  opportunity: {
    appointment_booked_date: { ...EMPTY_LOOKUP },
    customer_won_date: { ...EMPTY_LOOKUP },
    consultation_attended_date: { ...EMPTY_LOOKUP },
    utm_source: { ...EMPTY_LOOKUP },
    utm_medium: { ...EMPTY_LOOKUP },
  },
  contact: {
    appointment_booked_date: { ...EMPTY_LOOKUP },
    customer_won_date: { ...EMPTY_LOOKUP },
    consultation_attended_date: { ...EMPTY_LOOKUP },
    utm_source: { ...EMPTY_LOOKUP },
    utm_medium: { ...EMPTY_LOOKUP },
  },
  opportunityDefIndex: new Map(),
  contactDefIndex: new Map(),
};

function normalizeFieldName(name: string): string {
  return name.trim().toLowerCase();
}

function normalizeFieldKeyHint(key: string): string {
  return key.replace(/_/g, " ");
}

function findFieldLookup(
  defs: GhlCustomFieldDef[],
  displayName: string,
  fieldKeyHint: string,
  exactFieldKey?: string,
): BackClinicsFieldLookup {
  const ids = new Set<string>();
  let fieldKey: string | null = null;
  const needle = normalizeFieldName(displayName);
  const keyHint = normalizeFieldName(fieldKeyHint);
  const keyHintSpaced = normalizeFieldKeyHint(fieldKeyHint);
  const exactKey = exactFieldKey?.trim() ? normalizeFieldName(exactFieldKey) : null;

  for (const def of defs) {
    const nameMatch = normalizeFieldName(def.name) === needle;
    const fieldKeyMatch =
      normalizeFieldName(def.fieldKey).includes(keyHint) ||
      normalizeFieldName(def.fieldKey).includes(keyHintSpaced);
    const exactFieldKeyMatch =
      exactKey != null && normalizeFieldName(def.fieldKey) === exactKey;
    if (!nameMatch && !fieldKeyMatch && !exactFieldKeyMatch) continue;

    for (const id of def.alternateIds) ids.add(id);
    if (!fieldKey && def.fieldKey.trim()) {
      fieldKey = def.fieldKey.trim();
    }
  }

  return {
    ids: Array.from(ids),
    fieldKey,
  };
}

export function logBackClinicsFieldDefinitions(
  contactDefs: GhlCustomFieldDef[],
  opportunityDefs: GhlCustomFieldDef[],
): void {
  console.log(
    "[BackClinics] contact field definitions:",
    JSON.stringify(
      contactDefs.map((def) => ({
        id: def.id,
        name: def.name,
        fieldKey: def.fieldKey,
        dataType: def.dataType,
      })),
    ),
  );
  console.log(
    "[BackClinics] opportunity field definitions:",
    JSON.stringify(
      opportunityDefs.map((def) => ({
        id: def.id,
        name: def.name,
        fieldKey: def.fieldKey,
        dataType: def.dataType,
      })),
    ),
  );
}

export function resolveBackClinicsFieldIds(
  opportunityDefs: GhlCustomFieldDef[],
  contactDefs: GhlCustomFieldDef[],
): BackClinicsCustomFieldConfig {
  const opportunity = { ...BACK_CLINICS_CUSTOM_FIELDS.opportunity };
  const contact = { ...BACK_CLINICS_CUSTOM_FIELDS.contact };

  for (const key of Object.keys(
    BACK_CLINICS_DATE_FIELD_NAMES,
  ) as BackClinicsDateFieldKey[]) {
    const label = BACK_CLINICS_DATE_FIELD_NAMES[key];
    opportunity[key] = findFieldLookup(opportunityDefs, label, key);
    contact[key] = findFieldLookup(contactDefs, label, key);
  }

  for (const key of Object.keys(BACK_CLINICS_UTM_FIELD_RESOLUTION.contact) as BackClinicsUtmFieldKey[]) {
    const spec = BACK_CLINICS_UTM_FIELD_RESOLUTION.contact[key];
    contact[key] = findFieldLookup(
      contactDefs,
      spec.name,
      key,
      spec.fieldKey,
    );
  }

  for (const key of Object.keys(
    BACK_CLINICS_UTM_FIELD_RESOLUTION.opportunity,
  ) as BackClinicsUtmFieldKey[]) {
    const spec = BACK_CLINICS_UTM_FIELD_RESOLUTION.opportunity[key];
    opportunity[key] = findFieldLookup(
      opportunityDefs,
      spec.name,
      key,
      spec.fieldKey,
    );
  }

  return {
    location_id: BACK_CLINICS_LOCATION_ID,
    opportunity,
    contact,
    opportunityDefIndex: buildCustomFieldDefIndex(opportunityDefs),
    contactDefIndex: buildCustomFieldDefIndex(contactDefs),
  };
}

export function isBackClinicsGhlSync(
  clientId: string,
  locationId: string,
): boolean {
  return (
    clientId === BACK_CLINICS_CLIENT_ID &&
    locationId.trim() === BACK_CLINICS_LOCATION_ID
  );
}

/** Map raw UTM source/medium pairs to a display label for reporting. */
export function normalizeBackClinicsSource(
  utmSource: string | null,
  utmMedium: string | null,
): string {
  const src = utmSource?.toLowerCase().trim() ?? "";
  const med = utmMedium?.toLowerCase().trim() ?? "";

  if (
    (src === "google" || src === "adwords" || src === "google.com") &&
    (med === "cpc" || med === "ppc")
  ) {
    return "Google Ads";
  }

  if (
    (src === "google" || src === "google.com" || src === "google local listing") &&
    med === "organic"
  ) {
    return "Google Organic";
  }

  if (
    src === "google" ||
    src === "adwords" ||
    src === "google.com" ||
    src === "google local listing"
  ) {
    return "Google";
  }

  if (src === "facebook" || src === "fb") return "Facebook/Meta";

  if (src === "bing" || src === "microsoft") return "Microsoft/Bing";

  if (src === "direct" || src === "(direct)") return "Direct";

  if (!src) return "Unknown";

  return "Other";
}
