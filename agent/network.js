function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function parseRetryAfter(value) {
  if (!value) {
    return null;
  }

  const seconds = Number.parseFloat(value);
  if (!Number.isNaN(seconds)) {
    return Math.max(0, Math.ceil(seconds * 1000));
  }

  const retryDate = Date.parse(value);
  if (Number.isNaN(retryDate)) {
    return null;
  }

  return Math.max(0, retryDate - Date.now());
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function withRetry(task, options = {}) {
  const {
    retries = 2,
    baseDelayMs = 500,
    maxDelayMs = 4000,
    shouldRetry = () => false,
    onRetry
  } = options;

  let attempt = 0;
  let lastError = null;

  while (attempt <= retries) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error, attempt)) {
        throw error;
      }

      const retryAfterMs = parseRetryAfter(error?.retryAfter);
      const backoffDelayMs = Math.min(baseDelayMs * (2 ** attempt), maxDelayMs);
      const delayMs = retryAfterMs ?? backoffDelayMs;

      if (typeof onRetry === "function") {
        onRetry(error, attempt + 1, delayMs);
      }

      await sleep(delayMs);
      attempt += 1;
    }
  }

  throw lastError;
}
