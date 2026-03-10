import * as cheerio from "cheerio";
import { fetchWithTimeout, withRetry } from "./network.js";

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

const browserHeaders = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36"
};

export async function fetchPageContent(url, charLimit, config, rateLimit) {
  const response = await withRetry(
    () => rateLimit(() => fetchWithTimeout(url, {
      headers: browserHeaders,
      redirect: "follow"
    }, config.requestTimeoutMs)),
    {
      retries: config.maxRetries,
      shouldRetry: (error) => {
        if (error instanceof Error && /timed out/i.test(error.message)) {
          return true;
        }

        return [408, 425, 429, 500, 502, 503, 504].includes(error?.status);
      }
    }
  );

  if (!response.ok) {
    const error = new Error(`Failed to fetch page: ${url} (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Unsupported content type for ${url}: ${contentType || "unknown"}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  $("script, style, noscript, svg, iframe, header, footer").remove();

  const title = normalizeWhitespace($("title").first().text() || "Untitled page");
  const bodyText = normalizeWhitespace($("body").text());
  const content = bodyText.slice(0, charLimit);

  if (!content) {
    throw new Error(`No readable page content extracted from ${url}.`);
  }

  return {
    title,
    content
  };
}
