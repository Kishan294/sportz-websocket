import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * @file src/db/schema.js
 * @description Database schema for a real-time sports application using Drizzle ORM.
 * Adheres to senior architectural standards:
 * - CamelCase for JS variables
 * - Snake_case for DB columns
 * - Explicit field mapping
 */

// 1. Enums
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

// 2. Matches Table
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sport: text("sport").notNull(),
  homeTeam: text("home_team").notNull(),
  awayTeam: text("away_team").notNull(),
  status: matchStatusEnum("status").default("scheduled").notNull(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Commentary Table
export const commentary = pgTable("commentary", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id")
    .references(() => matches.id, { onDelete: "cascade" })
    .notNull(),
  minute: integer("minute"),
  sequence: integer("sequence").notNull(),
  period: text("period"), // e.g., '1st Half', 'Q1'
  eventType: text("event_type").notNull(), // e.g., 'goal', 'card', 'substitution'
  actor: text("actor"), // Player or coach involved
  team: text("team"), // Team involved
  message: text("message").notNull(),
  metadata: jsonb("metadata"), // Flexible field for specific event details
  tags: text("tags").array(), // Array of strings for categorization
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
