"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { largeArtwork, mediumArtwork, originalArtwork } from "@/lib/soundcloud-utils";

interface ArtworkImageProps {
  /** The source artwork URL (any SoundCloud size suffix — will be upgraded). */
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Size variant: "medium" (t300x300, default), "large" (t500x500), "original" (full res). */
  size?: "medium" | "large" | "original";
  /** Fallback gradient classes when no image or image fails to load. */
  fallbackClassName?: string;
  /** Whether to show a subtle skeleton while loading. */
  showSkeleton?: boolean;
  /** Referrer policy — defaults to "no-referrer" to avoid SoundCloud hotlink blocking. */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * ArtworkImage — a robust <img> wrapper for SoundCloud artwork.
 *
 * Features:
 *  - Upgrades the source URL to the requested size variant.
 *  - Shows a skeleton placeholder while loading.
 *  - Falls back to a gradient + initial letter if the image fails to load
 *    (e.g. 404, network error, CORS block).
 *  - Retries once with the original (un-upgraded) URL if the upgraded URL fails.
 *  - Uses referrerPolicy="no-referrer" by default to avoid hotlink blocking.
 *
 * Implementation note: the inner <ImgWithFallback> component uses a `key`
 * prop tied to the source URL so React remounts it (resetting its internal
 * loaded/error state) whenever the source changes — this avoids
 * setState-in-effect lint warnings.
 */
export function ArtworkImage({
  src,
  alt,
  className,
  size = "medium",
  fallbackClassName,
  showSkeleton = true,
  referrerPolicy = "no-referrer",
}: ArtworkImageProps) {
  // Compute the best URL for the requested size (memoized).
  const upgradedUrl = useMemo(() => {
    if (!src) return null;
    if (size === "original") return originalArtwork(src);
    if (size === "large") return largeArtwork(src);
    return mediumArtwork(src);
  }, [src, size]);

  if (!upgradedUrl) {
    return <Fallback alt={alt} className={className} fallbackClassName={fallbackClassName} />;
  }

  return (
    <ImgWithFallback
      key={upgradedUrl}
      primaryUrl={upgradedUrl}
      fallbackUrl={src ?? upgradedUrl}
      alt={alt}
      className={className}
      showSkeleton={showSkeleton}
      referrerPolicy={referrerPolicy}
      fallbackClassName={fallbackClassName}
    />
  );
}

function Fallback({
  alt,
  className,
  fallbackClassName,
}: {
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <div
      className={cn(
        "w-full h-full bg-gradient-to-br from-[var(--theme-accent)]/20 to-[#1a1a1a] flex items-center justify-center",
        fallbackClassName,
        className
      )}
      aria-label={alt}
      role="img"
    >
      <span className="text-2xl font-bold text-[var(--theme-accent)]/40 select-none">
        {alt?.charAt(0)?.toUpperCase() || "♪"}
      </span>
    </div>
  );
}

function ImgWithFallback({
  primaryUrl,
  fallbackUrl,
  alt,
  className,
  showSkeleton,
  referrerPolicy,
  fallbackClassName,
}: {
  primaryUrl: string;
  fallbackUrl: string;
  alt: string;
  className?: string;
  showSkeleton: boolean;
  referrerPolicy: React.HTMLAttributeReferrerPolicy;
  fallbackClassName?: string;
}) {
  // Try the primary URL first; if it errors, try the fallback URL; if that
  // errors too, show the gradient fallback.
  const [stage, setStage] = useState<"primary" | "fallback" | "error">("primary");
  const [loaded, setLoaded] = useState(false);

  const currentUrl = stage === "primary" ? primaryUrl : stage === "fallback" ? fallbackUrl : null;

  if (stage === "error" || !currentUrl) {
    return <Fallback alt={alt} className={className} fallbackClassName={fallbackClassName} />;
  }

  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      {showSkeleton && !loaded && (
        <div className="absolute inset-0 bg-[#1a1a1a] animate-pulse" />
      )}
      <img
        src={currentUrl}
        alt={alt}
        loading="lazy"
        referrerPolicy={referrerPolicy}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (stage === "primary" && fallbackUrl && fallbackUrl !== primaryUrl) {
            setStage("fallback");
            setLoaded(false);
          } else {
            setStage("error");
          }
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
