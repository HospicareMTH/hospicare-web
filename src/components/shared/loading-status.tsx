import { Spinner } from "@/components/ui/spinner";

export function LoadingStatus({ label }: { label: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-3 py-6 text-base text-muted-foreground"
    >
      <Spinner
        role="presentation"
        aria-hidden="true"
        className="size-5 text-primary"
      />
      {label}
    </p>
  );
}
