import type { CatalogPermissionGroup, Permission } from "@/modules/access";

import type { catalog } from "./tables";

export type CatalogKey = (typeof catalog.enumValues)[number];

export const CATALOG_GROUPS = ["admissions", "guests"] as const;

export type CatalogGroup = (typeof CATALOG_GROUPS)[number];

export const CATALOG_GROUP_LABELS: Record<CatalogGroup, string> = {
  admissions: "Admisiones",
  guests: "Huéspedes",
};

export type CatalogPermissionAction = "view" | "create" | "update" | "delete";

export type CatalogPermissionScope = {
  permissionGroup: CatalogPermissionGroup;
};

type CatalogIdentity = CatalogPermissionScope & {
  slug: string;
  label: string;
  group: CatalogGroup;
};

export type CatalogDefinition = CatalogIdentity & {
  kind: "options";
  key: CatalogKey;
  isReorderable: boolean;
};

export type HealthcareProfessionalsCatalogDefinition = CatalogIdentity & {
  kind: "healthcareProfessionals";
};

export type CatalogEntry =
  CatalogDefinition | HealthcareProfessionalsCatalogDefinition;

export function catalogPermission(
  definition: CatalogPermissionScope,
  action: CatalogPermissionAction,
): Permission {
  return `admin.${definition.permissionGroup}.${action}`;
}

function guestCatalog(
  key: CatalogKey,
  slug: string,
  label: string,
): CatalogDefinition {
  return {
    kind: "options",
    key,
    slug,
    label,
    group: "guests",
    permissionGroup: "guest_clinical_catalog_options",
    isReorderable: true,
  };
}

export const CATALOG_DEFINITIONS: readonly CatalogDefinition[] = [
  {
    kind: "options",
    key: "relationship",
    slug: "vinculos",
    label: "Vínculos",
    group: "admissions",
    permissionGroup: "relationship_types",
    isReorderable: false,
  },
  {
    kind: "options",
    key: "health_insurance",
    slug: "obras-sociales",
    label: "Obras sociales",
    group: "admissions",
    permissionGroup: "health_insurance_providers",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "information_awareness",
    slug: "informacion-general",
    label: "Información general",
    group: "admissions",
    permissionGroup: "information_awareness_options",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "religion",
    slug: "religion",
    label: "Religión",
    group: "admissions",
    permissionGroup: "religion_options",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "ecog_score",
    slug: "ecog",
    label: "ECOG",
    group: "admissions",
    permissionGroup: "ecog_score_options",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "oncological_treatment",
    slug: "tratamiento-oncologico",
    label: "Tratamiento oncológico",
    group: "admissions",
    permissionGroup: "oncological_treatment_options",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "metastasis_location",
    slug: "lugar-de-metastasis",
    label: "Lugar de metástasis",
    group: "admissions",
    permissionGroup: "metastasis_location_options",
    isReorderable: true,
  },
  {
    kind: "options",
    key: "surgery",
    slug: "cirugia",
    label: "Cirugía",
    group: "admissions",
    permissionGroup: "surgery_options",
    isReorderable: true,
  },
  guestCatalog(
    "hospitalization_reason",
    "motivo-de-internacion",
    "Motivo de internación",
  ),
  guestCatalog(
    "uncontrolled_symptom",
    "sintomas-no-controlados",
    "Síntomas no controlados",
  ),
  guestCatalog("ambulation", "deambulacion", "Deambulación"),
  guestCatalog(
    "ambulation_cause",
    "causa-de-deambulacion",
    "Causa de deambulación",
  ),
  guestCatalog("hygiene", "higiene", "Higiene y arreglo personal"),
  guestCatalog("bathroom_transfer", "traslado-al-bano", "Traslado al baño"),
  guestCatalog("mouth", "boca", "Boca"),
  guestCatalog("swallowing", "deglucion", "Deglución"),
  guestCatalog("nutrition", "nutricion", "Nutrición"),
  guestCatalog("hydration", "hidratacion", "Hidratación"),
  guestCatalog(
    "hydration_route",
    "forma-de-hidratacion",
    "Forma de hidratación",
  ),
  guestCatalog("abdomen", "abdomen", "Abdomen"),
  guestCatalog("diuresis", "diuresis", "Diuresis"),
  guestCatalog("urine", "orinas", "Orinas"),
  guestCatalog("catarsis", "catarsis", "Catarsis"),
  guestCatalog(
    "catarsis_consistency",
    "consistencia-de-catarsis",
    "Consistencia de catarsis",
  ),
  guestCatalog("respiratory", "aparato-respiratorio", "Aparato respiratorio"),
  guestCatalog(
    "epicrisis_sedation_medication",
    "medicacion-para-sedacion",
    "Medicación para sedación en epicrisis",
  ),
  guestCatalog(
    "epicrisis_sedation_reason",
    "motivos-de-sedacion",
    "Motivos de sedación en epicrisis",
  ),
];

export const HEALTHCARE_PROFESSIONALS_CATALOG: HealthcareProfessionalsCatalogDefinition =
  {
    kind: "healthcareProfessionals",
    slug: "profesionales-de-salud",
    label: "Profesionales de salud",
    group: "admissions",
    permissionGroup: "healthcare_professionals",
  };

// Profesionales va después de Vínculos, el mismo orden que en los permisos.
export const CATALOG_ENTRIES: readonly CatalogEntry[] =
  CATALOG_DEFINITIONS.flatMap((definition) =>
    definition.key === "relationship"
      ? [definition, HEALTHCARE_PROFESSIONALS_CATALOG]
      : [definition],
  );

export function findCatalogByKey(key: CatalogKey): CatalogDefinition {
  const definition = CATALOG_DEFINITIONS.find(
    (candidate) => candidate.key === key,
  );
  if (!definition) {
    throw new Error(`El catálogo ${key} no tiene definición.`);
  }
  return definition;
}
