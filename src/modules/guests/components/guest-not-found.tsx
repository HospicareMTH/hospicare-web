import Link from "next/link";

import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { GUESTS_DESTINATION } from "@/components/shared/navigation";
import { SectionSheet } from "@/components/shared/section-sheet";
import { Button } from "@/components/ui/button";

import { GUESTS_PATH } from "../schemas";

export function GuestNotFound() {
  return (
    <SectionSheet
      destination={GUESTS_DESTINATION}
      title="No encontramos este huésped"
    >
      <p className="text-base text-muted-foreground">
        Puede que la dirección esté incompleta. Buscalo desde el listado de
        Huéspedes.
      </p>
      <div>
        <Button asChild className={DIALOG_BUTTON_CLASS_NAME}>
          <Link href={GUESTS_PATH}>Ir a Huéspedes</Link>
        </Button>
      </div>
    </SectionSheet>
  );
}
