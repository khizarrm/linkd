import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { chats } from "./chats.schema";

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey().notNull(),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role"),
  content: text("content"),
  parts: text("parts"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});
