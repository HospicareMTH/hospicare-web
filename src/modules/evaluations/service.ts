import { findUserNames, type UserAccess } from "@/modules/access";
import {
  type CatalogFieldData,
  findNeurologicalLesionCauseOptionId,
  listSelectableCatalogOptions,
  loadCatalogField,
  validateCatalogSelection,
} from "@/modules/catalogs";
import {
  guestIdSchema,
  listActiveGuestIds,
  lockGuestForClinicalChange,
} from "@/modules/guests";
import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import {
  type ActionResult,
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import {
  countCamEvaluationsForReport,
  countPhysicalEvaluationsForReport,
  findCamEvaluationRecordOfGuest,
  findPhysicalEvaluationRecordOfGuest,
  insertCamEvaluation,
  insertPhysicalEvaluation,
  lockCamEvaluationRecordOfGuest,
  lockPhysicalEvaluationRecordOfGuest,
  type PhysicalEvaluationRecord,
  updateCamEvaluationRecord,
  updatePhysicalEvaluationRecord,
} from "./repository";
import {
  type CamEvaluationDetails,
  type CamEvaluationInput,
  mapPhysicalEvaluationCatalogFields,
  NEUROLOGICAL_LESION_DETAIL_MISSING_MESSAGE,
  PHYSICAL_EVALUATION_CATALOG_FIELD_KEYS,
  PHYSICAL_EVALUATION_CATALOG_FIELDS,
  type PhysicalEvaluationCatalogField,
  type PhysicalEvaluationDetails,
  type PhysicalEvaluationField,
  type PhysicalEvaluationInput,
  toSelectedOptionIds,
} from "./schemas";
import type { CamStoppingCriterion } from "./tables";

export const CAM_EVALUATION_REJECTION_MESSAGES = {
  alreadyExists:
    "Este huésped ya tiene su evaluación CAM. Actualizá la pantalla para verla y modificarla.",
  notFound:
    "Este huésped todavía no tiene evaluación CAM. Actualizá la pantalla para cargarla.",
  changedMeanwhile:
    "Otra persona cambió la evaluación CAM mientras la editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

function toVersion(updatedAt: Date): string {
  return updatedAt.toISOString();
}

export function createCamEvaluation(
  actorUserId: string,
  guestId: string,
  details: CamEvaluationDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForClinicalChange(
      transaction,
      guestId,
    );
    if (guestRejection) {
      return guestRejection;
    }
    if (await lockCamEvaluationRecordOfGuest(transaction, guestId)) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.alreadyExists);
    }
    await insertCamEvaluation(transaction, guestId, details, actorUserId);
    return SUCCESS;
  });
}

export function updateCamEvaluation(
  actorUserId: string,
  guestId: string,
  expectedVersion: string,
  details: CamEvaluationDetails,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForClinicalChange(
      transaction,
      guestId,
    );
    if (guestRejection) {
      return guestRejection;
    }
    const saved = await lockCamEvaluationRecordOfGuest(transaction, guestId);
    if (!saved) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.notFound);
    }
    if (toVersion(saved.updatedAt) !== expectedVersion) {
      return reject(CAM_EVALUATION_REJECTION_MESSAGES.changedMeanwhile);
    }
    await updateCamEvaluationRecord(
      transaction,
      saved.id,
      details,
      actorUserId,
    );
    return SUCCESS;
  });
}

export type CamEvaluationView = {
  version: string;
  input: CamEvaluationInput;
  isDeliriumLikely: boolean;
  stoppedAtCriterion: CamStoppingCriterion | null;
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
};

export async function findCamEvaluationOfGuest(
  candidateGuestId: string,
): Promise<CamEvaluationView | null> {
  const parsedGuestId = guestIdSchema.safeParse(candidateGuestId);
  if (!parsedGuestId.success) {
    return null;
  }
  const record = await findCamEvaluationRecordOfGuest(parsedGuestId.data);
  if (!record) {
    return null;
  }
  const userNames = await findUserNames(
    [record.createdByUserId, record.updatedByUserId].flatMap((userId) =>
      userId ? [userId] : [],
    ),
  );
  const nameOf = (userId: string | null) =>
    userId ? (userNames.get(userId) ?? null) : null;
  return {
    version: toVersion(record.updatedAt),
    input: {
      evaluationDate: record.evaluationDate,
      acuteOnset: record.acuteOnset,
      inattention: record.inattention,
      disorganizedThinking: record.disorganizedThinking,
      alteredConsciousness: record.alteredConsciousness,
      observations: record.observations ?? "",
    },
    isDeliriumLikely: record.isDeliriumLikely,
    stoppedAtCriterion: record.stoppedAtCriterion,
    createdAt: record.createdAt,
    createdByName: nameOf(record.createdByUserId),
    updatedAt: record.updatedAt,
    updatedByName: nameOf(record.updatedByUserId),
  };
}

export const PHYSICAL_EVALUATION_REJECTION_MESSAGES = {
  alreadyExists:
    "Este huésped ya tiene su evaluación física de ingreso. Actualizá la pantalla para verla y modificarla.",
  notFound:
    "Este huésped todavía no tiene evaluación física de ingreso. Actualizá la pantalla para cargarla.",
  changedMeanwhile:
    "Otra persona cambió la evaluación física de ingreso mientras la editabas, así que tus cambios no se guardaron. Actualizá la pantalla para ver la versión actual.",
} as const;

export type PhysicalEvaluationSavedSelections = Record<
  PhysicalEvaluationCatalogField,
  string[]
>;

async function resolveCatalogFields<Value>(
  toValue: (field: PhysicalEvaluationCatalogField) => Promise<Value>,
): Promise<Record<PhysicalEvaluationCatalogField, Value>> {
  const resolved = await Promise.all(
    PHYSICAL_EVALUATION_CATALOG_FIELD_KEYS.map(async (field) => ({
      field,
      value: await toValue(field),
    })),
  );
  return mapPhysicalEvaluationCatalogFields((field) => {
    const entry = resolved.find((candidate) => candidate.field === field);
    if (!entry) {
      throw new Error(`No se resolvió el campo de catálogo ${field}.`);
    }
    return entry.value;
  });
}

type FieldErrors = Partial<Record<PhysicalEvaluationField, string[]>>;

function toSavedSelections(
  source: Pick<PhysicalEvaluationDetails, PhysicalEvaluationCatalogField>,
): PhysicalEvaluationSavedSelections {
  return mapPhysicalEvaluationCatalogFields((field) =>
    toSelectedOptionIds(source[field]),
  );
}

async function findSelectionErrors(
  transaction: DatabaseTransaction,
  details: PhysicalEvaluationDetails,
  saved: PhysicalEvaluationSavedSelections | null,
): Promise<FieldErrors> {
  const fieldErrors: FieldErrors = {};
  const selected = toSavedSelections(details);
  // Una transacción usa una sola conexión: las consultas van una detrás de otra.
  for (const field of PHYSICAL_EVALUATION_CATALOG_FIELD_KEYS) {
    const result = await validateCatalogSelection(
      transaction,
      PHYSICAL_EVALUATION_CATALOG_FIELDS[field].catalog,
      selected[field],
      saved?.[field] ?? [],
    );
    if (result.status === "rejected") {
      fieldErrors[field] = [result.message];
    }
  }
  return fieldErrors;
}

type NeurologicalLesionCheck =
  | { status: "valid"; details: PhysicalEvaluationDetails }
  | { status: "invalid"; fieldErrors: FieldErrors };

// RN-12 y RN-13: el detalle se pide solo con la causa de sistema "Lesión neurológica".
async function applyNeurologicalLesionRule(
  details: PhysicalEvaluationDetails,
): Promise<NeurologicalLesionCheck> {
  const neurologicalLesionOptionId =
    await findNeurologicalLesionCauseOptionId();
  const isNeurologicalLesion =
    details.ambulationCauseOptionId !== null &&
    details.ambulationCauseOptionId === neurologicalLesionOptionId;
  if (!isNeurologicalLesion) {
    return {
      status: "valid",
      details: { ...details, neurologicalLesionDetail: null },
    };
  }
  if (!details.neurologicalLesionDetail) {
    return {
      status: "invalid",
      fieldErrors: {
        neurologicalLesionDetail: [NEUROLOGICAL_LESION_DETAIL_MISSING_MESSAGE],
      },
    };
  }
  return { status: "valid", details };
}

async function validatePhysicalEvaluation(
  transaction: DatabaseTransaction,
  details: PhysicalEvaluationDetails,
  saved: PhysicalEvaluationSavedSelections | null,
): Promise<NeurologicalLesionCheck> {
  const lesionCheck = await applyNeurologicalLesionRule(details);
  const selectionErrors = await findSelectionErrors(
    transaction,
    details,
    saved,
  );
  const fieldErrors = {
    ...(lesionCheck.status === "invalid" ? lesionCheck.fieldErrors : {}),
    ...selectionErrors,
  };
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid", fieldErrors };
  }
  return lesionCheck;
}

export function createPhysicalEvaluation(
  actorUserId: string,
  guestId: string,
  details: PhysicalEvaluationDetails,
): Promise<ActionResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForClinicalChange(
      transaction,
      guestId,
    );
    if (guestRejection) {
      return guestRejection;
    }
    if (await lockPhysicalEvaluationRecordOfGuest(transaction, guestId)) {
      return reject(PHYSICAL_EVALUATION_REJECTION_MESSAGES.alreadyExists);
    }
    const validation = await validatePhysicalEvaluation(
      transaction,
      details,
      null,
    );
    if (validation.status === "invalid") {
      return validation;
    }
    await insertPhysicalEvaluation(
      transaction,
      guestId,
      validation.details,
      actorUserId,
    );
    return SUCCESS;
  });
}

export function updatePhysicalEvaluation(
  actorUserId: string,
  guestId: string,
  expectedVersion: string,
  details: PhysicalEvaluationDetails,
): Promise<ActionResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const guestRejection = await lockGuestForClinicalChange(
      transaction,
      guestId,
    );
    if (guestRejection) {
      return guestRejection;
    }
    const saved = await lockPhysicalEvaluationRecordOfGuest(
      transaction,
      guestId,
    );
    if (!saved) {
      return reject(PHYSICAL_EVALUATION_REJECTION_MESSAGES.notFound);
    }
    if (toVersion(saved.updatedAt) !== expectedVersion) {
      return reject(PHYSICAL_EVALUATION_REJECTION_MESSAGES.changedMeanwhile);
    }
    const validation = await validatePhysicalEvaluation(
      transaction,
      details,
      toSavedSelections(saved),
    );
    if (validation.status === "invalid") {
      return validation;
    }
    await updatePhysicalEvaluationRecord(
      transaction,
      saved,
      validation.details,
      actorUserId,
    );
    return SUCCESS;
  });
}

function toPhysicalEvaluationInput(
  record: PhysicalEvaluationRecord,
): PhysicalEvaluationInput {
  return {
    evaluationDate: record.evaluationDate,
    painScore: record.painScore,
    tirednessScore: record.tirednessScore,
    nauseaScore: record.nauseaScore,
    depressionScore: record.depressionScore,
    anxietyScore: record.anxietyScore,
    drowsinessScore: record.drowsinessScore,
    appetiteScore: record.appetiteScore,
    dyspneaScore: record.dyspneaScore,
    sleepDifficultyScore: record.sleepDifficultyScore,
    wellbeingScore: record.wellbeingScore,
    heartRate: record.heartRate ?? "",
    bloodPressure: record.bloodPressure ?? "",
    respiratoryRate: record.respiratoryRate ?? "",
    temperature: record.temperature ?? "",
    painCause: record.painCause ?? "",
    painLocation: record.painLocation ?? "",
    painIntensity: record.painIntensity ?? "",
    painType: record.painType ?? "",
    ambulationOptionId: record.ambulationOptionId ?? "",
    ambulationCauseOptionId: record.ambulationCauseOptionId ?? "",
    neurologicalLesionDetail: record.neurologicalLesionDetail ?? "",
    ecogScoreOptionId: record.ecogScoreOptionId ?? "",
    bathroomTransferOptionId: record.bathroomTransferOptionId ?? "",
    hygieneOptionIds: record.hygieneOptionIds,
    mouthOptionIds: record.mouthOptionIds,
    swallowingOptionId: record.swallowingOptionId ?? "",
    nutritionOptionId: record.nutritionOptionId ?? "",
    hydrationOptionId: record.hydrationOptionId ?? "",
    hydrationRouteOptionId: record.hydrationRouteOptionId ?? "",
    abdomenOptionId: record.abdomenOptionId ?? "",
    diuresisOptionId: record.diuresisOptionId ?? "",
    urineOptionId: record.urineOptionId ?? "",
    catarsisOptionIds: record.catarsisOptionIds,
    catarsisConsistencyOptionIds: record.catarsisConsistencyOptionIds,
    lastCatarsisDate: record.lastCatarsisDate ?? "",
    respiratoryOptionId: record.respiratoryOptionId ?? "",
    expectorationType: record.expectorationType ?? "",
    hasPressureUlcers: record.hasPressureUlcers,
    pressureUlcerStage: record.pressureUlcerStage ?? "",
    pressureUlcerLocation: record.pressureUlcerLocation ?? "",
    otherSkinLesions: record.otherSkinLesions ?? "",
    hasEdemas: record.hasEdemas,
    edemaLocation: record.edemaLocation ?? "",
    hasOstomies: record.hasOstomies,
    ostomyType: record.ostomyType ?? "",
    otherDisorders: record.otherDisorders ?? "",
    carePlan: record.carePlan ?? "",
  };
}

export type PhysicalEvaluationOptionLabels = Record<
  PhysicalEvaluationCatalogField,
  string[]
>;

function findOptionLabels(
  savedSelections: PhysicalEvaluationSavedSelections,
): Promise<PhysicalEvaluationOptionLabels> {
  return resolveCatalogFields(async (field) => {
    const savedIds = savedSelections[field];
    if (savedIds.length === 0) {
      return [];
    }
    const options = await listSelectableCatalogOptions(
      PHYSICAL_EVALUATION_CATALOG_FIELDS[field].catalog,
      savedIds,
    );
    return options
      .filter((option) => savedIds.includes(option.id))
      .map((option) => option.label);
  });
}

export type PhysicalEvaluationView = {
  version: string;
  input: PhysicalEvaluationInput;
  savedSelections: PhysicalEvaluationSavedSelections;
  optionLabels: PhysicalEvaluationOptionLabels;
  createdAt: Date;
  createdByName: string | null;
  updatedAt: Date;
  updatedByName: string | null;
};

export async function findPhysicalEvaluationOfGuest(
  candidateGuestId: string,
): Promise<PhysicalEvaluationView | null> {
  const parsedGuestId = guestIdSchema.safeParse(candidateGuestId);
  if (!parsedGuestId.success) {
    return null;
  }
  const record = await findPhysicalEvaluationRecordOfGuest(parsedGuestId.data);
  if (!record) {
    return null;
  }
  const savedSelections = toSavedSelections(record);
  const [optionLabels, userNames] = await Promise.all([
    findOptionLabels(savedSelections),
    findUserNames(
      [record.createdByUserId, record.updatedByUserId].flatMap((userId) =>
        userId ? [userId] : [],
      ),
    ),
  ]);
  const nameOf = (userId: string | null) =>
    userId ? (userNames.get(userId) ?? null) : null;
  return {
    version: toVersion(record.updatedAt),
    input: toPhysicalEvaluationInput(record),
    savedSelections,
    optionLabels,
    createdAt: record.createdAt,
    createdByName: nameOf(record.createdByUserId),
    updatedAt: record.updatedAt,
    updatedByName: nameOf(record.updatedByUserId),
  };
}

export type PhysicalEvaluationFormCatalogs = {
  fields: Record<PhysicalEvaluationCatalogField, CatalogFieldData>;
  neurologicalLesionCauseOptionId: string | null;
};

export async function loadPhysicalEvaluationCatalogs(
  access: UserAccess,
  savedSelections: PhysicalEvaluationSavedSelections | null,
): Promise<PhysicalEvaluationFormCatalogs> {
  const [fields, neurologicalLesionCauseOptionId] = await Promise.all([
    resolveCatalogFields((field) =>
      loadCatalogField(
        access,
        PHYSICAL_EVALUATION_CATALOG_FIELDS[field].catalog,
        savedSelections?.[field] ?? [],
      ),
    ),
    findNeurologicalLesionCauseOptionId(),
  ]);
  return { fields, neurologicalLesionCauseOptionId };
}

export type EvaluationFindingsReport = {
  camEvaluatedCount: number;
  deliriumLikelyCount: number;
  physicalEvaluatedCount: number;
  pressureUlcerCount: number;
};

export async function getEvaluationFindingsReport(): Promise<EvaluationFindingsReport> {
  const activeGuestIds = await listActiveGuestIds();
  const camCounts = await countCamEvaluationsForReport(activeGuestIds);
  const physicalCounts =
    await countPhysicalEvaluationsForReport(activeGuestIds);
  return {
    camEvaluatedCount: camCounts.evaluatedCount,
    deliriumLikelyCount: camCounts.deliriumLikelyCount,
    physicalEvaluatedCount: physicalCounts.evaluatedCount,
    pressureUlcerCount: physicalCounts.pressureUlcerCount,
  };
}
