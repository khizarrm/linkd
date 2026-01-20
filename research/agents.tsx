import { Agent, webSearchTool, MemorySession, run, tool } from "@openai/agents";
import * as readline from "readline";
import { z } from "zod";
import OpenAI from "openai";
import { triagePrompt, peopleSearchPrompt } from "./prompts";
import { QueryGeneratorOutput } from "./types";

const openai = new OpenAI();

const queryGeneratorTool = tool({
  name: "generate_search_queries",
  description:
    "Generate optimized search queries to find people. Call this FIRST before using web_search.",
  parameters: z.object({
    request: z
      .string()
      .describe(
        "Full description of what kind of people to find, including company, role, location, and any other context",
      ),
  }),
  execute: async ({ request }) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `Generate 6-10 search queries to find people based on the request.

Rules:
- Use searches from a maximum of 2 years ago. Fastest way to do it is to add a date, eg: [your query] after:2024-01-20
- Use site:linkedin.com for LinkedIn-specific searches
- Use quotes for exact phrases
- Use Boolean operators (AND, OR)
- Include title synonyms (SWE, Developer, Engineer, etc.)
- Include "worked at" / "experience at" patterns
- For specific person searches, generate 1-5 targeted queries

Return JSON: { "queries": ["query1", ...], "reasoning": "brief explanation" }`,
        },
        {
          role: "user",
          content: request,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return QueryGeneratorOutput.parse(result);
  },
});

const peopleSearchAgent = new Agent({
  name: "people_search",
  instructions: peopleSearchPrompt,
  model: "gpt-5.2",
  tools: [queryGeneratorTool, webSearchTool()],
});

const triageAgent = new Agent({
  name: "triage",
  instructions: triagePrompt,
  model: "gpt-4.1",
  handoffs: [peopleSearchAgent],
});

const session = new MemorySession();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat() {
  const askQuestion = () => {
    rl.question("You: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      try {
        const result = await run(triageAgent, input, { session });
        console.log(`\n${result.finalOutput}\n`);
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

chat();
