import { z } from "zod";

export const PersonSchema = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  description: z.string(),
  profileUrl: z.string().optional(),
});

export const EmailFinderOutput = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  email: z.string().nullable(),
  emailSource: z.enum(["search", "guess", "none"]),
});

export const PeopleFinderOutput = z.object({
  status: z.enum(["people_found", "emails_found", "cant_find"]),
  message: z.string(),
  people: z
    .array(PersonSchema)
    .describe("A list of people that you have searched for")
    .optional(),
  emails: z
    .array(EmailFinderOutput)
    .describe("A list of all the verified emails you have found")
    .optional(),
  followUp: z.string().describe("a follow up message").optional(),
});

export type Person = z.infer<typeof PersonSchema>;
export type PeopleFinderOutputType = z.infer<typeof PeopleFinderOutput>;

export const QueryGeneratorOutput = z.object({
  queries: z.array(z.string()),
  reasoning: z.string(),
});

export type QueryGeneratorOutputType = z.infer<typeof QueryGeneratorOutput>;

export const TriageOutput = z.object({
  status: z.enum(["ready", "needs_info"]),
  companyName: z.string().optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  clarifyingQuestion: z.string().optional(),
});

export type TriageOutputType = z.infer<typeof TriageOutput>;
export type EmailFinderOutputType = z.infer<typeof EmailFinderOutput>;
