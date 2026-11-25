"use client";

import { PlusSignIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";

import type { CamEvaluationInput } from "../schemas";
import {
  CamEvaluationDialog,
  type CamEvaluationDialogMode,
} from "./cam-evaluation-dialog";

const BUTTON_CONTENT = {
  create: { label: "Cargar evaluación CAM", icon: PlusSignIcon },
  update: { label: "Modificar", icon: PencilEdit02Icon },
} as const;

export function CamEvaluationButton({
  guestId,
  guestFullName,
  mode,
  initialEvaluation,
  today,
}: {
  guestId: string;
  guestFullName: string;
  mode: CamEvaluationDialogMode;
  initialEvaluation: CamEvaluationInput;
  today: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const content = BUTTON_CONTENT[mode.kind];
  return (
    <>
      <Button
        variant={mode.kind === "create" ? "default" : "outline"}
        className={DIALOG_BUTTON_CLASS_NAME}
        onClick={() => setIsOpen(true)}
      >
        <HugeiconsIcon
          icon={content.icon}
          data-icon="inline-start"
          aria-hidden="true"
        />
        {content.label}
      </Button>
      {isOpen && (
        <CamEvaluationDialog
          guestId={guestId}
          guestFullName={guestFullName}
          mode={mode}
          initialEvaluation={initialEvaluation}
          today={today}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
