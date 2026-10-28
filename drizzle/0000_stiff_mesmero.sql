CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'other' NOT NULL,
	"calendar_type" text NOT NULL,
	"recurrence" text NOT NULL,
	"month" smallint,
	"day" smallint,
	"leap_month" boolean DEFAULT false NOT NULL,
	"anchor_date" date,
	"remind_time" time DEFAULT '08:00' NOT NULL,
	"remind_days_before" integer[] DEFAULT '{0}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"color" text DEFAULT 'rose' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text,
	"avatar_url" text,
	"default_remind_time" time DEFAULT '08:00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminders_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"days_before" integer NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_log_dedupe_key" UNIQUE("event_id","occurrence_date","days_before","channel")
);
--> statement-breakpoint
CREATE INDEX "events_user_active_idx" ON "events" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "events_scheduler_idx" ON "events" USING btree ("is_active","recurrence");--> statement-breakpoint
CREATE INDEX "reminders_log_user_idx" ON "reminders_log" USING btree ("user_id","created_at");