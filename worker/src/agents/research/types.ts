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
    .describe("full linkedin profile url (e.g., https://www.linkedin.com/in/john-doe)")
    .min(1, "linkedin url is required - extract from search results"),
});

export const EmailFinderOutput = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  email: z.string().nullable(),
  emailSource: z.enum(["search", "guess", "none"]),
});

export const PeopleFinderOutput = z.object({
  status: z.enum(["people_found", "emails_found", "cant_find", "greeting"]),
  message: z.string(),
  people: z
    .array(PersonSchema)
    .describe("A list of people that you have searched for")
    .optional(),
  emails: z
    .array(EmailFinderOutput)
    .describe("A list of all the verified emails you have found")
    .optional(),
});

export type Person = z.infer<typeof PersonSchema>;
export type PeopleFinderOutputType = z.infer<typeof PeopleFinderOutput>;

export const QueryGeneratorOutput = z.object({
  queries: z.array(z.string()),
});

export type QueryGeneratorOutputType = z.infer<typeof QueryGeneratorOutput>;
export type EmailFinderOutputType = z.infer<typeof EmailFinderOutput>;
