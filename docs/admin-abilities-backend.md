# Teacher Admin — Abilities Manager Backend

Adds teacher-side editing for base attributes, StudentID-keyed attribute bonuses, roster skills, and teacher-granted/purchased skills.

The full replacement Apps Script file includes this block automatically.

```js
// =========================================================
// Global Teacher Admin: Attributes + Skills
// =========================================================
const ADMIN_ABILITIES = {
  TXN_SHEET: "Ability_Transactions",
};

function ensureAbilityTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_ABILITIES.TXN_SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_ABILITIES.TXN_SHEET);

  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Action",
    "Field",
    "Before",
    "After",
    "Source",
    "Note",
  ]);
}

function adminSplitSkills_(raw) {
  return String(raw || "")
    .split(/[;,|\n\r]/g)
    .map((value) => norm_(value))
    .filter(Boolean);
}

function adminCanonicalSkillList_(values) {
  const out = [];
  const seen = new Set();

  (Array.isArray(values) ? values : []).forEach((value) => {
    const canonical = canonicalSkillName_(value);
    if (!canonical) throw new Error(`Invalid skill: ${value}`);

    const key = normalizeSkillId_(canonical);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(canonical);
  });

  return out.sort((a, b) => a.localeCompare(b));
}

function adminAbilityResolved_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  if (!studentId) throw new Error("Missing studentId.");

  const resolved = adminResolveClassRowForStudentId_(studentId);
  const map = resolved.map;

  const columns = {
    str: idx_(map, "Strength", "STR"),
    dex: idx_(map, "Dexterity", "DEX"),
    con: idx_(map, "Constitution", "CON"),
    int: idx_(map, "Intelligence", "INT"),
    wis: idx_(map, "Wisdom", "WIS"),
    cha: idx_(map, "Charisma", "CHA"),
    skills: idx_(map, "Skills", "Skill"),
  };

  ["str", "dex", "con", "int", "wis", "cha", "skills"].forEach((key) => {
    if (columns[key] < 0) {
      throw new Error(`${resolved.homeroom} is missing the ${key} ability column.`);
    }
  });

  return { ...resolved, columns };
}

function adminRosterSkillsForStudent_(studentIdRaw) {
  const resolved = adminAbilityResolved_(studentIdRaw);
  const raw = resolved.sh
    .getRange(resolved.rowNumber, resolved.columns.skills + 1)
    .getValue();

  const out = [];
  const seen = new Set();

  adminSplitSkills_(raw).forEach((value) => {
    const canonical = canonicalSkillName_(value) || norm_(value);
    const key = normalizeSkillId_(canonical);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(canonical);
  });

  return out.sort((a, b) => a.localeCompare(b));
}

function adminAbilitySnapshotForStudent_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  const students = loadStudentsMap_();
  const student = students.get(studentId);
  if (!student) throw new Error(`Active student not found: ${studentId}`);

  const resolved = adminAbilityResolved_(studentId);
  const state = ensurePlayerStateStudent_(studentId);

  const readBase = (key) =>
    Math.round(
      asNum_(
        resolved.sh.getRange(resolved.rowNumber, resolved.columns[key] + 1).getValue(),
        0
      )
    );

  const readBonus = (name) =>
    Math.round(
      asNum_(state.sh.getRange(state.row.sheetRow, state.row.col[name]).getValue(), 0)
    );

  return {
    ok: true,
    studentId,
    studentName: student.name || "",
    baseAttributes: {
      str: readBase("str"),
      dex: readBase("dex"),
      con: readBase("con"),
      int: readBase("int"),
      wis: readBase("wis"),
      cha: readBase("cha"),
    },
    bonusAttributes: {
      str: readBonus("STR_Bonus"),
      dex: readBonus("DEX_Bonus"),
      con: readBonus("CON_Bonus"),
      int: readBonus("INT_Bonus"),
      wis: readBonus("WIS_Bonus"),
      cha: readBonus("CHA_Bonus"),
    },
    rosterSkills: adminRosterSkillsForStudent_(studentId),
    purchasedSkills: purchasedSkillIdsForStudent_(studentId).names,
    now: new Date().toISOString(),
  };
}

function adminAbilitySnapshot_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data protection is required before abilities can be edited.");
  }

  return {
    ...adminAbilitySnapshotForStudent_(args.studentId),
    teacherToken: verified.token,
  };
}

function adminAttributeObject_(raw) {
  const source = raw || {};
  const out = {};

  ["str", "dex", "con", "int", "wis", "cha"].forEach((key) => {
    const value = Math.round(asNum_(source[key], 0));
    if (value < -99 || value > 99) {
      throw new Error(`${key.toUpperCase()} must be between -99 and 99.`);
    }
    out[key] = value;
  });

  return out;
}

function adminUpdateAbilities_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data protection is required before abilities can be edited.");
  }

  const studentId = normId_(args.studentId);
  const reason = norm_(args.reason || "");
  if (!studentId) throw new Error("Missing studentId.");
  if (!reason) throw new Error("A reason is required for ability changes.");

  const base = adminAttributeObject_(args.baseAttributes);
  const bonus = adminAttributeObject_(args.bonusAttributes);
  const rosterSkills = adminCanonicalSkillList_(args.rosterSkills);

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const before = adminAbilitySnapshotForStudent_(studentId);
    const resolved = adminAbilityResolved_(studentId);
    const state = ensurePlayerStateStudent_(studentId);
    const now = new Date();
    const nowIso = now.toISOString();

    const baseOrder = ["str", "dex", "con", "int", "wis", "cha"];
    baseOrder.forEach((key) => {
      resolved.sh
        .getRange(resolved.rowNumber, resolved.columns[key] + 1)
        .setValue(base[key]);
    });

    resolved.sh
      .getRange(resolved.rowNumber, resolved.columns.skills + 1)
      .setValue(rosterSkills.join(", "));

    state.sh
      .getRange(state.row.sheetRow, state.row.col.STR_Bonus, 1, 6)
      .setValues([[
        bonus.str,
        bonus.dex,
        bonus.con,
        bonus.int,
        bonus.wis,
        bonus.cha,
      ]]);
    state.sh
      .getRange(state.row.sheetRow, state.row.col.UpdatedAt)
      .setValue(nowIso);

    const txn = ensureAbilityTxnSheet_();
    const rows = [];
    const studentName = before.studentName || "";

    baseOrder.forEach((key) => {
      if (before.baseAttributes[key] !== base[key]) {
        rows.push([
          now,
          studentId,
          studentName,
          "SET_BASE_ATTRIBUTE",
          key.toUpperCase(),
          before.baseAttributes[key],
          base[key],
          "ADMIN",
          reason,
        ]);
      }

      if (before.bonusAttributes[key] !== bonus[key]) {
        rows.push([
          now,
          studentId,
          studentName,
          "SET_BONUS_ATTRIBUTE",
          `${key.toUpperCase()}_BONUS`,
          before.bonusAttributes[key],
          bonus[key],
          "ADMIN",
          reason,
        ]);
      }
    });

    const beforeSkills = before.rosterSkills.join(", ");
    const afterSkills = rosterSkills.join(", ");
    if (beforeSkills !== afterSkills) {
      rows.push([
        now,
        studentId,
        studentName,
        "SET_ROSTER_SKILLS",
        "Skills",
        beforeSkills,
        afterSkills,
        "ADMIN",
        reason,
      ]);
    }

    if (rows.length) {
      txn.getRange(txn.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);

    return {
      ...adminAbilitySnapshotForStudent_(studentId),
      teacherToken: verified.token,
      updated: rows.length > 0,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminAdjustSkill_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  const mode = norm_(args.mode || "").toUpperCase();
  const skillName = canonicalSkillName_(args.skillName || args.skillId || "");
  const reason = norm_(args.reason || "");

  if (!studentId) throw new Error("Missing studentId.");
  if (!["GRANT", "REVOKE"].includes(mode)) {
    throw new Error("Skill mode must be GRANT or REVOKE.");
  }
  if (!skillName) throw new Error("Invalid skill.");
  if (!reason) throw new Error("A reason is required for skill changes.");

  const students = loadStudentsMap_();
  const student = students.get(studentId);
  if (!student) throw new Error(`Active student not found: ${studentId}`);

  const skillId = normalizeSkillId_(skillName);
  const rosterIds = new Set(
    adminRosterSkillsForStudent_(studentId).map((name) => normalizeSkillId_(name))
  );
  const purchased = purchasedSkillIdsForStudent_(studentId);

  if (mode === "GRANT") {
    if (rosterIds.has(skillId) || purchased.ids.has(skillId)) {
      throw new Error("Skill already owned.");
    }

    const { index } = loadSkillStateIndex_();
    const state = index.get(studentId);
    const tokens = state ? state.skillTokens : 0;

    ensurePurchasedSkillsSheet_().appendRow([
      new Date(),
      studentId,
      student.name || "",
      skillId,
      skillName,
      0,
      "ADMIN",
      "",
    ]);

    ensureSkillTxnSheet_().appendRow([
      new Date(),
      studentId,
      student.name || "",
      "ADMIN_GRANT",
      skillId,
      skillName,
      0,
      tokens,
      tokens,
      "ADMIN",
      "",
      reason,
    ]);
  } else {
    if (rosterIds.has(skillId) && !purchased.ids.has(skillId)) {
      throw new Error(
        "That is a roster skill. Uncheck it under Roster Skills and save instead."
      );
    }

    const sh = ensurePurchasedSkillsSheet_();
    const values = sh.getDataRange().getValues();
    const map = headerMap_(values[0] || []);
    const iId = idx_(map, "StudentID", "ID");
    const iSkillId = idx_(map, "SkillId", "Skill ID");
    const iSkillName = idx_(map, "SkillName", "Skill Name");
    const rowsToDelete = [];

    for (let r = 1; r < values.length; r++) {
      if (normId_(values[r][iId]) !== studentId) continue;
      const rowSkillId = normalizeSkillId_(
        iSkillId >= 0 ? values[r][iSkillId] : values[r][iSkillName]
      );
      if (rowSkillId === skillId) rowsToDelete.push(r + 1);
    }

    if (!rowsToDelete.length) throw new Error("Purchased/granted skill not found.");

    rowsToDelete
      .sort((a, b) => b - a)
      .forEach((rowNumber) => sh.deleteRow(rowNumber));

    const { index } = loadSkillStateIndex_();
    const state = index.get(studentId);
    const tokens = state ? state.skillTokens : 0;

    ensureSkillTxnSheet_().appendRow([
      new Date(),
      studentId,
      student.name || "",
      "ADMIN_REVOKE",
      skillId,
      skillName,
      0,
      tokens,
      tokens,
      "ADMIN",
      "",
      reason,
    ]);
  }

  SpreadsheetApp.flush();

  return {
    ...adminAbilitySnapshotForStudent_(studentId),
    teacherToken: verified.token,
    mode,
    skillName,
  };
}
```
