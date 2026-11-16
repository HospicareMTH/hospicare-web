"use client";

import { MoreVerticalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import type { CSSProperties, KeyboardEvent, ReactNode, Ref } from "react";

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

export type ActionTableRowProps = {
  actions: RowAction[];
  actionsLabel: string;
  isSelected: boolean;
  onSelect: () => void;
  onOpen?: () => void;
  children: ReactNode;
};

const OPEN_ROW_KEY = "Enter";

export function ActionTableRow({
  actions,
  actionsLabel,
  isSelected,
  onSelect,
  onOpen,
  children,
  rowRef,
  rowStyle,
  isDragging = false,
  leadingCell,
}: ActionTableRowProps & {
  rowRef?: Ref<HTMLTableRowElement>;
  rowStyle?: CSSProperties;
  isDragging?: boolean;
  leadingCell?: ReactNode;
}) {
  function openWithKeyboard(event: KeyboardEvent<HTMLTableRowElement>) {
    if (event.key === OPEN_ROW_KEY && event.target === event.currentTarget) {
      onOpen?.();
    }
  }

  const row = (
    <TableRow
      ref={rowRef}
      style={rowStyle}
      aria-selected={isSelected}
      data-state={isSelected ? "selected" : undefined}
      data-dragging={isDragging || undefined}
      onClick={onSelect}
      onContextMenu={onSelect}
      onDoubleClick={onOpen}
      onKeyDown={onOpen ? openWithKeyboard : undefined}
      onFocus={onOpen ? onSelect : undefined}
      tabIndex={onOpen ? 0 : undefined}
      className="h-14 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset data-[state=selected]:bg-primary/10 data-dragging:relative data-dragging:z-10 data-dragging:bg-background data-dragging:shadow-[0_8px_24px_-8px_rgb(20_33_45/0.35)]"
    >
      {leadingCell}
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
