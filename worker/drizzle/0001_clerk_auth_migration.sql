-- Drop old Better Auth tables
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `verifications`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `templates`;

-- Users (Clerk-based auth)
CREATE TABLE `users` (
  `clerk_user_id` TEXT PRIMARY KEY,
  `email` TEXT NOT NULL,
  `name` TEXT,
  `image` TEXT,
  `created_at` INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
  `updated_at` INTEGER DEFAULT (cast(unixepoch('subsec') * 1000 as integer)),
  `linkedin_url` TEXT,
  `github_url` TEXT,
  `website_url` TEXT,
  `twitter_url` TEXT
);

-- Chats
CREATE TABLE `chats` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `clerk_user_id` TEXT NOT NULL,
  `title` TEXT,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`clerk_user_id`) REFERENCES `users`(`clerk_user_id`) ON DELETE CASCADE
);

-- Messages
CREATE TABLE `messages` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `chat_id` TEXT NOT NULL,
  `role` TEXT,
  `content` TEXT,
  `created_at` TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON DELETE CASCADE
);

-- Templates
CREATE TABLE `templates` (
  `id` TEXT PRIMARY KEY NOT NULL,
  `clerk_user_id` TEXT NOT NULL,
  `name` TEXT NOT NULL,
  `subject` TEXT NOT NULL,
  `body` TEXT NOT NULL,
  `created_at` INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  `updated_at` INTEGER DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
  FOREIGN KEY (`clerk_user_id`) REFERENCES `users`(`clerk_user_id`) ON DELETE CASCADE
);






