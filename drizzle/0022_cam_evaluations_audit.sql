ALTER TABLE "cam_evaluations" ADD CONSTRAINT "cam_evaluations_guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cam_evaluations" ADD CONSTRAINT "cam_evaluations_created_by_user_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "cam_evaluations" ADD CONSTRAINT "cam_evaluations_updated_by_user_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
CREATE TRIGGER "cam_evaluations_audit" AFTER INSERT OR UPDATE ON "cam_evaluations"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('cam_evaluation', 'guest_id', '');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "cam_evaluations" FROM hospicare_app;
  END IF;
END;
$$;
