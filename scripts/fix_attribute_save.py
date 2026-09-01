from pathlib import Path
import re


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


# Frontend/API version + safe retry for the idempotent SET operation.
p = Path("src/pages/admin/adminApi.ts")
s = p.read_text(encoding="utf-8")
s = replace_once(
    s,
    'export const ADMIN_API_VERSION = "2026-09-01.3";',
    'export const ADMIN_API_VERSION = "2026-09-01.4";',
    "frontend API version",
)
s = replace_once(
    s,
    '  "adminabilitysnapshot",\n  "adminstoresnapshot",',
    '  "adminabilitysnapshot",\n  "adminupdateabilities",\n  "adminstoresnapshot",',
    "retryable update abilities",
)
p.write_text(s, encoding="utf-8")


# Successful notices confirm the action, then disappear.
p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text(encoding="utf-8")
marker = "  const reloadStudents = async () => {"
effect = '''  useEffect(() => {
    if (!notice || notice.type !== "ok") return;

    const timer = window.setTimeout(() => {
      setNotice((current) => (current === notice ? null : current));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

'''
s = replace_once(s, marker, effect + marker, "success notice timer")
p.write_text(s, encoding="utf-8")


# Apps Script: replace the expensive snapshot-before/snapshot-after SET path.
p = Path("docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs")
s = p.read_text(encoding="utf-8")
s = replace_once(
    s,
    'const ADMIN_API_VERSION = "2026-09-01.3";',
    'const ADMIN_API_VERSION = "2026-09-01.4";',
    "backend API version",
)

replacement = r'''function adminUpdateAbilities_(args) {
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
    const resolved = adminAbilityResolved_(studentId);
    const state = ensurePlayerStateStudent_(studentId);
    const now = new Date();
    const nowIso = now.toISOString();
    const baseOrder = ["str", "dex", "con", "int", "wis", "cha"];

    // Read the class row once instead of rebuilding a full snapshot before
    // and after every save.
    const classWidth = Math.max(1, resolved.sh.getLastColumn());
    const classRow = resolved.sh
      .getRange(resolved.rowNumber, 1, 1, classWidth)
      .getValues()[0];

    const beforeBase = {};
    baseOrder.forEach((key) => {
      beforeBase[key] = Math.round(asNum_(classRow[resolved.columns[key]], 0));
    });

    const beforeRosterSkills = [];
    const beforeRosterSeen = new Set();
    adminSplitSkills_(classRow[resolved.columns.skills]).forEach((value) => {
      const canonical = canonicalSkillName_(value) || norm_(value);
      const key = normalizeSkillId_(canonical);
      if (!key || beforeRosterSeen.has(key)) return;
      beforeRosterSeen.add(key);
      beforeRosterSkills.push(canonical);
    });
    beforeRosterSkills.sort((a, b) => a.localeCompare(b));

    const beforeBonusValues = state.sh
      .getRange(state.row.sheetRow, state.row.col.STR_Bonus, 1, 6)
      .getValues()[0];
    const beforeBonus = {
      str: Math.round(asNum_(beforeBonusValues[0], 0)),
      dex: Math.round(asNum_(beforeBonusValues[1], 0)),
      con: Math.round(asNum_(beforeBonusValues[2], 0)),
      int: Math.round(asNum_(beforeBonusValues[3], 0)),
      wis: Math.round(asNum_(beforeBonusValues[4], 0)),
      cha: Math.round(asNum_(beforeBonusValues[5], 0)),
    };

    // Attribute columns are contiguous in the normal class-sheet schema.
    // Fall back to individual cells if a sheet is ever rearranged.
    const baseStart = resolved.columns.str;
    const contiguous = baseOrder.every(
      (key, index) => resolved.columns[key] === baseStart + index
    );

    if (contiguous) {
      resolved.sh
        .getRange(resolved.rowNumber, baseStart + 1, 1, 6)
        .setValues([[
          base.str,
          base.dex,
          base.con,
          base.int,
          base.wis,
          base.cha,
        ]]);
    } else {
      baseOrder.forEach((key) => {
        resolved.sh
          .getRange(resolved.rowNumber, resolved.columns[key] + 1)
          .setValue(base[key]);
      });
    }

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

    const rows = [];
    const studentName = resolved.currentName || studentId;

    baseOrder.forEach((key) => {
      if (beforeBase[key] !== base[key]) {
        rows.push([
          now,
          studentId,
          studentName,
          "SET_BASE_ATTRIBUTE",
          key.toUpperCase(),
          beforeBase[key],
          base[key],
          "ADMIN",
          reason,
        ]);
      }

      if (beforeBonus[key] !== bonus[key]) {
        rows.push([
          now,
          studentId,
          studentName,
          "SET_BONUS_ATTRIBUTE",
          `${key.toUpperCase()}_BONUS`,
          beforeBonus[key],
          bonus[key],
          "ADMIN",
          reason,
        ]);
      }
    });

    const beforeSkills = beforeRosterSkills.join(", ");
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
      const txn = ensureAbilityTxnSheet_();
      txn
        .getRange(txn.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);

    return {
      ok: true,
      studentId,
      studentName,
      baseAttributes: base,
      bonusAttributes: bonus,
      rosterSkills,
      purchasedSkills: purchasedSkillIdsForStudent_(studentId).names,
      teacherToken: verified.token,
      updated: rows.length > 0,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminAdjustSkill_'''

pattern = r"function adminUpdateAbilities_\(args\) \{.*?\n\}\n\nfunction adminAdjustSkill_"
s, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
if count != 1:
    raise RuntimeError(f"Expected one adminUpdateAbilities_ function, replaced {count}")
p.write_text(s, encoding="utf-8")
