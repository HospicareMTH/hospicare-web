type PermissionGroupDefinition = {
  key: string;
  label: string;
  permissions: readonly { key: string; label: string }[];
};

function catalogPermissionGroup<Key extends string>(key: Key, label: string) {
  return {
    key,
    label,
    permissions: [
      { key: `admin.${key}.view`, label: "Ver" },
      { key: `admin.${key}.create`, label: "Crear" },
      { key: `admin.${key}.update`, label: "Modificar" },
      { key: `admin.${key}.delete`, label: "Desactivar" },
    ],
  } as const;
}

export const PERMISSION_GROUPS = [
  {
    key: "roles",
    label: "Roles",
    permissions: [
      { key: "admin.roles.view", label: "Ver" },
      { key: "admin.roles.create", label: "Crear" },
      { key: "admin.roles.update", label: "Modificar" },
      { key: "admin.roles.delete", label: "Eliminar" },
      { key: "admin.roles.assign_permissions", label: "Asignar permisos" },
    ],
  },
  {
    key: "users",
    label: "Usuarios",
    permissions: [
      { key: "admin.users.view", label: "Ver" },
      { key: "admin.users.create", label: "Crear" },
      { key: "admin.users.update", label: "Cambiar el rol" },
      { key: "admin.users.revoke", label: "Revocar y restaurar accesos" },
    ],
  },
  {
    key: "invitations",
    label: "Invitaciones",
    permissions: [
      { key: "admin.invitations.view", label: "Ver" },
      { key: "admin.invitations.create", label: "Invitar" },
      { key: "admin.invitations.delete", label: "Revocar" },
    ],
  },
  catalogPermissionGroup("relationship_types", "Vínculos"),
  catalogPermissionGroup("healthcare_professionals", "Profesionales de salud"),
  catalogPermissionGroup("health_insurance_providers", "Obras sociales"),
  catalogPermissionGroup(
    "information_awareness_options",
    "Información general",
  ),
  catalogPermissionGroup("religion_options", "Religiones"),
  catalogPermissionGroup("ecog_score_options", "ECOG"),
  catalogPermissionGroup(
    "oncological_treatment_options",
    "Tratamientos oncológicos",
  ),
  catalogPermissionGroup(
    "metastasis_location_options",
    "Lugares de metástasis",
  ),
  catalogPermissionGroup("surgery_options", "Cirugías"),
  catalogPermissionGroup(
    "guest_clinical_catalog_options",
    "Opciones clínicas de huéspedes",
  ),
  {
    key: "documentation",
    label: "Documentación",
    permissions: [{ key: "documentation.app.view", label: "Ver" }],
  },
] as const satisfies readonly PermissionGroupDefinition[];

export type Permission =
  (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((permission) => permission.key),
);

const PERMISSION_KEYS: ReadonlySet<string> = new Set(ALL_PERMISSIONS);

export function isPermission(candidate: string): candidate is Permission {
  return PERMISSION_KEYS.has(candidate);
}
