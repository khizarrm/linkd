import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { users } from "./auth.schema";

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  attachments: text("attachments"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  isDefault: integer("is_default").default(0),
});
