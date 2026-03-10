import * as cheerio from "cheerio";
import { search, SafeSearchType } from "duck-duck-scrape";
import { createRateLimiter, dedupeSources } from "./execution.js";
import { fetchWithTimeout, withRetry } from "./network.js";

const browserHeaders = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
};

function normalizeResultUrl(url) {
  if (!url) {
    return url;
  }

  try {
    const parsed = new URL(url, "https://duckduckgo.com");
    const redirectTarget = parsed.searchParams.get("uddg");
    return redirectTarget ? decodeURIComponent(redirectTarget) : parsed.toString();
  } catch {
    return url;
  }
}

async function searchWebFallback(query, limit, config, rateLimit) {
  const response = await rateLimit(() => fetchWithTimeout(
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    {
      headers: browserHeaders
    },
    config.requestTimeoutMs
  ));

  if (!response.ok) {
    const error = new Error(`Fallback DuckDuckGo search failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  return dedupeSources($(".result")
    .slice(0, limit)
    .map((_, element) => {
      const titleLink = $(element).find(".result__title a").first();
      const snippet = $(element).find(".result__snippet").first().text().trim();

      return {
        title: titleLink.text().trim(),
        url: normalizeResultUrl(titleLink.attr("href")),
        description: snippet
      };
    })
    .get()
    .filter((result) => result.title && result.url));
}

export async function searchWeb(query, limit, config) {
  const rateLimit = createRateLimiter(config.searchRateLimitMs);

  try {
    const response = await withRetry(
      () => rateLimit(() => search(query, {
        safeSearch: SafeSearchType.MODERATE
      })),
      {
        retries: config.maxRetries,
        shouldRetry: (error) => error instanceof Error && /anomaly|too quickly|timed out/i.test(error.message)
      }
    );

    return dedupeSources(response.results
      .slice(0, limit)
      .map((result) => ({
        title: result.title,
        url: result.url,
        description: result.description
      })));
  } catch (error) {
    if (error instanceof Error && /anomaly|too quickly|timed out/i.test(error.message)) {
      return withRetry(
        () => searchWebFallback(query, limit, config, rateLimit),
        {
          retries: config.maxRetries,
          shouldRetry: (fallbackError) => [408, 429, 500, 502, 503, 504].includes(fallbackError?.status)
        }
      );
    }

    throw error;
  }
}
