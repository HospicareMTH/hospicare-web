import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import {
  type DatabaseTransaction,
  getDatabase,
} from "@/platform/database/client";

import { healthcareProfessionals } from "../tables";
import type { HealthcareProfessionalDetails } from "./schemas";

export type HealthcareProfessionalRecord = {
  id: string;
  fullName: string;
  specialty: string | null;
  licenseNumber: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

const RECORD_COLUMNS = {
  id: healthcareProfessionals.id,
  fullName: healthcareProfessionals.fullName,
  specialty: healthcareProfessionals.specialty,
  licenseNumber: healthcareProfessionals.licenseNumber,
  phone: healthcareProfessionals.phone,
  email: healthcareProfessionals.email,
  isActive: healthcareProfessionals.isActive,
};

export function listHealthcareProfessionals(): Promise<
  HealthcareProfessionalRecord[]
> {
  return getDatabase()
    .select(RECORD_COLUMNS)
    .from(healthcareProfessionals)
    .orderBy(asc(healthcareProfessionals.fullName));
}

export async function lockLatestProfessionalByEmail(
  transaction: DatabaseTransaction,
  email: string,
): Promise<{ id: string; isActive: boolean } | null> {
  const [professional] = await transaction
    .select({
      id: healthcareProfessionals.id,
      isActive: healthcareProfessionals.isActive,
    })
    .from(healthcareProfessionals)
    .where(eq(healthcareProfessionals.email, email))
    .orderBy(
      desc(healthcareProfessionals.isActive),
      desc(healthcareProfessionals.updatedAt),
    )
    .limit(1)
    .for("update");
  return professional ?? null;
}

export async function insertProfessional(
  transaction: DatabaseTransaction,
  details: HealthcareProfessionalDetails,
  actorUserId: string,
): Promise<void> {
  await transaction.insert(healthcareProfessionals).values({
    ...details,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  });
}

export async function reactivateProfessionalWithDetails(
  transaction: DatabaseTransaction,
  professionalId: string,
  details: HealthcareProfessionalDetails,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(healthcareProfessionals)
    .set({
      ...details,
      isActive: true,
      updatedByUserId: actorUserId,
      updatedAt: sql`now()`,
    })
    .where(eq(healthcareProfessionals.id, professionalId));
}

export async function updateProfessionalDetails(
  transaction: DatabaseTransaction,
  professionalId: string,
  details: HealthcareProfessionalDetails,
  actorUserId: string,
): Promise<boolean> {
  const updatedRows = await transaction
    .update(healthcareProfessionals)
    .set({ ...details, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(healthcareProfessionals.id, professionalId))
    .returning({ id: healthcareProfessionals.id });
  return updatedRows.length > 0;
}

export function lockProfessional(
  transaction: DatabaseTransaction,
  professionalId: string,
): Promise<{ email: string | null; isActive: boolean } | undefined> {
  return transaction
    .select({
      email: healthcareProfessionals.email,
      isActive: healthcareProfessionals.isActive,
    })
    .from(healthcareProfessionals)
    .where(eq(healthcareProfessionals.id, professionalId))
    .for("update")
    .then(([professional]) => professional);
}

export async function hasOtherActiveProfessionalWithEmail(
  transaction: DatabaseTransaction,
  professionalId: string,
  email: string,
): Promise<boolean> {
  const [professional] = await transaction
    .select({ id: healthcareProfessionals.id })
    .from(healthcareProfessionals)
    .where(
      and(
        eq(healthcareProfessionals.email, email),
        eq(healthcareProfessionals.isActive, true),
        ne(healthcareProfessionals.id, professionalId),
      ),
    )
    .limit(1);
  return professional !== undefined;
}

export async function saveProfessionalActive(
  transaction: DatabaseTransaction,
  professionalId: string,
  isActive: boolean,
  actorUserId: string,
): Promise<void> {
  await transaction
    .update(healthcareProfessionals)
    .set({ isActive, updatedByUserId: actorUserId, updatedAt: sql`now()` })
    .where(eq(healthcareProfessionals.id, professionalId));
}
