DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;

CREATE TABLE chats (
  id TEXT PRIMARY KEY NOT NULL,
  clerk_user_id TEXT NOT NULL,
  title TEXT,
  claude_conversation_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (clerk_user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  chat_id TEXT NOT NULL,
  role TEXT,
  content TEXT,
  parts TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);