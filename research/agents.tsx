import { Agent, webSearchTool, MemorySession, run } from "@openai/agents";
import * as readline from "readline";
import {
  PeopleFinderOutput,
  PeopleFinderOutputType,
  QueryGeneratorOutput,
  QueryGeneratorOutputType,
} from "./types";
import { getPeopleSearchPrompt, queryPrompt } from "./prompts";

const queryGenerator = new Agent({
  name: "query_generator",
  instructions: queryPrompt,
  model: "gpt-4.1",
  outputType: QueryGeneratorOutput,
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
        const queryResult = await run(queryGenerator, input, { session });
        const queryOutput = queryResult.finalOutput as
          | QueryGeneratorOutputType
          | undefined;

        if (!queryOutput?.queries?.length) {
          askQuestion();
          return;
        }

        console.log(`\nQueries: ${queryOutput.queries.join(", ")}\n`);

        const peopleSearchAgent = new Agent({
          name: "people_search_assistant",
          instructions: getPeopleSearchPrompt(queryOutput.queries),
          model: "gpt-5.2",
          tools: [webSearchTool()],
          outputType: PeopleFinderOutput,
        });

        const result = await run(
          peopleSearchAgent,
          `Find people using the queries: ${queryOutput.queries}`,
          { session },
        );
        const output = result.finalOutput as PeopleFinderOutputType | undefined;

        if (output?.status === "people_found" && output.people) {
          output.people.forEach((person, i) => {
            console.log(
              `${i + 1}. ${person.name} - ${person.role} at ${person.company}`,
            );
            console.log(`   ${person.description}`);
            console.log(`   ${person.profileUrl}\n`);
          });
        } else if (output?.message) {
          console.log(`\n${output.message}\n`);
        }
      } catch (error) {
        console.error("Error:", error instanceof Error ? error.message : error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

chat();
