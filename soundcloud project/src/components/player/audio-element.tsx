"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/store/player";
import type { ScTrack } from "@/lib/soundcloud-utils";

/**
 * HiddenAudioElement — renders a single <audio> tag bound to the player store.
 * All other components read state from the store; this component is the
 * single source of truth for the actual audio playback.
 *
 * Also implements continuous autoplay: when a track ends and the queue is
 * exhausted (and `autoplay` is on), we fetch related tracks via /api/related
 * and append them to the queue before continuing playback.
 */
export function HiddenAudioElement() {
  const ref = useRef<HTMLAudioElement | null>(null);
  // Guard so we don't trigger multiple related-fetches for the same track end.
  const fetchingAutoplayRef = useRef(false);

  const currentIndex = usePlayer((s) => s.currentIndex);
  const queue = usePlayer((s) => s.queue);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const currentTime = usePlayer((s) => s.currentTime);

  const cacheStreamUrl = usePlayer((s) => s.cacheStreamUrl);
  const streamUrlCache = usePlayer((s) => s.streamUrlCache);
  const setTime = usePlayer((s) => s.setTime);
  const setDuration = usePlayer((s) => s.setDuration);
  const pause = usePlayer((s) => s.pause);
  const next = usePlayer((s) => s.next);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  // Resolve stream URL when track changes
  const resolvedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!track) {
      resolvedUrlRef.current = null;
      return;
    }
    let cancelled = false;
    const cached = streamUrlCache[track.id];
    if (cached) {
      resolvedUrlRef.current = cached;
      if (ref.current) ref.current.src = cached;
      return;
    }
    resolvedUrlRef.current = null;
    fetch(`/api/stream/${track.id}?json=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { url: string }) => {
        if (cancelled || !data.url) return;
        cacheStreamUrl(track.id, data.url);
        resolvedUrlRef.current = data.url;
        if (ref.current) {
          ref.current.src = data.url;
          if (usePlayer.getState().isPlaying) {
            ref.current.play().catch(() => {});
          }
        }
      })
      .catch((e) => {
        console.error("[audio] failed to resolve stream URL for", track.id, e);
      });
    return () => {
      cancelled = true;
    };
  }, [track?.id]);

  // Sync play/pause
  useEffect(() => {
    const el = ref.current;
    if (!el || !resolvedUrlRef.current) return;
    if (isPlaying) {
      el.play().catch((e) => {
        console.warn("[audio] play() blocked:", e);
      });
    } else {
      el.pause();
    }
  }, [isPlaying, track?.id]);

  // Sync volume
  useEffect(() => {
    if (ref.current) {
      ref.current.volume = volume;
      ref.current.muted = muted;
    }
  }, [volume, muted]);

  // Sync external seeks
  const lastSeekRef = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (Math.abs(el.currentTime - currentTime) > 0.5) {
      lastSeekRef.current = currentTime;
      el.currentTime = currentTime;
    }
  }, [currentTime]);

  // Continuous autoplay: when track ends and queue is exhausted, fetch related
  // tracks for the just-played track and continue playing.
  const handleEnded = async () => {
    const state = usePlayer.getState();
    const { autoplay, queue: q, currentIndex: ci, repeat, addManyToQueue, next: goNext } = state;

    // If repeat === "one" or queue has more tracks, just go next.
    if (repeat === "one") {
      goNext();
      return;
    }
    const isLast = ci >= q.length - 1;
    if (!isLast || repeat === "all") {
      goNext();
      return;
    }
    // Queue exhausted — fetch related tracks if autoplay is on.
    if (!autoplay) {
      pause();
      return;
    }
    if (fetchingAutoplayRef.current) return;
    fetchingAutoplayRef.current = true;
    try {
      const current = q[ci];
      if (!current) {
        pause();
        return;
      }
      // Fetch related tracks via our API
      const res = await fetch(`/api/related/${current.id}?limit=10`);
      if (!res.ok) throw new Error("related fetch failed");
      const data = (await res.json()) as { tracks: ScTrack[] };
      // Filter out the current track and any track already in the queue.
      const existingIds = new Set(q.map((t) => t.id));
      const fresh = (data.tracks ?? []).filter(
        (t) => t && t.id !== current.id && !existingIds.has(t.id)
      );
      if (fresh.length === 0) {
        // No related tracks available — give up gracefully.
        pause();
        return;
      }
      // Append to queue, then advance.
      addManyToQueue(fresh);
      // The next() action will pick the new index automatically.
      goNext();
    } catch (e) {
      console.error("[audio] autoplay fetch failed:", e);
      pause();
    } finally {
      fetchingAutoplayRef.current = false;
    }
  };

  return (
    <audio
      ref={ref}
      onTimeUpdate={(e) => {
        const t = (e.target as HTMLAudioElement).currentTime;
        if (Math.abs(t - lastSeekRef.current) < 0.25) return;
        setTime(t);
      }}
      onLoadedMetadata={(e) => {
        const d = (e.target as HTMLAudioElement).duration;
        if (Number.isFinite(d)) setDuration(d);
      }}
      onEnded={handleEnded}
      onError={(e) => {
        console.error("[audio] error", e, (e.target as HTMLAudioElement).error);
        pause();
      }}
      preload="auto"
      crossOrigin="anonymous"
    />
  );
}
