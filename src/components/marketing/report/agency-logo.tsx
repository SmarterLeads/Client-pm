"use client";

import { useState } from "react";

type Props = {
  /** Normalized HTTPS/HTTP URL, or null to show placeholder immediately */
  src: string | null;
  agencyName: string;
  agencyPrimaryColor: string;
  /** Classes for the coloured placeholder (width/height varies by placement) */
  placeholderClassName: string;
  /** Classes for `<img>` (e.g. h-10 w-auto object-contain) */
  imgClassName: string;
};

/**
 * Logo for report chrome. Uses `referrerPolicy="no-referrer"` so CDNs that block
 * embedded referrers still deliver the asset. Falls back to the coloured bar when
 * the URL is missing or the image fails (404, CSP, corrupt file, unsupported type in-browser).
 */
export function AgencyLogo({
  src,
  agencyName,
  agencyPrimaryColor,
  placeholderClassName,
  imgClassName,
}: Props) {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <div
        className={placeholderClassName}
        style={{ backgroundColor: agencyPrimaryColor }}
        aria-label={`${agencyName} logo (unavailable)`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary agency URLs from DB
    <img
      src={src}
      alt={`${agencyName} logo`}
      className={imgClassName}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setBroken(true)}
    />
  );
}
