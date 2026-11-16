import Link from "next/link";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { ADMISSIONS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Button } from "@/components/ui/button";

import { ADMISSIONS_PATH } from "../schemas";

export function AdmissionInterviewNotFound() {
  return (
    <SectionSheet
      destination={ADMISSIONS_DESTINATION}
      title="No encontramos esta entrevista"
    >
      <p className="text-base text-muted-foreground">
        Puede que la dirección esté incompleta. Buscala desde el listado de
        Admisiones.
      </p>
      <div>
        <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
          <Link href={ADMISSIONS_PATH}>Ir a Admisiones</Link>
        </Button>
      </div>
    </SectionSheet>
  );
}
