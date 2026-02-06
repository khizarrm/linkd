CREATE TABLE IF NOT EXISTS "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"title" text,
	"openai_conversation_id" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("clerk_user_id") REFERENCES "users" ("clerk_user_id") ON UPDATE no action ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"role" text,
	"content" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("chat_id") REFERENCES "chats" ("id") ON UPDATE no action ON DELETE cascade
);