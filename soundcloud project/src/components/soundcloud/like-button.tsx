"use client";

import { Heart } from "lucide-react";
import { useLibrary } from "@/store/library";
import type { ScTrack } from "@/lib/soundcloud-utils";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  track: ScTrack;
  size?: number;
  className?: string;
}

export function LikeButton({ track, size = 18, className }: LikeButtonProps) {
  const isLiked = useLibrary((s) => s.likedTrackIds.includes(track.id));
  const toggleLike = useLibrary((s) => s.toggleLike);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleLike(track);
      }}
      className={cn(
        "p-2 rounded-full transition-colors hover:bg-[#1f1f1f]",
        isLiked ? "text-[var(--theme-accent)]" : "text-muted-foreground hover:text-white",
        className
      )}
      title={isLiked ? "Unlike" : "Like"}
      aria-label={isLiked ? "Unlike" : "Like"}
      aria-pressed={isLiked}
    >
      <Heart
        className="size-4"
        style={{ width: size, height: size }}
        fill={isLiked ? "currentColor" : "none"}
      />
    </button>
  );
}
