import { sql } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import type { z } from "zod";

export const userTable = pgTable("user", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
});

export const sessionTable = pgTable("session", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => userTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
});

export const linkTagTable = pgTable("link_tag", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  // some tags are created by the user, some are created by the system
  isSystem: boolean("is_system").notNull(),
  // user id should be nullable if the tag is system
  userId: uuid("user_id").references(() => userTable.id, {
    onDelete: "cascade",
  }),
});

// link state enum
export const linkStateEnum = pgEnum("link_state", [
  "processing",
  "processed",
  "failed",
]);

export const LinkStateEnum = {
  PROCESSING: "processing",
  PROCESSED: "processed",
  FAILED: "failed",
} as const;

export const linkTable = pgTable(
  "link",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    url: text("url").notNull(),
    title: text("title"),
    description: text("description"),
    image: text("image"),
    state: linkStateEnum("state").notNull(),
    notes: jsonb("notes"),
    userId: uuid("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    searchIndex: index("search_index").using(
      "gin",
      sql`(
          setweight(to_tsvector('english', ${table.title}), 'A') ||
          setweight(to_tsvector('english', regexp_replace(regexp_replace(${table.url}, '^https?://(?:www\.)?([^/]+).*$', '\1'), '\.[^.]+$', '')), 'B') ||
          setweight(to_tsvector('english', ${table.description}), 'C')
      )`
    ),
  })
);

// link table zod input type
export const insertLinkSchema = createInsertSchema(linkTable);

export const linkTagsToLinks = pgTable(
  "link_tags_to_links",
  {
    linkId: uuid("link_id")
      .notNull()
      .references(() => linkTable.id),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => linkTagTable.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.linkId, t.tagId] }),
  })
);

export const statusEnum = pgEnum("status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const eventEnum = pgEnum("event", ["scrape_og"]); // Add more event types here as needed

export const scrapingJobs = pgTable("scraping_jobs", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  url: text("url").notNull(),
  status: statusEnum("status").notNull().default("pending"),
  event: eventEnum("event").notNull(),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lockedAt: timestamp("locked_at"),
  linkId: uuid("link_id")
    .references(() => linkTable.id, { onDelete: "cascade" })
    .notNull(),
});

// Create Zod schemas for insert and select
export const insertScrapingJobSchema = createInsertSchema(scrapingJobs);
export const selectScrapingJobSchema = createSelectSchema(scrapingJobs);

// Types based on the Zod schemas
export type NewScrapingJob = z.infer<typeof insertScrapingJobSchema>;
export type ScrapingJob = z.infer<typeof selectScrapingJobSchema>;
