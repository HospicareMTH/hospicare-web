"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";

import { AnnulInterviewDialog } from "./annul-interview-dialog";

export function AnnulInterviewButton({
  interviewId,
  guestFullName,
}: {
  interviewId: string;
  guestFullName: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsDialogOpen(true)}
        className={DIALOG_BUTTON_CLASS_NAME}
      >
        <HugeiconsIcon
          icon={Cancel01Icon}
          data-icon="inline-start"
          aria-hidden="true"
        />
        Anular
      </Button>
      {isDialogOpen && (
        <AnnulInterviewDialog
          interviewId={interviewId}
          guestFullName={guestFullName}
          onClose={() => setIsDialogOpen(false)}
        />
      )}
    </>
  );
}
