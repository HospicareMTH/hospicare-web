type PermissionGroupDefinition = {
  key: string;
  label: string;
  permissions: readonly { key: string; label: string }[];
};

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
