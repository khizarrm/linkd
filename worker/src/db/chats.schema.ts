import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey().notNull(),
  clerkUserId: text("clerk_user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  title: text("title"),
  openaiConversationId: text("openai_conversation_id"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
