"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { es } from "react-day-picker/locale";

import { FIELD_CONTROL_CLASS_NAME } from "@/components/shared/form-styles";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatIsoDate, parseDisplayDate } from "@/platform/dates";

const DATE_PLACEHOLDER = "DD/MM/AAAA";
const EARLIEST_CALENDAR_MONTH = new Date(1900, 0, 1);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toCalendarDate(isoDate: string): Date | undefined {
  if (!ISO_DATE.test(isoDate)) {
    return undefined;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return new Date(year, month - 1, day);
}

function toIsoDate(calendarDate: Date): string {
  const month = String(calendarDate.getMonth() + 1).padStart(2, "0");
  const day = String(calendarDate.getDate()).padStart(2, "0");
  return `${calendarDate.getFullYear()}-${month}-${day}`;
}

export function DateField({
  id,
  value,
  onValueChange,
  latestIsoDate,
  isInvalid = false,
  describedBy,
}: {
  id: string;
  value: string;
  onValueChange: (isoDateOrText: string) => void;
  latestIsoDate: string;
  isInvalid?: boolean;
  describedBy?: string;
}) {
  const [text, setText] = useState(() =>
    ISO_DATE.test(value) ? formatIsoDate(value) : value,
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedDate = toCalendarDate(value);
  const latestDate = toCalendarDate(latestIsoDate);

  function changeText(nextText: string) {
    setText(nextText);
    onValueChange(parseDisplayDate(nextText) ?? nextText.trim());
  }

  function chooseDate(calendarDate: Date | undefined) {
    if (!calendarDate) {
      return;
    }
    const isoDate = toIsoDate(calendarDate);
    setText(formatIsoDate(isoDate));
    onValueChange(isoDate);
    setIsCalendarOpen(false);
  }

  return (
    <div className="flex gap-2">
      <Input
        id={id}
        value={text}
        onChange={(event) => changeText(event.target.value)}
        placeholder={DATE_PLACEHOLDER}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={isInvalid || undefined}
        aria-describedby={describedBy}
        className={FIELD_CONTROL_CLASS_NAME}
      />
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Elegir en el calendario"
            className="size-10 shrink-0"
          >
            <HugeiconsIcon icon={Calendar03Icon} aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="single"
            locale={es}
            captionLayout="dropdown"
            selected={selectedDate}
            defaultMonth={selectedDate ?? latestDate}
            startMonth={EARLIEST_CALENDAR_MONTH}
            endMonth={latestDate}
            disabled={latestDate ? { after: latestDate } : undefined}
            onSelect={chooseDate}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
