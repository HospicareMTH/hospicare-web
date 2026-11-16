"use client";

import {
  type Announcements,
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { type ReactNode, useId } from "react";

const POINTER_ACTIVATION_DISTANCE_IN_PIXELS = 4;

const SCREEN_READER_INSTRUCTIONS =
  "Para mover una fila, presioná espacio. Usá las flechas para cambiarla de lugar, espacio para soltarla y Escape para cancelar.";

export type RowReorder<Row> = {
  getRowLabel: (row: Row) => string;
  onMove: (rowId: string, targetRowId: string) => void;
};

function buildAnnouncements(
  describe: (id: UniqueIdentifier) => string,
): Announcements {
  return {
    onDragStart: ({ active }) => `Tomaste ${describe(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) {
        return `${describe(active.id)} está fuera de la lista.`;
      }
      if (over.id === active.id) {
        return undefined;
      }
      return `${describe(active.id)} está sobre ${describe(over.id)}.`;
    },
    onDragEnd: ({ active, over }) =>
      over
        ? `${describe(active.id)} quedó en el lugar de ${describe(over.id)}.`
        : `${describe(active.id)} volvió a su lugar.`,
    onDragCancel: ({ active }) =>
      `Cancelaste el movimiento de ${describe(active.id)}.`,
  };
}

export function SortableRowsContext<Row extends { id: string }>({
  rows,
  reorder,
  children,
}: {
  rows: Row[];
  reorder: RowReorder<Row>;
  children: ReactNode;
}) {
  const contextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE_IN_PIXELS },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  function describe(id: UniqueIdentifier): string {
    const row = rowsById.get(String(id));
    return row ? reorder.getRowLabel(row) : "la fila";
  }

  function moveDroppedRow({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) {
      return;
    }
    reorder.onMove(String(active.id), String(over.id));
  }

  return (
    <DndContext
      id={contextId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={moveDroppedRow}
      accessibility={{
        announcements: buildAnnouncements(describe),
        screenReaderInstructions: { draggable: SCREEN_READER_INSTRUCTIONS },
      }}
    >
      <SortableContext
        items={rows.map((row) => row.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}
