ALTER TABLE "catalog_options" ADD CONSTRAINT "catalog_options_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "catalog_options" ADD CONSTRAINT "catalog_options_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "catalog_options" ("catalog", "label", "description", "sort_order", "is_system")
SELECT "seed"."catalog"::"catalog", "seed"."label", "seed"."description", "seed"."sort_order", true
FROM (VALUES
  ('relationship', 'Hija/o', 'Vínculo familiar directo.', 10),
  ('relationship', 'Cónyuge', 'Pareja o cónyuge del huésped.', 20),
  ('relationship', 'Hermana/o', 'Hermana o hermano del huésped.', 30),
  ('relationship', 'Madre', 'Madre del huésped.', 40),
  ('relationship', 'Padre', 'Padre del huésped.', 50),
  ('relationship', 'Nieto/a', 'Nieto o nieta del huésped.', 60),
  ('relationship', 'Cuidador/a', 'Persona cuidadora principal.', 70),
  ('relationship', 'Otro', 'Otro vínculo declarado.', 80),
  ('health_insurance', 'OSDE', 'Cobertura médica privada.', 10),
  ('health_insurance', 'Swiss Medical', 'Cobertura médica privada.', 20),
  ('health_insurance', 'Galeno', 'Cobertura médica privada.', 30),
  ('health_insurance', 'Medifé', 'Cobertura médica privada.', 40),
  ('health_insurance', 'Omint', 'Cobertura médica privada.', 50),
  ('health_insurance', 'Sancor Salud', 'Cobertura médica privada.', 60),
  ('health_insurance', 'Hospital Italiano', 'Plan de salud institucional.', 70),
  ('health_insurance', 'Accord Salud', 'Cobertura médica y obra social.', 80),
  ('health_insurance', 'Medicus', 'Cobertura médica privada.', 90),
  ('health_insurance', 'Avalian', 'Cobertura médica privada.', 100),
  ('health_insurance', 'OSDEPYM', 'Obra social y medicina prepaga.', 110),
  ('health_insurance', 'OSECAC', 'Obra social de empleados de comercio.', 120),
  ('health_insurance', 'IOMA', 'Obra social de la Provincia de Buenos Aires.', 130),
  ('health_insurance', 'PAMI', 'Instituto Nacional de Servicios Sociales para Jubilados y Pensionados.', 140),
  ('health_insurance', 'Unión Personal', 'Obra social sindical.', 150),
  ('health_insurance', 'Luis Pasteur', 'Obra social del personal de dirección.', 160),
  ('health_insurance', 'Federada Salud', 'Cobertura médica mutual.', 170),
  ('health_insurance', 'Prevención Salud', 'Cobertura médica privada.', 180),
  ('information_awareness', 'Total, conoce el diagnóstico y el pronóstico', NULL, 10),
  ('information_awareness', 'Parcial, conoce el diagnóstico pero no el pronóstico', NULL, 20),
  ('information_awareness', 'No le dijeron', NULL, 30),
  ('information_awareness', 'No quiere la familia', NULL, 40),
  ('information_awareness', 'No pregunta', NULL, 50),
  ('information_awareness', 'No quiere el huésped', NULL, 60),
  ('information_awareness', 'No está en condiciones de recibirla', NULL, 70),
  ('religion', 'Ninguna', NULL, 10),
  ('religion', 'Católico', NULL, 20),
  ('religion', 'Judío', NULL, 30),
  ('religion', 'Evangelista', NULL, 40),
  ('religion', 'Mormón', NULL, 50),
  ('religion', 'Testigo de Jehová', NULL, 60),
  ('religion', 'Otra', NULL, 70),
  ('ecog_score', 'Asintomático, actividad normal', NULL, 10),
  ('ecog_score', 'Sintomático, realiza actividades cotidianas', NULL, 20),
  ('ecog_score', 'Sintomático, en cama menos del 50% del día', NULL, 30),
  ('ecog_score', 'Sintomático, en cama más del 50% del día', NULL, 40),
  ('ecog_score', 'Sintomático, todo el día en cama', NULL, 50),
  ('ecog_score', 'Huésped muriente', NULL, 60),
  ('oncological_treatment', 'No recibirá', NULL, 10),
  ('oncological_treatment', 'Suspensión definitiva', NULL, 20),
  ('oncological_treatment', 'No convencional', NULL, 30),
  ('hospitalization_reason', 'Situación de difícil control en últimos días', NULL, 10),
  ('hospitalization_reason', 'Ausencia o insuficiencia de soporte familiar y/o cuidadores', NULL, 20),
  ('hospitalization_reason', 'Alta demanda de cuidado de enfermería', NULL, 30),
  ('hospitalization_reason', 'Desgaste del cuidador principal', NULL, 40),
  ('hospitalization_reason', 'Angustia existencial y/o sufrimiento espiritual', NULL, 50),
  ('hospitalization_reason', 'Dificultades para gestionar materiales específicos en domicilio', 'Material ortopédico, oxigenoterapia, aspirador portátil, bombas de perfusión continua o fármacos de uso hospitalario.', 60),
  ('hospitalization_reason', 'Insuficiente cobertura de cuidados paliativos en domicilio', NULL, 70),
  ('uncontrolled_symptom', 'Dolor', NULL, 10),
  ('uncontrolled_symptom', 'Disnea', NULL, 20),
  ('uncontrolled_symptom', 'Delirium', NULL, 30),
  ('ambulation', 'Normal', NULL, 10),
  ('ambulation', 'Con ayuda', NULL, 20),
  ('ambulation', 'Con silla de ruedas', NULL, 30),
  ('ambulation', 'No deambula', NULL, 40),
  ('ambulation_cause', 'Progresión de la enfermedad', NULL, 10),
  ('ambulation_cause', 'Lesión neurológica', NULL, 20),
  ('hygiene', 'Independiente', NULL, 10),
  ('hygiene', 'Dependencia en cama', NULL, 20),
  ('hygiene', 'Dependencia baño', NULL, 30),
  ('bathroom_transfer', 'Sí', NULL, 10),
  ('bathroom_transfer', 'Con ayuda', NULL, 20),
  ('bathroom_transfer', 'No', NULL, 30),
  ('mouth', 'Sana', NULL, 10),
  ('mouth', 'Seca', NULL, 20),
  ('mouth', 'Dolorosa', NULL, 30),
  ('mouth', 'Sangrante', NULL, 40),
  ('mouth', 'Mucositis', NULL, 50),
  ('mouth', 'Micosis', NULL, 60),
  ('mouth', 'Prótesis', NULL, 70),
  ('swallowing', 'Normal', NULL, 10),
  ('swallowing', 'Leve', NULL, 20),
  ('swallowing', 'Moderado', NULL, 30),
  ('swallowing', 'Severo', NULL, 40),
  ('nutrition', 'Come solo', NULL, 10),
  ('nutrition', 'Con ayuda', NULL, 20),
  ('nutrition', 'Sin ingesta oral', NULL, 30),
  ('nutrition', 'Sonda nasogástrica', NULL, 40),
  ('hydration', 'Normal', NULL, 10),
  ('hydration', 'Deshidratado', NULL, 20),
  ('hydration_route', 'Oral', NULL, 10),
  ('hydration_route', 'Subcutáneo', NULL, 20),
  ('hydration_route', 'Intravenosa', NULL, 30),
  ('abdomen', 'Normal', NULL, 10),
  ('abdomen', 'Distendido', NULL, 20),
  ('abdomen', 'Doloroso', NULL, 30),
  ('diuresis', 'Normal', NULL, 10),
  ('diuresis', 'Pañal', NULL, 20),
  ('diuresis', 'Incontinencia', NULL, 30),
  ('diuresis', 'Sonda vesical', NULL, 40),
  ('urine', 'Normal', NULL, 10),
  ('urine', 'Hematúrica', NULL, 20),
  ('urine', 'Colúrica', NULL, 30),
  ('urine', 'Con sedimento', NULL, 40),
  ('catarsis', 'Normal', NULL, 10),
  ('catarsis', 'Pañal', NULL, 20),
  ('catarsis', 'Incontinencia', NULL, 30),
  ('catarsis', 'Constipación', NULL, 40),
  ('catarsis', 'Diarrea', NULL, 50),
  ('catarsis_consistency', 'Normal', NULL, 10),
  ('catarsis_consistency', 'Dura', NULL, 20),
  ('catarsis_consistency', 'Con sangre', NULL, 30),
  ('respiratory', 'Normal', NULL, 10),
  ('respiratory', 'Dificultad respiratoria', NULL, 20),
  ('respiratory', 'Disnea', NULL, 30),
  ('respiratory', 'Tos', NULL, 40),
  ('epicrisis_sedation_medication', 'Midazolam', NULL, 10),
  ('epicrisis_sedation_medication', 'Morfina', NULL, 20),
  ('epicrisis_sedation_medication', 'Levomepromazina', NULL, 30),
  ('epicrisis_sedation_medication', 'Haloperidol', NULL, 40),
  ('epicrisis_sedation_medication', 'Hioscina', NULL, 50),
  ('epicrisis_sedation_reason', 'Delirio', NULL, 10),
  ('epicrisis_sedation_reason', 'Disnea', NULL, 20),
  ('epicrisis_sedation_reason', 'Dolor', NULL, 30),
  ('epicrisis_sedation_reason', 'Otro', NULL, 40)
) AS "seed" ("catalog", "label", "description", "sort_order");
--> statement-breakpoint
CREATE FUNCTION "audit_catalog_option_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  "position_columns" text[] := ARRAY['sort_order', 'updated_at', 'updated_by_user_id'];
  "previous_row" jsonb;
  "next_row" jsonb := to_jsonb(NEW) - 'normalized_label';
  "action_name" text;
  "operation_name" "audit_operation";
BEGIN
  IF TG_OP = 'INSERT' THEN
    "action_name" := 'catalog_option.created';
    "operation_name" := 'create';
  ELSE
    "previous_row" := to_jsonb(OLD) - 'normalized_label';
    IF "previous_row" = "next_row" THEN
      RETURN NULL;
    END IF;
    "operation_name" := 'update';
    IF OLD."is_active" AND NOT NEW."is_active" THEN
      "action_name" := 'catalog_option.deactivated';
      "operation_name" := 'delete';
    ELSIF NOT OLD."is_active" AND NEW."is_active" THEN
      "action_name" := 'catalog_option.reactivated';
    ELSIF ("previous_row" - "position_columns") = ("next_row" - "position_columns") THEN
      "action_name" := 'catalog_option.reordered';
    ELSE
      "action_name" := 'catalog_option.updated';
    END IF;
  END IF;

  INSERT INTO "audit_log" (
    "action", "operation", "resource", "resource_id", "actor_user_id",
    "status", "previous_value", "new_value"
  ) VALUES (
    "action_name", "operation_name", 'catalog_option', NEW."id"::text,
    "audit_actor_user_id"(), 'success', "previous_row", "next_row"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "catalog_options_audit" AFTER INSERT OR UPDATE ON "catalog_options"
FOR EACH ROW EXECUTE FUNCTION "audit_catalog_option_change"();
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "catalog_options" FROM hospicare_app;
  END IF;
END;
$$;
