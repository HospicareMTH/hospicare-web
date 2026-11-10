"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { type MouseEvent, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import type { ActionResult } from "../actions";
import { runAction } from "./run-action";
import { DIALOG_BUTTON_CLASS_NAME } from "./styles";

export function ConfirmActionDialog({
  icon,
  title,
  description,
  confirmLabel,
  pendingLabel,
  successMessage,
  isDestructive,
  action,
  onClose,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel: string;
  successMessage: string;
  isDestructive: boolean;
  action: () => Promise<ActionResult>;
  onClose: () => void;
}) {
  const [isRunning, startRunning] = useTransition();

  function confirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    startRunning(async () => {
      const result = await runAction(action, successMessage);
      if (result !== null) {
        onClose();
      }
    });
  }

  return (
    <AlertDialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia
            className={cn(
              isDestructive
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            <HugeiconsIcon icon={icon} aria-hidden="true" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={DIALOG_BUTTON_CLASS_NAME}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant={isDestructive ? "destructive" : "default"}
            onClick={confirm}
            disabled={isRunning}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isRunning ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
