CREATE EXTENSION IF NOT EXISTS "vector";
CREATE TYPE "public"."event" AS ENUM('scrape_og');--> statement-breakpoint
CREATE TYPE "public"."link_state" AS ENUM('processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"description" text,
	"image" text,
	"state" "link_state" NOT NULL,
	"notes" jsonb,
	"notes_text" text,
	"embedding" vector(1536),
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"is_system" boolean NOT NULL,
	"user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "link_tags_to_links" (
	"link_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "link_tags_to_links_link_id_tag_id_pk" PRIMARY KEY("link_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "scraping_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"event" "event" NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"link_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"email" varchar NOT NULL,
	"password" text,
	"google_id" varchar,
	"profile_picture" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "link" ADD CONSTRAINT "link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tag" ADD CONSTRAINT "link_tag_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tags_to_links" ADD CONSTRAINT "link_tags_to_links_link_id_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."link"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tags_to_links" ADD CONSTRAINT "link_tags_to_links_tag_id_link_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."link_tag"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scraping_jobs" ADD CONSTRAINT "scraping_jobs_link_id_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_index" ON "link" USING gin ((
          setweight(to_tsvector('english', "title"), 'A') ||
          setweight(to_tsvector('english', "description"), 'B') ||
          setweight(to_tsvector('english', "notes_text"), 'C')
      ));--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "link" USING hnsw ("embedding" vector_cosine_ops);