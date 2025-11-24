import * as authSchema from "./auth.schema";
import * as companiesSchema from "./companies.schema";
import * as templatesSchema from "./templates.schema";
import * as waitlistSchema from "./waitlist.schema";

export const schema = {
    ...authSchema,
    ...companiesSchema,
    ...templatesSchema,
    ...waitlistSchema,
} as const;