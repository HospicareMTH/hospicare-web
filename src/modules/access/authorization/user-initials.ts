const MAXIMUM_INITIALS = 2;

export function getUserInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAXIMUM_INITIALS)
    .map((word) => word.charAt(0).toLocaleUpperCase("es-AR"))
    .join("");
}
