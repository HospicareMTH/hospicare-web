import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../schemas";
import {
  PUBLIC_FIELD_CONTROL_CLASS_NAME,
  PUBLIC_FIELD_LABEL_CLASS_NAME,
} from "./styles";

export type FieldErrors = Record<string, string[] | undefined>;

function toFieldError(messages: string[] | undefined) {
  return messages?.map((message) => ({ message }));
}

export function NewPasswordFields({
  fieldErrors,
}: {
  fieldErrors: FieldErrors;
}) {
  return (
    <>
      <Field data-invalid={fieldErrors.password ? true : undefined}>
        <RequiredFieldLabel
          htmlFor="new-password"
          className={PUBLIC_FIELD_LABEL_CLASS_NAME}
        >
          Contraseña
        </RequiredFieldLabel>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-invalid={fieldErrors.password ? true : undefined}
          aria-describedby="new-password-hint"
          className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
        />
        <p id="new-password-hint" className="text-sm text-muted-foreground">
          Al menos {PASSWORD_MIN_LENGTH} caracteres.
        </p>
        <FieldError errors={toFieldError(fieldErrors.password)} />
      </Field>
      <Field data-invalid={fieldErrors.passwordConfirmation ? true : undefined}>
        <RequiredFieldLabel
          htmlFor="password-confirmation"
          className={PUBLIC_FIELD_LABEL_CLASS_NAME}
        >
          Repetí la contraseña
        </RequiredFieldLabel>
        <Input
          id="password-confirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={fieldErrors.passwordConfirmation ? true : undefined}
          className={PUBLIC_FIELD_CONTROL_CLASS_NAME}
        />
        <FieldError errors={toFieldError(fieldErrors.passwordConfirmation)} />
      </Field>
    </>
  );
}
