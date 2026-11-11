CREATE TYPE "public"."catalog" AS ENUM('relationship', 'health_insurance', 'information_awareness', 'religion', 'ecog_score', 'oncological_treatment', 'metastasis_location', 'surgery', 'hospitalization_reason', 'uncontrolled_symptom', 'ambulation', 'ambulation_cause', 'hygiene', 'bathroom_transfer', 'mouth', 'swallowing', 'nutrition', 'hydration', 'hydration_route', 'abdomen', 'diuresis', 'urine', 'catarsis', 'catarsis_consistency', 'respiratory', 'epicrisis_sedation_medication', 'epicrisis_sedation_reason');--> statement-breakpoint
CREATE TABLE "catalog_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog" "catalog" NOT NULL,
	"label" text NOT NULL,
	"normalized_label" text GENERATED ALWAYS AS (lower(translate(btrim("label"), 'ÁÉÍÓÚÜÀÈÌÒÙÂÊÎÔÛÄËÏÖáéíóúüàèìòùâêîôûäëïö', 'aeiouuaeiouaeiouaeioaeiouuaeiouaeiouaeio'))) STORED,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_options_catalog_normalized_label_index" ON "catalog_options" USING btree ("catalog","normalized_label");--> statement-breakpoint
CREATE INDEX "catalog_options_catalog_sort_order_index" ON "catalog_options" USING btree ("catalog","sort_order");