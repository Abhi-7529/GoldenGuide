// Smoke test for Vercel AI Gateway: streams a short response and logs token usage.
// The AI SDK reads AI_GATEWAY_API_KEY from the environment loaded below.
// Run with: pnpm ai:check

import { streamText } from "ai";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const result = streamText({
    model: "openai/gpt-5.4-nano",
    prompt:
      "In two sentences, explain what a budget is to an older adult who is new to managing money.",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  const usage = await result.totalUsage;
  console.log("\n\nToken usage:", {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
