import type { UserAccess } from "@/modules/access";
import {
  canCreateCatalogEntries,
  type CatalogKey,
  findReligionOtherOptionId,
  HEALTHCARE_PROFESSIONALS_PICKER,
  type PickerCatalog,
  listSelectableCatalogOptions,
  listSelectableHealthcareProfessionals,
  type SelectableCatalogEntry,
  validateCatalogSelection,
  validateHealthcareProfessionalSelection,
} from "@/modules/catalogs";
import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import { removeDniSeparators } from "@/platform/dni";
import { type ListPage, resolvePageWindow } from "@/platform/list-query";
import type { FailedActionResult } from "@/platform/operation-result";

import {
  countAdmissionInterviewRecords,
  hasActiveInterviewWithDni,
  insertAdmissionInterview,
  listAdmissionInterviewRecords,
  listUsedFilterIds,
} from "./repository";
import type {
  AdmissionInterviewDetails,
  AdmissionInterviewField,
  AdmissionInterviewListQuery,
} from "./schemas";

export type CreateAdmissionInterviewResult =
  { status: "success"; interviewId: string } | FailedActionResult;

type FieldErrors = Partial<Record<AdmissionInterviewField, string[]>>;

type CatalogSelectionCheck = {
  field: AdmissionInterviewField;
  catalog: CatalogKey;
  selectedIds: string[];
};

const MISSING_RELIGION_DETAIL_MESSAGE = "Escribí cuál es la otra religión.";

function invalidFields(fieldErrors: FieldErrors): FailedActionResult {
  return { status: "invalid", fieldErrors };
}

function singleSelection(
  field: AdmissionInterviewField,
  catalog: CatalogKey,
  optionId: string | null,
): CatalogSelectionCheck {
  return { field, catalog, selectedIds: optionId ? [optionId] : [] };
}

function listCatalogSelectionChecks(
  details: AdmissionInterviewDetails,
): CatalogSelectionCheck[] {
  return [
    singleSelection(
      "healthInsuranceOptionId",
      "health_insurance",
      details.healthInsuranceOptionId,
    ),
    singleSelection(
      "informationAwarenessOptionId",
      "information_awareness",
      details.informationAwarenessOptionId,
    ),
    singleSelection("religionOptionId", "religion", details.religionOptionId),
    singleSelection(
      "ecogScoreOptionId",
      "ecog_score",
      details.ecogScoreOptionId,
    ),
    singleSelection(
      "intervieweeRelationshipOptionId",
      "relationship",
      details.intervieweeRelationshipOptionId,
    ),
    singleSelection(
      "metastasisLocationOptionId",
      "metastasis_location",
      details.metastasisLocationOptionId,
    ),
    singleSelection(
      "oncologicalTreatmentOptionId",
      "oncological_treatment",
      details.oncologicalTreatmentOptionId,
    ),
    {
      field: "surgeryOptionIds",
      catalog: "surgery",
      selectedIds: details.surgeryOptionIds,
    },
  ];
}

async function findSelectionErrors(
  transaction: DatabaseTransaction,
  details: AdmissionInterviewDetails,
): Promise<FieldErrors> {
  const checks = listCatalogSelectionChecks(details);
  const [catalogResults, primaryDoctorResult] = await Promise.all([
    Promise.all(
      checks.map((check) =>
        validateCatalogSelection(
          transaction,
          check.catalog,
          check.selectedIds,
          [],
        ),
      ),
    ),
    validateHealthcareProfessionalSelection(
      transaction,
      details.primaryDoctorId ? [details.primaryDoctorId] : [],
      [],
    ),
  ]);
  const fieldErrors: FieldErrors = {};
  checks.forEach((check, index) => {
    const result = catalogResults[index];
    if (result?.status === "rejected") {
      fieldErrors[check.field] = [result.message];
    }
  });
  if (primaryDoctorResult.status === "rejected") {
    fieldErrors.primaryDoctorId = [primaryDoctorResult.message];
  }
  return fieldErrors;
}

async function resolveReligionDetail(
  details: AdmissionInterviewDetails,
): Promise<AdmissionInterviewDetails | FailedActionResult> {
  const religionOtherOptionId = await findReligionOtherOptionId();
  if (details.religionOptionId !== religionOtherOptionId) {
    return { ...details, religionDetail: null };
  }
  if (!details.religionDetail) {
    return invalidFields({ religionDetail: [MISSING_RELIGION_DETAIL_MESSAGE] });
  }
  return details;
}

export async function createAdmissionInterview(
  actorUserId: string,
  details: AdmissionInterviewDetails,
): Promise<CreateAdmissionInterviewResult> {
  const resolvedDetails = await resolveReligionDetail(details);
  if ("status" in resolvedDetails) {
    return resolvedDetails;
  }
  return runInTransactionAs(actorUserId, async (transaction) => {
    const fieldErrors = await findSelectionErrors(transaction, resolvedDetails);
    if (Object.keys(fieldErrors).length > 0) {
      return invalidFields(fieldErrors);
    }
    const interviewId = await insertAdmissionInterview(
      transaction,
      resolvedDetails,
      actorUserId,
    );
    return { status: "success", interviewId };
  });
}

export function isDniInActiveInterview(dni: string): Promise<boolean> {
  return hasActiveInterviewWithDni(dni);
}

export type AdmissionInterviewListItem = {
  id: string;
  interviewDate: string;
  guestFullName: string;
  guestDni: string;
  intervieweeFullName: string;
  relationshipLabel: string | null;
  primaryDoctorName: string | null;
  referredBy: string | null;
  createdAt: Date;
};

export type FilterOption = {
  value: string;
  label: string;
};

export type AdmissionInterviewList = {
  page: ListPage<AdmissionInterviewListItem>;
  relationshipOptions: FilterOption[];
  primaryDoctorOptions: FilterOption[];
};

const DNI_LIKE_SEARCH = /^[\d.\-\s]+$/;

function toSearchTerm(search: string): string {
  return DNI_LIKE_SEARCH.test(search) ? removeDniSeparators(search) : search;
}

function toFilterOptions(entries: SelectableCatalogEntry[]): FilterOption[] {
  return entries.map(({ id, label }) => ({ value: id, label }));
}

function labelOf(
  labelsById: ReadonlyMap<string, string>,
  entryId: string | null,
): string | null {
  return entryId ? (labelsById.get(entryId) ?? null) : null;
}

export async function searchAdmissionInterviews(
  query: AdmissionInterviewListQuery,
): Promise<AdmissionInterviewList> {
  const search = { ...query, searchTerm: toSearchTerm(query.search) };
  const [totalCount, usedFilterIds] = await Promise.all([
    countAdmissionInterviewRecords(search),
    listUsedFilterIds(),
  ]);
  const window = resolvePageWindow(totalCount, query.page, query.pageSize);
  const [records, relationshipEntries, primaryDoctorEntries] =
    await Promise.all([
      listAdmissionInterviewRecords(search, {
        offset: window.offset,
        limit: query.pageSize,
      }),
      listSelectableCatalogOptions(
        "relationship",
        usedFilterIds.relationshipOptionIds,
      ),
      listSelectableHealthcareProfessionals(usedFilterIds.primaryDoctorIds),
    ]);
  const relationshipLabels = new Map(
    relationshipEntries.map(({ id, label }) => [id, label]),
  );
  const primaryDoctorNames = new Map(
    primaryDoctorEntries.map(({ id, label }) => [id, label]),
  );

  return {
    page: {
      items: records.map((record) => ({
        id: record.id,
        interviewDate: record.interviewDate,
        guestFullName: `${record.guestFirstName} ${record.guestLastName}`,
        guestDni: record.guestDni,
        intervieweeFullName: record.intervieweeFullName,
        relationshipLabel: labelOf(
          relationshipLabels,
          record.intervieweeRelationshipOptionId,
        ),
        primaryDoctorName: labelOf(primaryDoctorNames, record.primaryDoctorId),
        referredBy: record.referredBy,
        createdAt: record.createdAt,
      })),
      totalCount,
      page: window.page,
      pageCount: window.pageCount,
      pageSize: query.pageSize,
    },
    relationshipOptions: toFilterOptions(relationshipEntries),
    primaryDoctorOptions: toFilterOptions(primaryDoctorEntries),
  };
}

export type CatalogFieldData = {
  catalog: PickerCatalog;
  options: SelectableCatalogEntry[];
  canCreate: boolean;
};

export type InterviewCatalogFields = Record<
  | "healthInsurance"
  | "informationAwareness"
  | "religion"
  | "ecogScore"
  | "relationship"
  | "primaryDoctor"
  | "metastasisLocation"
  | "oncologicalTreatment"
  | "surgery",
  CatalogFieldData
>;

export type InterviewFormOptions = {
  catalogFields: InterviewCatalogFields;
  religionOtherOptionId: string | null;
};

async function loadCatalogField(
  access: UserAccess,
  catalog: CatalogKey,
): Promise<CatalogFieldData> {
  return {
    catalog,
    options: await listSelectableCatalogOptions(catalog),
    canCreate: canCreateCatalogEntries(access, catalog),
  };
}

async function loadPrimaryDoctorField(
  access: UserAccess,
): Promise<CatalogFieldData> {
  return {
    catalog: HEALTHCARE_PROFESSIONALS_PICKER,
    options: await listSelectableHealthcareProfessionals(),
    canCreate: canCreateCatalogEntries(access, HEALTHCARE_PROFESSIONALS_PICKER),
  };
}

export async function loadInterviewFormOptions(
  access: UserAccess,
): Promise<InterviewFormOptions> {
  const [
    healthInsurance,
    informationAwareness,
    religion,
    ecogScore,
    relationship,
    primaryDoctor,
    metastasisLocation,
    oncologicalTreatment,
    surgery,
    religionOtherOptionId,
  ] = await Promise.all([
    loadCatalogField(access, "health_insurance"),
    loadCatalogField(access, "information_awareness"),
    loadCatalogField(access, "religion"),
    loadCatalogField(access, "ecog_score"),
    loadCatalogField(access, "relationship"),
    loadPrimaryDoctorField(access),
    loadCatalogField(access, "metastasis_location"),
    loadCatalogField(access, "oncological_treatment"),
    loadCatalogField(access, "surgery"),
    findReligionOtherOptionId(),
  ]);
  return {
    catalogFields: {
      healthInsurance,
      informationAwareness,
      religion,
      ecogScore,
      relationship,
      primaryDoctor,
      metastasisLocation,
      oncologicalTreatment,
      surgery,
    },
    religionOtherOptionId,
  };
}
