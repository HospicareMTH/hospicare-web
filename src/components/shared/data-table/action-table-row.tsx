"use client";

import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";

export type RowAction = {
  label: string;
  icon: IconSvgElement;
  isDestructive: boolean;
  open: () => void;
};

const MENU_ITEM_CLASS_NAME = "h-10 text-base whitespace-nowrap";

export function ActionTableRow({
  actions,
  actionsLabel,
  isSelected,
  onSelect,
  children,
}: {
  actions: RowAction[];
  actionsLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  const row = (
    <TableRow
      aria-selected={isSelected}
      data-state={isSelected ? "selected" : undefined}
      onClick={onSelect}
      onContextMenu={onSelect}
      className="h-14 data-[state=selected]:bg-primary/10"
    >
      {children}
      <TableCell className="text-right">
        {actions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={actionsLabel}
              >
                <HugeiconsIcon
                  icon={MoreVerticalIcon}
                  className="size-5"
                  aria-hidden="true"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  variant={action.isDestructive ? "destructive" : "default"}
                  onSelect={action.open}
                  className={MENU_ITEM_CLASS_NAME}
                >
                  <HugeiconsIcon icon={action.icon} aria-hidden="true" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );

  if (actions.length === 0) {
    return row;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-52">
        {actions.map((action) => (
          <ContextMenuItem
            key={action.label}
            variant={action.isDestructive ? "destructive" : "default"}
            onSelect={action.open}
            className={MENU_ITEM_CLASS_NAME}
          >
            <HugeiconsIcon icon={action.icon} aria-hidden="true" />
            {action.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
