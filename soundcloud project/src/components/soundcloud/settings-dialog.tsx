"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlayer } from "@/store/player";
import { cn } from "@/lib/utils";
import { BackupRestore } from "./backup-restore";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const backgroundBlur = usePlayer((s) => s.backgroundBlur);
  const backgroundOverlay = usePlayer((s) => s.backgroundOverlay);
  const setBackgroundBlur = usePlayer((s) => s.setBackgroundBlur);
  const setBackgroundOverlay = usePlayer((s) => s.setBackgroundOverlay);
  const dynamicTheme = usePlayer((s) => s.dynamicTheme);
  const setDynamicTheme = usePlayer((s) => s.setDynamicTheme);
  const themeColor = usePlayer((s) => s.themeColor);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Dynamic theming */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium">
                  Dynamic theme color
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Extracts the dominant color from the current track&apos;s
                  cover art and applies it as the app&apos;s accent color.
                </p>
              </div>
              <Switch
                checked={dynamicTheme}
                onCheckedChange={setDynamicTheme}
                aria-label="Toggle dynamic theme"
              />
            </div>
            {/* Show the current extracted color */}
            {dynamicTheme && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Current color:</span>
                <div
                  className="size-5 rounded border border-[#2a2a2a]"
                  style={{
                    backgroundColor: themeColor || "var(--theme-accent)",
                  }}
                />
                <span className="font-mono text-muted-foreground">
                  {themeColor || "default"}
                </span>
              </div>
            )}
          </div>

          {/* Background blur setting */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">
                Player background blur
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Blurs the current track&apos;s artwork as a background behind the
                large player bar. Set to 0 for a solid dark background.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={120}
                step={1}
                value={backgroundBlur}
                onChange={(e) => setBackgroundBlur(Number(e.target.value))}
                className="flex-1 accent-[var(--theme-accent)] cursor-pointer"
                aria-label="Background blur amount"
              />
              <span className="text-sm tabular-nums text-muted-foreground w-16 text-right">
                {backgroundBlur}px
              </span>
            </div>
            {/* Quick preset buttons */}
            <div className="flex gap-1.5">
              {[
                { label: "Off", value: 0 },
                { label: "Light", value: 20 },
                { label: "Medium", value: 40 },
                { label: "Heavy", value: 80 },
              ].map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setBackgroundBlur(preset.value)}
                  className={cn(
                    "px-2.5 py-1 rounded text-xs font-medium transition-colors",
                    backgroundBlur === preset.value
                      ? "bg-[var(--theme-accent)] text-white"
                      : "bg-[#0a0a0a] text-muted-foreground hover:text-white border border-[#2a2a2a]"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background overlay opacity */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">
                Background darkness
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Controls how dark the overlay on the blurred background is.
                Higher = darker (better text readability), lower = more artwork
                visible.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={backgroundOverlay}
                onChange={(e) => setBackgroundOverlay(Number(e.target.value))}
                className="flex-1 accent-[var(--theme-accent)] cursor-pointer"
                aria-label="Background overlay opacity"
              />
              <span className="text-sm tabular-nums text-muted-foreground w-16 text-right">
                {Math.round(backgroundOverlay * 100)}%
              </span>
            </div>
          </div>

          {/* Backup & restore */}
          <BackupRestore />
        </div>

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[var(--theme-accent)] hover:bg-[var(--theme-accent-hover)] text-white"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
