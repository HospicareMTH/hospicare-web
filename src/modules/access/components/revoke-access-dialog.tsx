"use client";

import { type FormEvent, useState, useTransition } from "react";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { revokeUserAccessAction } from "../actions";
import {
  MAX_REVOCATION_DAYS,
  MIN_REVOCATION_DAYS,
  REVOCATION_REASON_MAX_LENGTH,
} from "../schemas";
import type { UserListItem } from "../service";
import { runAction } from "./run-action";
import {
  DIALOG_BUTTON_CLASS_NAME,
  FIELD_CONTROL_CLASS_NAME,
  SELECT_ITEM_CLASS_NAME,
  SELECT_TRIGGER_CLASS_NAME,
} from "./styles";

type DurationKind = "permanent" | "temporary";
type FieldErrors = Record<string, string[] | undefined>;

const FORM_ID = "revoke-access-form";

function isDurationKind(value: string): value is DurationKind {
  return value === "permanent" || value === "temporary";
}

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function RevokeAccessDialog({
  user,
  onClose,
}: {
  user: UserListItem;
  onClose: () => void;
}) {
  const [durationKind, setDurationKind] = useState<DurationKind>("permanent");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSaving, startSaving] = useTransition();

  function revoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = String(formData.get("reason") ?? "");
    const duration =
      durationKind === "temporary"
        ? { kind: durationKind, days: String(formData.get("days") ?? "") }
        : { kind: durationKind };

    startSaving(async () => {
      const result = await runAction(
        () => revokeUserAccessAction(user.id, { duration, reason }),
        "Acceso revocado.",
      );
      if (result?.status === "invalid") {
        setFieldErrors(result.fieldErrors);
      }
      if (result?.status === "success") {
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Revocar el acceso de {user.name}
          </DialogTitle>
          <DialogDescription className="text-base">
            No va a poder entrar y se cierran todas sus sesiones abiertas.
          </DialogDescription>
        </DialogHeader>
        <form id={FORM_ID} onSubmit={revoke} noValidate>
          <FieldGroup>
            <Field>
              <RequiredFieldLabel
                htmlFor="revocation-duration"
                className="text-base"
              >
                Duración
              </RequiredFieldLabel>
              <Select
                value={durationKind}
                onValueChange={(value) =>
                  isDurationKind(value) && setDurationKind(value)
                }
              >
                <SelectTrigger
                  id="revocation-duration"
                  className={`w-full ${SELECT_TRIGGER_CLASS_NAME}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    value="permanent"
                    className={SELECT_ITEM_CLASS_NAME}
                  >
                    Hasta que se restaure
                  </SelectItem>
                  <SelectItem
                    value="temporary"
                    className={SELECT_ITEM_CLASS_NAME}
                  >
                    Por una cantidad de días
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {durationKind === "temporary" && (
              <Field data-invalid={fieldErrors.duration ? true : undefined}>
                <RequiredFieldLabel
                  htmlFor="revocation-days"
                  className="text-base"
                >
                  Días
                </RequiredFieldLabel>
                <Input
                  id="revocation-days"
                  name="days"
                  type="number"
                  inputMode="numeric"
                  min={MIN_REVOCATION_DAYS}
                  max={MAX_REVOCATION_DAYS}
                  required
                  aria-invalid={fieldErrors.duration ? true : undefined}
                  className={`w-32 ${FIELD_CONTROL_CLASS_NAME}`}
                />
                <FieldError errors={toFieldError(fieldErrors.duration)} />
              </Field>
            )}
            <Field data-invalid={fieldErrors.reason ? true : undefined}>
              <RequiredFieldLabel
                htmlFor="revocation-reason"
                className="text-base"
              >
                Motivo
              </RequiredFieldLabel>
              <Textarea
                id="revocation-reason"
                name="reason"
                required
                maxLength={REVOCATION_REASON_MAX_LENGTH}
                aria-invalid={fieldErrors.reason ? true : undefined}
                className="min-h-24 text-base md:text-base"
              />
              <FieldError errors={toFieldError(fieldErrors.reason)} />
            </Field>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className={DIALOG_BUTTON_CLASS_NAME}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            form={FORM_ID}
            variant="destructive"
            disabled={isSaving}
            className={DIALOG_BUTTON_CLASS_NAME}
          >
            {isSaving ? "Revocando…" : "Revocar acceso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
