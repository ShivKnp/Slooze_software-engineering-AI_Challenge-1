# Web Search Agent

A modular Python AI agent that:
- Detects user intent (general question, launch/date calculation, latest news)
- Retrieves web context with Tavily
- Builds intent-aware prompts
- Streams responses from Google Gemini
- Extracts dates from snippets and computes day differences for launch/date questions
- Preserves conversational context to resolve follow-up references like "it"

---

## Project Structure

```text
web-search-agent/
  main.py
  README.md
  .env
  requirements.txt
  config/
    settings.py
  agent/
    web_agent.py
  services/
    context_service.py
    intent_service.py
    llm_service.py
    search_service.py
  utils/
    date_utils.py
    formatter.py
  models/
    schemas.py
  prompts/
    prompts.py
```

---

## Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Internet access (for Tavily and Gemini APIs)

### 2. Open the correct folder
From your workspace root:

```bash
cd web-search-agent
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
Create/update `.env` in `web-search-agent`:

```env
GOOGLE_API_KEY=your_google_api_key
TAVILY_API_KEY=your_tavily_api_key
GOOGLE_MODEL=gemini-2.5-flash
```

Notes:
- `GOOGLE_MODEL` is optional; default is `gemini-2.5-flash`.
- If the configured model is unavailable, the app falls back to `gemini-2.0-flash`.

---

## How To Run The Project

Run from inside `web-search-agent`:

```bash
python main.py
```

You will see:

```text
Web Search Agent (type 'exit' to quit)
```

Then ask multiple questions interactively.

Example:

```text
User Query: nuclear bomb was invented how many days ago?
User Query: can you predict when it can be used in the future?
```

The second query can resolve `it` from conversation context.

---


## Dependencies Used

From `requirements.txt`:

- `google-generativeai>=0.8.0`
  - Gemini client SDK for text generation and streaming tokens.
- `python-dotenv>=1.0.1`
  - Loads `.env` configuration into process environment.
- `requests>=2.32.0`
  - HTTP client used for Tavily API calls.

---

## Architecture Overview

### Layered flow
1. `main.py`
   - CLI loop and interaction lifecycle.
2. `agent/web_agent.py`
   - Orchestrates the end-to-end pipeline.
3. `services/*`
   - `intent_service.py`: rule-based intent detection.
   - `context_service.py`: conversational entity tracking and pronoun resolution.
   - `search_service.py`: Tavily API integration.
   - `llm_service.py`: Gemini streaming generation and model fallback.
4. `utils/*`
   - `formatter.py`: builds prompt context and source output format.
   - `date_utils.py`: date regex extraction and day-difference computation.
5. `prompts/prompts.py`
   - intent-specific prompt templates and instructions.
6. `models/schemas.py`
   - typed data models shared across modules.
7. `config/settings.py`
   - strict environment-backed settings loading.

### Request lifecycle
1. Read user query.
2. Resolve ambiguous references using previous turn entity (if needed).
3. Detect intent.
4. Search web with Tavily.
5. Build context from source title, URL, snippet.
6. Build intent-aware prompt.
7. Stream Gemini answer token-by-token.
8. For launch/date intent, compute and append day-difference summary.
9. Print formatted sources.

---

## Design Decisions And Trade-offs

### 1) Rule-based intent detection (chosen) vs LLM intent classifier
- Decision: Regex/rule patterns in `IntentService`.
- Why: Fast, deterministic, no extra API cost, easy to debug.
- Trade-off: Lower recall on unusual phrasing; requires manual pattern updates.

### 2) Single orchestrator agent class (chosen) vs distributed workflow engine
- Decision: Keep orchestration in `WebAgent`.
- Why: Simpler control flow and easier interview explanation.
- Trade-off: As features grow, orchestration can become crowded.

### 3) Stateless external APIs + local conversational memory (chosen)
- Decision: Store last extracted entity in memory for pronoun resolution.
- Why: Improves follow-up query quality with minimal complexity.
- Trade-off: Memory is session-local only; not persisted across restarts.

### 4) Local date for day-difference calculations (chosen)
- Decision: Use system local date (`date.today()`).
- Why: Matches user expectation in CLI and avoids timezone confusion.
- Trade-off: Results can differ across machines in different timezones.

### 5) Tavily for retrieval + Gemini for generation (chosen)
- Decision: Retrieval-augmented generation with source grounding.
- Why: Better factuality than pure LLM answers and supports citations.
- Trade-off: Accuracy depends on search result quality and snippet completeness.

### 6) Graceful fallback for model failures (chosen)
- Decision: Fallback model on `NotFound` and extractive summary on quota exhaustion.
- Why: Keeps the app usable under API instability/limits.
- Trade-off: Fallback response quality may be lower than normal generation.

---

## Troubleshooting

### `pip install -r requirements.txt` fails
- Ensure your current directory is `web-search-agent` before running install.
- Verify Python/pip point to the same interpreter.

### `python main.py` exits with missing env vars
- Confirm `.env` exists in `web-search-agent`.
- Required keys:
  - `GOOGLE_API_KEY`
  - `TAVILY_API_KEY`

### Gemini returns model not found
- Keep `GOOGLE_MODEL=gemini-2.5-flash` or another valid model.
- The app automatically attempts `gemini-2.0-flash` fallback.

### Search/API errors
- Check network connectivity.
- Verify Tavily key validity and quota.
