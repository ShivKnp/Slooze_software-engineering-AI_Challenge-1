import "dotenv/config";
import { runAgent } from "./runAgent.js";

async function main() {
  const question = process.argv.slice(2).join(" ").trim();

  if (!question) {
    console.error("Usage: npm start -- \"What are the latest specs in MacBook this year?\"");
    process.exitCode = 1;
    return;
  }

  try {
    const result = await runAgent(question);

    console.log(`Answer: ${result.answer}\n`);
    console.log("Sources:");
    for (const source of result.sources) {
      console.log(`- ${source.url}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
