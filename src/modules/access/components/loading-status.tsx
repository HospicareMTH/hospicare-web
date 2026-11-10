export function LoadingStatus({ label }: { label: string }) {
  return (
    <p role="status" className="text-base text-muted-foreground">
      {label}
    </p>
  );
}
