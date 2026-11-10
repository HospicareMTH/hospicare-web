import Image from "next/image";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";

const LOGO_ALTERNATIVE_TEXT = "Hospice Madre Teresa";
const LOGO_WIDTH = 600;
const LOGO_HEIGHT = 116;
const LOGO_CLASS_NAME = "mx-auto h-auto w-48";

export function PublicPageFrame({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-card px-4 py-16">
      <ThemeToggle className="absolute top-4 right-4 size-11" />
      <div className="w-full max-w-sm">
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
          id={titleId}
          className="mt-12 text-center text-3xl font-semibold tracking-tight"
        >
          {title}
        </h1>

        {children}
      </div>
    </main>
  );
}
