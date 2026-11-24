import { z } from "zod";

import {
  ADDRESS_LIMITS,
  dniSchema,
  HEALTH_INSURANCE_MEMBER_NUMBER_MAX_LENGTH,
  optionalOptionIdSchema,
  optionalTextSchema,
  optionIdsSchema,
  pastOrTodayDateSchema,
  PERSON_NAME_LIMITS,
  requiredTextSchema,
} from "@/platform/field-validation";
import {
  type ListQuery,
  type ListSort,
  parseListQuery,
  readSearchParam,
  type SearchParams,
} from "@/platform/list-query";

import type { GuestOrigin } from "./tables";

export const GUESTS_PATH = "/huespedes";
export const NEW_GUEST_PATH = "/huespedes/nuevo";

export function buildGuestPath(guestId: string): string {
  return `${GUESTS_PATH}/${guestId}`;
}

export function buildEditGuestPath(guestId: string): string {
  return `${buildGuestPath(guestId)}/editar`;
}

export const guestIdSchema = z.uuid();

export const GUEST_TAB_PARAMETER = "pestana";

export const GUEST_TABS = [
  "internacion",
  "evolucion-diaria",
  "evaluaciones",
] as const;

export type GuestTab = (typeof GUEST_TABS)[number];

export const DEFAULT_GUEST_TAB: GuestTab = "internacion";

export function buildGuestEvaluationsPath(guestId: string): string {
  const tabParameter: GuestTab = "evaluaciones";
  return `${buildGuestPath(guestId)}?${GUEST_TAB_PARAMETER}=${tabParameter}`;
}

export function parseGuestTab(searchParams: SearchParams): GuestTab {
  const requestedTab = readSearchParam(searchParams, GUEST_TAB_PARAMETER);
  return (
    GUEST_TABS.find((guestTab) => guestTab === requestedTab) ??
    DEFAULT_GUEST_TAB
  );
}

export const OTHER_HOSPITALIZATION_REASON_MAX_LENGTH = 500;

export const guestDetailsSchema = z.object({
  hospitalizationDate: pastOrTodayDateSchema("La fecha de internación"),
  firstName: requiredTextSchema("El nombre", PERSON_NAME_LIMITS),
  lastName: requiredTextSchema("El apellido", PERSON_NAME_LIMITS),
  birthDate: pastOrTodayDateSchema("La fecha de nacimiento"),
  dni: dniSchema,
  address: requiredTextSchema("La dirección", ADDRESS_LIMITS),
  healthInsuranceOptionId: optionalOptionIdSchema,
  healthInsuranceMemberNumber: optionalTextSchema(
    "El número de afiliado",
    HEALTH_INSURANCE_MEMBER_NUMBER_MAX_LENGTH,
  ),
  hospitalizationReasonOptionIds: optionIdsSchema,
  otherHospitalizationReason: optionalTextSchema(
    "El otro motivo de internación",
    OTHER_HOSPITALIZATION_REASON_MAX_LENGTH,
  ),
  uncontrolledSymptomOptionIds: optionIdsSchema,
});

export type GuestDetailsInput = z.input<typeof guestDetailsSchema>;
export type GuestDetails = z.output<typeof guestDetailsSchema>;
export type GuestField = keyof GuestDetailsInput;

export function buildEmptyGuest(today: string): GuestDetailsInput {
  return {
    hospitalizationDate: today,
    firstName: "",
    lastName: "",
    birthDate: "",
    dni: "",
    address: "",
    healthInsuranceOptionId: "",
    healthInsuranceMemberNumber: "",
    hospitalizationReasonOptionIds: [],
    otherHospitalizationReason: "",
    uncontrolledSymptomOptionIds: [],
  };
}

export const GUESTS_TABLE_KEY = "guests";

export const ORIGIN_FILTER_PARAMETER = "origen";

export const GUEST_ORIGIN_LABELS: Record<GuestOrigin, string> = {
  admission: "Admisión",
  manual: "Sin entrevista",
};

const ORIGIN_FILTER_VALUES = [
  { origin: "admission", value: "admision" },
  { origin: "manual", value: "sin-entrevista" },
] as const satisfies readonly { origin: GuestOrigin; value: string }[];

export const ORIGIN_FILTER_OPTIONS = ORIGIN_FILTER_VALUES.map(
  ({ origin, value }) => ({ value, label: GUEST_ORIGIN_LABELS[origin] }),
);

export const GUEST_SORT_KEYS = [
  "hospitalizationDate",
  "guestName",
  "dni",
  "createdAt",
] as const;

export type GuestSortKey = (typeof GUEST_SORT_KEYS)[number];

export const DEFAULT_GUEST_SORT: ListSort<GuestSortKey> = {
  key: "hospitalizationDate",
  isDescending: true,
};

export type GuestListQuery = ListQuery<GuestSortKey> & {
  origin: GuestOrigin | null;
};

function parseOriginFilter(value: string | undefined): GuestOrigin | null {
  return (
    ORIGIN_FILTER_VALUES.find((filter) => filter.value === value)?.origin ??
    null
  );
}

export function toOriginFilterValue(origin: GuestOrigin | null): string | null {
  return (
    ORIGIN_FILTER_VALUES.find((filter) => filter.origin === origin)?.value ??
    null
  );
}

export function parseGuestListQuery(
  searchParams: SearchParams,
): GuestListQuery {
  return {
    ...parseListQuery(searchParams, GUEST_SORT_KEYS, DEFAULT_GUEST_SORT),
    origin: parseOriginFilter(
      readSearchParam(searchParams, ORIGIN_FILTER_PARAMETER),
    ),
  };
}
