const MAX_CONCURRENT_APPS_SCRIPT_READS = 2;
let activeReads = 0;
const pendingReads: Array<() => void> = [];

function runNextAppsScriptReads() {
  while (
    activeReads < MAX_CONCURRENT_APPS_SCRIPT_READS &&
    pendingReads.length > 0
  ) {
    pendingReads.shift()?.();
  }
}

/**
 * Keep the browser from flooding Apps Script, while allowing two independent
 * reads to progress together. A single slow snapshot must not block unrelated
 * controls for 30-90 seconds. Purchases still run immediately and retain their
 * own idempotent handling.
 */
export function queueAppsScriptRead<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const start = () => {
      activeReads += 1;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          activeReads -= 1;
          runNextAppsScriptReads();
        });
    };

    pendingReads.push(start);
    runNextAppsScriptReads();
  });
}
