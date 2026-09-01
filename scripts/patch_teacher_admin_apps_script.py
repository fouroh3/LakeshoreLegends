from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "docs" / "LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"
BACKEND_DOC = ROOT / "docs" / "admin-player-state-inventory-backend.md"

text = TARGET.read_text(encoding="utf-8")
backend_doc = BACKEND_DOC.read_text(encoding="utf-8")


def replace_between(source: str, start: str, end: str, replacement: str) -> str:
    a = source.find(start)
    if a < 0:
        raise RuntimeError(f"Start marker not found: {start[:80]}")
    b = source.find(end, a)
    if b < 0:
        raise RuntimeError(f"End marker not found: {end[:80]}")
    return source[:a] + replacement.rstrip() + "\n\n" + source[b:]


def replace_function_until(source: str, function_start: str, next_marker: str, replacement: str) -> str:
    return replace_between(source, function_start, next_marker, replacement)


# Pull the tested backend block from the companion documentation so the full
# replacement file and the backend reference cannot drift apart.
try:
    backend = backend_doc.split("```js", 1)[1].split("```", 1)[0].strip()
except IndexError as exc:
    raise RuntimeError("Could not extract Player_State backend JS block") from exc

# Harden the migration backup: copy the actual sheet, including formulas and
# formatting, instead of creating a values-only snapshot.
backup_function = r'''function backupMasterBeforePlayerStateMigration_() {
  const ss = SpreadsheetApp.getActive();
  const master = getSheet_(CFG.STUDENTS_SHEET);
  const stamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || "GMT",
    "yyyyMMdd_HHmmss"
  );
  const name = `PlayerState_Backup_${stamp}`;
  const backup = master.copyTo(ss);
  backup.setName(name);
  return name;
}'''
backend = replace_between(
    backend,
    "function backupMasterBeforePlayerStateMigration_() {",
    "function playerStateStatusPayload_(teacherToken) {",
    backup_function,
)

# Harden the legacy attribute path for an unexpectedly empty Master.
backend = backend.replace(
    '  const idValues = master.getRange(2, iId + 1, Math.max(0, master.getLastRow() - 1), 1).getDisplayValues();',
    '  const rowCount = Math.max(0, master.getLastRow() - 1);\n  if (rowCount < 1) throw new Error("Master has no student rows.");\n  const idValues = master.getRange(2, iId + 1, rowCount, 1).getDisplayValues();',
)

# Harden rename audit logging if a class sheet ever lacks a Guild header.
backend = backend.replace(
    '      norm_(resolved.sh.getRange(resolved.rowNumber, idx_(resolved.map, "Guild") + 1).getValue()),',
    '      (() => {\n        const iGuild = idx_(resolved.map, "Guild");\n        return iGuild >= 0\n          ? norm_(resolved.sh.getRange(resolved.rowNumber, iGuild + 1).getValue())\n          : "";\n      })(),',
)

# Keep the header accurate.
text = text.replace(
    " *   - XP + Skill Token currency management\n",
    " *   - XP + Skill Token currency management\n *   - StudentID-keyed Player_State protection\n *   - Inventory / card management\n *   - Student rename + archive lifecycle\n",
)

# Insert the new Player_State / Inventory / lifecycle backend before routing.
route_marker = "// =========================================================\n// Web App Routing + Endpoints"
if "const ADMIN_PLAYER_STATE = {" not in text:
    pos = text.find(route_marker)
    if pos < 0:
        raise RuntimeError("Web routing marker not found")
    text = text[:pos] + backend.rstrip() + "\n\n" + text[pos:]

# Replace XP spending so attribute bonuses survive roster movement after the
# Player_State migration. This keeps the existing API response contract.
spend_xp = r'''function spendXpWrite_(args) {
  const ctl = readXpControl_();
  if (ctl.storeLocked) throw new Error("Store is closed.");
  if (!ctl.storePin) throw new Error("Store PIN is not set.");

  const pin = normPin_(args.pin || "");
  if (!pin || pin !== normPin_(ctl.storePin)) {
    throw new Error("Invalid Store PIN.");
  }

  const reqNonce = norm_(args.openNonce || "");
  if (ctl.openNonce && reqNonce && reqNonce !== ctl.openNonce) {
    throw new Error("Invalid store window.");
  }
  if (ctl.openNonce && !reqNonce) {
    throw new Error("Missing store window token.");
  }

  const requestId = norm_(args.requestId || "");
  if (requestId && idemIsDuplicate_("spendXp", requestId)) {
    return {
      ok: true,
      deduped: true,
      requestId,
      xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "",
      now: new Date().toISOString(),
    };
  }

  const studentId = normId_(args.studentId);
  const target = String(args.target || "").toUpperCase();
  const points = Math.max(1, Math.round(asNum_(args.points, 1)));

  if (!studentId) throw new Error("Missing studentId.");
  if (!["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(target)) {
    throw new Error("Invalid target.");
  }
  if (!Number.isFinite(points) || points < 1) {
    throw new Error("Invalid points.");
  }
  if (points > ctl.maxPointsPerOpen) {
    throw new Error("Too many points for this store window.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh: xpSh, index } = loadXpIndex_();
    const row = index.get(studentId);
    if (!row) throw new Error("Student not found in XP_State.");

    const costXp = ctl.xpPerPoint * points;
    const beforeBal = Math.round(asNum_(row.balance, 0));
    if (beforeBal < costXp) throw new Error("Not enough XP.");
    const afterBal = beforeBal - costXp;

    let attrWrite = null;

    try {
      attrWrite = writeAttributeBonusSafely_(studentId, target, points);
      xpSh.getRange(row.sheetRow, 4).setValue(afterBal);
      SpreadsheetApp.flush();

      const verifyBal = Math.round(
        asNum_(xpSh.getRange(row.sheetRow, 4).getValue(), -999999)
      );

      if (verifyBal !== afterBal) {
        throw new Error(
          `Write verification failed for ${studentId}. Expected balance ${afterBal}; got ${verifyBal}.`
        );
      }
    } catch (writeErr) {
      try {
        xpSh.getRange(row.sheetRow, 4).setValue(beforeBal);
      } catch (_) {}

      if (attrWrite) {
        try {
          writeAttributeBonusSafely_(studentId, target, -points);
        } catch (_) {}
      }

      throw writeErr;
    }

    const beforeAttr = attrWrite.beforeAttr;
    const afterAttr = attrWrite.afterAttr;
    const tx = ensureXpTxnSheet_();

    appendRowFast_(tx, [
      new Date(),
      studentId,
      row.name || "",
      row.homeroom || "",
      "SPEND",
      costXp,
      target,
      points,
      beforeBal,
      afterBal,
      "",
      ctl.windowLabel || "",
      ctl.openNonce || "",
      requestId || "",
    ]);

    stampXpControlUpdatedAt_();
    const iso = new Date().toISOString();
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, iso);
    if (requestId) idemMark_("spendXp", requestId);

    return {
      ok: true,
      studentId,
      target,
      points,
      costXp,
      balanceBefore: beforeBal,
      balanceAfter: afterBal,
      beforeAttr,
      afterAttr,
      xpLastWriteIso: iso,
      summary: xpSummary_(studentId),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}'''
text = replace_function_until(
    text,
    "function spendXpWrite_(args) {",
    "// ================================================================\n// ========================= SKILL STORE",
    spend_xp,
)

# Import only into an empty row whose historical StudentID has never been used.
# This means archived students keep an immutable ID and their history can never
# be inherited by a future student.
import_function = r'''function adminFindFirstUnreservedRosterRow_(
  sh,
  homeroom,
  nameCol,
  reservedIds
) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];
  if (!maxRow || maxRow < 2) {
    throw new Error(`No configured roster capacity for ${homeroom}.`);
  }

  const values = sh.getRange(2, nameCol, maxRow - 1, 1).getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (norm_(values[i][0])) continue;

    const rowNumber = i + 2;
    const studentId = adminGeneratedIdForClassRow_(homeroom, rowNumber);
    if (reservedIds.has(studentId)) continue;

    return rowNumber;
  }

  throw new Error(
    `${homeroom} has no unused roster slots left. Archived StudentIDs are intentionally never reused.`
  );
}

function adminImportStudents_(args) {
  const verified = verifyTeacher_(args || {});

  if (!masterPlayerStateLookupWired_()) {
    throw new Error(
      "Player data upgrade required before students can be imported. Use Protect Player Data in Teacher Admin first."
    );
  }

  const students = Array.isArray(args.students) ? args.students : [];
  if (!students.length) throw new Error("No students were provided.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const imported = [];
    const incomingKeys = new Set();
    const classState = new Map();
    const reservedIds = new Set(playerStateReservedIds_());
    const nowIso = new Date().toISOString();

    students.forEach((student, index) => {
      const first = norm_(student && student.first);
      const last = norm_(student && student.last);
      const homeroom = norm_(student && student.homeroom);
      const guild = norm_(student && student.guild);

      if (!first || !last || !homeroom) {
        throw new Error(
          `Import row ${index + 1} is missing first name, last name, or homeroom.`
        );
      }

      if (guild && ADMIN_GUILDS.indexOf(guild) === -1) {
        throw new Error(
          `Import row ${index + 1} has an invalid guild: ${guild}`
        );
      }

      const rosterName = adminRosterName_(first, last);
      const duplicateKey = `${homeroom}|${rosterName.toLowerCase()}`;

      if (incomingKeys.has(duplicateKey)) {
        throw new Error(
          `Duplicate pasted student in ${homeroom}: ${rosterName}`
        );
      }
      incomingKeys.add(duplicateKey);

      let state = classState.get(homeroom);

      if (!state) {
        const sh = adminClassSheet_(homeroom);
        const { map } = adminHeaderMapForSheet_(sh);
        const iName = idx_(map, "Name", "StudentName", "Student Name");
        const iGuild = idx_(map, "Guild");

        if (iName < 0) throw new Error(`${homeroom} is missing a Name column.`);
        if (iGuild < 0) throw new Error(`${homeroom} is missing a Guild column.`);

        state = {
          sh,
          iName,
          iGuild,
          existingNames: adminExistingRosterNameSet_(
            sh,
            homeroom,
            iName + 1
          ),
        };
        classState.set(homeroom, state);
      }

      if (state.existingNames.has(rosterName.toLowerCase())) {
        throw new Error(`${rosterName} already exists in ${homeroom}.`);
      }

      const row = adminFindFirstUnreservedRosterRow_(
        state.sh,
        homeroom,
        state.iName + 1,
        reservedIds
      );
      const studentId = adminGeneratedIdForClassRow_(homeroom, row);

      adminClearReusableRosterRow_(state.sh, row);
      state.sh.getRange(row, state.iName + 1).setValue(rosterName);
      state.sh.getRange(row, state.iGuild + 1).setValue(guild || "");
      state.existingNames.add(rosterName.toLowerCase());
      reservedIds.add(studentId);

      const record = {
        studentId,
        first,
        last,
        name: adminDisplayName_(first, last),
        rosterName,
        homeroom,
        guild: guild || "",
      };

      adminSeedStudentState_(record);
      ensurePlayerStateStudent_(studentId);
      imported.push(record);
    });

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    setProp_(CFG.PROP_LAST_WRITE_ISO, nowIso);
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);
    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      imported: imported.length,
      students: imported,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}'''
text = replace_function_until(
    text,
    "function adminImportStudents_(args) {",
    "function adminResolveClassRowForStudentId_(studentIdRaw) {",
    import_function,
)

# Add the new write routes.
route_anchor = '''      case "adminadjustcurrency":
        return jsonOut_(adminAdjustCurrency_(body));

      default:'''
route_replacement = '''      case "adminadjustcurrency":
        return jsonOut_(adminAdjustCurrency_(body));

      case "adminsystemstatus":
        return jsonOut_(adminSystemStatus_(body));

      case "adminmigrateplayerstate":
        return jsonOut_(migratePlayerStateFromMaster_(body));

      case "admininventorysnapshot":
        return jsonOut_(adminInventorySnapshot_(body));

      case "adminadjustinventory":
        return jsonOut_(adminAdjustInventory_(body));

      case "adminupdatestudent":
        return jsonOut_(adminUpdateStudent_(body));

      case "adminarchivestudent":
        return jsonOut_(adminArchiveStudent_(body));

      default:'''
if 'case "adminsystemstatus"' not in text:
    if route_anchor not in text:
        raise RuntimeError("Admin route insertion anchor not found")
    text = text.replace(route_anchor, route_replacement, 1)

# Ensure the new state/audit sheets exist when the normal ensure helpers run,
# but NEVER auto-run the migration itself.
ensure_anchor = '''        ensureSkillTxnSheet_();
        ensureFinalExaminerSheets_();'''
ensure_replacement = '''        ensureSkillTxnSheet_();
        ensurePlayerStateSheet_();
        ensureInventoryTxnSheet_();
        ensureRosterTxnSheet_();
        ensureFinalExaminerSheets_();'''
if ensure_anchor in text:
    text = text.replace(ensure_anchor, ensure_replacement, 1)

run_anchor = '''  ensureSkillTxnSheet_();
  ensureFinalExaminerSheets_();'''
run_replacement = '''  ensureSkillTxnSheet_();
  ensurePlayerStateSheet_();
  ensureInventoryTxnSheet_();
  ensureRosterTxnSheet_();
  ensureFinalExaminerSheets_();'''
if run_anchor in text:
    text = text.replace(run_anchor, run_replacement, 1)

# Sanity checks before writing the generated replacement file.
required = [
    "function adminSystemStatus_(args)",
    "function migratePlayerStateFromMaster_(args)",
    "function adminInventorySnapshot_(args)",
    "function adminAdjustInventory_(args)",
    "function adminUpdateStudent_(args)",
    "function adminArchiveStudent_(args)",
    'case "adminmigrateplayerstate"',
    'case "adminadjustinventory"',
    "writeAttributeBonusSafely_(studentId, target, points)",
    "adminFindFirstUnreservedRosterRow_",
]
for needle in required:
    if needle not in text:
        raise RuntimeError(f"Generated Apps Script missing: {needle}")

TARGET.write_text(text, encoding="utf-8")

# Node can parse the JavaScript syntax even though Apps Script runtime globals
# (SpreadsheetApp, LockService, etc.) do not exist locally.
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as fh:
    fh.write(text)
    check_path = fh.name

subprocess.run(["node", "--check", check_path], check=True)
print(f"Patched and syntax-checked {TARGET}")
