const FORMER_USER_LABEL = "una persona que ya no tiene cuenta";

export function describeRecordAuthor(name: string | null): string {
  return name ?? FORMER_USER_LABEL;
}
