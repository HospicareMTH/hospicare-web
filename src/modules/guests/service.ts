import { findUserNames, type UserAccess } from "@/modules/access";
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
import {
  type ActionResult,
  type FailedActionResult,
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import {
  annulGuestRecord,
  countGuestRecords,
  findActiveGuestOfInterview,
  findGuestRecord,
  findLatestAnnulledGuestOfInterview,
  type GuestRecord,
  type GuestSearch,
  hasActiveGuestWithDni,
  insertGuest,
  listGuestRecords,
  listInterviewIdsWithActiveGuest,
  listUsedHealthInsuranceOptionIds,
  lockGuestRecord,
  updateGuestRecord,
} from "./repository";
import {
  type GuestDetails,
  type GuestDetailsInput,
  type GuestField,
  guestIdSchema,
  type GuestListQuery,
} from "./schemas";
import type { GuestOrigin } from "./tables";

export type GuestCatalogFields = Record<
  "healthInsurance" | "hospitalizationReason" | "uncontrolledSymptom",
  CatalogFieldData
>;

type SavedSelections = Pick<
  GuestDetails,
  | "healthInsuranceOptionId"
  | "hospitalizationReasonOptionIds"
  | "uncontrolledSymptomOptionIds"
>;

const NO_SAVED_SELECTIONS: SavedSelections = {
  healthInsuranceOptionId: null,
  hospitalizationReasonOptionIds: [],
  uncontrolledSymptomOptionIds: [],
};

export async function loadGuestCatalogFields(
  access: UserAccess,
  saved: SavedSelections = NO_SAVED_SELECTIONS,
): Promise<GuestCatalogFields> {
  const [healthInsurance, hospitalizationReason, uncontrolledSymptom] =
    await Promise.all([
      loadCatalogField(
        access,
        "health_insurance",
        saved.healthInsuranceOptionId ? [saved.healthInsuranceOptionId] : [],
      ),
      loadCatalogField(
        access,
        "hospitalization_reason",
        saved.hospitalizationReasonOptionIds,
      ),
      loadCatalogField(
        access,
        "uncontrolled_symptom",
        saved.uncontrolledSymptomOptionIds,
      ),
    ]);
  return { healthInsurance, hospitalizationReason, uncontrolledSymptom };
}

type CatalogSelectionCheck = {
  field: GuestField;
  catalog: CatalogKey;
  selectedIds: string[];
};

function listCatalogSelectionChecks(
  details: SavedSelections,
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
  saved: SavedSelections,
): Promise<Partial<Record<GuestField, string[]>>> {
  const fieldErrors: Partial<Record<GuestField, string[]>> = {};
  const savedChecks = listCatalogSelectionChecks(saved);
  // Una transacción usa una sola conexión: las consultas van una detrás de otra.
  for (const [index, check] of listCatalogSelectionChecks(details).entries()) {
    const result = await validateCatalogSelection(
      transaction,
      check.catalog,
      check.selectedIds,
      savedChecks[index]?.selectedIds ?? [],
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
    const fieldErrors = await findSelectionErrors(
      transaction,
      details,
      NO_SAVED_SELECTIONS,
    );
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

export function isDniInActiveGuest(
  dni: string,
  excludedGuestId: string | null = null,
): Promise<boolean> {
  return hasActiveGuestWithDni(dni, excludedGuestId);
}

export const GUEST_REJECTION_MESSAGES = {
  notFound:
    "No encontramos este huésped. Volvé a Huéspedes y buscalo de nuevo.",
  annulled: "Este huésped está anulado y ya no se puede modificar.",
  alreadyAnnulled: "Este huésped ya estaba anulado.",
  changedMeanwhile:
    "Otra persona cambió este huésped mientras lo editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString();
}

function toDetailsInput(record: GuestRecord): GuestDetailsInput {
  return {
    hospitalizationDate: record.hospitalizationDate,
    firstName: record.firstName,
    lastName: record.lastName,
    birthDate: record.birthDate,
    dni: record.dni,
    address: record.address,
    healthInsuranceOptionId: record.healthInsuranceOptionId ?? "",
    healthInsuranceMemberNumber: record.healthInsuranceMemberNumber ?? "",
    hospitalizationReasonOptionIds: record.hospitalizationReasonOptionIds,
    otherHospitalizationReason: record.otherHospitalizationReason ?? "",
    uncontrolledSymptomOptionIds: record.uncontrolledSymptomOptionIds,
  };
}

export type GuestToEdit = {
  id: string;
  fullName: string;
  version: string;
  isAnnulled: boolean;
  details: GuestDetailsInput;
  savedSelections: SavedSelections;
};

export async function findGuestToEdit(
  candidateId: string,
): Promise<GuestToEdit | null> {
  const parsedId = guestIdSchema.safeParse(candidateId);
  if (!parsedId.success) {
    return null;
  }
  const record = await findGuestRecord(parsedId.data);
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    fullName: `${record.firstName} ${record.lastName}`,
    version: toVersion(record.updatedAt),
    isAnnulled: record.annulledAt !== null,
    details: toDetailsInput(record),
    savedSelections: {
      healthInsuranceOptionId: record.healthInsuranceOptionId,
      hospitalizationReasonOptionIds: record.hospitalizationReasonOptionIds,
      uncontrolledSymptomOptionIds: record.uncontrolledSymptomOptionIds,
    },
  };
}

export function updateGuest(
  actorUserId: string,
  guestId: string,
  expectedVersion: string,
  details: GuestDetails,
): Promise<ActionResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const saved = await lockGuestRecord(transaction, guestId);
    if (!saved) {
      return reject(GUEST_REJECTION_MESSAGES.notFound);
    }
    if (saved.annulledAt) {
      return reject(GUEST_REJECTION_MESSAGES.annulled);
    }
    if (toVersion(saved.updatedAt) !== expectedVersion) {
      return reject(GUEST_REJECTION_MESSAGES.changedMeanwhile);
    }
    const fieldErrors = await findSelectionErrors(transaction, details, saved);
    if (Object.keys(fieldErrors).length > 0) {
      return { status: "invalid", fieldErrors };
    }
    await updateGuestRecord(transaction, saved, details, actorUserId);
    return SUCCESS;
  });
}

export function annulGuest(
  actorUserId: string,
  guestId: string,
  reason: string,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const saved = await lockGuestRecord(transaction, guestId);
    if (!saved) {
      return reject(GUEST_REJECTION_MESSAGES.notFound);
    }
    if (saved.annulledAt) {
      return reject(GUEST_REJECTION_MESSAGES.alreadyAnnulled);
    }
    await annulGuestRecord(transaction, guestId, reason, actorUserId);
    return SUCCESS;
  });
}

export type GuestSummary = {
  id: string;
  fullName: string;
  clinicalRecordNumber: number;
  isAnnulled: boolean;
};

export async function findGuestSummary(
  candidateId: string,
): Promise<GuestSummary | null> {
  const parsedId = guestIdSchema.safeParse(candidateId);
  if (!parsedId.success) {
    return null;
  }
  const record = await findGuestRecord(parsedId.data);
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    fullName: `${record.firstName} ${record.lastName}`,
    clinicalRecordNumber: record.clinicalRecordNumber,
    isAnnulled: record.annulledAt !== null,
  };
}

export type GuestToEvaluate = { id: string; isAnnulled: boolean };

export async function lockGuestToEvaluate(
  transaction: DatabaseTransaction,
  guestId: string,
): Promise<GuestToEvaluate | null> {
  const saved = await lockGuestRecord(transaction, guestId);
  if (!saved) {
    return null;
  }
  return { id: saved.id, isAnnulled: saved.annulledAt !== null };
}

export async function findPendingInterviewIdsWithDni(
  dni: string,
): Promise<string[]> {
  const interviewIds = await findActiveInterviewIdsWithDni(dni);
  const acceptedInterviewIds = new Set(
    await listInterviewIdsWithActiveGuest(interviewIds),
  );
  return interviewIds.filter((id) => !acceptedInterviewIds.has(id));
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

export type GuestView = {
  id: string;
  clinicalRecordNumber: number;
  fullName: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  address: string;
  healthInsuranceLabel: string | null;
  healthInsuranceMemberNumber: string | null;
  hospitalizationDate: string;
  hospitalizationReasonLabels: string[];
  otherHospitalizationReason: string | null;
  uncontrolledSymptomLabels: string[];
  origin: GuestOrigin;
  admissionInterviewId: string | null;
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
  annulment: {
    annulledAt: Date;
    annulledByName: string | null;
    reason: string;
  } | null;
};

async function findOptionLabels(
  catalog: CatalogKey,
  savedOptionIds: string[],
): Promise<string[]> {
  if (savedOptionIds.length === 0) {
    return [];
  }
  const options = await listSelectableCatalogOptions(catalog, savedOptionIds);
  return options
    .filter((option) => savedOptionIds.includes(option.id))
    .map((option) => option.label);
}

function nameOf(
  namesById: ReadonlyMap<string, string>,
  userId: string | null,
): string | null {
  return userId ? (namesById.get(userId) ?? null) : null;
}

export async function findGuest(
  candidateId: string,
): Promise<GuestView | null> {
  const parsedId = guestIdSchema.safeParse(candidateId);
  if (!parsedId.success) {
    return null;
  }
  const record = await findGuestRecord(parsedId.data);
  if (!record) {
    return null;
  }
  const [
    healthInsuranceLabels,
    hospitalizationReasonLabels,
    uncontrolledSymptomLabels,
    userNames,
  ] = await Promise.all([
    findOptionLabels(
      "health_insurance",
      record.healthInsuranceOptionId ? [record.healthInsuranceOptionId] : [],
    ),
    findOptionLabels(
      "hospitalization_reason",
      record.hospitalizationReasonOptionIds,
    ),
    findOptionLabels(
      "uncontrolled_symptom",
      record.uncontrolledSymptomOptionIds,
    ),
    findUserNames(
      [
        record.createdByUserId,
        record.updatedByUserId,
        record.annulledByUserId,
      ].flatMap((userId) => (userId ? [userId] : [])),
    ),
  ]);

  return {
    id: record.id,
    clinicalRecordNumber: record.clinicalRecordNumber,
    fullName: `${record.firstName} ${record.lastName}`,
    firstName: record.firstName,
    lastName: record.lastName,
    birthDate: record.birthDate,
    dni: record.dni,
    address: record.address,
    healthInsuranceLabel: healthInsuranceLabels[0] ?? null,
    healthInsuranceMemberNumber: record.healthInsuranceMemberNumber,
    hospitalizationDate: record.hospitalizationDate,
    hospitalizationReasonLabels,
    otherHospitalizationReason: record.otherHospitalizationReason,
    uncontrolledSymptomLabels,
    origin: record.origin,
    admissionInterviewId: record.admissionInterviewId,
    createdAt: record.createdAt,
    createdByName: nameOf(userNames, record.createdByUserId),
    updatedAt: record.updatedAt,
    updatedByName: nameOf(userNames, record.updatedByUserId),
    annulment:
      record.annulledAt && record.annulmentReason
        ? {
            annulledAt: record.annulledAt,
            annulledByName: nameOf(userNames, record.annulledByUserId),
            reason: record.annulmentReason,
          }
        : null,
  };
}

export type InterviewGuest = {
  guestId: string;
  clinicalRecordNumber: number;
  acceptedAt: Date;
};

export async function findGuestOfInterview(
  interviewId: string,
): Promise<InterviewGuest | null> {
  const guest = await findActiveGuestOfInterview(getDatabase(), interviewId);
  return guest
    ? {
        guestId: guest.id,
        clinicalRecordNumber: guest.clinicalRecordNumber,
        acceptedAt: guest.createdAt,
      }
    : null;
}

export type AnnulledInterviewGuest = InterviewGuest & {
  annulledAt: Date;
};

export async function findAnnulledGuestOfInterview(
  interviewId: string,
): Promise<AnnulledInterviewGuest | null> {
  const guest = await findLatestAnnulledGuestOfInterview(interviewId);
  return guest
    ? {
        guestId: guest.id,
        clinicalRecordNumber: guest.clinicalRecordNumber,
        acceptedAt: guest.createdAt,
        annulledAt: guest.annulledAt,
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
