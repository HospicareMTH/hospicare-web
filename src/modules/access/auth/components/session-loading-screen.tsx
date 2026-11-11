import { Spinner } from "@/components/ui/spinner";

export function SessionLoadingScreen() {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background text-lg text-foreground"
    >
      <Spinner
        role="presentation"
        aria-hidden="true"
        className="size-8 text-primary"
      />
      Cargando tu sesión…
    </div>
  );
}
