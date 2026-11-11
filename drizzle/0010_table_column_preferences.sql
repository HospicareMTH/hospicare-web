CREATE TABLE "table_column_preferences" (
	"user_id" text NOT NULL,
	"table_key" text NOT NULL,
	"hidden_columns" text[] DEFAULT '{}'::text[] NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "table_column_preferences_user_id_table_key_pk" PRIMARY KEY("user_id","table_key")
);
--> statement-breakpoint
ALTER TABLE "table_column_preferences" ADD CONSTRAINT "table_column_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;