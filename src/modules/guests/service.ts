import type { UserAccess } from "@/modules/access";
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
  runInTransactionAs,
} from "@/platform/database/client";
import { removeDniSeparators } from "@/platform/dni";
import {
  type ListPage,
  normalizeForSearch,
  resolvePageWindow,
} from "@/platform/list-query";
import type { FailedActionResult } from "@/platform/operation-result";

import {
  countGuestRecords,
  type GuestSearch,
  hasActiveGuestWithDni,
  insertGuest,
  listGuestRecords,
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
