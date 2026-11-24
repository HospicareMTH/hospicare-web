"use client";

import { AlertCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";

import { DateInputField, TextField } from "@/components/shared/form-fields";
import { DIALOG_BUTTON_CLASS_NAME } from "@/components/shared/form-styles";
import { runAction } from "@/components/shared/run-action";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { CatalogOptionField } from "@/modules/catalogs/components";
import {
  ADDRESS_LIMITS,
  HEALTH_INSURANCE_MEMBER_NUMBER_MAX_LENGTH,
  PERSON_NAME_LIMITS,
} from "@/platform/field-validation";

import {
  checkGuestDniAction,
  createGuestManuallyAction,
  type GuestDniCheck,
} from "../actions";
import {
  type GuestDetailsInput,
  type GuestField,
  GUESTS_PATH,
  OTHER_HOSPITALIZATION_REASON_MAX_LENGTH,
} from "../schemas";
import type { GuestCatalogFields } from "../service";

type FieldErrors = Partial<Record<string, string[]>>;

const FORM_ID_PREFIX = "guest";
const DNI_INPUT_MAX_LENGTH = 40;
const FIELD_GROUP_CLASS_NAME =
  "grid gap-x-4 gap-y-6 md:grid-cols-2 xl:grid-cols-3";
const NO_DNI_MATCHES: GuestDniCheck = {
  hasActiveGuest: false,
  hasPendingInterview: false,
};

const INVALID_FORM_MESSAGE =
  "Hay datos para corregir. Revisá los campos marcados.";

function fieldId(field: GuestField): string {
  return `${FORM_ID_PREFIX}-${field}`;
}

function toSingleSelection(optionId: string): string[] {
  return optionId ? [optionId] : [];
}

function fromSingleSelection(selectedIds: string[]): string {
  return selectedIds[0] ?? "";
}

function FormSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const titleId = `${FORM_ID_PREFIX}-${id}-title`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <FieldGroup className={FIELD_GROUP_CLASS_NAME}>{children}</FieldGroup>
    </section>
  );
}

function DniNotice({ children }: { children: ReactNode }) {
  return (
    <Alert>
      <HugeiconsIcon icon={AlertCircleIcon} aria-hidden="true" />
      <AlertDescription className="text-base">{children}</AlertDescription>
    </Alert>
  );
}

type GuestFormProps = {
  initialGuest: GuestDetailsInput;
  catalogFields: GuestCatalogFields;
  today: string;
};

// Next conserva el estado de la pantalla al salir (Activity): entrar con un clic arranca de cero.
export function GuestForm(props: GuestFormProps) {
  const { bfcacheId } = useRouter();
  return <GuestFormContent key={bfcacheId} {...props} />;
}

function GuestFormContent({
  initialGuest,
  catalogFields,
  today,
}: GuestFormProps) {
  const router = useRouter();
  const [guest, setGuest] = useState(initialGuest);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dniMatches, setDniMatches] = useState(NO_DNI_MATCHES);
  const [isSaving, startSaving] = useTransition();
  const [, startDniCheck] = useTransition();

  function update<Field extends GuestField>(
    field: Field,
    value: GuestDetailsInput[Field],
  ) {
    setGuest((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function fieldProps(field: GuestField) {
    return { id: fieldId(field), errors: fieldErrors[field] };
  }

  function checkDuplicateDni() {
    const dni = guest.dni;
    startDniCheck(async () => {
      try {
        setDniMatches(await checkGuestDniAction(dni));
      } catch (error) {
        console.error("No se pudo revisar si el DNI ya estaba cargado.", error);
        setDniMatches(NO_DNI_MATCHES);
      }
    });
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(async () => {
      const result = await runAction(
        () => createGuestManuallyAction(guest),
        (created) =>
          `Creaste el huésped con historia clínica N.° ${created.clinicalRecordNumber}.`,
      );
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
        toast.error(INVALID_FORM_MESSAGE);
      }
      if (result?.status !== "success") {
        return;
      }
      router.push(GUESTS_PATH);
    });
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-8">
      <FormSection id="personal" title="Datos personales">
        <TextField
          {...fieldProps("firstName")}
          label="Nombre"
          value={guest.firstName}
          onValueChange={(value) => update("firstName", value)}
          maxLength={PERSON_NAME_LIMITS.maxLength}
          isRequired
        />
        <TextField
          {...fieldProps("lastName")}
          label="Apellido"
          value={guest.lastName}
          onValueChange={(value) => update("lastName", value)}
          maxLength={PERSON_NAME_LIMITS.maxLength}
          isRequired
        />
        <DateInputField
          {...fieldProps("birthDate")}
          label="Fecha de nacimiento"
          value={guest.birthDate}
          onValueChange={(value) => update("birthDate", value)}
          latestIsoDate={today}
        />
        <div className="flex flex-col gap-3">
          <TextField
            {...fieldProps("dni")}
            label="DNI"
            value={guest.dni}
            onValueChange={(value) => {
              update("dni", value);
              setDniMatches(NO_DNI_MATCHES);
            }}
            onBlur={checkDuplicateDni}
            maxLength={DNI_INPUT_MAX_LENGTH}
            isRequired
          />
          {dniMatches.hasActiveGuest && (
            <DniNotice>
              Ya hay otro huésped vigente con este DNI. Revisá que no sea la
              misma persona antes de guardar.
            </DniNotice>
          )}
          {dniMatches.hasPendingInterview && (
            <DniNotice>
              Hay una entrevista de admisión con este DNI que todavía no se
              aceptó. Si es la misma persona, aceptá esa entrevista en lugar de
              crear el huésped sin entrevista.
            </DniNotice>
          )}
        </div>
        <TextField
          {...fieldProps("address")}
          label="Dirección"
          value={guest.address}
          onValueChange={(value) => update("address", value)}
          maxLength={ADDRESS_LIMITS.maxLength}
          isRequired
          className="md:col-span-2"
        />
        <CatalogOptionField
          {...fieldProps("healthInsuranceOptionId")}
          label="Obra social"
          catalogField={catalogFields.healthInsurance}
          selectionMode="single"
          value={toSingleSelection(guest.healthInsuranceOptionId)}
          onValueChange={(selectedIds) =>
            update("healthInsuranceOptionId", fromSingleSelection(selectedIds))
          }
        />
        <TextField
          {...fieldProps("healthInsuranceMemberNumber")}
          label="Número de afiliado"
          value={guest.healthInsuranceMemberNumber}
          onValueChange={(value) =>
            update("healthInsuranceMemberNumber", value)
          }
          maxLength={HEALTH_INSURANCE_MEMBER_NUMBER_MAX_LENGTH}
        />
      </FormSection>

      <FormSection id="hospitalization" title="Internación">
        <DateInputField
          {...fieldProps("hospitalizationDate")}
          label="Fecha de internación"
          value={guest.hospitalizationDate}
          onValueChange={(value) => update("hospitalizationDate", value)}
          latestIsoDate={today}
        />
        <CatalogOptionField
          {...fieldProps("hospitalizationReasonOptionIds")}
          label="Motivos de internación"
          catalogField={catalogFields.hospitalizationReason}
          selectionMode="multiple"
          value={guest.hospitalizationReasonOptionIds}
          onValueChange={(selectedIds) =>
            update("hospitalizationReasonOptionIds", selectedIds)
          }
          className="md:col-span-full"
        />
        <TextField
          {...fieldProps("otherHospitalizationReason")}
          label="Otro motivo de internación"
          value={guest.otherHospitalizationReason}
          onValueChange={(value) => update("otherHospitalizationReason", value)}
          maxLength={OTHER_HOSPITALIZATION_REASON_MAX_LENGTH}
          isMultiline
          className="md:col-span-full"
        />
        <CatalogOptionField
          {...fieldProps("uncontrolledSymptomOptionIds")}
          label="Síntomas no controlados"
          catalogField={catalogFields.uncontrolledSymptom}
          selectionMode="multiple"
          value={guest.uncontrolledSymptomOptionIds}
          onValueChange={(selectedIds) =>
            update("uncontrolledSymptomOptionIds", selectedIds)
          }
          className="md:col-span-full"
        />
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button asChild variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
          <Link href={GUESTS_PATH}>Cancelar</Link>
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className={DIALOG_BUTTON_CLASS_NAME}
        >
          {isSaving ? "Guardando…" : "Guardar huésped"}
        </Button>
      </div>
    </form>
  );
}
