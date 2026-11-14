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

const CATALOG_PERMISSION_GROUPS = [
  catalogPermissionGroup("relationship_types", "Vínculos"),
  catalogPermissionGroup("healthcare_professionals", "Profesionales"),
  catalogPermissionGroup("health_insurance_providers", "Obras sociales"),
  catalogPermissionGroup(
    "information_awareness_options",
    "Información general",
  ),
  catalogPermissionGroup("religion_options", "Religión"),
  catalogPermissionGroup("ecog_score_options", "ECOG"),
  catalogPermissionGroup(
    "oncological_treatment_options",
    "Tratamiento oncológico",
  ),
  catalogPermissionGroup("metastasis_location_options", "Lugar de metástasis"),
  catalogPermissionGroup("surgery_options", "Cirugía"),
  catalogPermissionGroup(
    "guest_clinical_catalog_options",
    "Opciones clínicas de huéspedes",
  ),
] as const;

export type CatalogPermissionGroup =
  (typeof CATALOG_PERMISSION_GROUPS)[number]["key"];

export const CATALOG_VIEW_PERMISSIONS = CATALOG_PERMISSION_GROUPS.map(
  (group) => group.permissions[0].key,
);

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
  ...CATALOG_PERMISSION_GROUPS,
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
