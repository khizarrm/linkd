import { z } from "zod";

export const PersonSchema = z.object({
  name: z.string(),
  role: z.string(),
  company: z.string(),
  description: z.string(),
  profileUrl: z
    .string()
    .describe("A working linkedin link of the persons profile")
    .optional(),
});

export const PeopleFinderOutput = z.object({
  status: z.enum(["people_found", "cant_find"]),
  message: z.string(),
  people: z.array(PersonSchema).optional(),
  reason: z.string().optional(),
  suggestedAlternatives: z.array(z.string()).optional(),
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

export const EmailFinderOutput = z.object({
  people: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      company: z.string(),
      email: z.string().nullable(),
      emailSource: z.enum(["search", "guess", "none"]),
    })
  ),
});

export type EmailFinderOutputType = z.infer<typeof EmailFinderOutput>;
