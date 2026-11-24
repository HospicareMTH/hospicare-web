ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_created_by_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_ambulation_option_fk" FOREIGN KEY ("ambulation_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_ambulation_cause_option_fk" FOREIGN KEY ("ambulation_cause_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_ecog_score_option_fk" FOREIGN KEY ("ecog_score_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_bathroom_transfer_option_fk" FOREIGN KEY ("bathroom_transfer_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_swallowing_option_fk" FOREIGN KEY ("swallowing_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_nutrition_option_fk" FOREIGN KEY ("nutrition_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_hydration_option_fk" FOREIGN KEY ("hydration_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_hydration_route_option_fk" FOREIGN KEY ("hydration_route_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_abdomen_option_fk" FOREIGN KEY ("abdomen_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_diuresis_option_fk" FOREIGN KEY ("diuresis_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_urine_option_fk" FOREIGN KEY ("urine_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_admission_evaluations" ADD CONSTRAINT "physical_evaluations_respiratory_option_fk" FOREIGN KEY ("respiratory_option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_hygiene_options" ADD CONSTRAINT "physical_evaluation_hygiene_evaluation_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."physical_admission_evaluations"("guest_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_hygiene_options" ADD CONSTRAINT "physical_evaluation_hygiene_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_mouth_options" ADD CONSTRAINT "physical_evaluation_mouth_evaluation_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."physical_admission_evaluations"("guest_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_mouth_options" ADD CONSTRAINT "physical_evaluation_mouth_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_catarsis_options" ADD CONSTRAINT "physical_evaluation_catarsis_evaluation_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."physical_admission_evaluations"("guest_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_catarsis_options" ADD CONSTRAINT "physical_evaluation_catarsis_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_catarsis_consistency_options" ADD CONSTRAINT "physical_evaluation_catarsis_consistency_evaluation_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."physical_admission_evaluations"("guest_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "physical_evaluation_catarsis_consistency_options" ADD CONSTRAINT "physical_evaluation_catarsis_consistency_option_fk" FOREIGN KEY ("option_id") REFERENCES "public"."catalog_options"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
UPDATE "catalog_options" SET "system_key" = 'ambulation_cause_neurological_lesion'
WHERE "catalog" = 'ambulation_cause' AND "is_system" AND "label" = 'Lesión neurológica';
--> statement-breakpoint
CREATE TRIGGER "physical_admission_evaluations_audit" AFTER INSERT OR UPDATE ON "physical_admission_evaluations"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('physical_evaluation', 'guest_id', '');
--> statement-breakpoint
CREATE TRIGGER "physical_evaluation_hygiene_options_audit" AFTER INSERT OR UPDATE OR DELETE ON "physical_evaluation_hygiene_options"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('physical_evaluation_hygiene', 'guest_id', '');
--> statement-breakpoint
CREATE TRIGGER "physical_evaluation_mouth_options_audit" AFTER INSERT OR UPDATE OR DELETE ON "physical_evaluation_mouth_options"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('physical_evaluation_mouth', 'guest_id', '');
--> statement-breakpoint
CREATE TRIGGER "physical_evaluation_catarsis_options_audit" AFTER INSERT OR UPDATE OR DELETE ON "physical_evaluation_catarsis_options"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('physical_evaluation_catarsis', 'guest_id', '');
--> statement-breakpoint
CREATE TRIGGER "physical_evaluation_catarsis_consistency_options_audit" AFTER INSERT OR UPDATE OR DELETE ON "physical_evaluation_catarsis_consistency_options"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('physical_evaluation_catarsis_consistency', 'guest_id', '');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "physical_admission_evaluations" FROM hospicare_app;
    REVOKE TRUNCATE ON "physical_evaluation_hygiene_options" FROM hospicare_app;
    REVOKE TRUNCATE ON "physical_evaluation_mouth_options" FROM hospicare_app;
    REVOKE TRUNCATE ON "physical_evaluation_catarsis_options" FROM hospicare_app;
    REVOKE TRUNCATE ON "physical_evaluation_catarsis_consistency_options" FROM hospicare_app;
  END IF;
END;
$$;
