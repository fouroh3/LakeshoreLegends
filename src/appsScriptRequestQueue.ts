let readQueue: Promise<void> = Promise.resolve();

/**
 * Apps Script is much less stable when one browser starts several spreadsheet
 * reads at once. Keep reads from this tab in a short queue; purchases still run
 * immediately and retain their own idempotent retry handling.
 */
export function queueAppsScriptRead<T>(task: () => Promise<T>): Promise<T> {
  const request = readQueue.catch(() => undefined).then(task);
  readQueue = request.then(
    () => undefined,
    () => undefined
  );
  return request;
}
