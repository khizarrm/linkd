import * as authSchema from "./auth.schema";
import * as companiesSchema from "./companies.schema";
import * as templatesSchema from "./templates.schema";
import * as waitlistSchema from "./waitlist.schema";
import * as chatsSchema from "./chats.schema";
import * as messagesSchema from "./messages.schema";

export const schema = {
    ...authSchema,
    ...companiesSchema,
    ...templatesSchema,
    ...waitlistSchema,
    ...chatsSchema,
    ...messagesSchema,
} as const;