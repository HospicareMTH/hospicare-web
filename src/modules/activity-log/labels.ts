import type { AuditOperation, AuditStatus } from "@/modules/audit";
import { normalizeForSearch } from "@/platform/list-query";

export const OPERATION_LABELS: Record<AuditOperation, string> = {
  create: "Alta",
  update: "Actualización",
  delete: "Baja",
  access: "Acceso",
  session: "Sesión",
  security: "Seguridad",
};

export const STATUS_LABELS: Record<AuditStatus, string> = {
  success: "Completada",
  failure: "Fallida",
};

export const SYSTEM_ACTOR_LABEL = "Sistema";

const UNKNOWN_RESOURCE_LABEL = "Otro registro";

export const RESOURCE_LABELS = {
  session: "Sesión",
  user: "Usuario",
  account: "Datos de ingreso",
  two_factor: "Segundo factor",
  role: "Rol",
  user_role: "Rol de usuario",
  role_permission: "Permisos de rol",
  invitation: "Invitación",
  table_column_preference: "Columnas de listados",
  catalog_option: "Opción de catálogo",
  healthcare_professional: "Profesional de salud",
  admission_interview: "Entrevista de admisión",
  admission_interview_surgery: "Cirugía de entrevista",
  guest: "Huésped",
  guest_hospitalization_reason: "Motivo de internación",
  guest_uncontrolled_symptom: "Síntoma no controlado",
  cam_evaluation: "Evaluación CAM",
  system_setting: "Configuración",
} as const;

export type AuditResource = keyof typeof RESOURCE_LABELS;

const ACTION_LABELS = {
  "session.started": "Sesión iniciada",
  "session.revoked": "Sesión cerrada",
  "session.sign_in_failed": "Intento de ingreso fallido",
  "user.created": "Usuario creado",
  "user.updated": "Usuario actualizado",
  "user.deleted": "Usuario eliminado",
  "user.email_verified": "Correo verificado",
  "user.password_reset": "Contraseña restablecida",
  "user.password_updated": "Contraseña cambiada",
  "user.two_factor_enabled": "Segundo factor activado",
  "user.two_factor_disabled": "Segundo factor desactivado",
  "user.role_updated": "Rol del usuario cambiado",
  "user.access_revoked": "Acceso revocado",
  "user.access_restored": "Acceso restaurado",
  "account.created": "Datos de ingreso creados",
  "account.updated": "Datos de ingreso actualizados",
  "account.deleted": "Datos de ingreso eliminados",
  "two_factor.created": "Datos del segundo factor creados",
  "two_factor.updated": "Datos del segundo factor actualizados",
  "two_factor.deleted": "Datos del segundo factor eliminados",
  "two_factor.backup_codes_updated": "Códigos de respaldo generados",
  "role.created": "Rol creado",
  "role.updated": "Rol actualizado",
  "role.deleted": "Rol eliminado",
  "role.permissions_updated": "Permisos del rol actualizados",
  "user_role.created": "Rol asignado al usuario",
  "user_role.updated": "Rol del usuario cambiado",
  "user_role.deleted": "Rol quitado al usuario",
  "role_permission.created": "Permiso asignado al rol",
  "role_permission.updated": "Permiso del rol actualizado",
  "role_permission.deleted": "Permiso quitado al rol",
  "invitation.created": "Invitación creada",
  "invitation.updated": "Invitación actualizada",
  "invitation.accepted": "Invitación aceptada",
  "invitation.revoked": "Invitación revocada",
  "invitation.deleted": "Invitación eliminada",
  "table_column_preference.created": "Columnas del listado guardadas",
  "table_column_preference.updated": "Columnas del listado cambiadas",
  "table_column_preference.deleted": "Columnas del listado restablecidas",
  "catalog_option.created": "Opción creada",
  "catalog_option.updated": "Opción actualizada",
  "catalog_option.deactivated": "Opción desactivada",
  "catalog_option.reactivated": "Opción reactivada",
  "catalog_option.reordered": "Orden de la opción cambiado",
  "healthcare_professional.created": "Profesional creado",
  "healthcare_professional.updated": "Profesional actualizado",
  "healthcare_professional.deactivated": "Profesional desactivado",
  "healthcare_professional.reactivated": "Profesional reactivado",
  "admission_interview.created": "Entrevista creada",
  "admission_interview.updated": "Entrevista actualizada",
  "admission_interview.annulled": "Entrevista anulada",
  "admission_interview_surgery.created": "Cirugía agregada",
  "admission_interview_surgery.updated": "Cirugía actualizada",
  "admission_interview_surgery.deleted": "Cirugía quitada",
  "guest.created_from_admission": "Huésped creado desde admisión",
  "guest.created_manually": "Huésped creado sin entrevista",
  "guest.updated": "Huésped actualizado",
  "guest.annulled": "Huésped anulado",
  "guest_hospitalization_reason.created": "Motivo de internación agregado",
  "guest_hospitalization_reason.updated": "Motivo de internación actualizado",
  "guest_hospitalization_reason.deleted": "Motivo de internación quitado",
  "guest_uncontrolled_symptom.created": "Síntoma no controlado agregado",
  "guest_uncontrolled_symptom.updated": "Síntoma no controlado actualizado",
  "guest_uncontrolled_symptom.deleted": "Síntoma no controlado quitado",
  "cam_evaluation.created": "Evaluación CAM creada",
  "cam_evaluation.updated": "Evaluación CAM actualizada",
  "system_setting.updated": "Parámetros actualizados",
} as const;

const ACTION_LABELS_BY_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries(ACTION_LABELS),
);

const RESOURCE_LABELS_BY_CODE: ReadonlyMap<string, string> = new Map(
  Object.entries(RESOURCE_LABELS),
);

export const LABELED_ACTIONS: readonly string[] = [
  ...ACTION_LABELS_BY_CODE.keys(),
];

export function isAuditResource(candidate: string): candidate is AuditResource {
  return RESOURCE_LABELS_BY_CODE.has(candidate);
}

export const AUDIT_RESOURCES: readonly AuditResource[] =
  Object.keys(RESOURCE_LABELS).filter(isAuditResource);

export function labelResource(resource: string): string {
  return RESOURCE_LABELS_BY_CODE.get(resource) ?? UNKNOWN_RESOURCE_LABEL;
}

export function labelAction(
  action: string,
  resource: string,
  operation: AuditOperation,
): string {
  return (
    ACTION_LABELS_BY_CODE.get(action) ??
    `${labelResource(resource)}: ${OPERATION_LABELS[operation].toLocaleLowerCase("es-AR")}`
  );
}

export function findActionsWithLabelContaining(searchTerm: string): string[] {
  const normalizedTerm = normalizeForSearch(searchTerm);
  return [...ACTION_LABELS_BY_CODE]
    .filter(([, label]) => normalizeForSearch(label).includes(normalizedTerm))
    .map(([action]) => action);
}

export function isSystemActorMatching(searchTerm: string): boolean {
  return normalizeForSearch(SYSTEM_ACTOR_LABEL).includes(
    normalizeForSearch(searchTerm),
  );
}
