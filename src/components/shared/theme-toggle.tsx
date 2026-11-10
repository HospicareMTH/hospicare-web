"use client";

import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const DARK_THEME = "dark";
const LIGHT_THEME = "light";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  function switchTheme() {
    setTheme(resolvedTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      aria-label="Cambiar entre modo claro y oscuro"
      onClick={switchTheme}
      className={className}
    >
      <HugeiconsIcon
        icon={Moon02Icon}
        className="size-6 dark:hidden"
        aria-hidden="true"
      />
      <HugeiconsIcon
        icon={Sun03Icon}
        className="hidden size-6 dark:block"
        aria-hidden="true"
      />
    </Button>
  );
}
