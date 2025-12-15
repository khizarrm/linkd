import * as authSchema from "./auth.schema";
import * as companiesSchema from "./companies.schema";
import * as templatesSchema from "./templates.schema";
import * as waitlistSchema from "./waitlist.schema";
import * as chatsSchema from "./chats.schema";
import * as messagesSchema from "./messages.schema";
import * as feedbackSchema from "./feedback.schema";

export const schema = {
    ...authSchema,
    ...companiesSchema,
    ...templatesSchema,
    ...waitlistSchema,
    ...chatsSchema,
    ...messagesSchema,
    ...feedbackSchema,
} as const;