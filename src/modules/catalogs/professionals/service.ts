import {
  type DatabaseTransaction,
  runInTransactionAs,
} from "@/platform/database/client";
import { isUniqueViolation } from "@/platform/database/errors";
import {
  type Comparator,
  compareText,
  type ListPage,
  paginateList,
} from "@/platform/list-query";
import {
  type ActionResult,
  type FailedActionResult,
  type OperationResult,
  reject,
  SUCCESS,
} from "@/platform/operation-result";

import type { CatalogOptionState } from "../schemas";
import {
  checkCatalogSelection,
  isCatalogEntryId,
  type SelectableCatalogEntry,
} from "../selection";
import {
  countActiveProfessionals,
  findActiveProfessionalSpecialtyByEmail,
  findProfessionalsByIds,
  type HealthcareProfessionalRecord,
  hasOtherActiveProfessionalWithEmail,
  insertProfessional,
  listHealthcareProfessionals,
  listSelectableProfessionalRecords,
  lockLatestProfessionalByEmail,
  lockProfessional,
  reactivateProfessionalWithDetails,
  saveProfessionalActive,
  updateProfessionalDetails,
} from "./repository";
import type {
  HealthcareProfessionalListQuery,
  HealthcareProfessionalSortKey,
} from "./list-query";
import type { HealthcareProfessionalDetails } from "./schemas";

const HEALTHCARE_PROFESSIONAL_COMPARATORS: Record<
  HealthcareProfessionalSortKey,
  Comparator<HealthcareProfessionalRecord>
> = {
  fullName: (first, second) => compareText(first.fullName, second.fullName),
};

function matchesState(
  professional: HealthcareProfessionalRecord,
  state: CatalogOptionState,
): boolean {
  if (state === "all") {
    return true;
  }
  return professional.isActive === (state === "active");
}

function searchableText(professional: HealthcareProfessionalRecord): string {
  return [
    professional.fullName,
    professional.specialty,
    professional.licenseNumber,
    professional.email,
  ]
    .filter((text) => text !== null)
    .join(" ");
}

export async function searchHealthcareProfessionals({
  state,
  ...query
}: HealthcareProfessionalListQuery): Promise<
  ListPage<HealthcareProfessionalRecord>
> {
  const professionals = (await listHealthcareProfessionals()).filter(
    (professional) => matchesState(professional, state),
  );
  return paginateList(
    professionals,
    query,
    searchableText,
    HEALTHCARE_PROFESSIONAL_COMPARATORS,
  );
}

export const HEALTHCARE_PROFESSIONAL_REJECTION_MESSAGES = {
  professionalMissing: "El profesional ya no existe. Actualizá la pantalla.",
} as const;

function rejectDuplicateEmail(email: string | null): FailedActionResult {
  return {
    status: "invalid",
    fieldErrors: {
      email: [`Ya hay un profesional activo con el correo ${email}.`],
    },
  };
}

export type CreateHealthcareProfessionalResult =
  | FailedActionResult
  | { status: "success"; wasReactivated: boolean; professionalId: string };

export async function createHealthcareProfessional(
  actorUserId: string,
  details: HealthcareProfessionalDetails,
): Promise<CreateHealthcareProfessionalResult> {
  try {
    return await runInTransactionAs(actorUserId, async (transaction) => {
      const existing = details.email
        ? await lockLatestProfessionalByEmail(transaction, details.email)
        : null;
      if (existing?.isActive) {
        return rejectDuplicateEmail(details.email);
      }
      if (existing) {
        await reactivateProfessionalWithDetails(
          transaction,
          existing.id,
          details,
          actorUserId,
        );
        return {
          status: "success",
          wasReactivated: true,
          professionalId: existing.id,
        };
      }
      return {
        status: "success",
        wasReactivated: false,
        professionalId: await insertProfessional(
          transaction,
          details,
          actorUserId,
        ),
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return rejectDuplicateEmail(details.email);
    }
    throw error;
  }
}

export async function updateHealthcareProfessional(
  actorUserId: string,
  professionalId: string,
  details: HealthcareProfessionalDetails,
): Promise<ActionResult> {
  try {
    const wasUpdated = await runInTransactionAs(actorUserId, (transaction) =>
      updateProfessionalDetails(
        transaction,
        professionalId,
        details,
        actorUserId,
      ),
    );
    return wasUpdated
      ? SUCCESS
      : reject(HEALTHCARE_PROFESSIONAL_REJECTION_MESSAGES.professionalMissing);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return rejectDuplicateEmail(details.email);
    }
    throw error;
  }
}

export function setHealthcareProfessionalActive(
  actorUserId: string,
  professionalId: string,
  isActive: boolean,
): Promise<OperationResult> {
  return runInTransactionAs(actorUserId, async (transaction) => {
    const professional = await lockProfessional(transaction, professionalId);
    if (!professional) {
      return reject(
        HEALTHCARE_PROFESSIONAL_REJECTION_MESSAGES.professionalMissing,
      );
    }
    if (professional.isActive === isActive) {
      return SUCCESS;
    }
    const isEmailTaken =
      isActive &&
      professional.email !== null &&
      (await hasOtherActiveProfessionalWithEmail(
        transaction,
        professionalId,
        professional.email,
      ));
    if (isEmailTaken) {
      return reject(
        `No se puede reactivar porque ya hay un profesional activo con el correo ${professional.email}. Para reactivarlo, primero cambiá el correo de uno de los dos.`,
      );
    }
    await saveProfessionalActive(
      transaction,
      professionalId,
      isActive,
      actorUserId,
    );
    return SUCCESS;
  });
}

export function countActiveHealthcareProfessionals(): Promise<number> {
  return countActiveProfessionals();
}

export function listSelectableHealthcareProfessionals(
  savedProfessionalIds: readonly string[] = [],
): Promise<SelectableCatalogEntry[]> {
  return listSelectableProfessionalRecords(
    savedProfessionalIds.filter(isCatalogEntryId),
  );
}

export async function validateHealthcareProfessionalSelection(
  transaction: DatabaseTransaction,
  selectedProfessionalIds: readonly string[],
  savedProfessionalIds: readonly string[],
): Promise<OperationResult> {
  if (!selectedProfessionalIds.every(isCatalogEntryId)) {
    return reject(
      HEALTHCARE_PROFESSIONAL_REJECTION_MESSAGES.professionalMissing,
    );
  }
  const foundProfessionals =
    selectedProfessionalIds.length === 0
      ? []
      : await findProfessionalsByIds(transaction, selectedProfessionalIds);
  return checkCatalogSelection(
    selectedProfessionalIds,
    savedProfessionalIds,
    foundProfessionals,
    HEALTHCARE_PROFESSIONAL_REJECTION_MESSAGES.professionalMissing,
  );
}

// RF-EVO-03: la especialidad con la que firma un profesional activo, buscado por correo.
export function findActiveProfessionalSpecialty(
  email: string,
): Promise<string | null> {
  return findActiveProfessionalSpecialtyByEmail(email);
}
