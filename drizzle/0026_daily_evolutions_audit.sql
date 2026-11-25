ALTER TABLE "daily_evolutions" ADD CONSTRAINT "daily_evolutions_guest_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "daily_evolutions" ADD CONSTRAINT "daily_evolutions_author_user_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "system_settings" ("key", "value") VALUES ('daily_evolution_edit_window', '{"mode": "duration", "amount": 24, "unit": "hours"}');
--> statement-breakpoint
CREATE TRIGGER "daily_evolutions_audit" AFTER INSERT OR UPDATE ON "daily_evolutions"
FOR EACH ROW EXECUTE FUNCTION "audit_row_change"('daily_evolution', 'id', '');
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'hospicare_app') THEN
    REVOKE DELETE, TRUNCATE ON "daily_evolutions" FROM hospicare_app;
  END IF;
END;
$$;
