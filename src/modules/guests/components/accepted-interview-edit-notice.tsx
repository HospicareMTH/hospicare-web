import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { findGuestOfInterview } from "../service";

export async function AcceptedInterviewEditNotice({
  interviewId,
}: {
  interviewId: string;
}) {
  const guest = await findGuestOfInterview(interviewId);
  if (!guest) {
    return null;
  }

  return (
    <Alert>
      <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
      <AlertDescription className="text-base">
        Esta entrevista ya se aceptó. Los cambios que guardes acá no se pasan a
        los datos del huésped.
      </AlertDescription>
    </Alert>
  );
}
