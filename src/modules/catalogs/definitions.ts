import type { Permission } from "@/modules/access";

import type { catalog } from "./tables";

export type CatalogKey = (typeof catalog.enumValues)[number];

export const CATALOG_GROUPS = ["admissions", "guests"] as const;

export type CatalogGroup = (typeof CATALOG_GROUPS)[number];

export const CATALOG_GROUP_LABELS: Record<CatalogGroup, string> = {
  admissions: "Admisiones",
  guests: "Huéspedes",
};

export type CatalogDefinition = {
  key: CatalogKey;
  slug: string;
  label: string;
  group: CatalogGroup;
  viewPermission: Permission;
};

const GUEST_VIEW_PERMISSION = "admin.guest_clinical_catalog_options.view";

function guestCatalog(
  key: CatalogKey,
  slug: string,
  label: string,
): CatalogDefinition {
  return {
    key,
    slug,
    label,
    group: "guests",
    viewPermission: GUEST_VIEW_PERMISSION,
  };
}

export const CATALOG_DEFINITIONS: readonly CatalogDefinition[] = [
  {
    key: "relationship",
    slug: "vinculos",
    label: "Vínculos",
    group: "admissions",
    viewPermission: "admin.relationship_types.view",
  },
  {
    key: "health_insurance",
    slug: "obras-sociales",
    label: "Obras sociales",
    group: "admissions",
    viewPermission: "admin.health_insurance_providers.view",
  },
  {
    key: "information_awareness",
    slug: "informacion-general",
    label: "Información general",
    group: "admissions",
    viewPermission: "admin.information_awareness_options.view",
  },
  {
    key: "religion",
    slug: "religion",
    label: "Religión",
    group: "admissions",
    viewPermission: "admin.religion_options.view",
  },
  {
    key: "ecog_score",
    slug: "ecog",
    label: "ECOG",
    group: "admissions",
    viewPermission: "admin.ecog_score_options.view",
  },
  {
    key: "oncological_treatment",
    slug: "tratamiento-oncologico",
    label: "Tratamiento oncológico",
    group: "admissions",
    viewPermission: "admin.oncological_treatment_options.view",
  },
  {
    key: "metastasis_location",
    slug: "lugar-de-metastasis",
    label: "Lugar de metástasis",
    group: "admissions",
    viewPermission: "admin.metastasis_location_options.view",
  },
  {
    key: "surgery",
    slug: "cirugia",
    label: "Cirugía",
    group: "admissions",
    viewPermission: "admin.surgery_options.view",
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
