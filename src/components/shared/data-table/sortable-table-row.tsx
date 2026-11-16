"use client";

import { DragDropVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";

import { ActionTableRow, type ActionTableRowProps } from "./action-table-row";

export function SortableTableRow({
  id,
  rowLabel,
  ...rowProps
}: ActionTableRowProps & { id: string; rowLabel: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <ActionTableRow
      {...rowProps}
      rowRef={setNodeRef}
      rowStyle={{ transform: CSS.Translate.toString(transform), transition }}
      isDragging={isDragging}
      leadingCell={
        <TableCell className="w-12 pr-0">
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon"
            className="size-10 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label={`Mover ${rowLabel}`}
            {...attributes}
            {...listeners}
          >
            <HugeiconsIcon
              icon={DragDropVerticalIcon}
              className="size-5"
              aria-hidden="true"
            />
          </Button>
        </TableCell>
      }
    />
  );
}
