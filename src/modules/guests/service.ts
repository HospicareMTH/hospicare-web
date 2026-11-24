import type { UserAccess } from "@/modules/access";
import {
  findActiveInterviewIdsWithDni,
  lockInterviewToAccept,
} from "@/modules/admissions";
import {
  type CatalogFieldData,
  type CatalogKey,
  listSelectableCatalogOptions,
  loadCatalogField,
  validateCatalogSelection,
} from "@/modules/catalogs";
import { assignNextClinicalRecordNumber } from "@/modules/settings";
import {
  type DatabaseTransaction,
  getDatabase,
  runInTransactionAs,
} from "@/platform/database/client";
import { getBusinessDate } from "@/platform/dates";
import { removeDniSeparators } from "@/platform/dni";
import {
  type ListPage,
  normalizeForSearch,
  resolvePageWindow,
} from "@/platform/list-query";
import { type FailedActionResult, reject } from "@/platform/operation-result";

import {
  countGuestRecords,
  findActiveGuestOfInterview,
  type GuestSearch,
  hasActiveGuestWithDni,
  insertGuest,
  listGuestRecords,
  listInterviewIdsWithActiveGuest,
  listUsedHealthInsuranceOptionIds,
} from "./repository";
import type { GuestDetails, GuestField, GuestListQuery } from "./schemas";
import type { GuestOrigin } from "./tables";

export type GuestCatalogFields = Record<
  "healthInsurance" | "hospitalizationReason" | "uncontrolledSymptom",
  CatalogFieldData
>;

export async function loadGuestCatalogFields(
  access: UserAccess,
): Promise<GuestCatalogFields> {
  const [healthInsurance, hospitalizationReason, uncontrolledSymptom] =
    await Promise.all([
      loadCatalogField(access, "health_insurance", []),
      loadCatalogField(access, "hospitalization_reason", []),
      loadCatalogField(access, "uncontrolled_symptom", []),
    ]);
  return { healthInsurance, hospitalizationReason, uncontrolledSymptom };
}

type CatalogSelectionCheck = {
  field: GuestField;
  catalog: CatalogKey;
  selectedIds: string[];
};

function listCatalogSelectionChecks(
  details: GuestDetails,
): CatalogSelectionCheck[] {
  return [
    {
      field: "healthInsuranceOptionId",
      catalog: "health_insurance",
      selectedIds: details.healthInsuranceOptionId
        ? [details.healthInsuranceOptionId]
        : [],
    },
    {
      field: "hospitalizationReasonOptionIds",
      catalog: "hospitalization_reason",
      selectedIds: details.hospitalizationReasonOptionIds,
    },
    {
      field: "uncontrolledSymptomOptionIds",
      catalog: "uncontrolled_symptom",
      selectedIds: details.uncontrolledSymptomOptionIds,
    },
  ];
}

async function findSelectionErrors(
  transaction: DatabaseTransaction,
  details: GuestDetails,
): Promise<Partial<Record<GuestField, string[]>>> {
  const fieldErrors: Partial<Record<GuestField, string[]>> = {};
  // Una transacción usa una sola conexión: las consultas van una detrás de otra.
  for (const check of listCatalogSelectionChecks(details)) {
    const result = await validateCatalogSelection(
      transaction,
      check.catalog,
      check.selectedIds,
      [],
    );
    if (result.status === "rejected") {
      fieldErrors[check.field] = [result.message];
    }
  }
  return fieldErrors;
}

export type CreateGuestResult =
  | { status: "success"; guestId: string; clinicalRecordNumber: number }
  | FailedActionResult;

export function createGuestManually(
  actorUserId: string,
  details: GuestDetails,
): Promise<CreateGuestResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const fieldErrors = await findSelectionErrors(transaction, details);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: "invalid", fieldErrors };
    }
    const clinicalRecordNumber =
      await assignNextClinicalRecordNumber(transaction);
    const guestId = await insertGuest(transaction, {
      details,
      clinicalRecordNumber,
      origin: "manual",
      admissionInterviewId: null,
      actorUserId,
    });
    return { status: "success", guestId, clinicalRecordNumber };
  });
}

export function isDniInActiveGuest(dni: string): Promise<boolean> {
  return hasActiveGuestWithDni(dni);
}

export async function isDniInPendingInterview(dni: string): Promise<boolean> {
  const interviewIds = await findActiveInterviewIdsWithDni(dni);
  const acceptedInterviewIds = new Set(
    await listInterviewIdsWithActiveGuest(interviewIds),
  );
  return interviewIds.some((id) => !acceptedInterviewIds.has(id));
}

export const INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES = {
  notFound:
    "No encontramos esta entrevista. Volvé a Admisiones y buscala de nuevo.",
  annulled: "Esta entrevista está anulada: no se puede aceptar.",
} as const;

export type AcceptInterviewResult =
  | {
      status: "success";
      guestId: string;
      clinicalRecordNumber: number;
      wasCreated: boolean;
    }
  | FailedActionResult;

export function acceptAdmissionInterview(
  actorUserId: string,
  interviewId: string,
): Promise<AcceptInterviewResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const interview = await lockInterviewToAccept(transaction, interviewId);
    if (!interview) {
      return reject(INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES.notFound);
    }
    if (interview.isAnnulled) {
      return reject(INTERVIEW_ACCEPTANCE_REJECTION_MESSAGES.annulled);
    }
    const existingGuest = await findActiveGuestOfInterview(
      transaction,
      interviewId,
    );
    if (existingGuest) {
      return {
        status: "success",
        guestId: existingGuest.id,
        clinicalRecordNumber: existingGuest.clinicalRecordNumber,
        wasCreated: false,
      };
    }
    const clinicalRecordNumber =
      await assignNextClinicalRecordNumber(transaction);
    const guestId = await insertGuest(transaction, {
      details: {
        hospitalizationDate: getBusinessDate(new Date()),
        firstName: interview.firstName,
        lastName: interview.lastName,
        birthDate: interview.birthDate,
        dni: interview.dni,
        address: interview.address,
        healthInsuranceOptionId: interview.healthInsuranceOptionId,
        healthInsuranceMemberNumber: interview.healthInsuranceMemberNumber,
        hospitalizationReasonOptionIds: [],
        otherHospitalizationReason: null,
        uncontrolledSymptomOptionIds: [],
      },
      clinicalRecordNumber,
      origin: "admission",
      admissionInterviewId: interview.id,
      actorUserId,
    });
    return {
      status: "success",
      guestId,
      clinicalRecordNumber,
      wasCreated: true,
    };
  });
}

export type InterviewGuest = {
  clinicalRecordNumber: number;
  acceptedAt: Date;
};

export async function findGuestOfInterview(
  interviewId: string,
): Promise<InterviewGuest | null> {
  const guest = await findActiveGuestOfInterview(getDatabase(), interviewId);
  return guest
    ? {
        clinicalRecordNumber: guest.clinicalRecordNumber,
        acceptedAt: guest.createdAt,
      }
    : null;
}

export type GuestListItem = {
  id: string;
  clinicalRecordNumber: number;
  fullName: string;
  dni: string;
  hospitalizationDate: string;
  healthInsuranceLabel: string | null;
  healthInsuranceMemberNumber: string | null;
  origin: GuestOrigin;
  createdAt: Date;
};

const DIGITS_ONLY_SEARCH = /^\d+$/;
const DNI_LIKE_SEARCH = /^[\d.\-\s]+$/;
const LARGEST_STORED_INTEGER = 2_147_483_647;

function toSearchTerm(search: string): string {
  return DNI_LIKE_SEARCH.test(search) ? removeDniSeparators(search) : search;
}

function toClinicalRecordNumber(search: string): number | null {
  if (!DIGITS_ONLY_SEARCH.test(search)) {
    return null;
  }
  const candidate = Number(search);
  return candidate <= LARGEST_STORED_INTEGER ? candidate : null;
}

function findMatchingOptionIds(
  options: readonly { id: string; label: string }[],
  search: string,
): string[] {
  const normalizedSearch = normalizeForSearch(search);
  return options
    .filter(({ label }) => normalizeForSearch(label).includes(normalizedSearch))
    .map(({ id }) => id);
}

export async function searchGuests(
  query: GuestListQuery,
): Promise<ListPage<GuestListItem>> {
  const healthInsuranceOptions = await listSelectableCatalogOptions(
    "health_insurance",
    await listUsedHealthInsuranceOptionIds(),
  );
  const search: GuestSearch = {
    ...query,
    searchTerm: toSearchTerm(query.search),
    clinicalRecordNumber: toClinicalRecordNumber(query.search),
    matchingHealthInsuranceOptionIds: query.search
      ? findMatchingOptionIds(healthInsuranceOptions, query.search)
      : [],
  };
  const totalCount = await countGuestRecords(search);
  const window = resolvePageWindow(totalCount, query.page, query.pageSize);
  const records = await listGuestRecords(search, {
    offset: window.offset,
    limit: query.pageSize,
  });
  const healthInsuranceLabels = new Map(
    healthInsuranceOptions.map(({ id, label }) => [id, label]),
  );

  return {
    items: records.map((record) => ({
      id: record.id,
      clinicalRecordNumber: record.clinicalRecordNumber,
      fullName: `${record.firstName} ${record.lastName}`,
      dni: record.dni,
      hospitalizationDate: record.hospitalizationDate,
      healthInsuranceLabel: record.healthInsuranceOptionId
        ? (healthInsuranceLabels.get(record.healthInsuranceOptionId) ?? null)
        : null,
      healthInsuranceMemberNumber: record.healthInsuranceMemberNumber,
      origin: record.origin,
      createdAt: record.createdAt,
    })),
    totalCount,
    page: window.page,
    pageCount: window.pageCount,
    pageSize: query.pageSize,
  };
}
