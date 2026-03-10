# AI Web Search Agent

This project implements **Challenge A — AI Web Search Agent** in Node.js. It accepts a natural language question, searches the web with DuckDuckGo, retrieves the top results, extracts relevant page content, and asks Gemini to produce a grounded answer with source attribution.

## Features

- Natural language query input from the command line
- Basic browser UI for manual testing
- DuckDuckGo search integration for live web retrieval
- Top-result content extraction with HTML cleanup
- Gemini-based answer synthesis using retrieved evidence
- Source attribution in the final response
- Request timeouts, bounded retries, and outbound rate limiting
- Bounded page-fetch concurrency and source deduplication
- Input and environment validation for safer operation

## Project Structure

- `agent/index.js` — CLI entrypoint
- `agent/runAgent.js` — main orchestration pipeline
- `agent/search.js` — DuckDuckGo web search integration
- `agent/fetchPageContent.js` — web page retrieval and text extraction
- `agent/buildAnswer.js` — Gemini API call and structured answer generation
- `agent/config.js` — environment configuration and validation
- `server.js` — minimal HTTP server for browser testing
- `public/index.html` — simple test webpage

## Architecture Overview

1. The CLI accepts a user question.
2. The search module retrieves the top web results.
3. The fetch module downloads each result page and extracts readable text.
4. The answer module sends the question plus retrieved content to Gemini.
5. The final response prints a concise answer and the sources used.

## Design Decisions and Trade-offs

- **DuckDuckGo integration** keeps the retrieval setup simple and dependency-light.
- **Content extraction with Cheerio** is lightweight, but page text quality depends on site structure.
- **Top-N retrieval** balances answer quality against latency and token cost.
- **Gemini REST integration** keeps the LLM layer lightweight and easy to inspect.
- **Bounded retries + rate limiting** reduce provider throttling and improve resilience without adding infrastructure.
- **Concurrency caps** prevent aggressive parallel fetch behavior that can trigger blocking or transient failures.
- **CLI-first interface** is the fastest way to demonstrate the agent without adding API/server overhead.

## Prerequisites

- Node.js 18+
- A Gemini API key in `GEMINI_API_KEY`

## Setup

```bash
npm install
```

Copy `.env.example` to `.env` or export the variables directly in your shell. The CLI loads `.env` automatically.

Set environment variables:

### PowerShell

```powershell
$env:GEMINI_API_KEY="your_api_key_here"
$env:GEMINI_MODEL="gemini-2.5-flash"
```

Optional environment variables:

- `SEARCH_RESULT_LIMIT` — defaults to `5`
- `PAGE_CHAR_LIMIT` — defaults to `3000`
- `REQUEST_TIMEOUT_MS` — defaults to `12000`
- `MAX_RETRIES` — defaults to `2`
- `FETCH_CONCURRENCY` — defaults to `2`
- `SEARCH_RATE_LIMIT_MS` — defaults to `1500`
- `PAGE_FETCH_RATE_LIMIT_MS` — defaults to `300`
- `GEMINI_RATE_LIMIT_MS` — defaults to `1000`

## Run

```bash
npm start -- "What are the latest specs in MacBook this year?"
```

## Web UI

Start the basic web app:

```bash
npm run start:web
```

Then open `http://localhost:3000` in your browser.

## Example Output

```text
Answer: Recent MacBook models feature Apple silicon with stronger on-device AI performance, improved battery efficiency, and updated display and memory configurations. Exact current-year specs vary by model and should be verified from Apple and major review sources.

Sources:
- https://www.apple.com/
- https://www.theverge.com/
```
## Example Screen Shot

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/a9bc9a7f-cac0-4b63-8a3f-788a256434ee" />
<img width="1913" height="906" alt="image" src="https://github.com/user-attachments/assets/cf8791e5-8904-43e8-8e01-d9bab0755db0" />


## Dependencies Used

- `duck-duck-scrape` — search integration
- `cheerio` — HTML parsing and content extraction
- Gemini REST API — LLM integration

## Notes

- Some websites block automated fetching; in those cases the agent falls back to the search snippet.
- The final answer is constrained to use retrieved data and return source URLs.
- The app is still a CLI demo; for a full production service, add request authentication, centralized logging, metrics, and persistent caching.

