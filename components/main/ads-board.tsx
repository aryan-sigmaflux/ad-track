"use client";

import { startTransition, useMemo, useOptimistic, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { reorderBoard } from "@/lib/ads/actions";
import type { AdBoardColumn, AdListItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdCard } from "@/components/main/ad-card";

const COLUMNS: { id: AdBoardColumn; label: string; dot: string }[] = [
  { id: "all", label: "All ads", dot: "bg-tertiary" },
  { id: "winning", label: "Winning", dot: "bg-success" },
  { id: "losing", label: "Losing", dot: "bg-destructive" },
];
const COLUMN_IDS = COLUMNS.map((c) => c.id);

/** Ad ids per column, top to bottom. */
type BoardOrder = Record<AdBoardColumn, string[]>;

const isColumn = (id: UniqueIdentifier): id is AdBoardColumn =>
  COLUMN_IDS.includes(id as AdBoardColumn);

const findColumn = (order: BoardOrder, id: UniqueIdentifier): AdBoardColumn | null =>
  isColumn(id) ? id : (COLUMN_IDS.find((c) => order[c].includes(String(id))) ?? null);

/** Order as saved: hand-placed cards by position; unplaced ones (null) first,
 *  keeping the incoming newest-first order. */
function savedOrder(ads: AdListItem[]): BoardOrder {
  const order: BoardOrder = { all: [], winning: [], losing: [] };
  const sorted = [...ads].sort((a, b) => {
    if (a.board_position === b.board_position) return 0;
    if (a.board_position === null) return -1;
    if (b.board_position === null) return 1;
    return a.board_position - b.board_position;
  });
  for (const ad of sorted) {
    order[COLUMN_IDS.includes(ad.board_column) ? ad.board_column : "all"].push(ad.id);
  }
  return order;
}

type Props = {
  ads: AdListItem[]; // every ad, so the saved order stays complete while filtering
  visibleIds: Set<string>; // ads matching the current search / filters
  filtered: boolean;
};

/** Kanban board: every ad starts in "All ads" and can be dragged into
 *  "Winning" or "Losing" and reordered anywhere. The order is saved. */
export function AdsBoard({ ads, visibleIds, filtered }: Props) {
  const saved = useMemo(() => savedOrder(ads), [ads]);
  const byId = useMemo(() => new Map(ads.map((a) => [a.id, a])), [ads]);

  // Live order while a drag is in progress.
  const [dragOrder, setDragOrder] = useState<BoardOrder | null>(null);
  // Order shown after a drop until the save (and the data it revalidates)
  // settles; reverts to the saved order on its own if the save fails.
  const [pendingOrder, setPendingOrder] = useOptimistic<BoardOrder | null, BoardOrder>(
    null,
    (_, next) => next,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const order = dragOrder ?? pendingOrder ?? saved;

  const sensors = useSensors(
    // Small distance so a plain click still opens the ad.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Press-and-hold on touch so the page can still scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  // Resolve to the column under the pointer, then to the nearest visible card
  // in it (or the column itself when it has none).
  const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
    const col = hits.map((h) => findColumn(order, h.id)).find((c) => c !== null);
    if (!col) return [];
    const cards = order[col].filter((id) => visibleIds.has(id));
    if (cards.length === 0) return [{ id: col }];
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((c) => cards.includes(String(c.id))),
    });
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragOrder(order);
  };

  // Crossing into another column: insert above/below the hovered card.
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setDragOrder((prev) => {
      if (!prev) return prev;
      const from = findColumn(prev, active.id);
      const to = findColumn(prev, over.id);
      if (!from || !to || from === to) return prev;

      const id = String(active.id);
      const target = prev[to];
      let index = target.length;
      if (!isColumn(over.id)) {
        const overIndex = target.indexOf(String(over.id));
        const rect = active.rect.current.translated;
        const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false;
        if (overIndex >= 0) index = overIndex + (below ? 1 : 0);
      }
      return {
        ...prev,
        [from]: prev[from].filter((x) => x !== id),
        [to]: [...target.slice(0, index), id, ...target.slice(index)],
      };
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    let final = dragOrder;
    setActiveId(null);
    setDragOrder(null);
    if (!final || !over) return;

    // Reorder within the column the card ended up in.
    const id = String(active.id);
    const col = findColumn(final, id);
    if (col && over.id !== active.id && !isColumn(over.id) && findColumn(final, over.id) === col) {
      const list = final[col];
      final = { ...final, [col]: arrayMove(list, list.indexOf(id), list.indexOf(String(over.id))) };
    }

    const changed: Partial<BoardOrder> = {};
    for (const c of COLUMN_IDS) {
      const was = saved[c];
      const now = final[c];
      if (was.length !== now.length || was.some((x, i) => x !== now[i])) changed[c] = now;
    }
    if (Object.keys(changed).length === 0) return;

    const next = final;
    startTransition(async () => {
      setPendingOrder(next);
      const res = await reorderBoard(changed);
      if (!res.ok) toast.error(res.error);
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDragOrder(null);
  };

  const activeAd = activeId ? (byId.get(activeId) ?? null) : null;
  const activeColumn = activeId ? findColumn(order, activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <section className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {COLUMNS.map((col) => {
          const ids = order[col.id].filter((id) => visibleIds.has(id));
          return (
            <BoardColumn
              key={col.id}
              id={col.id}
              label={col.label}
              dot={col.dot}
              count={ids.length}
              highlight={activeColumn === col.id}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {ids.length === 0 ? (
                  <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                    {filtered ? "No matches" : col.id === "all" ? "No ads here" : "Drag ads here"}
                  </p>
                ) : (
                  ids.map((id, i) => {
                    const ad = byId.get(id);
                    return ad ? <SortableCard key={id} ad={ad} index={i} /> : null;
                  })
                )}
              </SortableContext>
            </BoardColumn>
          );
        })}
      </section>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeAd ? <AdCard ad={activeAd} overlay className="rotate-1" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  id,
  label,
  dot,
  count,
  highlight,
  children,
}: {
  id: AdBoardColumn;
  label: string;
  dot: string;
  count: number;
  highlight: boolean;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-transparent bg-secondary/60 p-2 transition-colors sm:w-[60%] md:w-auto",
        highlight && "border-brand/40 bg-secondary",
      )}
    >
      <div className="flex items-center gap-2 px-2 pb-2 pt-1">
        <span aria-hidden className={cn("size-2 rounded-full", dot)} />
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2">{children}</div>
    </div>
  );
}

// The sortable transform lives on a wrapper: the card's entrance animation
// holds its own `transform`, which would override an inline one.
function SortableCard({ ad, index }: { ad: AdListItem; index: number }) {
  const { setNodeRef, listeners, transform, transition, isDragging } = useSortable({ id: ad.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="touch-manipulation select-none"
      {...listeners}
    >
      <AdCard ad={ad} index={index} className={cn(isDragging && "opacity-40")} />
    </div>
  );
}
