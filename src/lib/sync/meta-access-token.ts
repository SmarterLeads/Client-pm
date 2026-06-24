/** Meta Marketing API token env vars; each falls back to {@link META_FALLBACK_TOKEN_ENV}. */
export const META_FALLBACK_TOKEN_ENV = "META_ACCESS_TOKEN" as const;

export const META_ACCESS_TOKEN_SMARTER_LEADS_ENV =
  "META_ACCESS_TOKEN_SMARTER_LEADS" as const;
export const META_ACCESS_TOKEN_ZEV_MEDIA_BM1_ENV =
  "META_ACCESS_TOKEN_ZEV_MEDIA_BM1" as const;
export const META_ACCESS_TOKEN_ZEV_MEDIA_BM2_ENV =
  "META_ACCESS_TOKEN_ZEV_MEDIA_BM2" as const;
export const META_ACCESS_TOKEN_BLUE_FLAMINGO_ENV =
  "META_ACCESS_TOKEN_BLUE_FLAMINGO" as const;

type MetaTokenEnvVar =
  | typeof META_ACCESS_TOKEN_SMARTER_LEADS_ENV
  | typeof META_ACCESS_TOKEN_ZEV_MEDIA_BM1_ENV
  | typeof META_ACCESS_TOKEN_ZEV_MEDIA_BM2_ENV
  | typeof META_ACCESS_TOKEN_BLUE_FLAMINGO_ENV;

/** Client UUID prefixes (first segment) mapped to agency-specific Meta tokens. */
const META_CLIENT_TOKEN_GROUPS: ReadonlyArray<{
  envVar: MetaTokenEnvVar;
  clientIdPrefixes: readonly string[];
}> = [
  {
    envVar: META_ACCESS_TOKEN_SMARTER_LEADS_ENV,
    clientIdPrefixes: [
      "57c8204e", // Back Clinics
      "73c88145", // Felix Swim School
      "ce42155a", // Little Canadian
      "4a37f4e3", // Maxi Mind Learning
      "43ac582a", // Menopause the Musical
      "625fb1ff", // The Pet Pharmacist
    ],
  },
  {
    envVar: META_ACCESS_TOKEN_ZEV_MEDIA_BM1_ENV,
    clientIdPrefixes: ["a344a603"], // Hudson Table
  },
  {
    envVar: META_ACCESS_TOKEN_ZEV_MEDIA_BM2_ENV,
    clientIdPrefixes: [
      "3873397d", // Gili Jewels
      "95984aa0", // Rugstyling
      "1b6bda03", // Simchat Torah Challenge
      "4e863dfe", // Soroka Hospital
    ],
  },
  {
    envVar: META_ACCESS_TOKEN_BLUE_FLAMINGO_ENV,
    clientIdPrefixes: ["c806f4a3"], // Tripod Fertility
  },
];

function normalizeClientId(clientId: string): string {
  return clientId.trim().toLowerCase();
}

function readMetaTokenEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Which env var supplies the token for this client (before fallback). */
export function getMetaAccessTokenEnvVarForClient(clientId: string): string {
  const normalized = normalizeClientId(clientId);
  for (const group of META_CLIENT_TOKEN_GROUPS) {
    if (
      group.clientIdPrefixes.some((prefix) =>
        normalized.startsWith(prefix.toLowerCase()),
      )
    ) {
      return group.envVar;
    }
  }
  return META_FALLBACK_TOKEN_ENV;
}

/**
 * Meta Marketing API access token for a client.
 * Uses agency-specific env vars when mapped; falls back to META_ACCESS_TOKEN.
 */
export function getMetaAccessToken(clientId: string): string {
  const primaryEnv = getMetaAccessTokenEnvVarForClient(clientId);
  const specific = readMetaTokenEnv(primaryEnv);
  if (specific) return specific;

  const fallback = readMetaTokenEnv(META_FALLBACK_TOKEN_ENV);
  if (fallback) return fallback;

  throw new Error(
    `Missing Meta access token: set ${primaryEnv} or ${META_FALLBACK_TOKEN_ENV}`,
  );
}
