import { describeRecordAuthor } from "@/components/shared/record-author";
import { formatDateTime } from "@/platform/dates";

export function EvaluationHistory({
  createdAt,
  createdByName,
  updatedAt,
  updatedByName,
}: {
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
}) {
  const wasUpdated = updatedAt.getTime() !== createdAt.getTime();
  return (
    <p className="text-base text-muted-foreground">
      Cargada el {formatDateTime(createdAt)} por{" "}
      {describeRecordAuthor(createdByName)}.
      {wasUpdated &&
        ` Última modificación el ${formatDateTime(updatedAt)} por ${describeRecordAuthor(updatedByName)}.`}
    </p>
  );
}
