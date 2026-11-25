import { findUserNames, type UserAccess } from "@/modules/access";
import {
  canCreateCatalogEntries,
  type CatalogFieldData,
  type CatalogKey,
  findReligionOtherOptionId,
  HEALTHCARE_PROFESSIONALS_PICKER,
  listSelectableCatalogOptions,
  loadCatalogField,
  listSelectableHealthcareProfessionals,
  type SelectableCatalogEntry,
  validateCatalogSelection,
  validateHealthcareProfessionalSelection,
} from "@/modules/catalogs";
import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import { getReportWindowStart, REPORT_WINDOW_DAYS } from "@/platform/dates";
import { removeDniSeparators } from "@/platform/dni";
import { type ListPage, resolvePageWindow } from "@/platform/list-query";
import {
  type FailedActionResult,
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import {
  type AdmissionInterviewRecord,
  annulAdmissionInterviewRecord,
  countAdmissionInterviewRecords,
  countAdmissionInterviewsForReport,
  findAdmissionInterviewRecord,
  hasActiveInterviewWithDni,
  insertAdmissionInterview,
  listActiveInterviewIdsWithDni,
  listAdmissionInterviewRecords,
  listUsedFilterIds,
  lockAdmissionInterviewRecord,
  updateAdmissionInterviewRecord,
} from "./repository";
import {
  type AdmissionInterviewDetails,
  type AdmissionInterviewDetailsInput,
  type AdmissionInterviewField,
  admissionInterviewIdSchema,
  type AdmissionInterviewListQuery,
} from "./schemas";

export type CreateAdmissionInterviewResult =
  { status: "success"; interviewId: string } | FailedActionResult;

export type UpdateAdmissionInterviewResult =
  { status: "success" } | FailedActionResult;

export const ADMISSION_INTERVIEW_REJECTION_MESSAGES = {
  notFound:
    "No encontramos esta entrevista. Volvé a Admisiones y buscala de nuevo.",
  annulled: "Esta entrevista está anulada y ya no se puede modificar.",
  alreadyAnnulled: "Esta entrevista ya estaba anulada.",
  changedMeanwhile:
    "Otra persona cambió esta entrevista mientras la editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

type CatalogSelectionSource = Pick<
  AdmissionInterviewDetails,
  | "healthInsuranceOptionId"
  | "informationAwarenessOptionId"
  | "religionOptionId"
  | "ecogScoreOptionId"
  | "intervieweeRelationshipOptionId"
  | "metastasisLocationOptionId"
  | "oncologicalTreatmentOptionId"
  | "surgeryOptionIds"
  | "primaryDoctorId"
>;

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
  details: CatalogSelectionSource,
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
  saved: CatalogSelectionSource | null,
): Promise<FieldErrors> {
  const checks = listCatalogSelectionChecks(details);
  const savedChecks = saved ? listCatalogSelectionChecks(saved) : [];
  const savedPrimaryDoctorIds = saved?.primaryDoctorId
    ? [saved.primaryDoctorId]
    : [];
  const [catalogResults, primaryDoctorResult] = await Promise.all([
    Promise.all(
      checks.map((check, index) =>
        validateCatalogSelection(
          transaction,
          check.catalog,
          check.selectedIds,
          savedChecks[index]?.selectedIds ?? [],
        ),
      ),
    ),
    validateHealthcareProfessionalSelection(
      transaction,
      details.primaryDoctorId ? [details.primaryDoctorId] : [],
      savedPrimaryDoctorIds,
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
    const fieldErrors = await findSelectionErrors(
      transaction,
      resolvedDetails,
      null,
    );
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

function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString();
}

export async function updateAdmissionInterview(
  actorUserId: string,
  interviewId: string,
  expectedVersion: string,
  details: AdmissionInterviewDetails,
): Promise<UpdateAdmissionInterviewResult> {
  const resolvedDetails = await resolveReligionDetail(details);
  if ("status" in resolvedDetails) {
    return resolvedDetails;
  }
  return runInTransactionAs(actorUserId, async (transaction) => {
    const saved = await lockAdmissionInterviewRecord(transaction, interviewId);
    if (!saved) {
      return reject(ADMISSION_INTERVIEW_REJECTION_MESSAGES.notFound);
    }
    if (saved.annulledAt) {
      return reject(ADMISSION_INTERVIEW_REJECTION_MESSAGES.annulled);
    }
    if (toVersion(saved.updatedAt) !== expectedVersion) {
      return reject(ADMISSION_INTERVIEW_REJECTION_MESSAGES.changedMeanwhile);
    }
    const fieldErrors = await findSelectionErrors(
      transaction,
      resolvedDetails,
      saved,
    );
    if (Object.keys(fieldErrors).length > 0) {
      return invalidFields(fieldErrors);
    }
    await updateAdmissionInterviewRecord(
      transaction,
      interviewId,
      resolvedDetails,
      saved.surgeryOptionIds,
      actorUserId,
    );
    return { status: "success" };
  });
}

export async function annulAdmissionInterview(
  actorUserId: string,
  interviewId: string,
  reason: string,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const saved = await lockAdmissionInterviewRecord(transaction, interviewId);
    if (!saved) {
      return reject(ADMISSION_INTERVIEW_REJECTION_MESSAGES.notFound);
    }
    if (saved.annulledAt) {
      return reject(ADMISSION_INTERVIEW_REJECTION_MESSAGES.alreadyAnnulled);
    }
    await annulAdmissionInterviewRecord(
      transaction,
      interviewId,
      reason,
      actorUserId,
    );
    return SUCCESS;
  });
}

export function isDniInActiveInterview(
  dni: string,
  excludedInterviewId: string | null,
): Promise<boolean> {
  return hasActiveInterviewWithDni(dni, excludedInterviewId);
}

export function findActiveInterviewIdsWithDni(dni: string): Promise<string[]> {
  return listActiveInterviewIdsWithDni(dni);
}

export type InterviewToAccept = {
  id: string;
  isAnnulled: boolean;
  firstName: string;
  lastName: string;
  birthDate: string;
  dni: string;
  address: string;
  healthInsuranceOptionId: string | null;
  healthInsuranceMemberNumber: string | null;
};

export async function lockInterviewToAccept(
  transaction: DatabaseTransaction,
  interviewId: string,
): Promise<InterviewToAccept | null> {
  const record = await lockAdmissionInterviewRecord(transaction, interviewId);
  if (!record) {
    return null;
  }
  return {
    id: record.id,
    isAnnulled: record.annulledAt !== null,
    firstName: record.guestFirstName,
    lastName: record.guestLastName,
    birthDate: record.guestBirthDate,
    dni: record.guestDni,
    address: record.guestAddress,
    healthInsuranceOptionId: record.healthInsuranceOptionId,
    healthInsuranceMemberNumber: record.healthInsuranceMemberNumber,
  };
}

export type AdmissionInterviewView = {
  id: string;
  details: AdmissionInterviewDetailsInput;
  version: string;
  isAnnulled: boolean;
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
  annulment: AdmissionInterviewAnnulment | null;
};

export type AdmissionInterviewAnnulment = {
  annulledAt: Date;
  annulledByName: string | null;
  reason: string;
};

function toDetailsInput(
  record: AdmissionInterviewRecord,
): AdmissionInterviewDetailsInput {
  return {
    interviewDate: record.interviewDate,
    guestFirstName: record.guestFirstName,
    guestLastName: record.guestLastName,
    guestBirthDate: record.guestBirthDate,
    guestDni: record.guestDni,
    guestAddress: record.guestAddress,
    healthInsuranceOptionId: record.healthInsuranceOptionId ?? "",
    healthInsuranceMemberNumber: record.healthInsuranceMemberNumber ?? "",
    informationAwarenessOptionId: record.informationAwarenessOptionId,
    religionOptionId: record.religionOptionId,
    religionDetail: record.religionDetail ?? "",
    ecogScoreOptionId: record.ecogScoreOptionId,
    personalHistory: record.personalHistory ?? "",
    intervieweeFullName: record.intervieweeFullName,
    intervieweePhone: record.intervieweePhone ?? "",
    intervieweeRelationshipOptionId:
      record.intervieweeRelationshipOptionId ?? "",
    familyComposition: record.familyComposition ?? "",
    referredBy: record.referredBy ?? "",
    primaryDoctorId: record.primaryDoctorId ?? "",
    hasHomeCareDifficulties: record.hasHomeCareDifficulties,
    hasFuneralService: record.hasFuneralService,
    hasHomeCare: record.hasHomeCare,
    hasEmergencyService: record.hasEmergencyService,
    tumor: record.tumor ?? "",
    hasMetastasis: record.hasMetastasis,
    metastasisLocationOptionId: record.metastasisLocationOptionId ?? "",
    oncologicalTreatmentOptionId: record.oncologicalTreatmentOptionId,
    nonOncologicalDisease: record.nonOncologicalDisease ?? "",
    surgeryOptionIds: record.surgeryOptionIds,
    radiotherapy: record.radiotherapy ?? "",
    chemotherapy: record.chemotherapy ?? "",
    hemotherapy: record.hemotherapy ?? "",
    hasOpioidTreatment: record.hasOpioidTreatment,
    opioid: record.opioid ?? "",
    otherMedications: record.otherMedications ?? "",
    complementaryStudies: record.complementaryStudies ?? "",
  };
}

function nameOf(
  namesById: ReadonlyMap<string, string>,
  userId: string | null,
): string | null {
  return userId ? (namesById.get(userId) ?? null) : null;
}

export async function findAdmissionInterview(
  candidateId: string,
): Promise<AdmissionInterviewView | null> {
  const parsedId = admissionInterviewIdSchema.safeParse(candidateId);
  if (!parsedId.success) {
    return null;
  }
  const record = await findAdmissionInterviewRecord(parsedId.data);
  if (!record) {
    return null;
  }
  const userNames = await findUserNames(
    [
      record.createdByUserId,
      record.updatedByUserId,
      record.annulledByUserId,
    ].flatMap((userId) => (userId ? [userId] : [])),
  );
  return {
    id: record.id,
    details: toDetailsInput(record),
    version: toVersion(record.updatedAt),
    isAnnulled: record.annulledAt !== null,
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

function toSavedIds(optionId: string | undefined): string[] {
  return optionId ? [optionId] : [];
}

async function loadPrimaryDoctorField(
  access: UserAccess,
  savedIds: string[],
): Promise<CatalogFieldData> {
  return {
    catalog: HEALTHCARE_PROFESSIONALS_PICKER,
    options: await listSelectableHealthcareProfessionals(savedIds),
    canCreate: canCreateCatalogEntries(access, HEALTHCARE_PROFESSIONALS_PICKER),
  };
}

export async function loadInterviewFormOptions(
  access: UserAccess,
  saved: AdmissionInterviewDetailsInput | null,
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
    loadCatalogField(
      access,
      "health_insurance",
      toSavedIds(saved?.healthInsuranceOptionId),
    ),
    loadCatalogField(
      access,
      "information_awareness",
      toSavedIds(saved?.informationAwarenessOptionId),
    ),
    loadCatalogField(access, "religion", toSavedIds(saved?.religionOptionId)),
    loadCatalogField(
      access,
      "ecog_score",
      toSavedIds(saved?.ecogScoreOptionId),
    ),
    loadCatalogField(
      access,
      "relationship",
      toSavedIds(saved?.intervieweeRelationshipOptionId),
    ),
    loadPrimaryDoctorField(access, toSavedIds(saved?.primaryDoctorId)),
    loadCatalogField(
      access,
      "metastasis_location",
      toSavedIds(saved?.metastasisLocationOptionId),
    ),
    loadCatalogField(
      access,
      "oncological_treatment",
      toSavedIds(saved?.oncologicalTreatmentOptionId),
    ),
    loadCatalogField(access, "surgery", saved?.surgeryOptionIds ?? []),
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

export type AdmissionsReport = {
  windowDays: number;
  createdInWindowCount: number;
  activeCount: number;
  acceptedCount: number;
  pendingDecisionCount: number;
};

export async function getAdmissionsReport(
  acceptedInterviewIds: readonly string[],
  now: Date = new Date(),
): Promise<AdmissionsReport> {
  const counts = await countAdmissionInterviewsForReport(
    getReportWindowStart(now),
    acceptedInterviewIds,
  );
  return {
    windowDays: REPORT_WINDOW_DAYS,
    createdInWindowCount: counts.createdSinceCount,
    activeCount: counts.activeCount,
    acceptedCount: counts.acceptedCount,
    pendingDecisionCount: counts.activeCount - counts.acceptedCount,
  };
}
