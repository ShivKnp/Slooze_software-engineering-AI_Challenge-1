const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const DEFAULT_SEARCH_LIMIT = Number.parseInt(process.env.SEARCH_RESULT_LIMIT || "5", 10);
const DEFAULT_PAGE_CHAR_LIMIT = Number.parseInt(process.env.PAGE_CHAR_LIMIT || "3000", 10);
const DEFAULT_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS || "12000", 10);
const DEFAULT_MAX_RETRIES = Number.parseInt(process.env.MAX_RETRIES || "2", 10);
const DEFAULT_FETCH_CONCURRENCY = Number.parseInt(process.env.FETCH_CONCURRENCY || "2", 10);
const DEFAULT_SEARCH_RATE_LIMIT_MS = Number.parseInt(process.env.SEARCH_RATE_LIMIT_MS || "1500", 10);
const DEFAULT_PAGE_FETCH_RATE_LIMIT_MS = Number.parseInt(process.env.PAGE_FETCH_RATE_LIMIT_MS || "300", 10);
const DEFAULT_GEMINI_RATE_LIMIT_MS = Number.parseInt(process.env.GEMINI_RATE_LIMIT_MS || "1000", 10);

export function getConfig() {
  return {
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: DEFAULT_MODEL,
    searchLimit: Number.isNaN(DEFAULT_SEARCH_LIMIT) ? 5 : DEFAULT_SEARCH_LIMIT,
    pageCharLimit: Number.isNaN(DEFAULT_PAGE_CHAR_LIMIT) ? 3000 : DEFAULT_PAGE_CHAR_LIMIT,
    requestTimeoutMs: Number.isNaN(DEFAULT_REQUEST_TIMEOUT_MS) ? 12000 : DEFAULT_REQUEST_TIMEOUT_MS,
    maxRetries: Number.isNaN(DEFAULT_MAX_RETRIES) ? 2 : DEFAULT_MAX_RETRIES,
    fetchConcurrency: Number.isNaN(DEFAULT_FETCH_CONCURRENCY) ? 2 : DEFAULT_FETCH_CONCURRENCY,
    searchRateLimitMs: Number.isNaN(DEFAULT_SEARCH_RATE_LIMIT_MS) ? 1500 : DEFAULT_SEARCH_RATE_LIMIT_MS,
    pageFetchRateLimitMs: Number.isNaN(DEFAULT_PAGE_FETCH_RATE_LIMIT_MS) ? 300 : DEFAULT_PAGE_FETCH_RATE_LIMIT_MS,
    geminiRateLimitMs: Number.isNaN(DEFAULT_GEMINI_RATE_LIMIT_MS) ? 1000 : DEFAULT_GEMINI_RATE_LIMIT_MS
  };
}

export function validateConfig(config) {
  if (!config.geminiApiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add it to your environment before running the agent.");
  }

  if (config.searchLimit < 1 || config.searchLimit > 10) {
    throw new Error("SEARCH_RESULT_LIMIT must be between 1 and 10.");
  }

  if (config.pageCharLimit < 500 || config.pageCharLimit > 20000) {
    throw new Error("PAGE_CHAR_LIMIT must be between 500 and 20000.");
  }

  if (config.requestTimeoutMs < 1000 || config.requestTimeoutMs > 60000) {
    throw new Error("REQUEST_TIMEOUT_MS must be between 1000 and 60000.");
  }

  if (config.maxRetries < 0 || config.maxRetries > 5) {
    throw new Error("MAX_RETRIES must be between 0 and 5.");
  }

  if (config.fetchConcurrency < 1 || config.fetchConcurrency > 5) {
    throw new Error("FETCH_CONCURRENCY must be between 1 and 5.");
  }
}
