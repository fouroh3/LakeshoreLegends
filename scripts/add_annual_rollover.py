from pathlib import Path

repo = Path('.')
app_path = repo / 'docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs'
api_path = repo / 'src/pages/admin/adminApi.ts'
constants_path = repo / 'src/pages/admin/adminConstants.ts'
roster_utils_path = repo / 'src/pages/admin/adminRosterUtils.ts'
admin_page_path = repo / 'src/pages/admin/AdminPage.tsx'
component_path = repo / 'src/pages/admin/components/AnnualRolloverPanel.tsx'

app = app_path.read_text()
api = api_path.read_text()
constants = constants_path.read_text()
roster_utils = roster_utils_path.read_text()
admin_page = admin_page_path.read_text()


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Anchor not found: {label}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# API version bump
# ---------------------------------------------------------------------------
app = replace_once(
    app,
    'const ADMIN_API_VERSION = "2026-09-01.9";',
    'const ADMIN_API_VERSION = "2026-09-01.10";',
    'Apps Script API version',
)
api = replace_once(
    api,
    'export const ADMIN_API_VERSION = "2026-09-01.9";',
    'export const ADMIN_API_VERSION = "2026-09-01.10";',
    'frontend API version',
)

# ---------------------------------------------------------------------------
# Apps Script annual rollover backend
# ---------------------------------------------------------------------------
rollover_anchor = '''// =========================================================
// Global Teacher Admin: Store Settings
// =========================================================
'''

rollover_block = r'''// =========================================================
// Global Teacher Admin: Annual School-Year Rollover
// =========================================================
const ADMIN_YEAR_ROLLOVER = {
  CONFIRMATION: "START NEW SCHOOL YEAR",
  ARCHIVE_PREFIX: "Lakeshore Legends Archive",
  LAST_ARCHIVE_LABEL_PROP: "LL_LAST_ARCHIVE_LABEL",
  LAST_ARCHIVE_URL_PROP: "LL_LAST_ARCHIVE_URL",
  LAST_ROLLOVER_AT_PROP: "LL_LAST_ROLLOVER_AT",
  CLEAR_SHEETS: [
    CFG.HP_STATE_SHEET,
    CFG.HP_LOG_SHEET,
    CFG.XP_STATE_SHEET,
    CFG.XP_TXN_SHEET,
    CFG.SKILL_STATE_SHEET,
    CFG.PURCHASED_SKILLS_SHEET,
    CFG.SKILL_TXN_SHEET,
    ADMIN_PLAYER_STATE.SHEET,
    ADMIN_PLAYER_STATE.INVENTORY_TXN_SHEET,
    ADMIN_PLAYER_STATE.ROSTER_TXN_SHEET,
    ADMIN_PLAYER_STATE.ARCHIVED_ROSTER_SHEET,
    ADMIN_ABILITIES.TXN_SHEET,
    ADMIN_MEDIA.TXN_SHEET,
    CFG.BOSS_STATE_SHEET,
    CFG.BOSS_LOG_SHEET,
    CFG.BATTLE_GUILD_TOTALS_SHEET,
    FINAL_EXAMINER.CLASS_SHEET,
    FINAL_EXAMINER.BOSS_SHEET,
    FINAL_EXAMINER.LOG_SHEET,
  ],
};

function adminYearRolloverFirstIds_() {
  const out = {};
  Object.keys(ADMIN_CLASS_MAX_ROW).forEach((homeroom) => {
    out[homeroom] = `${homeroom}-001`;
  });
  return out;
}

function adminYearRolloverActiveBattles_() {
  try {
    const battle = battleControlRows_();
    return (battle.rows || [])
      .filter((row) => norm_(row.status).toUpperCase() === "ACTIVE")
      .map((row) => norm_(row.homeroom))
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function adminYearRolloverActiveStudentCount_() {
  let count = 0;
  Object.keys(ADMIN_CLASS_MAX_ROW).forEach((homeroom) => {
    const sh = adminClassSheet_(homeroom);
    const info = adminHeaderMapForSheet_(sh);
    const iName = idx_(info.map, "Name", "StudentName", "Student Name");
    if (iName < 0) return;
    const rows = Math.max(
      0,
      Math.min(ADMIN_CLASS_MAX_ROW[homeroom], sh.getMaxRows()) - 1
    );
    if (!rows) return;
    const values = sh.getRange(2, iName + 1, rows, 1).getDisplayValues();
    values.forEach((row) => {
      if (norm_(row[0])) count++;
    });
  });
  return count;
}

function adminYearRolloverAddMediaKey_(set, raw) {
  const value = String(raw || "").trim();
  if (!value) return;

  const direct = value
    .split("?")[0]
    .replace(/^\/+/, "")
    .trim();
  if (/^(portraits|companions)\/[^/]+\.[A-Za-z0-9]+$/i.test(direct)) {
    set.add(direct);
  }

  const parsed = adminR2MediaPathFromUrl_(value);
  if (
    parsed &&
    parsed.objectKey &&
    /^(portraits|companions)\//i.test(parsed.objectKey)
  ) {
    set.add(parsed.objectKey);
  }
}

function adminYearRolloverMediaKeys_() {
  const keys = new Set();

  Object.keys(ADMIN_CLASS_MAX_ROW).forEach((homeroom) => {
    const sh = adminClassSheet_(homeroom);
    const info = adminHeaderMapForSheet_(sh);
    const rows = Math.max(
      0,
      Math.min(ADMIN_CLASS_MAX_ROW[homeroom], sh.getMaxRows()) - 1
    );
    if (!rows) return;

    ["PortraitURL", "CompanionURL"].forEach((header) => {
      const col = idx_(info.map, header, header.replace("URL", " URL"));
      if (col < 0) return;
      sh.getRange(2, col + 1, rows, 1)
        .getDisplayValues()
        .forEach((row) => adminYearRolloverAddMediaKey_(keys, row[0]));
    });
  });

  const playerState = getSheetOptional_(ADMIN_PLAYER_STATE.SHEET);
  if (playerState && playerState.getLastRow() >= 2) {
    const values = playerState.getDataRange().getDisplayValues();
    const map = headerMap_(values[0] || []);
    const iCompanion = idx_(map, "CompanionURL", "Companion URL");
    if (iCompanion >= 0) {
      values
        .slice(1)
        .forEach((row) => adminYearRolloverAddMediaKey_(keys, row[iCompanion]));
    }
  }

  const mediaTxn = getSheetOptional_(ADMIN_MEDIA.TXN_SHEET);
  if (mediaTxn && mediaTxn.getLastRow() >= 2) {
    const values = mediaTxn.getDataRange().getDisplayValues();
    const map = headerMap_(values[0] || []);
    const iPath = idx_(map, "RepoPath", "Repo Path", "ObjectKey", "Object Key");
    const iUrl = idx_(map, "PublicURL", "Public URL");
    values.slice(1).forEach((row) => {
      if (iPath >= 0) adminYearRolloverAddMediaKey_(keys, row[iPath]);
      if (iUrl >= 0) adminYearRolloverAddMediaKey_(keys, row[iUrl]);
    });
  }

  const archived = getSheetOptional_(ADMIN_PLAYER_STATE.ARCHIVED_ROSTER_SHEET);
  if (archived && archived.getLastRow() >= 2) {
    const values = archived.getDataRange().getValues();
    const map = headerMap_(values[0] || []);
    const iRoster = idx_(map, "RosterJSON", "Roster JSON");
    if (iRoster >= 0) {
      values.slice(1).forEach((row) => {
        try {
          const roster = JSON.parse(String(row[iRoster] || "{}")) || {};
          adminYearRolloverAddMediaKey_(
            keys,
            roster.PortraitURL || roster["Portrait URL"] || ""
          );
          adminYearRolloverAddMediaKey_(
            keys,
            roster.CompanionURL || roster["Companion URL"] || ""
          );
        } catch (_) {}
      });
    }
  }

  return Array.from(keys).sort();
}

function adminYearRolloverPreviewPayload_() {
  const playerState = loadPlayerStateIndex_();
  let archivedStudents = 0;
  let movedDeletedReservations = 0;

  playerState.index.forEach((row) => {
    if (row.rosterStatus === "ARCHIVED") archivedStudents++;
    if (row.rosterStatus === "MOVED" || row.rosterStatus === "DELETED") {
      movedDeletedReservations++;
    }
  });

  const mediaKeys = adminYearRolloverMediaKeys_();
  const source = SpreadsheetApp.getActive();

  return {
    activeStudents: adminYearRolloverActiveStudentCount_(),
    reservedStudentIds: playerState.index.size,
    archivedStudents,
    movedDeletedReservations,
    mediaObjects: mediaKeys.length,
    mediaConfigured: !!adminMediaPublicStatus_().mediaConfigured,
    activeBattles: adminYearRolloverActiveBattles_(),
    archiveSheetCount: source.getSheets().length,
    firstIds: adminYearRolloverFirstIds_(),
    lastArchiveLabel: getProp_(ADMIN_YEAR_ROLLOVER.LAST_ARCHIVE_LABEL_PROP),
    lastArchiveUrl: getProp_(ADMIN_YEAR_ROLLOVER.LAST_ARCHIVE_URL_PROP),
    lastRolloverAt: getProp_(ADMIN_YEAR_ROLLOVER.LAST_ROLLOVER_AT_PROP),
    mediaKeys,
  };
}

function adminYearRolloverPreview_(args) {
  const verified = verifyTeacher_(args || {});
  const preview = adminYearRolloverPreviewPayload_();
  return {
    ok: true,
    teacherToken: verified.token,
    adminApiVersion: ADMIN_API_VERSION,
    ...preview,
    mediaKeys: undefined,
    now: new Date().toISOString(),
  };
}

function adminYearRolloverArchiveLabel_(raw) {
  const value = norm_(raw || "");
  if (!value) throw new Error("Enter the school year being archived, such as 2026-27.");
  if (value.length > 60) throw new Error("School-year archive label is too long.");
  return value.replace(/[\\/:*?"<>|]+/g, "-");
}

function adminYearRolloverCreateArchive_(archiveLabel, preview) {
  const source = SpreadsheetApp.getActive();
  SpreadsheetApp.flush();

  const tz = Session.getScriptTimeZone() || "GMT";
  const stamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HHmmss");
  const archiveName = `${ADMIN_YEAR_ROLLOVER.ARCHIVE_PREFIX} — ${archiveLabel} — ${stamp}`;
  const archive = SpreadsheetApp.create(archiveName);
  const info = archive.getSheets()[0];
  info.setName("_Year_Archive_Info");

  const infoRows = [
    ["Lakeshore Legends Year Archive", archiveLabel],
    ["Archived At", new Date().toISOString()],
    ["Source Spreadsheet", source.getName()],
    ["Source Spreadsheet ID", source.getId()],
    ["Active students at rollover", preview.activeStudents],
    ["Reserved StudentIDs at rollover", preview.reservedStudentIds],
    ["Archived students at rollover", preview.archivedStudents],
    ["Moved/deleted reservations", preview.movedDeletedReservations],
    ["Managed media objects found", preview.mediaObjects],
    ["Source sheets copied", source.getSheets().length],
    ["Note", "This workbook is a frozen year-end snapshot. Formulas were converted to their displayed data values so this archive will not change with the live game database."],
  ];
  info.getRange(1, 1, infoRows.length, 2).setValues(infoRows);
  info.getRange(1, 1, 1, 2).setFontWeight("bold");
  info.setColumnWidth(1, 230);
  info.setColumnWidth(2, 620);
  info.setFrozenRows(1);

  source.getSheets().forEach((sourceSheet) => {
    const copied = sourceSheet.copyTo(archive);
    copied.setName(sourceSheet.getName());

    const sourceRange = sourceSheet.getDataRange();
    const rows = sourceRange.getNumRows();
    const cols = sourceRange.getNumColumns();
    if (rows > 0 && cols > 0) {
      copied.getRange(1, 1, rows, cols).setValues(sourceRange.getValues());
    }
  });

  SpreadsheetApp.flush();
  return {
    name: archiveName,
    url: archive.getUrl(),
    id: archive.getId(),
    sheets: source.getSheets().length,
  };
}

function adminYearRolloverClearSheetData_(sheetName) {
  const sh = getSheetOptional_(sheetName);
  if (!sh) return 0;
  const lastRow = sh.getLastRow();
  const lastCol = Math.max(1, sh.getLastColumn());
  if (lastRow < 2) return 0;
  sh.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  return lastRow - 1;
}

function adminYearRolloverClearClassRosters_() {
  let rowsCleared = 0;
  Object.keys(ADMIN_CLASS_MAX_ROW).forEach((homeroom) => {
    const sh = adminClassSheet_(homeroom);
    const maxRow = Math.min(ADMIN_CLASS_MAX_ROW[homeroom], sh.getMaxRows());
    const rowCount = Math.max(0, maxRow - 1);
    if (!rowCount) return;

    const info = adminHeaderMapForSheet_(sh);
    const iName = idx_(info.map, "Name", "StudentName", "Student Name");
    if (iName >= 0) {
      sh.getRange(2, iName + 1, rowCount, 1)
        .getDisplayValues()
        .forEach((row) => {
          if (norm_(row[0])) rowsCleared++;
        });
    }

    // Columns B/C are ARRAYFORMULA outputs. Clear only teacher-owned cells.
    sh.getRange(2, 1, rowCount, 1).clearContent();
    const lastCol = Math.max(sh.getLastColumn(), 4);
    if (lastCol >= 4) {
      sh.getRange(2, 4, rowCount, lastCol - 3).clearContent();
    }
  });
  return rowsCleared;
}

function adminYearRolloverResetBattleControl_() {
  const sh = getSheetOptional_(CFG.BATTLE_CONTROL_SHEET);
  if (!sh || sh.getLastRow() < 2) return 0;
  const rowCount = Math.min(CFG.BATTLE_CONTROL_MAX_ROWS, sh.getLastRow() - 1);
  const colCount = Math.max(1, sh.getLastColumn());
  const headers = sh.getRange(1, 1, 1, colCount).getDisplayValues()[0];
  const map = headerMap_(headers);
  const values = sh.getRange(2, 1, rowCount, colCount).getValues();
  const nowIso = new Date().toISOString();

  const setIf = (row, key, value) => {
    const i = map[String(key).toLowerCase()];
    if (i != null && i >= 0) row[i] = value;
  };

  values.forEach((row) => {
    setIf(row, "status", "INACTIVE");
    setIf(row, "quest", "");
    setIf(row, "round", 1);
    setIf(row, "turn", "GUILD");
    setIf(row, "pairto", "");
    setIf(row, "leaderhomeroom", "");
    setIf(row, "activebattlesessionid", "");
    setIf(row, "bosskey", "");
    setIf(row, "bossinstanceid", "");
    setIf(row, "currentstatesummary", "Inactive");
    setIf(row, "lastupdated", nowIso);
  });

  sh.getRange(2, 1, rowCount, colCount).setValues(values);
  return rowCount;
}

function adminYearRolloverDeleteMediaBatch_(mediaKeys) {
  const keys = Array.from(new Set(Array.isArray(mediaKeys) ? mediaKeys : []))
    .map((value) => String(value || "").trim())
    .filter((value) => /^(portraits|companions)\//i.test(value));

  if (!keys.length) {
    return { attempted: 0, deleted: 0, failed: 0, warnings: [] };
  }

  const cfg = adminMediaConfig_();
  if (!adminMediaPublicStatus_().mediaConfigured) {
    return {
      attempted: 0,
      deleted: 0,
      failed: keys.length,
      warnings: [
        `${keys.length} managed media object${keys.length === 1 ? "" : "s"} could not be removed because R2 is not connected. The live roster reset still completed.`,
      ],
    };
  }

  let deleted = 0;
  let failed = 0;
  const warnings = [];
  const chunkSize = 50;

  for (let start = 0; start < keys.length; start += chunkSize) {
    const chunk = keys.slice(start, start + chunkSize);
    try {
      const requests = chunk.map((objectKey) => {
        const signed = adminR2SignedHeaders_(cfg, "DELETE", objectKey, []);
        return {
          url: signed.url,
          method: "delete",
          headers: signed.headers,
          muteHttpExceptions: true,
        };
      });
      const responses = UrlFetchApp.fetchAll(requests);
      responses.forEach((response, index) => {
        const code = response.getResponseCode();
        if (code >= 200 && code < 300) {
          deleted++;
        } else {
          failed++;
          if (warnings.length < 5) {
            warnings.push(`R2 cleanup failed for ${chunk[index]} (${code}).`);
          }
        }
      });
    } catch (err) {
      failed += chunk.length;
      if (warnings.length < 5) {
        warnings.push(
          String(err && err.message ? err.message : err || "R2 media cleanup failed.")
        );
      }
    }
  }

  return { attempted: keys.length, deleted, failed, warnings };
}

function adminStartNewSchoolYear_(args) {
  const verified = verifyTeacher_(args || {});
  const archiveLabel = adminYearRolloverArchiveLabel_(args.archiveLabel);
  const confirmation = norm_(args.confirmation || "");
  const acknowledged = toBool_(args.acknowledged, false);

  if (!acknowledged) {
    throw new Error("Confirm that you understand the live student roster will be reset.");
  }
  if (confirmation !== ADMIN_YEAR_ROLLOVER.CONFIRMATION) {
    throw new Error(`Type ${ADMIN_YEAR_ROLLOVER.CONFIRMATION} exactly to continue.`);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const preview = adminYearRolloverPreviewPayload_();
    if (preview.activeBattles.length) {
      throw new Error(
        `End active battles before starting a new school year: ${preview.activeBattles.join(", ")}`
      );
    }

    let archive;
    try {
      archive = adminYearRolloverCreateArchive_(archiveLabel, preview);
    } catch (err) {
      throw new Error(
        `Year-end archive could not be created, so NO live student data was reset. ${String(
          err && err.message ? err.message : err || "Archive creation failed."
        )}`
      );
    }

    const nowIso = new Date().toISOString();
    const clearedSheets = {};
    let clearedRosterRows = 0;

    try {
      clearedRosterRows = adminYearRolloverClearClassRosters_();
      ADMIN_YEAR_ROLLOVER.CLEAR_SHEETS.forEach((sheetName) => {
        clearedSheets[sheetName] = adminYearRolloverClearSheetData_(sheetName);
      });

      // Store settings survive rollover, but student purchasing is closed until
      // a teacher intentionally reopens it for the new cohort.
      adminSetStoreControlValue_("StoreLocked", "TRUE");
      adminSetStoreControlValue_("OpenNonce", Utilities.getUuid());
      adminSetStoreControlValue_("UpdatedAt", nowIso);

      // Battle configuration structure survives, but all live sessions are reset.
      adminYearRolloverResetBattleControl_();

      SpreadsheetApp.flush();
      recomputeGuildTotals_();
      SpreadsheetApp.flush();

      cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
      cacheRemove_("hpAll:v1");
      setProp_(CFG.PROP_LAST_WRITE_ISO, nowIso);
      setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);
      setProp_(ADMIN_YEAR_ROLLOVER.LAST_ARCHIVE_LABEL_PROP, archiveLabel);
      setProp_(ADMIN_YEAR_ROLLOVER.LAST_ARCHIVE_URL_PROP, archive.url);
      setProp_(ADMIN_YEAR_ROLLOVER.LAST_ROLLOVER_AT_PROP, nowIso);
    } catch (err) {
      throw new Error(
        `The archive was created successfully (${archive.url}), but the live reset did not finish. Stop and inspect the archive before retrying. ${String(
          err && err.message ? err.message : err || "Live reset failed."
        )}`
      );
    }

    // Media cleanup is deliberately last and non-fatal. At this point the live
    // student layer is clean; a temporary R2 problem should only leave orphaned
    // old files, never roll back or corrupt the new roster state.
    const media = adminYearRolloverDeleteMediaBatch_(preview.mediaKeys);

    return {
      ok: true,
      teacherToken: verified.token,
      archiveLabel,
      archiveName: archive.name,
      archiveUrl: archive.url,
      archiveId: archive.id,
      archiveSheets: archive.sheets,
      clearedStudents: clearedRosterRows,
      clearedSheets,
      media,
      storeClosed: true,
      firstIds: adminYearRolloverFirstIds_(),
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

'''
app = replace_once(app, rollover_anchor, rollover_block + rollover_anchor, 'rollover insertion')

# Router actions.
router_anchor = '''      case "adminsystemstatus":
        return jsonOut_(adminSystemStatus_(body));

      case "adminmigrateplayerstate":'''
router_new = '''      case "adminsystemstatus":
        return jsonOut_(adminSystemStatus_(body));

      case "adminyearrolloverpreview":
        return jsonOut_(adminYearRolloverPreview_(body));

      case "adminstartnewschoolyear":
        return jsonOut_(adminStartNewSchoolYear_(body));

      case "adminmigrateplayerstate":'''
app = replace_once(app, router_anchor, router_new, 'annual rollover routes')

# Backend import allocation: sort each incoming batch by homeroom, last, first.
import_anchor = '''    const imported = [];
    const incomingKeys = new Set();
    const classState = new Map();
    const reservedIds = new Set(playerStateReservedIds_());
    const nowIso = new Date().toISOString();

    students.forEach((student, index) => {'''
import_new = '''    const imported = [];
    const incomingKeys = new Set();
    const classState = new Map();
    const reservedIds = new Set(playerStateReservedIds_());
    const nowIso = new Date().toISOString();

    // A fresh annual roster should begin alphabetically at ...-001. Existing
    // in-year students are never renumbered; this only controls allocation
    // order among the students in the current import batch.
    const orderedStudents = students
      .map((student, sourceIndex) => ({ student, sourceIndex }))
      .sort((a, b) => {
        const aStudent = a.student || {};
        const bStudent = b.student || {};
        const hr = norm_(aStudent.homeroom).localeCompare(
          norm_(bStudent.homeroom),
          "en",
          { numeric: true }
        );
        if (hr !== 0) return hr;
        const last = norm_(aStudent.last).localeCompare(norm_(bStudent.last), "en", {
          sensitivity: "base",
        });
        if (last !== 0) return last;
        return norm_(aStudent.first).localeCompare(norm_(bStudent.first), "en", {
          sensitivity: "base",
        });
      });

    orderedStudents.forEach(({ student, sourceIndex }) => {
      const index = sourceIndex;'''
app = replace_once(app, import_anchor, import_new, 'backend import sorting')

app_path.write_text(app)

# ---------------------------------------------------------------------------
# Frontend admin API
# ---------------------------------------------------------------------------
api_type_anchor = '''export type AdminCompanionUpdateResult = {
  ok?: boolean;
  error?: string;
  studentId?: string;
  companionUrl?: string;
  companionStatus?: AdminCompanionStatus;
  [key: string]: any;
};
'''
api_types = api_type_anchor + r'''

export type AdminYearRolloverPreviewResult = {
  ok?: boolean;
  error?: string;
  activeStudents: number;
  reservedStudentIds: number;
  archivedStudents: number;
  movedDeletedReservations: number;
  mediaObjects: number;
  mediaConfigured: boolean;
  activeBattles: string[];
  archiveSheetCount: number;
  firstIds: Record<string, string>;
  lastArchiveLabel?: string;
  lastArchiveUrl?: string;
  lastRolloverAt?: string;
  adminApiVersion?: string;
  now?: string;
  [key: string]: any;
};

export type AdminStartNewSchoolYearResult = {
  ok?: boolean;
  error?: string;
  archiveLabel: string;
  archiveName: string;
  archiveUrl: string;
  archiveId?: string;
  archiveSheets?: number;
  clearedStudents: number;
  clearedSheets?: Record<string, number>;
  media?: {
    attempted: number;
    deleted: number;
    failed: number;
    warnings: string[];
  };
  storeClosed?: boolean;
  firstIds: Record<string, string>;
  now?: string;
  [key: string]: any;
};
'''
api = replace_once(api, api_type_anchor, api_types, 'admin API annual result types')

api = replace_once(
    api,
    '''  | "adminsystemstatus"
  | "adminmigrateplayerstate"''',
    '''  | "adminsystemstatus"
  | "adminyearrolloverpreview"
  | "adminstartnewschoolyear"
  | "adminmigrateplayerstate"''',
    'AdminAction annual actions',
)
api = replace_once(
    api,
    '''  "adminsystemstatus",
  "adminarchivedstudents",''',
    '''  "adminsystemstatus",
  "adminyearrolloverpreview",
  "adminarchivedstudents",''',
    'retryable annual preview',
)

api_func_anchor = '''export async function adminMigratePlayerState() {
  return postAdminAction<AdminSystemStatusResult>(
    "adminmigrateplayerstate",
    {}
  );
}
'''
api_funcs = api_func_anchor + r'''

export async function adminYearRolloverPreview() {
  return postAdminAction<AdminYearRolloverPreviewResult>(
    "adminyearrolloverpreview",
    {}
  );
}

export async function adminStartNewSchoolYear(args: {
  archiveLabel: string;
  confirmation: string;
  acknowledged: boolean;
}) {
  return postAdminAction<AdminStartNewSchoolYearResult>(
    "adminstartnewschoolyear",
    args
  );
}
'''
api = replace_once(api, api_func_anchor, api_funcs, 'annual API functions')
api_path.write_text(api)

# ---------------------------------------------------------------------------
# Admin section type
# ---------------------------------------------------------------------------
constants = replace_once(
    constants,
    '''  | "store"
  | "system";''',
    '''  | "store"
  | "system"
  | "yearRollover";''',
    'AdminSection year rollover',
)
constants_path.write_text(constants)

# ---------------------------------------------------------------------------
# Frontend importer preview: alphabetical allocation within each batch
# ---------------------------------------------------------------------------
start = roster_utils.find('export function parseStudentPaste(args: {')
end = roster_utils.find('\nexport function studentSort', start)
if start < 0 or end < 0:
    raise SystemExit('parseStudentPaste function boundaries not found')
new_parse = r'''export function parseStudentPaste(args: {
  raw: string;
  format: PasteFormat;
  defaultHomeroom: string;
  students: Student[];
  reservedStudentIds?: string[];
}): ParsedStudent[] {
  const lines = String(args.raw ?? "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);

  const usedByHr = usedSuffixesByHomeroom(
    args.students,
    Array.isArray(args.reservedStudentIds) ? args.reservedStudentIds : []
  );
  const existingKeys = existingNameKeys(args.students);
  const incomingKeys = new Set<string>();
  const parsed: ParsedStudent[] = [];

  lines.forEach((line, index) => {
    if (index === 0 && looksLikeHeader(line)) return;

    const parts = splitPasteLine(line);
    let first = "";
    let last = "";
    let homeroom = clean(args.defaultHomeroom);
    let error = "";

    if (args.format === "last-first") {
      last = clean(parts[0]);
      first = clean(parts[1]);
      if (!homeroom) homeroom = clean(parts[2]);
    }

    if (args.format === "first-last") {
      first = clean(parts[0]);
      last = clean(parts[1]);
      if (!homeroom) homeroom = clean(parts[2]);
    }

    if (args.format === "full-name") {
      const full = clean(parts[0]);
      if (!homeroom) homeroom = clean(parts[1]);

      const nameParts = full.split(" ").filter(Boolean);
      first = nameParts.slice(0, -1).join(" ");
      last = nameParts.slice(-1).join(" ");
    }

    if (!first || !last) {
      error = "Missing first or last name.";
    }

    if (!homeroom) {
      error = "Choose a homeroom or include one in the pasted rows.";
    } else if (!ADMIN_HOMEROOMS.includes(homeroom as (typeof ADMIN_HOMEROOMS)[number])) {
      error = "Homeroom should be 8-1 through 8-10.";
    }

    const nameKey = `${homeroom}|${rosterName(first, last).toLowerCase()}`;

    if (!error && existingKeys.has(nameKey)) {
      error = "Student already exists in this homeroom.";
    }

    if (!error && incomingKeys.has(nameKey)) {
      error = "Duplicate student in pasted rows.";
    }

    if (!error) incomingKeys.add(nameKey);

    parsed.push({
      rowNumber: index + 1,
      raw: line,
      first,
      last,
      homeroom,
      guild: "",
      previewId: "",
      error: error || undefined,
    });
  });

  const valid = parsed
    .filter((row) => !row.error)
    .sort((a, b) => {
      const hr = a.homeroom.localeCompare(b.homeroom, "en", { numeric: true });
      if (hr !== 0) return hr;
      const last = a.last.localeCompare(b.last, "en", { sensitivity: "base" });
      if (last !== 0) return last;
      return a.first.localeCompare(b.first, "en", { sensitivity: "base" });
    });

  valid.forEach((row) => {
    const used = usedByHr.get(row.homeroom) ?? new Set<number>();
    const suffix = nextAvailableSuffix(row.homeroom, used);

    if (!suffix) {
      row.error = `${row.homeroom} has no unused roster slots left.`;
      return;
    }

    row.previewId = buildPreviewId(row.homeroom, suffix);
    used.add(suffix);
    usedByHr.set(row.homeroom, used);
  });

  const invalid = parsed.filter((row) => row.error && !valid.includes(row));
  return [...valid, ...invalid];
}
'''
roster_utils = roster_utils[:start] + new_parse + roster_utils[end:]
roster_utils_path.write_text(roster_utils)

# ---------------------------------------------------------------------------
# Annual rollover React panel
# ---------------------------------------------------------------------------
component = r'''// src/pages/admin/components/AnnualRolloverPanel.tsx

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  RefreshCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  adminStartNewSchoolYear,
  adminYearRolloverPreview,
  type AdminStartNewSchoolYearResult,
  type AdminYearRolloverPreviewResult,
} from "../adminApi";

const CONFIRMATION = "START NEW SCHOOL YEAR";

type Props = {
  onCompleted?: (result: AdminStartNewSchoolYearResult) => void | Promise<void>;
};

function StatCard({
  label,
  value,
  detail,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "zinc" | "amber" | "red" | "cyan";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-300/15 bg-red-400/[0.055] text-red-100"
      : tone === "amber"
      ? "border-amber-300/15 bg-amber-400/[0.055] text-amber-100"
      : tone === "cyan"
      ? "border-cyan-300/15 bg-cyan-400/[0.055] text-cyan-100"
      : "border-white/[0.07] bg-black/20 text-white";

  return (
    <div className={`rounded-[22px] border p-4 ${toneClass}`}>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-55">
        {label}
      </div>
      <div className="mt-1 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-xs leading-5 opacity-55">{detail}</div>
    </div>
  );
}

export default function AnnualRolloverPanel({ onCompleted }: Props) {
  const [preview, setPreview] = useState<AdminYearRolloverPreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [archiveLabel, setArchiveLabel] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [result, setResult] = useState<AdminStartNewSchoolYearResult | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setError("");
    try {
      const next = await adminYearRolloverPreview();
      setPreview(next);
    } catch (err: any) {
      setPreview(null);
      setError(err?.message || "Could not load the school-year rollover preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPreview();
  }, []);

  const activeBattles = preview?.activeBattles ?? [];
  const exactConfirmation = confirmation === CONFIRMATION;
  const canRun =
    !!preview &&
    !loading &&
    !running &&
    activeBattles.length === 0 &&
    archiveLabel.trim().length > 0 &&
    acknowledged &&
    exactConfirmation;

  const firstIdEntries = useMemo(
    () => Object.entries(preview?.firstIds ?? {}).sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true })),
    [preview?.firstIds]
  );

  const startRollover = async () => {
    if (!canRun) return;
    setRunning(true);
    setError("");
    setResult(null);

    try {
      const next = await adminStartNewSchoolYear({
        archiveLabel: archiveLabel.trim(),
        confirmation,
        acknowledged,
      });
      setResult(next);
      setPreview((current) =>
        current
          ? {
              ...current,
              activeStudents: 0,
              reservedStudentIds: 0,
              archivedStudents: 0,
              movedDeletedReservations: 0,
              mediaObjects: 0,
              activeBattles: [],
            }
          : current
      );
      setAcknowledged(false);
      setConfirmation("");
      await onCompleted?.(next);
    } catch (err: any) {
      setError(err?.message || "New school year reset failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-amber-300/16 bg-[linear-gradient(135deg,rgba(120,53,15,0.20),rgba(35,14,8,0.72)_48%,rgba(10,10,12,0.92))] shadow-[0_20px_70px_rgba(0,0,0,0.28)]">
        <div className="relative p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/[0.07] blur-3xl" />
          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-200/75">
                <GraduationCap size={17} />
                Annual Rollover
              </div>
              <h3 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Archive this year. Start the next roster at 001.
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300/75">
                This is the once-a-year reset. Global Manager first creates a frozen Google Sheets archive of the current game database. Only after that archive succeeds will the live student roster, StudentID reservations, player state, old battle runtime, and student media be cleared.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadPreview()}
              disabled={loading || running}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 py-2.5 text-sm font-black text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-40"
            >
              <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
              {loading ? "Checking..." : "Refresh Preview"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[22px] border border-red-300/20 bg-red-400/[0.08] px-4 py-3 text-sm font-semibold leading-6 text-red-100">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-[26px] border border-emerald-300/20 bg-emerald-400/[0.07] p-5 shadow-[0_0_34px_rgba(52,211,153,0.08)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-200" />
            <div className="min-w-0 flex-1">
              <div className="text-lg font-black text-emerald-50">New school year is ready.</div>
              <p className="mt-1 text-sm leading-6 text-emerald-100/65">
                Live StudentIDs are released and the next fresh roster can begin at 001. The Store was closed automatically.
              </p>
              <a
                href={result.archiveUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/15"
              >
                <Archive size={15} />
                Open {result.archiveLabel} Archive
                <ExternalLink size={14} />
              </a>
              {result.media?.failed ? (
                <div className="mt-3 text-xs leading-5 text-amber-200/75">
                  Student data reset successfully, but {result.media.failed} old media object{result.media.failed === 1 ? "" : "s"} could not be removed from R2. The archive is safe and the new roster can still be imported.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active Players"
          value={loading ? "…" : preview?.activeStudents ?? "—"}
          detail="Live roster rows that will be emptied."
          tone="red"
        />
        <StatCard
          label="Reserved IDs"
          value={loading ? "…" : preview?.reservedStudentIds ?? "—"}
          detail="Active, archived, moved, and deleted IDs released."
          tone="amber"
        />
        <StatCard
          label="Archived"
          value={loading ? "…" : preview?.archivedStudents ?? "—"}
          detail="Archived students preserved in the year snapshot."
        />
        <StatCard
          label="R2 Media"
          value={loading ? "…" : preview?.mediaObjects ?? "—"}
          detail="Managed hero/companion files queued for cleanup."
          tone="cyan"
        />
        <StatCard
          label="Archive Sheets"
          value={loading ? "…" : preview?.archiveSheetCount ?? "—"}
          detail="Live workbook sheets copied before reset."
        />
      </div>

      {activeBattles.length > 0 && (
        <div className="rounded-[24px] border border-red-300/25 bg-red-500/[0.09] p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert size={21} className="mt-0.5 shrink-0 text-red-200" />
            <div>
              <div className="font-black text-red-50">End active battles first.</div>
              <div className="mt-1 text-sm leading-6 text-red-100/70">
                Annual rollover is blocked while these homerooms are active: {activeBattles.join(", ")}.
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
        <div className="rounded-[26px] border border-white/[0.08] bg-black/20 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <Archive size={18} className="text-cyan-200" />
            What gets preserved
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <span className="font-bold text-zinc-200">Frozen year archive</span><br />Every current spreadsheet sheet is copied to a separate Google Spreadsheet and formulas are frozen to values.
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
              <span className="font-bold text-zinc-200">Game configuration</span><br />Store PIN/cost rules, R2 connection, quest configuration, and the Global Manager itself stay configured.
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-sm font-black text-white">
            <Trash2 size={18} className="text-red-200" />
            What resets live
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-400 sm:grid-cols-2">
            <div className="rounded-2xl border border-red-300/[0.08] bg-red-400/[0.025] p-3">
              Student roster, guilds, attributes, skills, HP, XP, Skill Tokens, inventory, companions, portraits, archives, and ID tombstones.
            </div>
            <div className="rounded-2xl border border-red-300/[0.08] bg-red-400/[0.025] p-3">
              Old boss/battle runtime and logs are cleared so next year cannot inherit last year’s battle state. The Store is forced closed.
            </div>
          </div>

          <div className="mt-5 rounded-[22px] border border-cyan-300/12 bg-cyan-400/[0.045] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/65">
              Fresh StudentID namespace
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {firstIdEntries.map(([homeroom, studentId]) => (
                <span
                  key={homeroom}
                  className="rounded-full border border-cyan-300/12 bg-black/25 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100/80"
                >
                  {homeroom} → {studentId}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-cyan-100/55">
              Fresh batch imports are assigned alphabetically inside each homeroom. Mid-year additions never renumber existing students.
            </p>
          </div>
        </div>

        <div className="rounded-[26px] border border-red-300/16 bg-[linear-gradient(180deg,rgba(69,10,10,0.20),rgba(14,7,9,0.72))] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-200/65">
            Final Confirmation
          </div>
          <div className="mt-1 text-xl font-black text-white">Start New School Year</div>
          <p className="mt-2 text-sm leading-6 text-red-100/60">
            Do not run this for normal student changes. Archive/Restore remains the correct tool during the school year.
          </p>

          <label className="mt-5 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            School year being archived
          </label>
          <input
            value={archiveLabel}
            onChange={(event) => setArchiveLabel(event.target.value)}
            disabled={running}
            placeholder="Example: 2026-27"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none ring-amber-300/20 placeholder:text-zinc-700 focus:ring-2 disabled:opacity-50"
          />

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-3">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              disabled={running}
              className="mt-1 h-4 w-4 accent-red-400"
            />
            <span className="text-xs leading-5 text-zinc-400">
              I understand this empties the live student year after the archive is created, and old StudentIDs will become reusable.
            </span>
          </label>

          <label className="mt-4 block text-[11px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Type {CONFIRMATION}
          </label>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={running}
            autoComplete="off"
            spellCheck={false}
            className={[
              "mt-2 w-full rounded-2xl border bg-black/35 px-4 py-3 font-mono text-sm font-bold outline-none transition",
              confirmation && !exactConfirmation
                ? "border-red-300/25 text-red-100 ring-red-300/15 focus:ring-2"
                : exactConfirmation
                ? "border-emerald-300/25 text-emerald-100 ring-emerald-300/15 focus:ring-2"
                : "border-white/10 text-white ring-red-300/15 focus:ring-2",
            ].join(" ")}
          />

          <button
            type="button"
            onClick={() => void startRollover()}
            disabled={!canRun}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-red-200/25 bg-[linear-gradient(180deg,rgba(248,113,113,0.94),rgba(220,38,38,0.92))] px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_28px_rgba(239,68,68,0.16)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-none disabled:bg-white/[0.04] disabled:text-zinc-600 disabled:shadow-none"
          >
            {running ? (
              <>
                <RefreshCcw size={16} className="animate-spin" />
                Archiving & Resetting...
              </>
            ) : (
              <>
                <ShieldAlert size={16} />
                Archive Year & Reset Students
              </>
            )}
          </button>

          {!loading && preview?.lastArchiveLabel ? (
            <div className="mt-4 text-[11px] leading-5 text-zinc-600">
              Last annual archive: {preview.lastArchiveLabel}
              {preview.lastRolloverAt ? ` • ${new Date(preview.lastRolloverAt).toLocaleString()}` : ""}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
'''
component_path.write_text(component)

# ---------------------------------------------------------------------------
# AdminPage integration
# ---------------------------------------------------------------------------
admin_page = replace_once(
    admin_page,
    '''  Activity,
  ChevronRight,''',
    '''  Activity,
  CalendarRange,
  ChevronRight,''',
    'CalendarRange icon import',
)
admin_page = replace_once(
    admin_page,
    '''import ArchivedStudentsPanel from "./components/ArchivedStudentsPanel";
''',
    '''import ArchivedStudentsPanel from "./components/ArchivedStudentsPanel";
import AnnualRolloverPanel from "./components/AnnualRolloverPanel";
''',
    'AnnualRolloverPanel import',
)

# Add roster reload suppression ref near existing refs.
ref_anchor = '''  const lastSystemStatusFetchRef = useRef(0);'''
if ref_anchor in admin_page:
    admin_page = replace_once(
        admin_page,
        ref_anchor,
        ref_anchor + '\n  const suppressRosterReloadUntilRef = useRef(0);',
        'roster suppression ref',
    )
else:
    # Fallback anchor close to state refs in current file.
    ref_fallback = '''  const [notice, setNotice] = useState<{'''
    idx = admin_page.find(ref_fallback)
    if idx < 0:
        raise SystemExit('No AdminPage ref insertion anchor found')
    # Insert before the notice state, useRef already imported.
    admin_page = admin_page[:idx] + '  const suppressRosterReloadUntilRef = useRef(0);\n' + admin_page[idx:]

reload_anchor = '''  const reloadStudents = async () => {
    setLoading(true);'''
reload_new = '''  const reloadStudents = async () => {
    if (Date.now() < suppressRosterReloadUntilRef.current) {
      setStudents([]);
      return;
    }

    setLoading(true);'''
admin_page = replace_once(admin_page, reload_anchor, reload_new, 'reloadStudents suppression')

nav_anchor = '''                <SectionButton
                  active={section === "system"}
                  title="Data Health"
                  detail="Integrity checks and connections."
                  icon={<Database size={17} />}
                  tone="emerald"
                  onClick={() => setSection("system")}
                />'''
nav_new = nav_anchor + '''
                <SectionButton
                  active={section === "yearRollover"}
                  title="Start New School Year"
                  detail="Archive the year and reset roster IDs."
                  icon={<CalendarRange size={17} />}
                  tone="emerald"
                  onClick={() => setSection("yearRollover")}
                />'''
admin_page = replace_once(admin_page, nav_anchor, nav_new, 'System annual nav item')

system_render_anchor = '''            {section === "system" && (
              <AdminPanel
                kicker="System Health"
                title="Data Health & Connections"
                description="A plain-language view of the protections underneath the game. Normal teacher work should never require opening these sheets directly."
              >'''
if system_render_anchor not in admin_page:
    raise SystemExit('System render anchor not found')
# Insert the rollover section immediately before the Data Health section.
rollover_render = '''            {section === "yearRollover" && (
              <AdminPanel
                kicker="School Year"
                title="Start New School Year"
                description="Create a frozen year-end archive, reset the live student layer, and release StudentIDs so the next roster can start cleanly at 001."
              >
                <AnnualRolloverPanel
                  onCompleted={async () => {
                    // The backend is authoritative. Master's published CSV can
                    // briefly lag a destructive rollover, so keep the local
                    // roster empty instead of allowing stale students to flash back.
                    suppressRosterReloadUntilRef.current = Date.now() + 12000;
                    setStudents([]);
                    setArchivedRefreshKey((value) => value + 1);
                    await reloadSystemStatus();
                    setNotice({
                      type: "ok",
                      msg: "New school year ready. The live student roster is empty and StudentIDs can start again at 001.",
                    });
                  }}
                />
              </AdminPanel>
            )}

'''
admin_page = replace_once(
    admin_page,
    system_render_anchor,
    rollover_render + system_render_anchor,
    'annual rollover render',
)
admin_page_path.write_text(admin_page)

print('Annual rollover feature patched; Admin API bumped to 2026-09-01.10')
