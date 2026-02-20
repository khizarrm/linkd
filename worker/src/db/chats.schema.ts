import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { users } from "./auth.schema";

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey().notNull(),
  clerkUserId: text("clerk_user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  title: text("title"),
  claudeConversationId: text("claude_conversation_id"),
  contextSummary: text("context_summary"),
  contextSummaryMessageCount: integer("context_summary_message_count").default(0),
  contextSummaryUpdatedAt: text("context_summary_updated_at"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});
