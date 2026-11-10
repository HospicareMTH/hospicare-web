import Image from "next/image";

import { RequiredFieldLabel } from "@/components/shared/required-field-label";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const FOLDER_TAB_COLOR_CLASS_NAMES = [
  "bg-section-blue",
  "bg-section-green",
  "bg-section-ochre",
  "bg-section-plum",
];

const LOGO_ALTERNATIVE_TEXT = "Hospice Madre Teresa";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 116;
const LOGO_CLASS_NAME = "mx-auto h-auto w-70 max-w-full";

const FIELD_CONTROL_CLASS_NAME = "h-12 px-3.5 caret-primary md:text-base";
const FIELD_LABEL_CLASS_NAME = "text-base";

export function SignInScreen() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-muted px-4 py-20 sm:px-14 sm:py-8">
      <ThemeToggle className="absolute top-4 right-4 size-11" />
      <div className="relative w-full max-w-120">
        <div
          aria-hidden="true"
          className="absolute top-14 -right-4 flex flex-col gap-3 sm:-right-10"
        >
          {FOLDER_TAB_COLOR_CLASS_NAMES.map((colorClassName) => (
            <span
              key={colorClassName}
              className={`block h-16 w-14 rounded-r-lg sm:h-24 ${colorClassName}`}
            />
          ))}
        </div>

        <Card className="relative gap-6 p-6 shadow-[0_14px_34px_rgb(11_59_102/0.1)] sm:p-11">
          <CardHeader className="gap-7 px-0">
            <Image
              src="/hmt-logos/HMT-Logo-horizontal-azul.svg"
              alt={LOGO_ALTERNATIVE_TEXT}
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              preload
              className={`${LOGO_CLASS_NAME} dark:hidden`}
            />
            <Image
              src="/hmt-logos/HMT-Logo-horizontal-blanco.svg"
              alt={LOGO_ALTERNATIVE_TEXT}
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              className={`${LOGO_CLASS_NAME} hidden dark:block`}
            />
            <h1
              id="sign-in-title"
              className="text-center text-2xl font-semibold"
            >
              Iniciar sesión
            </h1>
          </CardHeader>

          <CardContent className="px-0">
            <form aria-labelledby="sign-in-title">
              <FieldGroup>
                <Field>
                  <RequiredFieldLabel
                    htmlFor="sign-in-email"
                    className={FIELD_LABEL_CLASS_NAME}
                  >
                    Correo electrónico
                  </RequiredFieldLabel>
                  <Input
                    id="sign-in-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    className={FIELD_CONTROL_CLASS_NAME}
                  />
                </Field>
                <Field>
                  <RequiredFieldLabel
                    htmlFor="sign-in-password"
                    className={FIELD_LABEL_CLASS_NAME}
                  >
                    Contraseña
                  </RequiredFieldLabel>
                  <Input
                    id="sign-in-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className={FIELD_CONTROL_CLASS_NAME}
                  />
                </Field>
                <Button
                  type="button"
                  className="mt-2 h-13 w-full text-lg font-semibold"
                >
                  Ingresar
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-11 text-base underline"
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
