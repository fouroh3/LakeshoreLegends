/*
  FINAL EXAMINER RAID CHRONICLE PATCH

  In the live Apps Script, replace the current `latestLogRow` / `latestEvent`
  block inside `finalExaminerState_` with this block.

  Then add `events` to the return object as shown below.
*/

const raidLogRows = logValues
  .slice(1)
  .filter((row) => norm_(row[1]) === raidId)
  .slice(-80)
  .reverse();

const bossNameByKey = new Map(
  bosses.map((boss) => [boss.bossKey, boss.bossName])
);

const events = raidLogRows.map((row) => ({
  timestamp:
    row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ""),
  classKey: norm_(row[2]),
  classLabel: norm_(row[3]),
  action: norm_(row[4]).toUpperCase(),
  targetBossKey: norm_(row[5]).toUpperCase(),
  targetBossName: bossNameByKey.get(norm_(row[5]).toUpperCase()) || "",
  requestedAmount: Math.max(0, Math.round(asNum_(row[6], 0))),
  appliedAmount: Math.max(0, Math.round(asNum_(row[7], 0))),
  overkillLost: Math.max(0, Math.round(asNum_(row[8], 0))),
  classHPAfter: Math.max(0, Math.round(asNum_(row[9], 0))),
  bossHPAfter: Math.max(0, Math.round(asNum_(row[10], 0))),
}));

const latestEvent = events[0] || null;

/*
  In the object returned by finalExaminerState_, include:

  events,
  latestEvent,
*/
