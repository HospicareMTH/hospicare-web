// @vitest-environment node
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { Permission, UserAccess } from "@/modules/access";
import { FAILED_SIGN_IN_ACTION } from "@/modules/audit";
import { getDatabase } from "@/platform/database/client";
import { resetTestDatabase } from "@/platform/database/test-database";

import { isAuditResource, LABELED_ACTIONS } from "./labels";
import {
  type ActivityLogListQuery,
  DEFAULT_ACTIVITY_LOG_SORT,
  parseActivityLogListQuery,
} from "./schemas";
import { searchActivityLog } from "./service";

function buildAccess(permissions: Permission[]): UserAccess {
  return {
    userId: randomUUID(),
    roleId: null,
    isSuperUser: false,
    permissions: new Set(permissions),
  };
}

const VIEWER = buildAccess(["admin.logs.view"]);

function buildQuery(
  overrides: Partial<ActivityLogListQuery> = {},
): ActivityLogListQuery {
  return {
    search: "",
    sort: DEFAULT_ACTIVITY_LOG_SORT,
    page: 1,
    pageSize: 50,
    operation: null,
    resource: null,
    ...overrides,
  };
}

async function insertUser(name: string): Promise<string> {
  const userId = randomUUID();
  await getDatabase().execute(
    sql`insert into users (id, name, email)
        values (${userId}, ${name}, ${`${userId}@hospicare.test`})`,
  );
  return userId;
}

type EntryInput = {
  action: string;
  operation: string;
  resource: string;
  occurredAt: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  status?: "success" | "failure";
};

async function insertEntry({
  action,
  operation,
  resource,
  occurredAt,
  actorUserId = null,
  targetUserId = null,
  status = "success",
}: EntryInput): Promise<void> {
  await getDatabase().execute(
    sql`insert into audit_log
          (action, operation, resource, actor_user_id, target_user_id, status, occurred_at)
        values (${action}, ${operation}::audit_operation, ${resource}, ${actorUserId},
                ${targetUserId}, ${status}::audit_status, ${occurredAt}::timestamptz)`,
  );
}

async function listActionLabels(
  overrides: Partial<ActivityLogListQuery> = {},
): Promise<string[]> {
  const activityLog = await searchActivityLog(VIEWER, buildQuery(overrides));
  return activityLog?.items.map((entry) => entry.actionLabel) ?? [];
}

describe("registro de actividad: consulta", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("RF-ROL-08: sin permiso para ver el registro no devuelve entradas", async () => {
    await insertEntry({
      action: "session.started",
      operation: "session",
      resource: "session",
      occurredAt: "2026-11-10T12:00:00-03:00",
    });

    expect(
      await searchActivityLog(buildAccess(["admin.users.view"]), buildQuery()),
    ).toBeNull();
  });

  it("RF-LOG-01: muestra fecha, acción, operación, recurso, responsable, estado y usuario afectado", async () => {
    const actorUserId = await insertUser("Ana Ficticia");
    const targetUserId = await insertUser("Bruno Ficticio");
    await insertEntry({
      action: "user_role.updated",
      operation: "update",
      resource: "user_role",
      occurredAt: "2026-11-10T12:00:00-03:00",
      actorUserId,
      targetUserId,
    });

    const activityLog = await searchActivityLog(
      VIEWER,
      buildQuery({ resource: "user_role" }),
    );

    expect(activityLog?.items).toEqual([
      expect.objectContaining({
        occurredAt: new Date("2026-11-10T15:00:00Z"),
        actionLabel: "Rol del usuario cambiado",
        operationLabel: "Actualización",
        resourceLabel: "Rol de usuario",
        actorName: "Ana Ficticia",
        targetUserName: "Bruno Ficticio",
        status: "success",
        statusLabel: "Completada",
      }),
    ]);
  });

  it("RN-25, RN-22: sin responsable figura Sistema, y la baja nombra la operación", async () => {
    await insertEntry({
      action: FAILED_SIGN_IN_ACTION,
      operation: "session",
      resource: "session",
      occurredAt: "2026-11-10T12:00:00-03:00",
      status: "failure",
    });
    await insertEntry({
      action: "admission_interview.annulled",
      operation: "delete",
      resource: "admission_interview",
      occurredAt: "2026-11-10T13:00:00-03:00",
    });

    const activityLog = await searchActivityLog(VIEWER, buildQuery());

    expect(
      activityLog?.items.map(
        ({ actionLabel, operationLabel, actorName, statusLabel }) => ({
          actionLabel,
          operationLabel,
          actorName,
          statusLabel,
        }),
      ),
    ).toEqual([
      {
        actionLabel: "Entrevista anulada",
        operationLabel: "Baja",
        actorName: "Sistema",
        statusLabel: "Completada",
      },
      {
        actionLabel: "Intento de ingreso fallido",
        operationLabel: "Sesión",
        actorName: "Sistema",
        statusLabel: "Fallida",
      },
    ]);
  });

  it("RF-LOG-01, RNF-07: una acción sin nombre se muestra con su recurso y operación, sin códigos internos", async () => {
    await insertEntry({
      action: "user.unlisted_event",
      operation: "create",
      resource: "user",
      occurredAt: "2026-11-10T12:00:00-03:00",
    });
    await insertEntry({
      action: "unlisted_resource.deleted",
      operation: "delete",
      resource: "unlisted_resource",
      occurredAt: "2026-11-10T13:00:00-03:00",
    });

    expect(await listActionLabels()).toEqual([
      "Otro registro: baja",
      "Usuario: alta",
    ]);
  });

  it("RF-LOG-02: busca por acción sin distinguir mayúsculas ni acentos", async () => {
    await insertEntry({
      action: "session.started",
      operation: "session",
      resource: "session",
      occurredAt: "2026-11-10T12:00:00-03:00",
    });
    await insertEntry({
      action: "catalog_option.created",
      operation: "create",
      resource: "catalog_option",
      occurredAt: "2026-11-10T13:00:00-03:00",
    });

    expect(await listActionLabels({ search: "SESION INICIADA" })).toEqual([
      "Sesión iniciada",
    ]);
    expect(await listActionLabels({ search: "opción" })).toEqual([
      "Opción creada",
    ]);
  });

  it("RF-LOG-02: busca por responsable, incluido Sistema", async () => {
    const actorUserId = await insertUser("Ramón Ficticio");
    await insertEntry({
      action: "role.created",
      operation: "create",
      resource: "role",
      occurredAt: "2026-11-10T12:00:00-03:00",
      actorUserId,
    });

    expect(await listActionLabels({ search: "ramon" })).toEqual(["Rol creado"]);
    expect(await listActionLabels({ search: "sistema" })).toEqual([
      "Usuario creado",
    ]);
    expect(await listActionLabels({ search: "%" })).toEqual([]);
  });

  it("RF-LOG-02: filtra por operación y por recurso", async () => {
    await insertEntry({
      action: "catalog_option.created",
      operation: "create",
      resource: "catalog_option",
      occurredAt: "2026-11-10T12:00:00-03:00",
    });
    await insertEntry({
      action: "catalog_option.deactivated",
      operation: "delete",
      resource: "catalog_option",
      occurredAt: "2026-11-10T13:00:00-03:00",
    });
    await insertEntry({
      action: "role.deleted",
      operation: "delete",
      resource: "role",
      occurredAt: "2026-11-10T14:00:00-03:00",
    });

    expect(await listActionLabels({ operation: "delete" })).toEqual([
      "Rol eliminado",
      "Opción desactivada",
    ]);
    expect(
      await listActionLabels({
        operation: "delete",
        resource: "catalog_option",
      }),
    ).toEqual(["Opción desactivada"]);
  });

  it("RF-LOG-02: ordena por fecha, de la más reciente a la más antigua por defecto", async () => {
    await insertEntry({
      action: "role.created",
      operation: "create",
      resource: "role",
      occurredAt: "2026-11-10T12:00:00-03:00",
    });
    await insertEntry({
      action: "role.updated",
      operation: "update",
      resource: "role",
      occurredAt: "2026-11-11T12:00:00-03:00",
    });

    expect(await listActionLabels()).toEqual(["Rol actualizado", "Rol creado"]);
    expect(
      await listActionLabels({
        sort: { key: "occurredAt", isDescending: false },
      }),
    ).toEqual(["Rol creado", "Rol actualizado"]);
  });

  it("RF-LOG-02, RF-TAB-01: pagina en el servidor", async () => {
    for (let minute = 0; minute < 51; minute += 1) {
      await insertEntry({
        action: "session.started",
        operation: "session",
        resource: "session",
        occurredAt: `2026-11-10T12:${String(minute).padStart(2, "0")}:00-03:00`,
      });
    }

    const secondPage = await searchActivityLog(VIEWER, buildQuery({ page: 2 }));

    expect(secondPage).toMatchObject({
      totalCount: 51,
      page: 2,
      pageCount: 2,
      pageSize: 50,
    });
    expect(secondPage?.items.map((entry) => entry.occurredAt)).toEqual([
      new Date("2026-11-10T15:00:00Z"),
    ]);
  });

  it("RF-LOG-02, RF-TAB-01: ignora filtros desconocidos en la dirección", () => {
    expect(
      parseActivityLogListQuery({
        operacion: "delete",
        recurso: "otra_tabla",
        orden: "occurredAt",
      }),
    ).toMatchObject({
      operation: "delete",
      resource: null,
      sort: { key: "occurredAt", isDescending: false },
    });
  });
});

const AUDITED_CODE_PATTERN = /'([a-z_]+)\.([a-z_]+)'/g;
const DATABASE_SETTING_PREFIX = "hospicare";

const TRIGGER_EVENTS = [
  { bit: 4, suffix: "created" },
  { bit: 8, suffix: "deleted" },
  { bit: 16, suffix: "updated" },
] as const;

async function listGenericTriggerActions(): Promise<string[]> {
  const result = await getDatabase().execute<{
    resource: string;
    events: number;
  }>(
    sql`select split_part(encode(audit_trigger.tgargs, 'escape'), '\\000', 1) as resource,
               audit_trigger.tgtype::int as events
        from pg_trigger audit_trigger
        join pg_proc trigger_function on trigger_function.oid = audit_trigger.tgfoid
        where trigger_function.proname = 'audit_row_change'
          and not audit_trigger.tgisinternal`,
  );
  return result.rows.flatMap(({ resource, events }) =>
    TRIGGER_EVENTS.filter(({ bit }) => (events & bit) !== 0).map(
      ({ suffix }) => `${resource}.${suffix}`,
    ),
  );
}

async function listExplicitTriggerActions(): Promise<string[]> {
  const result = await getDatabase().execute<{ source: string }>(
    sql`select audit_function.prosrc as source
        from pg_proc audit_function
        join pg_namespace function_schema on function_schema.oid = audit_function.pronamespace
        where function_schema.nspname = 'public'
          and audit_function.prosrc like '%audit%'`,
  );
  return result.rows.flatMap(({ source }) =>
    [...source.matchAll(AUDITED_CODE_PATTERN)]
      .filter(([, prefix]) => prefix !== DATABASE_SETTING_PREFIX)
      .map(([code]) => code.slice(1, -1)),
  );
}

describe("registro de actividad: nombres", () => {
  it("RF-LOG-01, RNF-07: toda acción que se registra tiene nombre, igual que su recurso", async () => {
    const recordedActions = new Set([
      ...(await listGenericTriggerActions()),
      ...(await listExplicitTriggerActions()),
      FAILED_SIGN_IN_ACTION,
    ]);

    expect([...recordedActions]).toEqual(
      expect.arrayContaining([
        "role_permission.deleted",
        "user.two_factor_enabled",
        "admission_interview.annulled",
      ]),
    );
    const labeledActions = new Set(LABELED_ACTIONS);
    const unlabeledActions = [...recordedActions].filter(
      (action) => !labeledActions.has(action),
    );
    const unlabeledResources = [...recordedActions]
      .map((action) => action.split(".")[0] ?? "")
      .filter((resource) => !isAuditResource(resource));

    expect(unlabeledActions).toEqual([]);
    expect(unlabeledResources).toEqual([]);
  });
});
