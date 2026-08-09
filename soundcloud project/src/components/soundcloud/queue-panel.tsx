"use client";

import { usePlayer } from "@/store/player";
import { QueueView } from "./queue-view";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueuePanelProps {
  className?: string;
}

/**
 * Slide-in queue panel that appears on the right when the user opens the queue
 * from the player. Renders the queue inside the panel.
 */
export function QueuePanel({ className }: QueuePanelProps) {
  const showQueue = usePlayer((s) => s.showQueue);
  const setShowQueue = usePlayer((s) => s.setShowQueue);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-30 transition-opacity lg:hidden",
          showQueue ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setShowQueue(false)}
      />
      <aside
        className={cn(
          "fixed lg:sticky top-0 right-0 z-40 h-full w-full sm:w-96 bg-[#0f0f0f] border-l border-[#1f1f1f] flex flex-col transition-transform duration-300",
          showQueue ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:hidden",
          className
        )}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#1f1f1f] shrink-0">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Play Queue</h2>
          <button
            onClick={() => setShowQueue(false)}
            className="p-1.5 rounded text-muted-foreground hover:text-white hover:bg-[#1f1f1f]"
            title="Close queue"
            aria-label="Close queue"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <QueueView />
        </div>
      </aside>
    </>
  );
}
