export const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${timeFormatter.format(date)}`;
}

const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getBusinessDate(instant: Date): string {
  return businessDateFormatter.format(instant);
}

export function isAfterBusinessToday(
  isoDate: string,
  now: Date = new Date(),
): boolean {
  return isoDate > getBusinessDate(now);
}

const SEPARATED_DISPLAY_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const COMPACT_DISPLAY_DATE = /^(\d{2})(\d{2})(\d{4})$/;

function isCalendarDate(isoDate: string): boolean {
  const instant = new Date(`${isoDate}T00:00:00Z`);
  return (
    !Number.isNaN(instant.getTime()) &&
    instant.toISOString().startsWith(isoDate)
  );
}

export function parseDisplayDate(text: string): string | null {
  const trimmedText = text.trim();
  const match =
    SEPARATED_DISPLAY_DATE.exec(trimmedText) ??
    COMPACT_DISPLAY_DATE.exec(trimmedText);
  const [, day, month, year] = match ?? [];
  if (!day || !month || !year) {
    return null;
  }
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isCalendarDate(isoDate) ? isoDate : null;
}
