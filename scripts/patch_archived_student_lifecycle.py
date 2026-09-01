from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "src/pages/admin/adminApi.ts"
APP = ROOT / "src/pages/admin/AdminPage.tsx"
GS = ROOT / "docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"


def once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# adminApi.ts
# -----------------------------------------------------------------------------
api = API.read_text(encoding="utf-8")
if "export type AdminArchivedStudentRow" not in api:
    marker = "export type AdminArchiveStudentResult = {"
    pos = api.find(marker)
    if pos < 0:
        raise RuntimeError("Archive result type marker missing")
    block = r'''export type AdminArchivedStudentRow = {
  studentId: string;
  studentName: string;
  homeroom: string;
  guild: string;
  archivedAt: string;
  reason: string;
};

export type AdminArchivedStudentsResult = {
  ok?: boolean;
  error?: string;
  rows?: AdminArchivedStudentRow[];
  [key: string]: any;
};

export type AdminRestoreStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  restored?: boolean;
  [key: string]: any;
};

export type AdminDeleteArchivedStudentResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  deleted?: boolean;
  mediaCleanupRequired?: boolean;
  [key: string]: any;
};

'''
    api = api[:pos] + block + api[pos:]

    api = once(
        api,
        '  | "adminarchivestudent"',
        '  | "adminarchivestudent"\n  | "adminarchivedstudents"\n  | "adminrestorestudent"\n  | "admindeletearchivedstudent"',
        "archive action list",
    )

    api += r'''

export async function adminArchivedStudents() {
  return postAdminAction<AdminArchivedStudentsResult>(
    "adminarchivedstudents",
    {}
  );
}

export async function adminRestoreStudent(args: { studentId: string }) {
  return postAdminAction<AdminRestoreStudentResult>(
    "adminrestorestudent",
    args
  );
}

export async function adminDeleteArchivedStudent(args: {
  studentId: string;
  reason: string;
}) {
  return postAdminAction<AdminDeleteArchivedStudentResult>(
    "admindeletearchivedstudent",
    args
  );
}
'''
API.write_text(api, encoding="utf-8")


# -----------------------------------------------------------------------------
# AdminPage.tsx
# -----------------------------------------------------------------------------
app = APP.read_text(encoding="utf-8")
if "ArchivedStudentsPanel" not in app:
    app = once(
        app,
        'import StoreSettingsPanel from "./components/StoreSettingsPanel";',
        'import StoreSettingsPanel from "./components/StoreSettingsPanel";\nimport ArchivedStudentsPanel from "./components/ArchivedStudentsPanel";',
        "archived component import",
    )

    active_panel = '''                <AdminPanel
                  kicker="Active Roster"
                  title="Roster & Demographics"
                  description="Fix names, move students between homerooms with full game-state migration, or archive students without losing their history."
                >
                  <StudentManagePanel
                    students={students}
                    busy={busy || !playerStateReady}
                    onUpdate={handleUpdateStudent}
                    onMove={handleMoveStudent}
                    onArchive={handleArchiveStudent}
                  />
                </AdminPanel>'''
    replacement = active_panel + '''

                <AdminPanel
                  kicker="Archived Roster"
                  title="Restore or Permanently Delete"
                  description="Archived students stay recoverable and keep their StudentID reserved. Restore mistakes safely, or permanently erase their stored game data when you are certain it is no longer needed."
                >
                  <ArchivedStudentsPanel onRosterChanged={reloadStudents} />
                </AdminPanel>'''
    app = once(app, active_panel, replacement, "archived roster panel")
APP.write_text(app, encoding="utf-8")


# -----------------------------------------------------------------------------
# Apps Script
# -----------------------------------------------------------------------------
gs = GS.read_text(encoding="utf-8")
if "adminArchivedStudents_" not in gs:
    # Extend Player_State constants with archive snapshot sheet.
    gs = once(
        gs,
        '  ROSTER_TXN_SHEET: "Roster_Transactions",\n};',
        '  ROSTER_TXN_SHEET: "Roster_Transactions",\n  ARCHIVED_ROSTER_SHEET: "Archived_Roster",\n};',
        "archived roster constant",
    )

    ensure_anchor = '''function ensureRosterTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_PLAYER_STATE.ROSTER_TXN_SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_PLAYER_STATE.ROSTER_TXN_SHEET);

  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Action",
    "Homeroom",
    "Guild",
    "Reason",
    "Detail",
  ]);
}
'''
    archive_ensure = ensure_anchor + r'''
function ensureArchivedRosterSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_PLAYER_STATE.ARCHIVED_ROSTER_SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_PLAYER_STATE.ARCHIVED_ROSTER_SHEET);

  sh = ensureHeaders_(sh, [
    "StudentID",
    "StudentName",
    "Homeroom",
    "Guild",
    "RosterJSON",
    "HPJSON",
    "ArchivedAt",
    "Reason",
  ]);
  const rows = Math.max(1, sh.getMaxRows() - 1);
  sh.getRange(2, 1, rows, 1).setNumberFormat("@");
  return sh;
}
'''
    gs = once(gs, ensure_anchor, archive_ensure, "archived roster ensure")

    # Non-active IDs must never be silently resurrected by a generic state helper.
    old_reactivate = '''  } else if (row.rosterStatus !== "ACTIVE") {
    loaded.sh.getRange(row.sheetRow, row.col.RosterStatus).setValue("ACTIVE");
    loaded.sh.getRange(row.sheetRow, row.col.ArchivedAt).setValue("");
    loaded.sh.getRange(row.sheetRow, row.col.UpdatedAt).setValue(nowIso);
    loaded = loadPlayerStateIndex_();
    row = loaded.index.get(studentId);
  }

  if (!row) throw new Error(`Unable to create Player_State row for ${studentId}.`);'''
    new_reactivate = '''  } else if (row.rosterStatus !== "ACTIVE") {
    throw new Error(`StudentID ${studentId} is ${row.rosterStatus || "inactive"} and cannot be edited as an active player.`);
  }

  if (!row) throw new Error(`Unable to create Player_State row for ${studentId}.`);'''
    gs = once(gs, old_reactivate, new_reactivate, "non-active player state guard")

    # Add archive lifecycle helpers immediately before Student Edit + Archive section.
    marker = "// =========================================================\n// Global Teacher Admin: Student Edit + Archive"
    pos = gs.find(marker)
    if pos < 0:
        raise RuntimeError("Student archive section marker missing")

    lifecycle = r'''
// =========================================================
// Global Teacher Admin: Archived Roster Lifecycle
// =========================================================
function adminArchivedSnapshotRow_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  const sh = ensureArchivedRosterSheet_();
  const row = findRowByIdInCol_(sh, 1, studentId);
  if (row < 2) return null;
  const values = sh.getRange(row, 1, 1, 8).getValues()[0];
  return {
    sheet: sh,
    sheetRow: row,
    studentId,
    studentName: norm_(values[1]),
    homeroom: norm_(values[2]),
    guild: norm_(values[3]),
    rosterJson: String(values[4] || ""),
    hpJson: String(values[5] || ""),
    archivedAt:
      values[6] instanceof Date ? values[6].toISOString() : norm_(values[6]),
    reason: norm_(values[7]),
  };
}

function adminSaveArchivedRosterSnapshot_(resolved, reasonRaw) {
  const reason = norm_(reasonRaw || "");
  const sh = ensureArchivedRosterSheet_();
  const headers = resolved.sh
    .getRange(1, 1, 1, Math.max(1, resolved.sh.getLastColumn()))
    .getDisplayValues()[0]
    .map((value) => norm_(value));
  const values = resolved.sh
    .getRange(resolved.rowNumber, 1, 1, headers.length)
    .getValues()[0];

  const roster = {};
  headers.forEach((header, index) => {
    if (!header) return;
    const value = values[index];
    roster[header] = value instanceof Date ? value.toISOString() : value;
  });

  const iGuild = idx_(resolved.map, "Guild");
  const guild = iGuild >= 0
    ? norm_(resolved.sh.getRange(resolved.rowNumber, iGuild + 1).getValue())
    : "";

  const hp = loadHpIndex_();
  const hpRow = hp.index.get(resolved.studentId);
  const hpSnapshot = hpRow
    ? { baseHP: hpRow.baseHP, currentHP: hpRow.currentHP }
    : { baseHP: CFG.MAX_HP_DEFAULT, currentHP: CFG.MAX_HP_DEFAULT };
  const nowIso = new Date().toISOString();

  const payload = [
    resolved.studentId,
    resolved.currentName,
    resolved.homeroom,
    guild,
    JSON.stringify(roster),
    JSON.stringify(hpSnapshot),
    nowIso,
    reason,
  ];

  const existing = findRowByIdInCol_(sh, 1, resolved.studentId);
  const rowNumber = existing >= 2 ? existing : sh.getLastRow() + 1;
  sh.getRange(rowNumber, 1).setNumberFormat("@");
  sh.getRange(rowNumber, 1, 1, payload.length).setValues([payload]);

  return {
    studentName: resolved.currentName,
    homeroom: resolved.homeroom,
    guild,
    archivedAt: nowIso,
  };
}

function adminArchivedStudents_(args) {
  const verified = verifyTeacher_(args || {});
  const state = loadPlayerStateIndex_().index;
  const archive = ensureArchivedRosterSheet_();
  const values = archive.getDataRange().getValues();
  const rows = [];

  for (let r = 1; r < values.length; r++) {
    const studentId = normId_(values[r][0]);
    if (!studentId) continue;
    const stateRow = state.get(studentId);
    if (!stateRow || stateRow.rosterStatus !== "ARCHIVED") continue;

    rows.push({
      studentId,
      studentName: norm_(values[r][1]),
      homeroom: norm_(values[r][2]),
      guild: norm_(values[r][3]),
      archivedAt:
        values[r][6] instanceof Date
          ? values[r][6].toISOString()
          : norm_(values[r][6]),
      reason: norm_(values[r][7]),
    });
  }

  rows.sort((a, b) =>
    String(b.archivedAt || "").localeCompare(String(a.archivedAt || ""))
  );

  return {
    ok: true,
    teacherToken: verified.token,
    rows,
    now: new Date().toISOString(),
  };
}

function adminLocationForReservedStudentId_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  const parts = studentId.match(/^(8-\d+)-(\d+)$/);
  if (!parts) throw new Error(`Invalid student ID: ${studentId}`);
  const homeroom = parts[1];
  const rowNumber = Number(parts[2]) + 1;
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];
  if (!maxRow || rowNumber < 2 || rowNumber > maxRow) {
    throw new Error(`Student ID is outside a roster range: ${studentId}`);
  }
  const sh = adminClassSheet_(homeroom);
  const info = adminHeaderMapForSheet_(sh);
  return { studentId, homeroom, rowNumber, sh, map: info.map, headers: info.headers };
}

function adminRestoreStudent_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  if (!studentId) throw new Error("Missing studentId.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const loaded = loadPlayerStateIndex_();
    const state = loaded.index.get(studentId);
    if (!state || state.rosterStatus !== "ARCHIVED") {
      throw new Error("Only archived students can be restored.");
    }

    const snapshot = adminArchivedSnapshotRow_(studentId);
    if (!snapshot) throw new Error("Archived roster snapshot is missing.");
    const location = adminLocationForReservedStudentId_(studentId);
    const iName = idx_(location.map, "Name", "StudentName", "Student Name");
    if (iName < 0) throw new Error(`${location.homeroom} is missing Name.`);
    if (norm_(location.sh.getRange(location.rowNumber, iName + 1).getValue())) {
      throw new Error(
        `The original roster slot ${studentId} is no longer empty. Restore was stopped to prevent overwriting another student.`
      );
    }

    let roster = {};
    let hpSnapshot = {};
    try { roster = JSON.parse(snapshot.rosterJson || "{}") || {}; } catch (_) {}
    try { hpSnapshot = JSON.parse(snapshot.hpJson || "{}") || {}; } catch (_) {}

    location.headers.forEach((header, index) => {
      const key = norm_(header);
      if (!key) return;
      if (["Homeroom", "StudentID", "Student Id", "ID"].includes(key)) return;
      if (!Object.prototype.hasOwnProperty.call(roster, key)) return;
      location.sh.getRange(location.rowNumber, index + 1).setValue(roster[key]);
    });

    const nowIso = new Date().toISOString();
    loaded.sh.getRange(state.sheetRow, state.col.RosterStatus).setValue("ACTIVE");
    loaded.sh.getRange(state.sheetRow, state.col.ArchivedAt).setValue("");
    loaded.sh.getRange(state.sheetRow, state.col.UpdatedAt).setValue(nowIso);

    const hp = hpHeaderIdx_();
    let hpSheetRow = findRowByIdInCol_(hp.sh, hp.col.StudentID, studentId);
    const baseHP = Math.max(1, Math.round(asNum_(hpSnapshot.baseHP, CFG.MAX_HP_DEFAULT)));
    const currentHP = Math.max(0, Math.min(baseHP, Math.round(asNum_(hpSnapshot.currentHP, baseHP))));
    if (hpSheetRow >= 2) {
      hp.sh.getRange(hpSheetRow, hp.col.Name).setValue(snapshot.studentName);
      hp.sh.getRange(hpSheetRow, hp.col.Homeroom).setValue(snapshot.homeroom);
      hp.sh.getRange(hpSheetRow, hp.col.Guild).setValue(snapshot.guild);
      hp.sh.getRange(hpSheetRow, hp.col.BaseHP).setValue(baseHP);
      hp.sh.getRange(hpSheetRow, hp.col.CurrentHP).setValue(currentHP);
      hp.sh.getRange(hpSheetRow, hp.col.UpdatedAt).setValue(nowIso);
    } else {
      appendRowFast_(hp.sh, [
        studentId,
        snapshot.studentName,
        snapshot.homeroom,
        snapshot.guild,
        baseHP,
        currentHP,
        nowIso,
        0,
      ]);
    }

    appendRowFast_(ensureRosterTxnSheet_(), [
      new Date(),
      studentId,
      snapshot.studentName,
      "RESTORE",
      snapshot.homeroom,
      snapshot.guild,
      "Teacher Admin",
      "Restored from Archived_Roster snapshot.",
    ]);

    snapshot.sheet.deleteRow(snapshot.sheetRow);
    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      studentId,
      restored: true,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminDeleteRowsForStudentId_(sheetName, studentIdRaw) {
  const sh = getSheetOptional_(sheetName);
  if (!sh || sh.getLastRow() < 2) return 0;
  const headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getDisplayValues()[0];
  const map = headerMap_(headers);
  const iId = idx_(map, "StudentID", "Student Id", "ID");
  if (iId < 0) return 0;

  const studentId = normId_(studentIdRaw);
  const values = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getDisplayValues();
  const rows = [];
  values.forEach((row, index) => {
    if (normId_(row[0]) === studentId) rows.push(index + 2);
  });
  rows.sort((a, b) => b - a).forEach((rowNumber) => sh.deleteRow(rowNumber));
  return rows.length;
}

function adminGithubDeletePublicUrl_(publicUrlRaw) {
  const publicUrl = norm_(publicUrlRaw);
  if (!/^\/(?:portraits|companions)\//i.test(publicUrl)) return true;
  const cfg = adminMediaConfig_();
  if (!cfg.token) return false;

  const repoPath = `public${publicUrl}`;
  const url = adminGithubContentsUrl_(cfg.repo, repoPath);
  const existing = UrlFetchApp.fetch(
    `${url}?ref=${encodeURIComponent(cfg.branch)}`,
    {
      method: "get",
      headers: adminGithubHeaders_(cfg.token),
      muteHttpExceptions: true,
    }
  );
  if (existing.getResponseCode() === 404) return true;
  if (existing.getResponseCode() !== 200) return false;

  let sha = "";
  try { sha = String(JSON.parse(existing.getContentText()).sha || ""); } catch (_) {}
  if (!sha) return false;

  const response = UrlFetchApp.fetch(url, {
    method: "delete",
    headers: adminGithubHeaders_(cfg.token),
    contentType: "application/json",
    payload: JSON.stringify({
      message: `Teacher Admin: delete archived media ${studentId || ""}`,
      sha,
      branch: cfg.branch,
    }).replace('${studentId || ""}', ''),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  return code >= 200 && code < 300;
}

function adminDeleteArchivedStudent_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  const reason = norm_(args.reason || "");
  if (!studentId) throw new Error("Missing studentId.");
  if (!reason) throw new Error("A reason is required for permanent deletion.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const loaded = loadPlayerStateIndex_();
    const state = loaded.index.get(studentId);
    if (!state || state.rosterStatus !== "ARCHIVED") {
      throw new Error("Only archived students can be permanently deleted.");
    }

    const snapshot = adminArchivedSnapshotRow_(studentId);
    let portraitUrl = "";
    if (snapshot) {
      try {
        const roster = JSON.parse(snapshot.rosterJson || "{}") || {};
        portraitUrl = norm_(roster.PortraitURL || roster["Portrait URL"] || "");
      } catch (_) {}
    }
    const companionUrl = state.companionUrl || "";

    const mediaCleanup = [portraitUrl, companionUrl]
      .filter(Boolean)
      .map((url) => adminGithubDeletePublicUrl_(url));
    const mediaCleanupRequired = mediaCleanup.some((ok) => !ok);

    [
      CFG.HP_STATE_SHEET,
      CFG.HP_LOG_SHEET,
      CFG.XP_STATE_SHEET,
      CFG.XP_TXN_SHEET,
      CFG.SKILL_STATE_SHEET,
      CFG.PURCHASED_SKILLS_SHEET,
      CFG.SKILL_TXN_SHEET,
      ADMIN_PLAYER_STATE.INVENTORY_TXN_SHEET,
      ADMIN_ABILITIES.TXN_SHEET,
      ADMIN_MEDIA.TXN_SHEET,
      ADMIN_PLAYER_STATE.ROSTER_TXN_SHEET,
    ].forEach((sheetName) => adminDeleteRowsForStudentId_(sheetName, studentId));

    if (snapshot) snapshot.sheet.deleteRow(snapshot.sheetRow);

    const nowIso = new Date().toISOString();
    loaded.sh.getRange(state.sheetRow, 2, 1, 13).setValues([[
      "",
      "",
      0,
      0,
      0,
      0,
      0,
      0,
      "",
      "DELETED",
      nowIso,
      nowIso,
      "",
    ]]);

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      studentId,
      deleted: true,
      mediaCleanupRequired,
      reason,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

'''.strip() + "\n\n"
    gs = gs[:pos] + lifecycle + gs[pos:]

    # Archive must snapshot before clearing/deleting HP.
    archive_start = gs.find("function adminArchiveStudent_(args) {")
    archive_end = gs.find("// =========================================================\n// Global Teacher Admin: Attributes + Skills", archive_start)
    if archive_start < 0 or archive_end < 0:
        raise RuntimeError("adminArchiveStudent function bounds missing")
    archive_block = gs[archive_start:archive_end]
    archive_block = once(
        archive_block,
        '    const studentName = resolved.currentName;\n    const nowIso = new Date().toISOString();',
        '    const studentName = resolved.currentName;\n    const nowIso = new Date().toISOString();\n\n    adminSaveArchivedRosterSnapshot_(resolved, reason);',
        "archive snapshot call",
    )
    gs = gs[:archive_start] + archive_block + gs[archive_end:]

    # Ensure Archived_Roster exists.
    gs = gs.replace(
        "        ensureRosterTxnSheet_();\n        ensureAbilityTxnSheet_();",
        "        ensureRosterTxnSheet_();\n        ensureArchivedRosterSheet_();\n        ensureAbilityTxnSheet_();",
        1,
    )
    gs = gs.replace(
        "  ensureRosterTxnSheet_();\n  ensureAbilityTxnSheet_();",
        "  ensureRosterTxnSheet_();\n  ensureArchivedRosterSheet_();\n  ensureAbilityTxnSheet_();",
        1,
    )

    route_anchor = '''      case "adminarchivestudent":
        return jsonOut_(adminArchiveStudent_(body));'''
    route_replacement = route_anchor + '''

      case "adminarchivedstudents":
        return jsonOut_(adminArchivedStudents_(body));

      case "adminrestorestudent":
        return jsonOut_(adminRestoreStudent_(body));

      case "admindeletearchivedstudent":
        return jsonOut_(adminDeleteArchivedStudent_(body));'''
    gs = once(gs, route_anchor, route_replacement, "archived student routes")

GS.write_text(gs, encoding="utf-8")
print("Patched archive snapshot, restore, and permanent deletion lifecycle.")
