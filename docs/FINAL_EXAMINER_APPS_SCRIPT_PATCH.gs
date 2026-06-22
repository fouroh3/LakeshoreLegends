/*
 * FINAL EXAMINER BACKEND PATCH
 * Paste this whole block ABOVE doGet/doPost in the deployed Apps Script.
 * Then add the three routing lines shown at the bottom of this file.
 */

const FINAL_EXAMINER = {
  CLASS_SHEET: "FinalExaminer_Class_State",
  BOSS_SHEET: "FinalExaminer_Boss_State",
  LOG_SHEET: "FinalExaminer_Log",
  RAID_ID: "final_examiner_2026",
  BOSSES: [
    ["KEEPER_SHADOWS", "The Keeper of Shadows", 1572, false],
    ["CRYPT_WARDEN", "The Crypt Warden", 2478, false],
    ["THE_ALCHEMIST", "The Alchemist of Doom", 3567, false],
    ["PLAGUEBEARER", "The Plaguebearer", 4002, false],
    ["PRISM_SENTINEL", "The Prism Sentinel", 5230, false],
    ["FINAL_EXAMINER", "The Final Examiner", 35422, true],
  ],
};

function ensureFinalExaminerSheets_() {
  const ss = SpreadsheetApp.getActive();
  let classSh = ss.getSheetByName(FINAL_EXAMINER.CLASS_SHEET);
  let bossSh = ss.getSheetByName(FINAL_EXAMINER.BOSS_SHEET);
  let logSh = ss.getSheetByName(FINAL_EXAMINER.LOG_SHEET);
  if (!classSh) classSh = ss.insertSheet(FINAL_EXAMINER.CLASS_SHEET);
  if (!bossSh) bossSh = ss.insertSheet(FINAL_EXAMINER.BOSS_SHEET);
  if (!logSh) logSh = ss.insertSheet(FINAL_EXAMINER.LOG_SHEET);

  ensureHeaders_(classSh, [
    "RaidId", "ClassKey", "Label", "Homerooms", "StartingHP", "CurrentHP", "UpdatedAt",
  ]);
  ensureHeaders_(bossSh, [
    "RaidId", "BossKey", "BossName", "MaxHP", "CurrentHP", "Locked", "Defeated", "UpdatedAt",
  ]);
  ensureHeaders_(logSh, [
    "Timestamp", "RaidId", "ClassKey", "ClassLabel", "Action", "TargetBossKey", "RequestedAmount", "AppliedAmount", "OverkillLost", "ClassHPAfter", "BossHPAfter", "Note", "RequestId",
  ]);

  return { classSh, bossSh, logSh };
}

function finalExaminerActiveLeaderUnits_() {
  syncBattleControlDerivedFields_();
  const { rows } = battleControlRows_();
  const leaders = rows.filter((r) =>
    String(r.status || "").toUpperCase() === "ACTIVE" &&
    norm_(r.leaderHomeroom || r.homeroom) === norm_(r.homeroom)
  );

  return leaders.map((leader) => {
    const homerooms = rows
      .filter((r) =>
        String(r.status || "").toUpperCase() === "ACTIVE" &&
        norm_(r.leaderHomeroom || r.homeroom) === norm_(leader.homeroom)
      )
      .map((r) => norm_(r.homeroom))
      .filter(Boolean);

    const label = homerooms.join(" / ");
    return {
      classKey: homerooms.join("__").replace(/[^A-Za-z0-9_\-]/g, "_").toUpperCase(),
      label,
      homerooms,
    };
  });
}

function finalExaminerHpByHomeroom_() {
  const { index } = loadHpIndex_();
  const students = loadStudentsMap_();
  const totals = new Map();

  index.forEach((hp, studentId) => {
    const student = students.get(studentId);
    const homeroom = norm_(student && student.homeroom);
    if (!homeroom) return;
    totals.set(homeroom, (totals.get(homeroom) || 0) + Math.max(0, Math.round(asNum_(hp.currentHP, 0))));
  });

  return totals;
}

function finalExaminerStart_(args) {
  const raidId = norm_(args && args.raidId) || FINAL_EXAMINER.RAID_ID;
  const requestId = norm_(args && args.requestId);
  if (requestId && idemIsDuplicate_("finalExaminerStart", requestId)) {
    return finalExaminerState_(raidId);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { classSh, bossSh } = ensureFinalExaminerSheets_();
    const units = finalExaminerActiveLeaderUnits_();
    if (!units.length) throw new Error("No ACTIVE Battle_Control classes found. Activate all Final Examiner classes first.");

    const hpByHomeroom = finalExaminerHpByHomeroom_();
    const nowIso = new Date().toISOString();
    const classRows = units.map((unit) => {
      const total = unit.homerooms.reduce((sum, hr) => sum + Math.max(0, Number(hpByHomeroom.get(hr) || 0)), 0);
      return [raidId, unit.classKey, unit.label, unit.homerooms.join(", "), total, total, nowIso];
    });
    const bossRows = FINAL_EXAMINER.BOSSES.map(([key, name, hp, locked]) => [raidId, key, name, hp, hp, locked, false, nowIso]);

    const clearRaidRows = (sh) => {
      const values = sh.getDataRange().getValues();
      const keep = [values[0]];
      for (let i = 1; i < values.length; i++) {
        if (norm_(values[i][0]) !== raidId) keep.push(values[i]);
      }
      sh.clearContents();
      sh.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
    };

    clearRaidRows(classSh);
    clearRaidRows(bossSh);
    if (classRows.length) classSh.getRange(classSh.getLastRow() + 1, 1, classRows.length, classRows[0].length).setValues(classRows);
    if (bossRows.length) bossSh.getRange(bossSh.getLastRow() + 1, 1, bossRows.length, bossRows[0].length).setValues(bossRows);

    if (requestId) idemMark_("finalExaminerStart", requestId);
    return { ok: true, started: true, raid: finalExaminerState_(raidId) };
  } finally {
    lock.releaseLock();
  }
}

function finalExaminerState_(raidIdRaw) {
  const raidId = norm_(raidIdRaw) || FINAL_EXAMINER.RAID_ID;
  const { classSh, bossSh } = ensureFinalExaminerSheets_();
  const classValues = classSh.getDataRange().getValues();
  const bossValues = bossSh.getDataRange().getValues();

  const classes = classValues.slice(1)
    .filter((r) => norm_(r[0]) === raidId)
    .map((r) => ({
      classKey: norm_(r[1]), label: norm_(r[2]), startingHP: Math.max(0, Math.round(asNum_(r[4], 0))),
      currentHP: Math.max(0, Math.round(asNum_(r[5], 0))), updatedAt: String(r[6] || ""),
    }));
  const bosses = bossValues.slice(1)
    .filter((r) => norm_(r[0]) === raidId)
    .map((r) => ({
      bossKey: norm_(r[1]), bossName: norm_(r[2]), maxHP: Math.max(1, Math.round(asNum_(r[3], 1))),
      currentHP: Math.max(0, Math.round(asNum_(r[4], 0))), locked: toBool_(r[5], false),
      defeated: toBool_(r[6], false), updatedAt: String(r[7] || ""),
    }));

  const minions = bosses.filter((b) => b.bossKey !== "FINAL_EXAMINER");
  const finalBoss = bosses.find((b) => b.bossKey === "FINAL_EXAMINER");
  const allMinionsDefeated = minions.length > 0 && minions.every((b) => b.defeated || b.currentHP <= 0);
  const phase = finalBoss && finalBoss.defeated ? "VICTORY" : allMinionsDefeated ? "FINAL_EXAMINER" : "MINIONS";

  return { ok: true, raidId, active: classes.length > 0 && bosses.length > 0, phase, classes, bosses, updatedAt: new Date().toISOString() };
}

function finalExaminerAction_(args) {
  const raidId = norm_(args && args.raidId) || FINAL_EXAMINER.RAID_ID;
  const classKey = norm_(args && args.classKey);
  const actionType = norm_(args && args.actionType).toUpperCase();
  const targetBossKey = norm_(args && args.targetBossKey).toUpperCase();
  const amount = Math.max(0, Math.round(asNum_(args && args.amount, 0)));
  const note = norm_(args && args.note);
  const requestId = norm_(args && args.requestId);

  if (!classKey) throw new Error("Missing classKey.");
  if (!["HEAL", "STRIKE"].includes(actionType)) throw new Error("Action must be HEAL or STRIKE.");
  if (!amount) throw new Error("Amount must be greater than zero.");
  if (actionType === "STRIKE" && !targetBossKey) throw new Error("Choose one target boss.");
  if (requestId && idemIsDuplicate_("finalExaminerAction", requestId)) return { ok: true, deduped: true, raid: finalExaminerState_(raidId) };

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { classSh, bossSh, logSh } = ensureFinalExaminerSheets_();
    const classes = classSh.getDataRange().getValues();
    const bosses = bossSh.getDataRange().getValues();
    const classRowIndex = classes.findIndex((r, i) => i > 0 && norm_(r[0]) === raidId && norm_(r[1]) === classKey);
    if (classRowIndex < 1) throw new Error("Raid class not found. Start the raid first.");

    const classRow = classes[classRowIndex];
    const classHPBefore = Math.max(0, Math.round(asNum_(classRow[5], 0)));
    const classStartingHP = Math.max(0, Math.round(asNum_(classRow[4], 0)));
    let classHPAfter = classHPBefore;
    let bossHPAfter = "";
    let appliedAmount = 0;
    let overkillLost = 0;
    const nowIso = new Date().toISOString();

    if (actionType === "HEAL") {
      classHPAfter = classHPBefore + amount;
      appliedAmount = amount;
      classSh.getRange(classRowIndex + 1, 6, 1, 2).setValues([[classHPAfter, nowIso]]);
    } else {
      const bossRowIndex = bosses.findIndex((r, i) => i > 0 && norm_(r[0]) === raidId && norm_(r[1]) === targetBossKey);
      if (bossRowIndex < 1) throw new Error("Target boss not found.");
      const bossRow = bosses[bossRowIndex];
      const locked = toBool_(bossRow[5], false);
      const defeated = toBool_(bossRow[6], false) || Math.max(0, asNum_(bossRow[4], 0)) <= 0;
      if (locked) throw new Error("That boss is still locked.");
      if (defeated) throw new Error("That boss has already been defeated.");

      const bossBefore = Math.max(0, Math.round(asNum_(bossRow[4], 0)));
      appliedAmount = Math.min(amount, bossBefore);
      overkillLost = Math.max(0, amount - appliedAmount);
      bossHPAfter = Math.max(0, bossBefore - appliedAmount);
      bossSh.getRange(bossRowIndex + 1, 5, 1, 4).setValues([[bossHPAfter, false, bossHPAfter <= 0, nowIso]]);

      const freshBosses = bossSh.getDataRange().getValues();
      const minionRows = freshBosses.slice(1).filter((r) => norm_(r[0]) === raidId && norm_(r[1]) !== "FINAL_EXAMINER");
      const allMinionsDefeated = minionRows.length > 0 && minionRows.every((r) => toBool_(r[6], false) || Math.max(0, asNum_(r[4], 0)) <= 0);
      if (allMinionsDefeated) {
        const finalIndex = freshBosses.findIndex((r, i) => i > 0 && norm_(r[0]) === raidId && norm_(r[1]) === "FINAL_EXAMINER");
        if (finalIndex > 0) bossSh.getRange(finalIndex + 1, 6, 1, 3).setValues([[false, toBool_(freshBosses[finalIndex][6], false), nowIso]]);
      }
    }

    logSh.appendRow([new Date(), raidId, classKey, norm_(classRow[2]), actionType, targetBossKey, amount, appliedAmount, overkillLost, classHPAfter, bossHPAfter, note, requestId]);
    if (requestId) idemMark_("finalExaminerAction", requestId);

    return { ok: true, appliedAmount, overkillLost, classHPAfter, bossHPAfter, raid: finalExaminerState_(raidId) };
  } finally {
    lock.releaseLock();
  }
}

/* ADD THESE ROUTES:

In doGet switch:
case "finalexaminerstate":
  return jsonOut_(finalExaminerState_(p.raidId || ""));

In doPost switch:
case "finalexaminerstart":
  return jsonOut_(finalExaminerStart_(body));
case "finalexamineraction":
  return jsonOut_(finalExaminerAction_(body));

And add ensureFinalExaminerSheets_(); inside RUN_ensureAllSheets().
*/
