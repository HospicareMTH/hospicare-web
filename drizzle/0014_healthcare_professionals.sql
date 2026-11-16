CREATE TABLE "healthcare_professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"specialty" text,
	"license_number" text,
	"phone" text,
	"email" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "healthcare_professionals_email_index" ON "healthcare_professionals" USING btree ("email") WHERE "healthcare_professionals"."is_active" and "healthcare_professionals"."email" is not null;--> statement-breakpoint
CREATE INDEX "healthcare_professionals_full_name_index" ON "healthcare_professionals" USING btree ("full_name");