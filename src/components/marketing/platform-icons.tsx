import type { PlatformTab } from "@/lib/queries/lead-gen-queries";

export type PlatformKey = PlatformTab | "tiktok";

const iconClass = "h-4 w-4 shrink-0";

const KNOWN_PLATFORM_LABELS: Record<PlatformKey, string> = {
  google: "Google Ads",
  meta: "Meta",
  microsoft: "Microsoft Ads",
  tiktok: "TikTok Ads",
  linkedin: "LinkedIn",
  ghl: "GoHighLevel",
};

function platformLabel(platform: PlatformKey | string): string {
  const key = platform.trim().toLowerCase();
  if (key in KNOWN_PLATFORM_LABELS) {
    return KNOWN_PLATFORM_LABELS[key as PlatformKey];
  }
  return key
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function abbreviatePlatform(platform: string): string {
  const key = platform.trim().toLowerCase();
  if (key === "ghl") return "GHL";

  const parts = key.split(/[_\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  return key.slice(0, 3).toUpperCase();
}

function renderPlatformIcon(platform: PlatformKey | string) {
  switch (platform.trim().toLowerCase()) {
    case "google":
      return <GoogleIcon className={iconClass} />;
    case "meta":
      return <MetaIcon className={iconClass} />;
    case "microsoft":
      return <MicrosoftIcon className={iconClass} />;
    case "tiktok":
      return <TikTokIcon className={iconClass} />;
    case "linkedin":
      return <LinkedInIcon className={iconClass} />;
    case "ghl":
      return <GhlIcon className={iconClass} />;
    default:
      return (
        <UnknownPlatformBadge
          platform={platform}
          className={iconClass}
        />
      );
  }
}

export function PlatformIcon({ platform }: { platform: PlatformKey | string }) {
  return renderPlatformIcon(platform);
}

export function PlatformIconRow({ keys }: { keys: PlatformTab[] }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Active platforms">
      {keys.map((k) => (
        <span
          key={k}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          title={platformLabel(k)}
        >
          {renderPlatformIcon(k)}
        </span>
      ))}
    </div>
  );
}

function TextBadgeIcon({
  className,
  label,
  background,
  fontSize = 8,
}: {
  className?: string;
  label: string;
  background: string;
  fontSize?: number;
}) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill={background} />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fill="#fff"
        fontSize={fontSize}
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

function GhlIcon({ className }: { className?: string }) {
  return (
    <TextBadgeIcon
      className={className}
      label="GHL"
      background="#16A34A"
      fontSize={7.5}
    />
  );
}

function UnknownPlatformBadge({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const abbr = abbreviatePlatform(platform);
  return (
    <TextBadgeIcon
      className={className}
      label={abbr}
      background="#71717A"
      fontSize={abbr.length > 2 ? 6.5 : 8}
    />
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
      />
    </svg>
  );
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <rect x="2" y="2" width="9" height="9" fill="#f59e0b" />
      <rect x="13" y="2" width="9" height="9" fill="#f97316" />
      <rect x="2" y="13" width="9" height="9" fill="#fb923c" />
      <rect x="13" y="13" width="9" height="9" fill="#fdba74" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#833AB4"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.194 10.125 24v-8.437H7.078v-3.49h3.047v-2.661c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.93-1.956 1.884v2.266h3.328l-.532 3.49h-2.796V24C19.612 23.194 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#0A66C2"
        d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
      />
    </svg>
  );
}
