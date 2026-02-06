import { z } from "zod";

export const PersonSchema = z.object({
  name: z.string(),
  role: z.string(),
  location: z
    .string()
    .describe("city/region if shown, otherwise blank")
    .optional(),
  company: z.string(),
  description: z.string().describe("brief summary from their profile"),
  linkedinUrl: z
    .string()
    .nullable()
    .describe("full linkedin profile url (e.g., https://www.linkedin.com/in/john-doe), null if not found"),
  source: z
    .enum(["linkedin", "web", "company_page"])
    .describe("source where this person was found - linkedin, web search, or company page"),
  webUrl: z
    .string()
    .nullable()
    .describe("web URL if source is 'web' or 'company_page', otherwise null"),
});

export const EmailFinderOutput = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  email: z.string().nullable(),
  emailSource: z.enum(["search", "guess", "none"]),
});

export const PeopleFinderOutput = z.object({
  status: z.enum(["people_found", "emails_found", "cant_find", "greeting", "clarification_needed"]),
  message: z.string(),
  people: z
    .array(PersonSchema)
    .describe("A list of people that you have searched for")
    .optional(),
  emails: z
    .array(EmailFinderOutput)
    .describe("A list of all the verified emails you have found")
    .optional(),
  companyOptions: z
    .array(z.object({
      name: z.string(),
      domain: z.string().nullable(),
      description: z.string(),
    }))
    .describe("List of company options when clarification is needed")
    .optional(),
});

export type Person = z.infer<typeof PersonSchema>;
export type PeopleFinderOutputType = z.infer<typeof PeopleFinderOutput>;

export const QueryGeneratorOutput = z.object({
  queries: z.array(z.string()),
});

export type QueryGeneratorOutputType = z.infer<typeof QueryGeneratorOutput>;
export type EmailFinderOutputType = z.infer<typeof EmailFinderOutput>;
