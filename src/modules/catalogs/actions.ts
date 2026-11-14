"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { requirePermission } from "@/modules/access";
import {
  type ActionResult,
  refreshOnSuccess,
  reject,
  toInvalidResult,
  toRejectedResult,
} from "@/platform/operation-result";

import {
  catalogPermission,
  findCatalogByKey,
  type CatalogKey,
} from "./definitions";
import { findCatalogOfOption } from "./repository";
import {
  catalogOptionDetailsSchema,
  type CatalogOptionDetailsInput,
  catalogOptionIdSchema,
} from "./schemas";
import {
  CATALOG_REJECTION_MESSAGES,
  createCatalogOption,
  type CreateCatalogOptionResult,
  setCatalogOptionActive,
  updateCatalogOption,
} from "./service";
import { catalog } from "./tables";

type CatalogAction = "create" | "update" | "delete";

const catalogKeySchema = z.enum(catalog.enumValues, {
  error: "El catálogo no es válido.",
});

async function requireCatalogPermission(
  catalogKey: CatalogKey,
  action: CatalogAction,
): Promise<string> {
  const { access } = await requirePermission(
    catalogPermission(findCatalogByKey(catalogKey), action),
  );
  return access.userId;
}

async function requireOptionPermission(
  optionId: string,
  action: CatalogAction,
): Promise<{ actorUserId: string } | ActionResult> {
  const parsedOptionId = catalogOptionIdSchema.safeParse(optionId);
  if (!parsedOptionId.success) {
    return toRejectedResult(parsedOptionId.error);
  }
  const catalogKey = await findCatalogOfOption(parsedOptionId.data);
  if (!catalogKey) {
    return reject(CATALOG_REJECTION_MESSAGES.optionMissing);
  }
  return { actorUserId: await requireCatalogPermission(catalogKey, action) };
}

export async function createCatalogOptionAction(
  catalogKey: string,
  input: CatalogOptionDetailsInput,
): Promise<CreateCatalogOptionResult> {
  const parsedCatalogKey = catalogKeySchema.safeParse(catalogKey);
  if (!parsedCatalogKey.success) {
    return toRejectedResult(parsedCatalogKey.error);
  }
  const actorUserId = await requireCatalogPermission(
    parsedCatalogKey.data,
    "create",
  );
  const details = catalogOptionDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  const result = await createCatalogOption(
    actorUserId,
    parsedCatalogKey.data,
    details.data,
  );
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export async function updateCatalogOptionAction(
  optionId: string,
  input: CatalogOptionDetailsInput,
): Promise<ActionResult> {
  const permission = await requireOptionPermission(optionId, "update");
  if (!("actorUserId" in permission)) {
    return permission;
  }
  const details = catalogOptionDetailsSchema.safeParse(input);
  if (!details.success) {
    return toInvalidResult(details.error);
  }
  const result = await updateCatalogOption(
    permission.actorUserId,
    optionId,
    details.data,
  );
  if (result.status === "success") {
    refresh();
  }
  return result;
}

export async function deactivateCatalogOptionAction(
  optionId: string,
): Promise<ActionResult> {
  const permission = await requireOptionPermission(optionId, "delete");
  if (!("actorUserId" in permission)) {
    return permission;
  }
  return refreshOnSuccess(
    await setCatalogOptionActive(permission.actorUserId, optionId, false),
  );
}

export async function reactivateCatalogOptionAction(
  optionId: string,
): Promise<ActionResult> {
  const permission = await requireOptionPermission(optionId, "update");
  if (!("actorUserId" in permission)) {
    return permission;
  }
  return refreshOnSuccess(
    await setCatalogOptionActive(permission.actorUserId, optionId, true),
  );
}
