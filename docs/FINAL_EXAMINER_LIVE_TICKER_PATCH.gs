/*
 * FINAL EXAMINER LIVE TICKER PATCH
 *
 * Replace ONLY finalExaminerState_ in the deployed Apps Script with this version.
 * This exposes the newest action log entry so every smartboard can show
 * which raid party took the action and which boss was targeted.
 */
function finalExaminerState_(raidIdRaw) {
  const raidId = norm_(raidIdRaw) || FINAL_EXAMINER.RAID_ID;
  const { classSh, bossSh, logSh } = ensureFinalExaminerSheets_();
  const classValues = classSh.getDataRange().getValues();
  const bossValues = bossSh.getDataRange().getValues();
  const logValues = logSh.getDataRange().getValues();

  const classes = classValues.slice(1)
    .filter((r) => norm_(r[0]) === raidId)
    .map((r) => ({
      classKey: norm_(r[1]),
      label: norm_(r[2]),
      startingHP: Math.max(0, Math.round(asNum_(r[4], 0))),
      currentHP: Math.max(0, Math.round(asNum_(r[5], 0))),
      updatedAt: String(r[6] || ""),
    }));

  const bosses = bossValues.slice(1)
    .filter((r) => norm_(r[0]) === raidId)
    .map((r) => ({
      bossKey: norm_(r[1]),
      bossName: norm_(r[2]),
      maxHP: Math.max(1, Math.round(asNum_(r[3], 1))),
      currentHP: Math.max(0, Math.round(asNum_(r[4], 0))),
      locked: toBool_(r[5], false),
      defeated: toBool_(r[6], false),
      updatedAt: String(r[7] || ""),
    }));

  const latestLogRow = logValues.slice(1)
    .filter((r) => norm_(r[1]) === raidId)
    .slice(-1)[0];

  const latestEvent = latestLogRow
    ? {
        timestamp: String(latestLogRow[0] || ""),
        classKey: norm_(latestLogRow[2]),
        classLabel: norm_(latestLogRow[3]),
        action: norm_(latestLogRow[4]).toUpperCase(),
        targetBossKey: norm_(latestLogRow[5]).toUpperCase(),
        requestedAmount: Math.max(0, Math.round(asNum_(latestLogRow[6], 0))),
        appliedAmount: Math.max(0, Math.round(asNum_(latestLogRow[7], 0))),
      }
    : null;

  const minions = bosses.filter((b) => b.bossKey !== "FINAL_EXAMINER");
  const finalBoss = bosses.find((b) => b.bossKey === "FINAL_EXAMINER");
  const allMinionsDefeated = minions.length > 0 && minions.every((b) => b.defeated || b.currentHP <= 0);
  const phase = finalBoss && finalBoss.defeated ? "VICTORY" : allMinionsDefeated ? "FINAL_EXAMINER" : "MINIONS";

  return {
    ok: true,
    raidId,
    active: classes.length > 0 && bosses.length > 0,
    phase,
    classes,
    bosses,
    latestEvent,
    updatedAt: new Date().toISOString(),
  };
}
