function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function createRateLimiter(intervalMs = 0) {
  let nextAvailableAt = 0;

  return async function limit(task) {
    const waitMs = Math.max(0, nextAvailableAt - Date.now());
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    nextAvailableAt = Date.now() + intervalMs;
    return task();
  };
}

export async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      const index = currentIndex;
      currentIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export function dedupeSources(results) {
  const seen = new Set();

  return results.filter((result) => {
    if (!result?.url) {
      return false;
    }

    const key = result.url.toLowerCase();
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
