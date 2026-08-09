"use client";

import { usePlayer } from "@/store/player";
import { TrackRow } from "./track-row";
import { Trash2, X, ListMusic, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { ScTrack } from "@/lib/soundcloud-utils";

export function QueueView() {
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.currentIndex);
  const clearQueue = usePlayer((s) => s.clearQueue);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const moveQueueItem = usePlayer((s) => s.moveQueueItem);

  // Use both PointerSensor (desktop) and TouchSensor (mobile).
  // Activation constraints require some movement so taps/clicks on rows
  // don't accidentally start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.findIndex((t) => String(t.id) === active.id);
    const to = queue.findIndex((t) => String(t.id) === over.id);
    if (from < 0 || to < 0) return;
    moveQueueItem(from, to);
  };

  if (queue.length === 0) {
    return (
      <div className="text-center py-16">
        <ListMusic className="size-12 mx-auto mb-3 text-muted-foreground opacity-50" />
        <h3 className="text-base font-semibold text-white mb-1">Your queue is empty</h3>
        <p className="text-sm text-muted-foreground">
          Play a track or add songs to the queue to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-white">Play Queue</h2>
          <p className="text-xs text-muted-foreground">{queue.length} tracks queued</p>
        </div>
        <button
          onClick={() => {
            if (confirm("Clear the entire queue?")) clearQueue();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-muted-foreground hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
        >
          <Trash2 className="size-3.5" />
          Clear all
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={queue.map((t) => String(t.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {queue.map((track, index) => (
              <SortableQueueRow
                key={`${track.id}-${index}`}
                track={track}
                index={index}
                isCurrent={index === currentIndex}
                onRemove={() => removeFromQueue(index)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

interface SortableQueueRowProps {
  track: ScTrack;
  index: number;
  isCurrent: boolean;
  onRemove: () => void;
}

function SortableQueueRow({ track, index, isCurrent, onRemove }: SortableQueueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(track.id),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group grid grid-cols-[auto_1fr_auto] gap-2 items-center px-2 sm:px-3 py-2 rounded-md hover:bg-[#1a1a1a] transition-colors",
        isCurrent && "bg-[#1a1a1a]",
        isDragging && "ring-1 ring-[var(--theme-accent)] bg-[#1a1a1a]"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-white cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <TrackRow
          track={track}
          index={index}
          inQueue
          showArtwork
          showIndex={false}
          showPlays={false}
          className="hover:bg-transparent px-0 py-0"
        />
      </div>

      {/* Always visible remove button on mobile; hover-only on desktop */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded text-muted-foreground hover:text-red-400 hover:bg-[#2a2a2a] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
        aria-label="Remove from queue"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

// Re-export arrayMove so tree-shaking doesn't drop it; harmless if unused.
export { arrayMove };
