import { createRateLimiter } from "./execution.js";
import { fetchWithTimeout, withRetry } from "./network.js";

function extractJsonPayload(text) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Gemini returned a response that was not valid JSON.");
}

function collectTextFromCandidate(candidate) {
  return (candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
}

async function requestAnswerWithModel({ apiKey, model, question, sourceSummary, config, rateLimit }) {
  const response = await withRetry(
    () => rateLimit(() => fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You answer questions using supplied web results only. Be concise, factual, and explicit about uncertainty. Return only a JSON object with keys answer and sourcesUsed. The answer should be plain text. sourcesUsed must be an array of source URLs used in the answer."
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Question: ${question}\n\nRetrieved web material:\n${sourceSummary}`
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      },
      config.requestTimeoutMs
    )),
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
    const errorText = await response.text();
    const error = new Error(`Gemini request failed for model \"${model}\" (${response.status}): ${errorText}`);
    error.status = response.status;
    error.retryAfter = response.headers.get("retry-after");
    throw error;
  }

  const payload = await response.json();
  const candidate = payload.candidates?.[0];
  if (!candidate) {
    throw new Error(`Gemini did not return any answer candidates for model \"${model}\".`);
  }

  const text = collectTextFromCandidate(candidate);
  const output = extractJsonPayload(text);
  const parsed = JSON.parse(output);

  return {
    answer: parsed.answer,
    sourcesUsed: Array.isArray(parsed.sourcesUsed) ? parsed.sourcesUsed : [],
    modelUsed: model
  };
}

export async function buildAnswer({ apiKey, model, question, sources, config }) {
  const sourceSummary = sources
    .map((source, index) => {
      const body = source.content || source.description || "No content available.";
      return [
        `Source ${index + 1}: ${source.title}`,
        `URL: ${source.url}`,
        `Snippet: ${source.description || "N/A"}`,
        `Content: ${body}`
      ].join("\n");
    })
    .join("\n\n");

  const fallbackModels = [model, "gemini-2.5-flash", "gemini-flash-latest"];
  const uniqueModels = [...new Set(fallbackModels.filter(Boolean))];
  let lastRecoverableError = null;
  const rateLimit = createRateLimiter(config.geminiRateLimitMs);

  for (const candidateModel of uniqueModels) {
    try {
      return await requestAnswerWithModel({
        apiKey,
        model: candidateModel,
        question,
        sourceSummary,
        config,
        rateLimit
      });
    } catch (error) {
      if (error.status === 429 || error.status === 404) {
        lastRecoverableError = error;
        continue;
      }

      throw error;
    }
  }

  if (lastRecoverableError?.status === 429) {
    throw new Error("Gemini rejected the configured model and all fallbacks due to quota limits. Try `gemini-2.5-flash` or check the project quota/billing.");
  }

  if (lastRecoverableError?.status === 404) {
    throw new Error("Gemini could not find the configured model or any fallback models for this API key.");
  }

  throw new Error("Gemini could not generate an answer with the configured model or fallback models.");
}
