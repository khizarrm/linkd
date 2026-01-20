import { Agent, webSearchTool, MemorySession, run } from "@openai/agents";
import * as readline from "readline";
import { triagePrompt, queryPrompt, peopleSearchPrompt } from "./prompts";

const peopleSearchAgent = new Agent({
  name: "people_search",
  instructions: peopleSearchPrompt,
  model: "gpt-5.2",
  tools: [webSearchTool()],
});

const queryGenerator = new Agent({
  name: "query_generator",
  instructions: queryPrompt,
  model: "gpt-4.1",
  handoffs: [peopleSearchAgent],
});

const triageAgent = new Agent({
  name: "triage",
  instructions: triagePrompt,
  model: "gpt-4.1",
  handoffs: [queryGenerator, peopleSearchAgent],
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
