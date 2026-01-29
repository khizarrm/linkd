import { Agent, webSearchTool, MemorySession, run } from "@openai/agents";
import * as readline from "readline";
import { triagePrompt, peopleSearchPrompt } from "./prompts";
import { queryGeneratorTool, getUserInfo, emailFinderTool } from "./tools";

const peopleSearchAgent = new Agent({
  name: "people_search",
  instructions: peopleSearchPrompt,
  model: "gpt-5.2",
  tools: [queryGeneratorTool, getUserInfo, emailFinderTool, webSearchTool()],
});

const triageAgent = new Agent({
  name: "triage",
  instructions: triagePrompt,
  model: "gpt-4.1",
  handoffs: [peopleSearchAgent],
  tools: [getUserInfo],
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
        console.log("\nAssistant: ", "");

        let fullResponse = "";

        const result = await run(triageAgent, input, {
          session,
          stream: true,
        } as any);

        const textStream = (result as any).toTextStream();
        for await (const chunk of textStream) {
          process.stdout.write(chunk);
          fullResponse += chunk;
        }

        console.log("\n");
      } catch (error) {
        console.error(
          "\nError:",
          error instanceof Error ? error.message : error,
        );
      }

      askQuestion();
    });
  };

  askQuestion();
}

chat();
