import { getConfig, validateConfig } from "./config.js";
import { createRateLimiter, dedupeSources, mapWithConcurrency } from "./execution.js";
import { searchWeb } from "./search.js";
import { fetchPageContent } from "./fetchPageContent.js";
import { buildAnswer } from "./buildAnswer.js";

export async function runAgent(question) {
  const normalizedQuestion = question.trim();
  if (!normalizedQuestion || normalizedQuestion.length < 3) {
    throw new Error("Question must be at least 3 characters long.");
  }

  if (normalizedQuestion.length > 500) {
    throw new Error("Question is too long. Keep it under 500 characters.");
  }

  const config = getConfig();
  validateConfig(config);

  const searchResults = await searchWeb(normalizedQuestion, config.searchLimit, config);

  if (searchResults.length === 0) {
    return {
      answer: "I could not find relevant web results for that question.",
      sources: []
    };
  }

  const fetchRateLimit = createRateLimiter(config.pageFetchRateLimitMs);
  const enrichedSources = await mapWithConcurrency(
    dedupeSources(searchResults),
    config.fetchConcurrency,
    async (result) => {
      try {
        const page = await fetchPageContent(result.url, config.pageCharLimit, config, fetchRateLimit);
        return {
          ...result,
          content: page.content,
          pageTitle: page.title
        };
      } catch {
        return {
          ...result,
          content: result.description
        };
      }
    }
  );

  const llmAnswer = await buildAnswer({
    apiKey: config.geminiApiKey,
    model: config.geminiModel,
    question: normalizedQuestion,
    sources: enrichedSources,
    config
  });

  const sourceSet = new Set(llmAnswer.sourcesUsed);
  const sources = enrichedSources.filter((source) => sourceSet.has(source.url));

  return {
    answer: llmAnswer.answer,
    sources
  };
}
