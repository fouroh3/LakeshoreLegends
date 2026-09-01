/** =========================================================
 * Lakeshore Legends API — COMPLETE TEACHER ADMIN BUILD
 * MERGED BUILD (2026-09-01)
 *
 * Includes:
 * - HP API
 * - Boss API
 * - XP Store API
 * - Skill Store API
 * - Guild_Totals
 * - Battle_Control using the current 12-column layout
 * - Final Examiner
 * - Regular Battle Teacher Console
 * - Global Teacher Admin
 *   - Bulk student import
 *   - Guild assignment / unassignment
 *   - XP + Skill Token currency management
 *   - StudentID-keyed Player_State protection
 *   - Inventory / card management
 *   - Student rename + archive lifecycle
 *   - Attribute + skill management
 *   - Player_State StudentID integrity protection
 *
 * IMPORTANT ROSTER RULE:
 * - Master is a derived roll-up and is NOT the source for roster edits.
 * - Class sheets (8-1 ... 8-10) are the roster source of truth.
 * - Class-sheet Homeroom / StudentID cells are derived formulas and are never
 *   overwritten by the Teacher Admin importer.
 * ========================================================= */

const CFG = {
  // Master
  STUDENTS_SHEET: "Master",

  // HP
  HP_STATE_SHEET: "HP_State",
  HP_LOG_SHEET: "HP_Log",
  MAX_HP_DEFAULT: 20,

  // XP Store
  XP_CONTROL_SHEET_PRIMARY: "Store_Control",
  XP_CONTROL_SHEET_FALLBACK: "XP_Control",
  XP_STATE_SHEET: "XP_State",
  XP_TXN_SHEET: "XP_Transactions",

  // Skill Store
  SKILL_STATE_SHEET: "Skill_State",
  PURCHASED_SKILLS_SHEET: "Purchased_Skills",
  SKILL_TXN_SHEET: "Skill_Transactions",

  // Boss
  BOSS_STATE_SHEET: "Boss_State",
  BOSS_LOG_SHEET: "Boss_Log",
  MAX_BOSS_HP_DEFAULT: 2000,

  // Totals
  GUILD_TOTALS_SHEET: "Guild_Totals",
  BATTLE_GUILD_TOTALS_SHEET: "Battle_GuildTotals",

  // Battle control
  BATTLE_CONTROL_SHEET: "Battle_Control",
  BATTLE_CONTROL_MAX_ROWS: 10,
  BATTLE_CONTROL_HOMEROOMS: [
    "8-1",
    "8-2",
    "8-3",
    "8-4",
    "8-5",
    "8-6",
    "8-7",
    "8-8",
    "8-9",
    "8-10",
  ],

  // Locking / caching
  LOCK_WAIT_MS: 15000,
  CACHE_SECONDS_STUDENTS: 60,
  CACHE_SECONDS_HP: 2,

  PROP_LAST_WRITE_ISO: "HP_LAST_WRITE_ISO",
  PROP_LAST_XP_WRITE_ISO: "HP_LAST_XP_WRITE_ISO",
};

const BATTLE_UI = {
  SHEET: CFG.BATTLE_CONTROL_SHEET,
  MAX_ROWS: CFG.BATTLE_CONTROL_MAX_ROWS,
  HOMEROOMS: CFG.BATTLE_CONTROL_HOMEROOMS,
};

// =========================================================
// Output helpers (+ CORS)
// =========================================================
function withCors_(output) {
  try {
    output.setHeader("Access-Control-Allow-Origin", "*");
    output.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    output.setHeader("Access-Control-Allow-Headers", "Content-Type");
    output.setHeader("Access-Control-Max-Age", "3600");
  } catch (_) {}
  return output;
}

function jsonOut_(obj) {
  return withCors_(
    ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
      ContentService.MimeType.JSON
    )
  );
}

function textOut_(txt) {
  return withCors_(
    ContentService.createTextOutput(txt || "").setMimeType(
      ContentService.MimeType.TEXT
    )
  );
}

// =========================================================
// Utilities
// =========================================================
function norm_(v) {
  return String(v ?? "")
    .replace(/^[\"'‘’“”]+|[\"'‘’“”]+$/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .trim();
}

function normId_(v) {
  return norm_(v)
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function normPin_(v) {
  return String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[^\dA-Za-z]/g, "")
    .trim()
    .toUpperCase();
}

function asNum_(v, fallback) {
  const s = String(v ?? "").replace(/[^\d\-\.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
}

function toBool_(v, fallback) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "TRUE" || s === "1" || s === "YES" || s === "Y") return true;
  if (s === "FALSE" || s === "0" || s === "NO" || s === "N") return false;
  return !!fallback;
}

function headerMap_(headers) {
  const m = {};
  (headers || []).forEach((h, i) => (m[String(h).trim().toLowerCase()] = i));
  return m;
}

function idx_(map, ...keys) {
  for (const k of keys) {
    const i = map[String(k).toLowerCase()];
    if (i != null) return i;
  }
  return -1;
}

function getProp_(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function setProp_(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, String(val ?? ""));
}

function cacheGetJson_(key) {
  const c = CacheService.getScriptCache();
  const raw = c.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function cachePutJson_(key, obj, seconds) {
  CacheService.getScriptCache().put(key, JSON.stringify(obj), seconds);
}

function cacheRemove_(key) {
  try {
    CacheService.getScriptCache().remove(key);
  } catch (_) {}
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(name);
  if (!sh) throw new Error(`Missing sheet: ${name}`);
  return sh;
}

function getSheetOptional_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || null;
}

// =========================================================
// Header-safe ensure helpers
// =========================================================
function headersMatch_(existingRow, want) {
  for (let i = 0; i < want.length; i++) {
    const a = String(existingRow?.[i] ?? "").trim();
    const b = String(want[i] ?? "").trim();
    if (a !== b) return false;
  }
  return true;
}

function sheetHasAnyHeader_(row) {
  return (row || []).some((x) => String(x || "").trim() !== "");
}

function ensureHeaders_(sh, want) {
  const lastCol = Math.max(sh.getLastColumn() || 1, want.length);
  const existing = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const hasAny = sheetHasAnyHeader_(existing);
  const same = headersMatch_(existing, want);
  if (!hasAny || !same) sh.getRange(1, 1, 1, want.length).setValues([want]);
  return sh;
}

// =========================================================
// Idempotency
// =========================================================
const IDEMP_TTL_SECONDS = 180;

function idemKey_(action, requestId) {
  return `idem:v1:${String(action)}:${String(requestId)}`;
}

function idemIsDuplicate_(action, requestId) {
  if (!requestId) return false;
  try {
    const c = CacheService.getScriptCache();
    return !!c.get(idemKey_(action, requestId));
  } catch {
    return false;
  }
}

function idemMark_(action, requestId) {
  if (!requestId) return;
  try {
    CacheService.getScriptCache().put(
      idemKey_(action, requestId),
      "1",
      IDEMP_TTL_SECONDS
    );
  } catch (_) {}
}

// =========================================================
// Round Locks (Boss ATTACK only when round+guild are present)
// =========================================================
const ROUNDLOCK_TTL_SECONDS = 60 * 60;

function normRound_(v) {
  const n = Math.floor(asNum_(v, 0));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundLockKey_(kind, sessionOrBossInstanceId, round, who) {
  return `roundlock:v1:${kind}:${String(sessionOrBossInstanceId)}:${String(
    round
  )}:${String(who)}`;
}

function roundLockIsDuplicate_(kind, sessionOrBossInstanceId, round, who) {
  if (!sessionOrBossInstanceId || !round || !who) return false;
  try {
    const c = CacheService.getScriptCache();
    return !!c.get(
      roundLockKey_(kind, sessionOrBossInstanceId, round, who)
    );
  } catch {
    return false;
  }
}

function roundLockMark_(kind, sessionOrBossInstanceId, round, who) {
  if (!sessionOrBossInstanceId || !round || !who) return;
  try {
    CacheService.getScriptCache().put(
      roundLockKey_(kind, sessionOrBossInstanceId, round, who),
      "1",
      ROUNDLOCK_TTL_SECONDS
    );
  } catch (_) {}
}

// =========================================================
// Fast Row/Append Helpers
// =========================================================
function findRowByIdInCol_(sh, col, idValue) {
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return -1;
  const range = sh.getRange(2, col, lastRow - 1, 1);
  const tf = range.createTextFinder(String(idValue)).matchEntireCell(true);
  const cell = tf.findNext();
  return cell ? cell.getRow() : -1;
}

function appendRowFast_(sh, rowArr) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, rowArr.length).setValues([rowArr]);
  return r;
}

// =========================================================
// Students Map (cached)
// =========================================================
function loadStudentsMap_() {
  const cacheKey = `studentsMap:${CFG.STUDENTS_SHEET}`;
  const cached = cacheGetJson_(cacheKey);
  if (cached && cached.items && Array.isArray(cached.items)) {
    const m = new Map();
    cached.items.forEach((x) => m.set(x.studentId, x));
    return m;
  }

  const sh = getSheet_(CFG.STUDENTS_SHEET);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return new Map();

  const headers = values[0];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID", "Student Id");
  const iName = idx_(map, "Name", "StudentName", "Student Name");
  const iHr = idx_(map, "Homeroom", "HR", "Class");
  const iGuild = idx_(map, "Guild");

  if (iId < 0)
    throw new Error(`Missing StudentID column in ${CFG.STUDENTS_SHEET}`);
  if (iName < 0)
    throw new Error(`Missing Name column in ${CFG.STUDENTS_SHEET}`);

  const out = new Map();
  const items = [];

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = normId_(row[iId]);
    if (!id) continue;

    const obj = {
      studentId: id,
      name: norm_(row[iName]),
      homeroom: norm_(iHr >= 0 ? row[iHr] : ""),
      guild: norm_(iGuild >= 0 ? row[iGuild] : ""),
    };

    out.set(id, obj);
    items.push(obj);
  }

  cachePutJson_(cacheKey, { items }, CFG.CACHE_SECONDS_STUDENTS);
  return out;
}

// ================================================================
// ========================= SHEET ENSURES =========================
// ================================================================
function ensureHpStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.HP_STATE_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.HP_STATE_SHEET);
  return ensureHeaders_(sh, [
    "StudentID",
    "Name",
    "Homeroom",
    "Guild",
    "BaseHP",
    "CurrentHP",
    "UpdatedAt",
    "LastDelta",
  ]);
}

function ensureHpLogSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.HP_LOG_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.HP_LOG_SHEET);
  return ensureHeaders_(sh, [
    "Timestamp",
    "SessionID",
    "StudentID",
    "Delta",
    "Before",
    "After",
    "Note",
  ]);
}

function ensureBossStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.BOSS_STATE_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.BOSS_STATE_SHEET);
  return ensureHeaders_(sh, [
    "BossInstanceId",
    "BossKey",
    "BossName",
    "MaxHP",
    "CurrentHP",
    "UpdatedAt",
  ]);
}

function ensureBossLogSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.BOSS_LOG_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.BOSS_LOG_SHEET);
  return ensureHeaders_(sh, [
    "At",
    "BossInstanceId",
    "BossKey",
    "ActionType",
    "Round",
    "Homeroom",
    "Guild",
    "Delta",
    "NewHP",
    "Source",
    "RequestId",
  ]);
}

function ensureGuildTotalsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.GUILD_TOTALS_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.GUILD_TOTALS_SHEET);
  return ensureHeaders_(sh, [
    "UpdatedAt",
    "Homeroom",
    "Guild",
    "Members",
    "TotalBaseHP",
    "TotalCurrentHP",
    "PctHP",
  ]);
}

function ensureBattleGuildTotalsSheet_() {
  return null;
}

function ensureBattleControlSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.BATTLE_CONTROL_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.BATTLE_CONTROL_SHEET);

  const want = [
    "Homeroom",
    "Status",
    "Quest",
    "Round",
    "Turn",
    "PairTo",
    "LeaderHomeroom",
    "ActiveBattleSessionId",
    "BossKey",
    "BossInstanceId",
    "CurrentStateSummary",
    "LastUpdated",
  ];

  sh.getRange(1, 1, 1, want.length).setValues([want]);

  const maxCols = sh.getMaxColumns();
  if (maxCols > want.length) {
    sh.getRange(
      1,
      want.length + 1,
      Math.max(sh.getMaxRows(), 11),
      maxCols - want.length
    ).clearContent();
  }

  const neededRows = 1 + BATTLE_UI.MAX_ROWS;
  if (sh.getMaxRows() < neededRows) {
    sh.insertRowsAfter(sh.getMaxRows(), neededRows - sh.getMaxRows());
  }

  const range = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, want.length);
  const vals = range.getValues();
  let changed = false;

  for (let i = 0; i < BATTLE_UI.MAX_ROWS; i++) {
    if (!norm_(vals[i][0])) {
      vals[i][0] = BATTLE_UI.HOMEROOMS[i] || "";
      changed = true;
    }
    if (!norm_(vals[i][1])) {
      vals[i][1] = "INACTIVE";
      changed = true;
    }
    const round = Math.floor(asNum_(vals[i][3], 0));
    if (!round || round < 1) {
      vals[i][3] = 1;
      changed = true;
    }
    if (!norm_(vals[i][4])) {
      vals[i][4] = "BOSS";
      changed = true;
    }
  }

  if (changed) range.setValues(vals);

  return sh;
}

// ================================================================
// ========================= BATTLE CONTROL ========================
// ================================================================
function battleControlRows_() {
  const sh = ensureBattleControlSheet_();
  const vals = sh.getRange(1, 1, 1 + BATTLE_UI.MAX_ROWS, 12).getValues();
  const headers = vals[0].map((h) => String(h || "").trim());
  const map = headerMap_(headers);

  const rows = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    rows.push({
      sheetRow: r + 1,
      homeroom: norm_(row[map["homeroom"]]),
      status: norm_(row[map["status"]]).toUpperCase(),
      quest: norm_(row[map["quest"]]),
      round: Math.max(1, Math.floor(asNum_(row[map["round"]], 1))),
      turn: norm_(row[map["turn"]]).toUpperCase() || "BOSS",
      pairTo: norm_(row[map["pairto"]]),
      leaderHomeroom: norm_(row[map["leaderhomeroom"]]),
      activeBattleSessionId: norm_(row[map["activebattlesessionid"]]),
      bossKey: norm_(row[map["bosskey"]]),
      bossInstanceId: norm_(row[map["bossinstanceid"]]),
      currentStateSummary: norm_(row[map["currentstatesummary"]]),
      lastUpdated: row[map["lastupdated"]],
    });
  }

  return { sh, headers, map, rows };
}

function questToBossKey_(quest) {
  const q = norm_(quest);
  const m = {
    "The Lake of Shadows": "KEEPER_SHADOWS",
    "The Alchemists Lair": "THE_ALCHEMIST",
    "The Ensnaring Crypt": "CRYPT_WARDEN",
    "The Final Examiner": "FINAL_EXAMINER",
    "The Plagueborn Woods": "PLAGUEBEARER",
    "The Prism Tower": "PRISM_SENTINEL",
  };
  return (
    m[q] ||
    q
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase()
  );
}

function makeBattleSessionId_(leaderHomeroom, quest) {
  const safeQuest = questToBossKey_(quest || "BATTLE");
  return `battle_${leaderHomeroom}_${safeQuest}`;
}

function makeBossInstanceId_(battleSessionId) {
  return `boss_${battleSessionId}`;
}

function resolveLeaderForRow_(row, rowByHomeroom) {
  const pairTo = norm_(row.pairTo);
  if (!pairTo) return row.homeroom || "";
  const target = rowByHomeroom.get(pairTo);
  if (!target) return row.homeroom || "";
  if (pairTo === row.homeroom) return row.homeroom || "";
  if (norm_(target.pairTo)) return row.homeroom || "";
  return pairTo;
}

function syncBattleControlDerivedFields_() {
  const { sh, map, rows } = battleControlRows_();
  const rowByHomeroom = new Map(rows.map((r) => [r.homeroom, r]));
  const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();
  let changed = false;
  const nowIso = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const leaderHomeroom =
      resolveLeaderForRow_(r, rowByHomeroom) || r.homeroom;
    const isFollower = leaderHomeroom !== r.homeroom;
    const leaderRow = rowByHomeroom.get(leaderHomeroom) || r;

    const effectiveQuest = isFollower ? leaderRow.quest : r.quest;
    const effectiveRound = isFollower ? leaderRow.round : r.round;
    const effectiveTurn = isFollower ? leaderRow.turn : r.turn;

    const battleSessionId =
      r.status === "ACTIVE" && effectiveQuest
        ? makeBattleSessionId_(leaderHomeroom, effectiveQuest)
        : "";

    const bossKey =
      r.status === "ACTIVE" && effectiveQuest
        ? questToBossKey_(effectiveQuest)
        : "";

    const bossInstanceId =
      battleSessionId && r.status === "ACTIVE"
        ? makeBossInstanceId_(battleSessionId)
        : "";

    let summary = "";
    if (r.status !== "ACTIVE") {
      summary = "Inactive";
    } else if (isFollower) {
      summary = `Paired to ${leaderHomeroom} — DO NOT EDIT`;
    } else if (!effectiveQuest) {
      summary = "Active — choose quest";
    } else if (effectiveTurn === "BOSS") {
      summary = "Boss Turn";
    } else if (effectiveTurn === "GUILD") {
      summary = "Guild Turn — all guilds may act";
    } else {
      summary = "Active";
    }

    const current = vals[i];
    const updates = [
      ["leaderhomeroom", leaderHomeroom],
      ["activebattlesessionid", battleSessionId],
      ["bosskey", bossKey],
      ["bossinstanceid", bossInstanceId],
      ["currentstatesummary", summary],
      ["lastupdated", nowIso],
    ];

    for (const [key, val] of updates) {
      const colIdx = map[key];
      if (current[colIdx] !== val) {
        current[colIdx] = val;
        changed = true;
      }
    }

    if (isFollower) {
      if (current[map["quest"]] !== effectiveQuest) {
        current[map["quest"]] = effectiveQuest;
        changed = true;
      }
      if (String(current[map["round"]]) !== String(effectiveRound)) {
        current[map["round"]] = effectiveRound;
        changed = true;
      }
      if (String(current[map["turn"]]) !== String(effectiveTurn)) {
        current[map["turn"]] = effectiveTurn;
        changed = true;
      }
    }
  }

  if (changed) {
    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);
  }

  return { ok: true, synced: true, at: nowIso };
}

function syncBossStateFromBattleControl_() {
  syncBattleControlDerivedFields_();
  const { rows } = battleControlRows_();
  const bossState = ensureBossStateSheet_();
  const nowIso = new Date().toISOString();
  const activeLeaders = new Map();

  rows.forEach((r) => {
    if (String(r.status || "").toUpperCase() !== "ACTIVE") return;
    const leaderHomeroom = norm_(r.leaderHomeroom || r.homeroom);
    const ownHomeroom = norm_(r.homeroom);
    if (!leaderHomeroom || !ownHomeroom) return;
    if (norm_(leaderHomeroom) !== norm_(ownHomeroom)) return;

    const bossInstanceId = norm_(r.bossInstanceId || "");
    const bossKey = norm_(r.bossKey || "");
    if (!bossInstanceId || !bossKey) return;

    const defaults = bossDefaultsFromKey_(bossKey);
    activeLeaders.set(bossInstanceId, {
      bossInstanceId,
      bossKey,
      bossName: defaults.bossName,
      leaderHomeroom,
    });
  });

  const vals = bossState.getDataRange().getValues();
  const rowsToDelete = [];
  let created = 0;
  let updated = 0;
  let deleted = 0;
  const existingRowById = new Map();

  for (let r = 1; r < vals.length; r++) {
    const bossInstanceId = norm_(vals[r][0]);
    if (!bossInstanceId) continue;
    if (!existingRowById.has(bossInstanceId)) {
      existingRowById.set(bossInstanceId, r + 1);
    } else {
      rowsToDelete.push(r + 1);
    }
  }

  activeLeaders.forEach((b) => {
    const row = existingRowById.get(b.bossInstanceId);
    if (row) {
      const existing = bossState.getRange(row, 1, 1, 6).getValues()[0];
      const existingMax = Math.max(
        1,
        Math.round(asNum_(existing[3], CFG.MAX_BOSS_HP_DEFAULT))
      );
      const existingCur = Math.max(
        0,
        Math.min(
          existingMax,
          Math.round(asNum_(existing[4], existingMax))
        )
      );
      bossState.getRange(row, 1, 1, 6).setValues([
        [
          b.bossInstanceId,
          b.bossKey,
          b.bossName,
          existingMax,
          existingCur,
          nowIso,
        ],
      ]);
      updated++;
    } else {
      appendRowFast_(bossState, [
        b.bossInstanceId,
        b.bossKey,
        b.bossName,
        CFG.MAX_BOSS_HP_DEFAULT,
        CFG.MAX_BOSS_HP_DEFAULT,
        nowIso,
      ]);
      created++;
    }
  });

  for (let r = 1; r < vals.length; r++) {
    const sheetRow = r + 1;
    const bossInstanceId = norm_(vals[r][0]);
    if (!bossInstanceId) continue;
    if (!activeLeaders.has(bossInstanceId)) rowsToDelete.push(sheetRow);
  }

  rowsToDelete
    .sort((a, b) => b - a)
    .forEach((rowNum) => {
      bossState.deleteRow(rowNum);
      deleted++;
    });

  return {
    ok: true,
    synced: activeLeaders.size,
    created,
    updated,
    deleted,
    at: nowIso,
  };
}

function resolveBattleContext_(homeroom) {
  const { rows } = battleControlRows_();
  const row = rows.find((r) => r.homeroom === norm_(homeroom));
  if (!row)
    throw new Error(`Homeroom not found in Battle_Control: ${homeroom}`);
  const leaderHomeroom = row.leaderHomeroom || row.homeroom;
  const leaderRow = rows.find((r) => r.homeroom === leaderHomeroom) || row;
  return {
    homeroom: row.homeroom,
    leaderHomeroom,
    activeBattleSessionId: leaderRow.activeBattleSessionId,
    bossKey: leaderRow.bossKey,
    bossInstanceId: leaderRow.bossInstanceId,
    round: leaderRow.round,
    turn: leaderRow.turn,
    quest: leaderRow.quest,
    status: leaderRow.status,
  };
}

function battleControlGet_() {
  const cacheKey = "battleControl:v1";
  const cached = cacheGetJson_(cacheKey);
  if (cached && cached.ok && Array.isArray(cached.rows)) return cached;

  const { rows } = battleControlRows_();
  const payload = {
    ok: true,
    rows: rows.map((r) => ({
      homeroom: r.homeroom || "",
      status: r.status || "",
      quest: r.quest || "",
      round: r.round || 1,
      turn: r.turn || "BOSS",
      pairTo: r.pairTo || "",
      leaderHomeroom: r.leaderHomeroom || "",
      activeBattleSessionId: r.activeBattleSessionId || "",
      sessionId: r.activeBattleSessionId || "",
      bossKey: r.bossKey || "",
      bossInstanceId: r.bossInstanceId || "",
      currentStateSummary: r.currentStateSummary || "",
      lastUpdated:
        r.lastUpdated instanceof Date
          ? r.lastUpdated.toISOString()
          : String(r.lastUpdated || ""),
      guildAttacks:
        String(r.turn || "").toUpperCase() === "GUILD" ? "OPEN" : "CLOSED",
    })),
    now: new Date().toISOString(),
  };

  cachePutJson_(cacheKey, payload, 3);
  return payload;
}

// ================================================================
// ========================= HP SYSTEM ============================
// ================================================================
function hpHeaderIdx_() {
  const sh = ensureHpStateSheet_();
  const headers = sh
    .getRange(1, 1, 1, Math.max(sh.getLastColumn() || 1, 8))
    .getDisplayValues()[0]
    .map((h) => String(h || "").trim());
  const m = headerMap_(headers);
  const iId = idx_(m, "StudentID", "ID");
  const iName = idx_(m, "Name");
  const iHr = idx_(m, "Homeroom", "HR", "Class");
  const iGuild = idx_(m, "Guild");
  const iBase = idx_(m, "BaseHP", "Base", "MaxHP");
  const iCur = idx_(m, "CurrentHP", "Current");
  const iUpdated = idx_(m, "UpdatedAt", "Updated");
  const iLastDelta = idx_(m, "LastDelta", "Delta");

  if (iId < 0) throw new Error("HP_State missing StudentID header.");
  if (iBase < 0) throw new Error("HP_State missing BaseHP header.");
  if (iCur < 0) throw new Error("HP_State missing CurrentHP header.");
  if (iUpdated < 0) throw new Error("HP_State missing UpdatedAt header.");
  if (iLastDelta < 0) throw new Error("HP_State missing LastDelta header.");

  return {
    sh,
    col: {
      StudentID: iId + 1,
      Name: iName >= 0 ? iName + 1 : 2,
      Homeroom: iHr >= 0 ? iHr + 1 : 3,
      Guild: iGuild >= 0 ? iGuild + 1 : 4,
      BaseHP: iBase + 1,
      CurrentHP: iCur + 1,
      UpdatedAt: iUpdated + 1,
      LastDelta: iLastDelta + 1,
    },
  };
}

function loadHpIndex_() {
  const { sh, col } = hpHeaderIdx_();
  const values = sh.getDataRange().getDisplayValues();
  const headers = values[0] || [];
  const m = headerMap_(headers);
  const iId = idx_(m, "StudentID", "ID");
  const iBase = idx_(m, "BaseHP", "Base", "MaxHP");
  const iCur = idx_(m, "CurrentHP", "Current");
  if (iId < 0) throw new Error("HP_State missing StudentID header.");
  if (iBase < 0) throw new Error("HP_State missing BaseHP header.");
  if (iCur < 0) throw new Error("HP_State missing CurrentHP header.");

  const index = new Map();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = normId_(row[iId]);
    if (!id) continue;
    const baseHP = Math.max(
      1,
      Math.round(asNum_(row[iBase], CFG.MAX_HP_DEFAULT))
    );
    const cappedBase = Math.min(CFG.MAX_HP_DEFAULT, baseHP);
    const currentHP = Math.max(
      0,
      Math.min(cappedBase, Math.round(asNum_(row[iCur], cappedBase)))
    );
    index.set(id, { sheetRow: r + 1, baseHP: cappedBase, currentHP });
  }
  return { sh, col, index };
}

function hpGetAll_() {
  const cacheKey = "hpAll:v1";
  const cached = cacheGetJson_(cacheKey);
  if (cached && cached.ok && Array.isArray(cached.hp)) return cached;
  const { index } = loadHpIndex_();
  const out = [];
  index.forEach((v, id) =>
    out.push({ studentId: id, baseHP: v.baseHP, currentHP: v.currentHP })
  );
  out.sort((a, b) =>
    String(a.studentId).localeCompare(String(b.studentId))
  );
  const payload = {
    ok: true,
    hp: out,
    hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "",
    now: new Date().toISOString(),
  };
  cachePutJson_(cacheKey, payload, CFG.CACHE_SECONDS_HP);
  return payload;
}

function hpLogDelta_(args) {
  const studentId = normId_(args.studentId);
  const sessionId = norm_(args.sessionId);
  const delta = Math.round(asNum_(args.delta, 0));
  const note = norm_(args.note || "");
  const requestId = norm_(args.requestId || "");
  if (!studentId) throw new Error("Missing studentId");
  if (!sessionId) throw new Error("Missing sessionId");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Invalid delta");

  if (requestId && idemIsDuplicate_("hpLogDelta", requestId)) {
    return {
      ok: true,
      deduped: true,
      studentId,
      sessionId,
      requestId,
      hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "",
      now: new Date().toISOString(),
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { sh, col, index } = loadHpIndex_();
    let row = index.get(studentId);
    if (!row) {
      const studentsMap = loadStudentsMap_();
      const s = studentsMap.get(studentId) || {
        studentId,
        name: "",
        homeroom: "",
        guild: "",
      };
      const base = CFG.MAX_HP_DEFAULT;
      const cur = base;
      const nowIso = new Date().toISOString();
      appendRowFast_(sh, [
        studentId,
        s.name || "",
        s.homeroom || "",
        s.guild || "",
        base,
        cur,
        nowIso,
        0,
      ]);
      const re = loadHpIndex_();
      row = re.index.get(studentId);
      if (!row)
        throw new Error(`Student not found in HP_State after seed: ${studentId}`);
    }

    const baseHP = Math.min(
      CFG.MAX_HP_DEFAULT,
      Math.max(1, row.baseHP || CFG.MAX_HP_DEFAULT)
    );
    const before = Math.max(0, Math.min(baseHP, row.currentHP));
    const after = Math.max(0, Math.min(baseHP, before + delta));
    sh.getRange(row.sheetRow, col.CurrentHP).setValue(after);
    sh.getRange(row.sheetRow, col.UpdatedAt).setValue(new Date().toISOString());
    sh.getRange(row.sheetRow, col.LastDelta).setValue(delta);
    const log = ensureHpLogSheet_();
    appendRowFast_(log, [
      new Date(),
      sessionId,
      studentId,
      delta,
      before,
      after,
      note,
    ]);
    const iso = new Date().toISOString();
    setProp_(CFG.PROP_LAST_WRITE_ISO, iso);
    cacheRemove_("hpAll:v1");
    if (requestId) idemMark_("hpLogDelta", requestId);
    return { ok: true, studentId, baseHP, before, after, hpLastWriteIso: iso };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function hpLogBatch_(args) {
  const sessionId = norm_(args.sessionId);
  const note = norm_(args.note || "");
  const requestId = norm_(args.requestId || "");
  const entries = Array.isArray(args.entries) ? args.entries : [];
  if (!sessionId) throw new Error("Missing sessionId");
  if (!entries.length) throw new Error("Missing entries");
  if (requestId && idemIsDuplicate_("hpLogBatch", requestId)) {
    return {
      ok: true,
      deduped: true,
      sessionId,
      requestId,
      hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "",
      now: new Date().toISOString(),
    };
  }

  const cleaned = entries
    .map((x) => ({
      studentId: normId_(x && x.studentId),
      delta: Math.round(asNum_(x && x.delta, 0)),
      note: norm_((x && x.note) || note || ""),
    }))
    .filter(
      (x) => x.studentId && Number.isFinite(x.delta) && x.delta !== 0
    );
  if (!cleaned.length) throw new Error("No valid entries");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    let { sh, col, index } = loadHpIndex_();
    const studentsMap = loadStudentsMap_();
    const now = new Date();
    const nowIso = now.toISOString();
    const seedRows = [];
    cleaned.forEach((item) => {
      if (!index.get(item.studentId)) {
        const s = studentsMap.get(item.studentId) || {
          studentId: item.studentId,
          name: "",
          homeroom: "",
          guild: "",
        };
        seedRows.push([
          item.studentId,
          s.name || "",
          s.homeroom || "",
          s.guild || "",
          CFG.MAX_HP_DEFAULT,
          CFG.MAX_HP_DEFAULT,
          nowIso,
          0,
        ]);
      }
    });
    if (seedRows.length) {
      sh.getRange(
        sh.getLastRow() + 1,
        1,
        seedRows.length,
        seedRows[0].length
      ).setValues(seedRows);
      const reloaded = loadHpIndex_();
      sh = reloaded.sh;
      col = reloaded.col;
      index = reloaded.index;
    }

    cleaned.forEach((item) => {
      if (!index.get(item.studentId))
        throw new Error(`Student missing from HP_State: ${item.studentId}`);
    });
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    const sheetData = sh.getRange(1, 1, lastRow, lastCol).getValues();
    const results = [];
    const logRows = [];

    cleaned.forEach((item) => {
      const row = index.get(item.studentId);
      if (!row)
        throw new Error(`Student not found during apply: ${item.studentId}`);
      const sheetRowIndex = row.sheetRow - 1;
      const rowValues = sheetData[sheetRowIndex];
      const baseHP = Math.min(
        CFG.MAX_HP_DEFAULT,
        Math.max(
          1,
          Math.round(asNum_(row.baseHP, CFG.MAX_HP_DEFAULT))
        )
      );
      const before = Math.max(
        0,
        Math.min(baseHP, Math.round(asNum_(row.currentHP, baseHP)))
      );
      const after = Math.max(0, Math.min(baseHP, before + item.delta));
      rowValues[col.CurrentHP - 1] = after;
      rowValues[col.UpdatedAt - 1] = nowIso;
      rowValues[col.LastDelta - 1] = item.delta;
      row.currentHP = after;
      results.push({
        studentId: item.studentId,
        baseHP,
        before,
        after,
        delta: item.delta,
      });
      logRows.push([
        now,
        sessionId,
        item.studentId,
        item.delta,
        before,
        after,
        item.note || "",
      ]);
    });

    sh.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(
      sheetData
    );
    if (logRows.length) {
      const log = ensureHpLogSheet_();
      log.getRange(
        log.getLastRow() + 1,
        1,
        logRows.length,
        logRows[0].length
      ).setValues(logRows);
    }
    setProp_(CFG.PROP_LAST_WRITE_ISO, nowIso);
    cacheRemove_("hpAll:v1");
    if (requestId) idemMark_("hpLogBatch", requestId);
    return {
      ok: true,
      sessionId,
      requestId,
      count: results.length,
      results,
      hpLastWriteIso: nowIso,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// ================================================================
// ========================= GUILD TOTALS ==========================
// ================================================================
function recomputeGuildTotals_() {
  const hp = ensureHpStateSheet_();
  const vals = hp.getDataRange().getValues();
  const outSh = ensureGuildTotalsSheet_();
  if (!vals || vals.length < 2) {
    const last = outSh.getLastRow();
    if (last > 1)
      outSh
        .getRange(2, 1, last - 1, outSh.getLastColumn())
        .clearContent();
    return {
      ok: true,
      written: 0,
      updatedAt: new Date().toISOString(),
      note: "HP_State empty",
    };
  }

  const headers = (vals[0] || []).map((h) => String(h || "").trim());
  const m = headerMap_(headers);
  const iHr = idx_(m, "Homeroom", "HR", "Class");
  const iGuild = idx_(m, "Guild");
  const iBase = idx_(m, "BaseHP", "Base", "MaxHP");
  const iCur = idx_(m, "CurrentHP", "Current");
  if (iHr < 0) throw new Error("HP_State missing Homeroom header.");
  if (iGuild < 0) throw new Error("HP_State missing Guild header.");
  if (iBase < 0) throw new Error("HP_State missing BaseHP header.");
  if (iCur < 0) throw new Error("HP_State missing CurrentHP header.");

  const agg = new Map();
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const homeroom = norm_(row[iHr] || "");
    const guild = norm_(row[iGuild] || "") || "Unguilded";
    const baseHP = Math.max(0, asNum_(row[iBase], 0));
    const curHP = Math.max(0, asNum_(row[iCur], 0));
    if (!homeroom && !guild && !baseHP && !curHP) continue;
    const key = `${homeroom}||${guild}`;
    if (!agg.has(key))
      agg.set(key, {
        Homeroom: homeroom,
        Guild: guild,
        Members: 0,
        TotalBaseHP: 0,
        TotalCurrentHP: 0,
      });
    const a = agg.get(key);
    a.Members += 1;
    a.TotalBaseHP += baseHP;
    a.TotalCurrentHP += curHP;
  }

  const updatedAt = new Date().toISOString();
  const rows = Array.from(agg.values())
    .sort((a, b) => {
      const hr = String(a.Homeroom).localeCompare(String(b.Homeroom));
      return hr !== 0 ? hr : String(a.Guild).localeCompare(String(b.Guild));
    })
    .map((a) => {
      const pct = a.TotalBaseHP > 0 ? a.TotalCurrentHP / a.TotalBaseHP : 0;
      return [
        updatedAt,
        a.Homeroom,
        a.Guild,
        a.Members,
        Math.round(a.TotalBaseHP),
        Math.round(a.TotalCurrentHP),
        Math.round(pct * 10000) / 10000,
      ];
    });

  const last = outSh.getLastRow();
  if (last > 1)
    outSh
      .getRange(2, 1, last - 1, outSh.getLastColumn())
      .clearContent();
  if (rows.length)
    outSh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { ok: true, written: rows.length, updatedAt };
}

function guildTotalsGet_(homeroomFilter) {
  const sh = ensureGuildTotalsSheet_();
  const vals = sh.getDataRange().getValues();
  if (!vals || vals.length < 2)
    return { ok: true, updatedAt: "", rows: [] };
  const headers = vals[0].map((h) => String(h || "").trim());
  const rows = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    if (
      homeroomFilter &&
      String(obj.Homeroom || "") !== String(homeroomFilter)
    )
      continue;
    rows.push(obj);
  }
  const updatedAt = rows.length ? String(rows[0].UpdatedAt || "") : "";
  return { ok: true, updatedAt, rows };
}

// ================================================================
// ====================== BATTLE GUILD TOTALS ======================
// ================================================================
function recomputeBattleGuildTotals_() {
  return {
    ok: false,
    disabled: true,
    error: "Battle_GuildTotals has been disabled for performance.",
  };
}

function battleGuildTotalsGet_() {
  return {
    ok: false,
    disabled: true,
    error: "Battle_GuildTotals has been disabled for performance.",
    rows: [],
    updatedAt: "",
  };
}

// ================================================================
// ========================= BOSS INSTANCES =======================
// ================================================================
function bossFindRow_(sh, bossInstanceId) {
  return findRowByIdInCol_(sh, 1, String(bossInstanceId));
}

function bossDefaultsFromKey_(bossKey) {
  const key = norm_(bossKey);
  const name =
    key
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim() || "Boss";
  return { bossName: name, maxHP: CFG.MAX_BOSS_HP_DEFAULT };
}

function bossStateCacheKey_(bossInstanceId) {
  return `bossState:v1:${norm_(bossInstanceId)}`;
}

function bossGetState_(bossInstanceId, bossKey) {
  const id = norm_(bossInstanceId);
  if (!id) throw new Error("Missing bossInstanceId");
  const cacheKey = bossStateCacheKey_(id);
  const cached = cacheGetJson_(cacheKey);
  if (cached && cached.bossInstanceId) return cached;

  const state = ensureBossStateSheet_();
  ensureBossLogSheet_();
  const row = bossFindRow_(state, id);
  if (row !== -1) {
    const r = state.getRange(row, 1, 1, 6).getValues()[0];
    const payload = {
      bossInstanceId: String(r[0] || ""),
      bossKey: String(r[1] || ""),
      bossName: String(r[2] || ""),
      maxHP: Math.round(asNum_(r[3], CFG.MAX_BOSS_HP_DEFAULT)),
      currentHP: Math.round(asNum_(r[4], 0)),
      updatedAt: String(r[5] || ""),
    };
    cachePutJson_(cacheKey, payload, 3);
    return payload;
  }

  const def = bossDefaultsFromKey_(bossKey);
  const nowIso = new Date().toISOString();
  const maxHP = Math.max(
    1,
    Math.round(def.maxHP || CFG.MAX_BOSS_HP_DEFAULT)
  );
  const cur = maxHP;
  appendRowFast_(state, [
    id,
    norm_(bossKey),
    def.bossName,
    maxHP,
    cur,
    nowIso,
  ]);
  const payload = {
    bossInstanceId: id,
    bossKey: norm_(bossKey),
    bossName: def.bossName,
    maxHP,
    currentHP: cur,
    updatedAt: nowIso,
  };
  cachePutJson_(cacheKey, payload, 3);
  return payload;
}

function bossApplyDelta_(args) {
  const bossInstanceId = norm_(args.bossInstanceId);
  const bossKey = norm_(args.bossKey || "");
  const delta = Math.round(asNum_(args.delta, 0));
  const source = norm_(args.source || "");
  const requestId = norm_(args.requestId || "");
  const actionType = norm_(args.actionType || "ATTACK");
  const AT = actionType.toUpperCase().trim() || "ATTACK";
  const round = normRound_(args.round);
  const guild = norm_(args.guild || "");
  const homeroom = norm_(args.homeroom || "");
  if (!bossInstanceId) throw new Error("Missing bossInstanceId");
  if (!Number.isFinite(delta) || delta === 0) throw new Error("Invalid delta");

  if (requestId && idemIsDuplicate_("bossDelta", requestId)) {
    const st = bossGetState_(bossInstanceId, bossKey);
    return {
      ok: true,
      deduped: true,
      requestId,
      ...st,
      now: new Date().toISOString(),
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const state = ensureBossStateSheet_();
    const log = ensureBossLogSheet_();
    const st0 = bossGetState_(bossInstanceId, bossKey);
    const row = bossFindRow_(state, bossInstanceId);
    if (row < 2) throw new Error("Boss instance row not found after ensure");
    const maxHP = Math.max(
      1,
      Math.round(asNum_(st0.maxHP, CFG.MAX_BOSS_HP_DEFAULT))
    );
    const before = Math.max(
      0,
      Math.min(maxHP, Math.round(asNum_(st0.currentHP, maxHP)))
    );
    const after = Math.max(0, Math.min(maxHP, before + delta));
    const nowIso = new Date().toISOString();
    state.getRange(row, 4, 1, 3).setValues([[maxHP, after, nowIso]]);
    appendRowFast_(log, [
      new Date(),
      bossInstanceId,
      bossKey || st0.bossKey,
      AT,
      round || "",
      homeroom || "",
      guild || "",
      delta,
      after,
      source,
      requestId || "",
    ]);
    cacheRemove_(bossStateCacheKey_(bossInstanceId));
    if (requestId) idemMark_("bossDelta", requestId);
    return {
      ok: true,
      bossInstanceId,
      bossKey: bossKey || st0.bossKey,
      bossName: st0.bossName,
      maxHP,
      currentHP: after,
      updatedAt: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// ================================================================
// ========================= XP STORE =============================
// ================================================================
function getXpControlSheet_() {
  const primary = getSheetOptional_(CFG.XP_CONTROL_SHEET_PRIMARY);
  if (primary) return primary;
  const fallback = getSheetOptional_(CFG.XP_CONTROL_SHEET_FALLBACK);
  if (fallback) return fallback;
  throw new Error(
    `Missing control sheet. Create '${CFG.XP_CONTROL_SHEET_PRIMARY}' (preferred) or '${CFG.XP_CONTROL_SHEET_FALLBACK}'.`
  );
}

function readXpControl_() {
  const sh = getXpControlSheet_();
  const values = sh.getDataRange().getValues();
  const out = {};
  for (let r = 1; r < values.length; r++) {
    const k = norm_(values[r][0]);
    if (!k) continue;
    out[k] = values[r][1];
  }
  const storeLocked = toBool_(out.StoreLocked ?? "TRUE", true);
  const storePin = normPin_(out.StorePIN ?? "");
  const xpPerPoint = Math.max(1, Math.round(asNum_(out.XPPerPoint, 5)));
  const windowLabel = norm_(out.WindowLabel ?? "");
  const maxPointsPerOpen = Math.max(
    1,
    Math.round(asNum_(out.MaxPointsPerOpen, 999))
  );
  const openNonce = norm_(out.OpenNonce ?? "");
  return {
    storeLocked,
    storePin,
    xpPerPoint,
    windowLabel,
    maxPointsPerOpen,
    openNonce,
  };
}

function stampXpControlUpdatedAt_() {
  const sh = getXpControlSheet_();
  const values = sh.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    const k = norm_(values[r][0]);
    if (k === "UpdatedAt") {
      sh.getRange(r + 1, 2).setValue(new Date().toISOString());
      return;
    }
  }
}

function ensureXpStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.XP_STATE_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.XP_STATE_SHEET);
  return ensureHeaders_(sh, ["Name", "Homeroom", "StudentID", "Balance"]);
}

function ensureXpTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.XP_TXN_SHEET);
  if (!sh) sh = ss.insertSheet(CFG.XP_TXN_SHEET);
  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Homeroom",
    "Type",
    "XP",
    "Target",
    "Points",
    "BalanceBefore",
    "BalanceAfter",
    "Note",
    "WindowLabel",
    "OpenNonce",
    "RequestId",
  ]);
}

function loadXpIndex_() {
  const sh = ensureXpStateSheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const m = headerMap_(headers);
  const iName = idx_(m, "Name");
  const iHr = idx_(m, "Homeroom");
  const iId = idx_(m, "StudentID", "ID");
  const iBal = idx_(m, "Balance");
  if (iId < 0 || iBal < 0)
    throw new Error(
      "XP_State must include headers: Name, Homeroom, StudentID, Balance"
    );
  const index = new Map();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = normId_(row[iId]);
    if (!id) continue;
    const bal = Math.round(asNum_(row[iBal], 0));
    index.set(id, {
      sheetRow: r + 1,
      name: norm_(iName >= 0 ? row[iName] : ""),
      homeroom: norm_(iHr >= 0 ? row[iHr] : ""),
      balance: bal,
    });
  }
  return { sh, index };
}

function seedXpStateFromMaster_() {
  const ss = SpreadsheetApp.getActive();
  const master = ss.getSheetByName(CFG.STUDENTS_SHEET);
  if (!master) throw new Error(`Missing sheet: ${CFG.STUDENTS_SHEET}`);
  const xp = ensureXpStateSheet_();
  const values = master.getDataRange().getValues();
  if (values.length < 2) throw new Error("Master has no data.");
  const headers = values[0].map((h) =>
    String(h || "")
      .trim()
      .toLowerCase()
  );
  const iName = headers.indexOf("name");
  const iHr = headers.indexOf("homeroom");
  const iId = headers.indexOf("studentid");
  if (iName < 0 || iHr < 0 || iId < 0)
    throw new Error("Master must include headers: Name, Homeroom, StudentID");
  const { index } = loadXpIndex_();
  const out = [["Name", "Homeroom", "StudentID", "Balance"]];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = normId_(row[iId]);
    if (!id) continue;
    const existing = index.get(id);
    const bal = existing ? Math.round(asNum_(existing.balance, 0)) : 0;
    out.push([norm_(row[iName]), norm_(row[iHr]), id, bal]);
  }
  xp.clearContents();
  xp.getRange(1, 1, out.length, out[0].length).setValues(out);
  return { ok: true, seeded: out.length - 1 };
}

function xpSummary_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  if (!studentId) throw new Error("Missing studentId");
  const ctl = readXpControl_();
  const xpPerPoint = ctl.xpPerPoint;
  const { index } = loadXpIndex_();
  const row = index.get(studentId);
  const balance = row ? Math.round(asNum_(row.balance, 0)) : 0;
  const tx = ensureXpTxnSheet_();
  const tvals = tx.getDataRange().getValues();
  let earned = 0;
  let spent = 0;
  const recent = [];
  for (let r = tvals.length - 1; r >= 1 && recent.length < 12; r--) {
    const rid = normId_(tvals[r][1]);
    if (rid !== studentId) continue;
    const type =
      String(tvals[r][4] || "").toUpperCase() === "SPEND"
        ? "SPEND"
        : "EARN";
    const xp = Math.round(asNum_(tvals[r][5], 0));
    const target = String(tvals[r][6] || "").toUpperCase() || "";
    const ts =
      tvals[r][0] instanceof Date
        ? tvals[r][0].toISOString()
        : String(tvals[r][0] || "");
    recent.push({
      timestamp: ts,
      type,
      xp,
      target: target ? target : undefined,
      note: tvals[r][10] ? String(tvals[r][10]) : undefined,
    });
  }
  for (let r = 1; r < tvals.length; r++) {
    const rid = normId_(tvals[r][1]);
    if (rid !== studentId) continue;
    const type = String(tvals[r][4] || "").toUpperCase();
    const xp = Math.round(asNum_(tvals[r][5], 0));
    if (type === "SPEND") spent += xp;
    else earned += xp;
  }
  return {
    studentId,
    earned,
    spent,
    balance,
    spendablePoints: Math.floor(Math.max(0, balance) / xpPerPoint),
    recent,
  };
}

function xpState_() {
  const ctl = readXpControl_();
  return {
    ok: true,
    storeLocked: ctl.storeLocked,
    windowLabel: ctl.windowLabel || "",
    xpPerPoint: ctl.xpPerPoint,
    maxPointsPerOpen: ctl.maxPointsPerOpen,
    openNonce: ctl.openNonce || "",
    now: new Date().toISOString(),
    xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "",
  };
}

function spendXpWrite_(args) {
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
}

// ================================================================
// ========================= SKILL STORE ===========================
// ================================================================
const SKILL_STORE = {
  COST_PER_SKILL: 1,
  VALID_SKILLS: [
    "Acrobatics",
    "Animal Handling",
    "Arcana",
    "Athletic",
    "Deception",
    "Defensive",
    "Endurance",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Persuasion",
    "Religious",
    "Sleight of Hand",
    "Spontaneous",
    "Stealthy",
    "Survival",
    "Team Player",
  ],
};

function normalizeSkillId_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalSkillName_(skillIdOrName) {
  const wanted = normalizeSkillId_(skillIdOrName);

  const found = SKILL_STORE.VALID_SKILLS.find(
    (name) => normalizeSkillId_(name) === wanted
  );

  return found || "";
}

function skillStudentName_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);

  if (!studentId) return "";

  try {
    const students = loadStudentsMap_();
    const student = students.get(studentId);

    return student ? norm_(student.name || "") : "";
  } catch (_) {
    return "";
  }
}

function ensureSkillStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.SKILL_STATE_SHEET);

  if (!sh) {
    sh = ss.insertSheet(CFG.SKILL_STATE_SHEET);
  }

  return ensureHeaders_(sh, [
    "StudentID",
    "StudentName",
    "SkillTokens",
    "UpdatedAt",
  ]);
}

function ensurePurchasedSkillsSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.PURCHASED_SKILLS_SHEET);

  if (!sh) {
    sh = ss.insertSheet(CFG.PURCHASED_SKILLS_SHEET);
  }

  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "SkillId",
    "SkillName",
    "Cost",
    "Source",
    "RequestId",
  ]);
}

function ensureSkillTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(CFG.SKILL_TXN_SHEET);

  if (!sh) {
    sh = ss.insertSheet(CFG.SKILL_TXN_SHEET);
  }

  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Type",
    "SkillId",
    "SkillName",
    "Tokens",
    "BeforeTokens",
    "AfterTokens",
    "Source",
    "RequestId",
    "Note",
  ]);
}

function loadSkillStateIndex_() {
  const sh = ensureSkillStateSheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID");
  const iName = idx_(map, "StudentName", "Student Name", "Name");
  const iTokens = idx_(map, "SkillTokens", "Skill Tokens", "Tokens");
  const iUpdated = idx_(map, "UpdatedAt", "Updated");

  if (iId < 0) {
    throw new Error("Skill_State missing StudentID header.");
  }

  if (iTokens < 0) {
    throw new Error("Skill_State missing SkillTokens header.");
  }

  const index = new Map();

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const studentId = normId_(row[iId]);

    if (!studentId) continue;

    const fallbackName = skillStudentName_(studentId);
    const studentName = norm_(iName >= 0 ? row[iName] : "") || fallbackName;

    index.set(studentId, {
      sheetRow: r + 1,
      studentId,
      studentName,
      skillTokens: Math.max(0, Math.round(asNum_(row[iTokens], 0))),
      col: {
        StudentID: iId + 1,
        StudentName: iName >= 0 ? iName + 1 : 2,
        SkillTokens: iTokens + 1,
        UpdatedAt: iUpdated >= 0 ? iUpdated + 1 : 4,
      },
    });
  }

  return { sh, index };
}

function purchasedSkillIdsForStudent_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  const sh = ensurePurchasedSkillsSheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID");
  const iSkillId = idx_(map, "SkillId", "Skill ID");
  const iSkillName = idx_(map, "SkillName", "Skill Name");

  const ids = new Set();
  const names = [];

  if (iId < 0) {
    return { ids, names };
  }

  for (let r = 1; r < values.length; r++) {
    if (normId_(values[r][iId]) !== studentId) continue;

    const skillName = String(
      iSkillName >= 0 ? values[r][iSkillName] : ""
    ).trim();

    const skillId = normalizeSkillId_(
      iSkillId >= 0 ? values[r][iSkillId] : skillName
    );

    if (!skillId || ids.has(skillId)) continue;

    ids.add(skillId);
    names.push(skillName || canonicalSkillName_(skillId));
  }

  return { ids, names };
}

function skillSummary_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);

  if (!studentId) {
    throw new Error("Missing studentId.");
  }

  const { index } = loadSkillStateIndex_();
  const state = index.get(studentId);
  const studentName = state?.studentName || skillStudentName_(studentId);
  const purchased = purchasedSkillIdsForStudent_(studentId);

  const tx = ensureSkillTxnSheet_();
  const values = tx.getDataRange().getValues();
  const headers = values[0] || [];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID");
  const iSkillName = idx_(map, "SkillName", "Skill Name");
  const iTokens = idx_(map, "Tokens");
  const iSource = idx_(map, "Source");

  const recent = [];

  if (iId >= 0) {
    for (let r = values.length - 1; r >= 1 && recent.length < 12; r--) {
      if (normId_(values[r][iId]) !== studentId) continue;

      const ts =
        values[r][0] instanceof Date
          ? values[r][0].toISOString()
          : String(values[r][0] || "");

      recent.push({
        timestamp: ts,
        skillName: String(iSkillName >= 0 ? values[r][iSkillName] : ""),
        cost: Math.abs(
          Math.round(asNum_(iTokens >= 0 ? values[r][iTokens] : 0, 0))
        ),
        source: String(iSource >= 0 ? values[r][iSource] : ""),
      });
    }
  }

  return {
    ok: true,
    studentId,
    studentName,
    skillTokens: state ? state.skillTokens : 0,
    purchasedSkills: purchased.names,
    recent,
    now: new Date().toISOString(),
  };
}

function skillSnapshot_() {
  const sh = ensurePurchasedSkillsSheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID");
  const iName = idx_(map, "StudentName", "Student Name", "Name");
  const iSkillId = idx_(map, "SkillId", "Skill ID");
  const iSkillName = idx_(map, "SkillName", "Skill Name");

  const byStudent = new Map();

  if (iId < 0) {
    return {
      ok: true,
      purchasedSkills: [],
      now: new Date().toISOString(),
    };
  }

  for (let r = 1; r < values.length; r++) {
    const studentId = normId_(values[r][iId]);

    if (!studentId) continue;

    const studentName =
      norm_(iName >= 0 ? values[r][iName] : "") ||
      skillStudentName_(studentId);

    const skillName = String(
      iSkillName >= 0 ? values[r][iSkillName] : ""
    ).trim();

    const skillId = normalizeSkillId_(
      iSkillId >= 0 ? values[r][iSkillId] : skillName
    );

    const canonicalName = skillName || canonicalSkillName_(skillId);

    if (!skillId || !canonicalName) continue;

    const existing = byStudent.get(studentId) || {
      studentId,
      studentName,
      ids: new Set(),
      skills: [],
    };

    if (!existing.ids.has(skillId)) {
      existing.ids.add(skillId);
      existing.skills.push(canonicalName);
    }

    byStudent.set(studentId, existing);
  }

  return {
    ok: true,
    purchasedSkills: Array.from(byStudent.values()).map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName || "",
      skills: row.skills,
    })),
    now: new Date().toISOString(),
  };
}

function purchaseSkill_(args) {
  const ctl = readXpControl_();

  if (ctl.storeLocked) {
    throw new Error("Store is closed.");
  }

  if (!ctl.storePin) {
    throw new Error("Store PIN is not set.");
  }

  const pin = normPin_(args.pin || "");

  if (!pin || pin !== normPin_(ctl.storePin)) {
    throw new Error("Invalid Store PIN.");
  }

  const studentId = normId_(args.studentId);

  if (!studentId) {
    throw new Error("Missing studentId.");
  }

  const skillName = canonicalSkillName_(args.skillId || args.skillName || "");

  if (!skillName) {
    throw new Error("Invalid skill.");
  }

  const skillId = normalizeSkillId_(skillName);
  const cost = SKILL_STORE.COST_PER_SKILL;
  const requestId = norm_(args.requestId || "");

  if (requestId && idemIsDuplicate_("purchaseSkill", requestId)) {
    return {
      ok: true,
      deduped: true,
      requestId,
      summary: skillSummary_(studentId),
      now: new Date().toISOString(),
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh: stateSh, index } = loadSkillStateIndex_();
    const state = index.get(studentId);

    if (!state) {
      throw new Error("Student not found in Skill_State.");
    }

    const studentName = state.studentName || skillStudentName_(studentId);

    if (studentName) {
      stateSh
        .getRange(state.sheetRow, state.col.StudentName)
        .setValue(studentName);
    }

    const rosterSkillIds = new Set(
      adminRosterSkillsForStudent_(studentId).map((name) => normalizeSkillId_(name))
    );
    if (rosterSkillIds.has(skillId)) {
      throw new Error("Skill already owned.");
    }

    const purchased = purchasedSkillIdsForStudent_(studentId);

    if (purchased.ids.has(skillId)) {
      throw new Error("Skill already owned.");
    }

    const beforeTokens = state.skillTokens;

    if (beforeTokens < cost) {
      throw new Error("Not enough Skill Tokens.");
    }

    const afterTokens = beforeTokens - cost;
    const nowIso = new Date().toISOString();

    stateSh
      .getRange(state.sheetRow, state.col.SkillTokens, 1, 2)
      .setValues([[afterTokens, nowIso]]);

    ensurePurchasedSkillsSheet_().appendRow([
      new Date(),
      studentId,
      studentName,
      skillId,
      skillName,
      cost,
      "STORE",
      requestId,
    ]);

    ensureSkillTxnSheet_().appendRow([
      new Date(),
      studentId,
      studentName,
      "SPEND",
      skillId,
      skillName,
      -cost,
      beforeTokens,
      afterTokens,
      "STORE",
      requestId,
      "Skill purchase",
    ]);

    if (requestId) {
      idemMark_("purchaseSkill", requestId);
    }

    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      studentId,
      studentName,
      skillId,
      skillName,
      cost,
      beforeTokens,
      afterTokens,
      summary: skillSummary_(studentId),
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// ================================================================
// ========================= FINAL EXAMINER ========================
// ================================================================
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
    "RaidId",
    "ClassKey",
    "Label",
    "Homerooms",
    "StartingHP",
    "CurrentHP",
    "UpdatedAt",
  ]);
  ensureHeaders_(bossSh, [
    "RaidId",
    "BossKey",
    "BossName",
    "MaxHP",
    "CurrentHP",
    "Locked",
    "Defeated",
    "UpdatedAt",
  ]);
  ensureHeaders_(logSh, [
    "Timestamp",
    "RaidId",
    "ClassKey",
    "ClassLabel",
    "Action",
    "TargetBossKey",
    "RequestedAmount",
    "AppliedAmount",
    "OverkillLost",
    "ClassHPAfter",
    "BossHPAfter",
    "Note",
    "RequestId",
  ]);
  return { classSh, bossSh, logSh };
}

function finalExaminerActiveLeaderUnits_() {
  const sh = getSheet_("FinalExaminer_Config");
  const values = sh.getDataRange().getValues();
  if (values.length < 2)
    throw new Error(
      "FinalExaminer_Config has no class rows. Add the three Final Examiner units first."
    );
  const headers = values[0];
  const map = headerMap_(headers);
  const iClassKey = idx_(map, "ClassKey");
  const iLabel = idx_(map, "Label");
  const iHomerooms = idx_(map, "Homerooms");
  if (iClassKey < 0 || iLabel < 0 || iHomerooms < 0)
    throw new Error(
      "FinalExaminer_Config needs these headers: ClassKey, Label, Homerooms"
    );
  const units = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const classKey = norm_(row[iClassKey]);
    const label = norm_(row[iLabel]);
    const homerooms = String(row[iHomerooms] || "")
      .split(/[;,|]/)
      .map((value) => norm_(value))
      .filter(Boolean);
    if (!classKey && !label && homerooms.length === 0) continue;
    if (!classKey || !label || homerooms.length === 0)
      throw new Error(
        `FinalExaminer_Config row ${
          r + 1
        } is incomplete. Every row needs ClassKey, Label, and Homerooms.`
      );
    units.push({ classKey, label, homerooms });
  }
  if (!units.length)
    throw new Error("FinalExaminer_Config has no usable Final Examiner units.");
  return units;
}

function finalExaminerHpByHomeroom_() {
  const { index } = loadHpIndex_();
  const students = loadStudentsMap_();
  const totals = new Map();
  index.forEach((hp, studentId) => {
    const student = students.get(studentId);
    const homeroom = norm_(student && student.homeroom);
    if (!homeroom) return;
    totals.set(
      homeroom,
      (totals.get(homeroom) || 0) +
        Math.max(0, Math.round(asNum_(hp.currentHP, 0)))
    );
  });
  return totals;
}

function finalExaminerStart_(args) {
  const raidId = norm_(args && args.raidId) || FINAL_EXAMINER.RAID_ID;
  const requestId = norm_(args && args.requestId);
  if (requestId && idemIsDuplicate_("finalExaminerStart", requestId))
    return finalExaminerState_(raidId);
  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { classSh, bossSh } = ensureFinalExaminerSheets_();
    const units = finalExaminerActiveLeaderUnits_();
    if (!units.length)
      throw new Error(
        "No Final Examiner classes found. Configure FinalExaminer_Config first."
      );
    const hpByHomeroom = finalExaminerHpByHomeroom_();
    const nowIso = new Date().toISOString();
    const classRows = units.map((unit) => {
      const total = unit.homerooms.reduce(
        (sum, hr) => sum + Math.max(0, Number(hpByHomeroom.get(hr) || 0)),
        0
      );
      return [
        raidId,
        unit.classKey,
        unit.label,
        unit.homerooms.join(", "),
        total,
        total,
        nowIso,
      ];
    });
    const bossRows = FINAL_EXAMINER.BOSSES.map(
      ([key, name, hp, locked]) => [
        raidId,
        key,
        name,
        hp,
        hp,
        locked,
        false,
        nowIso,
      ]
    );
    const clearRaidRows = (sh) => {
      const values = sh.getDataRange().getValues();
      const keep = [values[0]];
      for (let i = 1; i < values.length; i++)
        if (norm_(values[i][0]) !== raidId) keep.push(values[i]);
      sh.clearContents();
      sh.getRange(1, 1, keep.length, keep[0].length).setValues(keep);
    };
    clearRaidRows(classSh);
    clearRaidRows(bossSh);
    if (classRows.length)
      classSh
        .getRange(classSh.getLastRow() + 1, 1, classRows.length, classRows[0].length)
        .setValues(classRows);
    if (bossRows.length)
      bossSh
        .getRange(bossSh.getLastRow() + 1, 1, bossRows.length, bossRows[0].length)
        .setValues(bossRows);
    if (requestId) idemMark_("finalExaminerStart", requestId);
    return { ok: true, started: true, raid: finalExaminerState_(raidId) };
  } finally {
    lock.releaseLock();
  }
}

function finalExaminerState_(raidIdRaw) {
  const raidId = norm_(raidIdRaw) || FINAL_EXAMINER.RAID_ID;
  const { classSh, bossSh, logSh } = ensureFinalExaminerSheets_();
  const classValues = classSh.getDataRange().getValues();
  const bossValues = bossSh.getDataRange().getValues();
  const logValues = logSh.getDataRange().getValues();

  const classes = classValues
    .slice(1)
    .filter((r) => norm_(r[0]) === raidId)
    .map((r) => ({
      classKey: norm_(r[1]),
      label: norm_(r[2]),
      startingHP: Math.max(0, Math.round(asNum_(r[4], 0))),
      currentHP: Math.max(0, Math.round(asNum_(r[5], 0))),
      updatedAt: String(r[6] || ""),
    }));

  const bosses = bossValues
    .slice(1)
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

  const bossNameByKey = new Map(
    bosses.map((boss) => [boss.bossKey, boss.bossName])
  );
  const events = logValues
    .slice(1)
    .filter((row) => norm_(row[1]) === raidId)
    .slice(-80)
    .reverse()
    .map((row) => {
      const targetBossKey = norm_(row[5]).toUpperCase();
      return {
        timestamp:
          row[0] instanceof Date
            ? row[0].toISOString()
            : String(row[0] || ""),
        classKey: norm_(row[2]),
        classLabel: norm_(row[3]),
        action: norm_(row[4]).toUpperCase(),
        targetBossKey,
        targetBossName: bossNameByKey.get(targetBossKey) || "",
        requestedAmount: Math.max(0, Math.round(asNum_(row[6], 0))),
        appliedAmount: Math.max(0, Math.round(asNum_(row[7], 0))),
        overkillLost: Math.max(0, Math.round(asNum_(row[8], 0))),
        classHPAfter: Math.max(0, Math.round(asNum_(row[9], 0))),
        bossHPAfter: Math.max(0, Math.round(asNum_(row[10], 0))),
      };
    });
  const latestEvent = events[0] || null;

  const minions = bosses.filter((b) => b.bossKey !== "FINAL_EXAMINER");
  const finalBoss = bosses.find((b) => b.bossKey === "FINAL_EXAMINER");
  const allMinionsDefeated =
    minions.length > 0 &&
    minions.every((b) => b.defeated || b.currentHP <= 0);
  const phase =
    finalBoss && finalBoss.defeated
      ? "VICTORY"
      : allMinionsDefeated
      ? "FINAL_EXAMINER"
      : "MINIONS";

  return {
    ok: true,
    raidId,
    active: classes.length > 0 && bosses.length > 0,
    phase,
    classes,
    bosses,
    events,
    latestEvent,
    updatedAt: new Date().toISOString(),
  };
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
  if (!["HEAL", "STRIKE", "DAMAGE"].includes(actionType))
    throw new Error("Action must be HEAL, STRIKE, or DAMAGE.");
  if (!amount) throw new Error("Amount must be greater than zero.");
  if (actionType === "STRIKE" && !targetBossKey)
    throw new Error("Choose one target boss.");
  if (requestId && idemIsDuplicate_("finalExaminerAction", requestId))
    return {
      ok: true,
      deduped: true,
      raid: finalExaminerState_(raidId),
    };

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { classSh, bossSh, logSh } = ensureFinalExaminerSheets_();
    const classes = classSh.getDataRange().getValues();
    const bosses = bossSh.getDataRange().getValues();
    const classRowIndex = classes.findIndex(
      (r, i) =>
        i > 0 && norm_(r[0]) === raidId && norm_(r[1]) === classKey
    );
    if (classRowIndex < 1)
      throw new Error("Raid class not found. Start the raid first.");
    const classRow = classes[classRowIndex];
    const classHPBefore = Math.max(0, Math.round(asNum_(classRow[5], 0)));
    let classHPAfter = classHPBefore;
    let bossHPAfter = "";
    let appliedAmount = 0;
    let overkillLost = 0;
    const nowIso = new Date().toISOString();

    if (actionType === "HEAL") {
      classHPAfter = classHPBefore + amount;
      appliedAmount = amount;
      classSh
        .getRange(classRowIndex + 1, 6, 1, 2)
        .setValues([[classHPAfter, nowIso]]);
    } else if (actionType === "DAMAGE") {
      appliedAmount = Math.min(amount, classHPBefore);
      overkillLost = Math.max(0, amount - appliedAmount);
      classHPAfter = Math.max(0, classHPBefore - appliedAmount);
      classSh
        .getRange(classRowIndex + 1, 6, 1, 2)
        .setValues([[classHPAfter, nowIso]]);
    } else {
      const bossRowIndex = bosses.findIndex(
        (r, i) =>
          i > 0 &&
          norm_(r[0]) === raidId &&
          norm_(r[1]) === targetBossKey
      );
      if (bossRowIndex < 1) throw new Error("Target boss not found.");
      const bossRow = bosses[bossRowIndex];
      const locked = toBool_(bossRow[5], false);
      const defeated =
        toBool_(bossRow[6], false) || Math.max(0, asNum_(bossRow[4], 0)) <= 0;
      if (locked) throw new Error("That boss is still locked.");
      if (defeated) throw new Error("That boss has already been defeated.");
      const bossBefore = Math.max(0, Math.round(asNum_(bossRow[4], 0)));
      appliedAmount = Math.min(amount, bossBefore);
      overkillLost = Math.max(0, amount - appliedAmount);
      bossHPAfter = Math.max(0, bossBefore - appliedAmount);
      bossSh
        .getRange(bossRowIndex + 1, 5, 1, 4)
        .setValues([[bossHPAfter, false, bossHPAfter <= 0, nowIso]]);

      const freshBosses = bossSh.getDataRange().getValues();
      const minionRows = freshBosses
        .slice(1)
        .filter(
          (r) =>
            norm_(r[0]) === raidId && norm_(r[1]) !== "FINAL_EXAMINER"
        );
      const allMinionsDefeated =
        minionRows.length > 0 &&
        minionRows.every(
          (r) =>
            toBool_(r[6], false) || Math.max(0, asNum_(r[4], 0)) <= 0
        );
      if (allMinionsDefeated) {
        const finalIndex = freshBosses.findIndex(
          (r, i) =>
            i > 0 &&
            norm_(r[0]) === raidId &&
            norm_(r[1]) === "FINAL_EXAMINER"
        );
        if (finalIndex > 0)
          bossSh
            .getRange(finalIndex + 1, 6, 1, 3)
            .setValues([
              [
                false,
                toBool_(freshBosses[finalIndex][6], false),
                nowIso,
              ],
            ]);
      }
    }

    logSh.appendRow([
      new Date(),
      raidId,
      classKey,
      norm_(classRow[2]),
      actionType,
      targetBossKey,
      amount,
      appliedAmount,
      overkillLost,
      classHPAfter,
      bossHPAfter,
      note,
      requestId,
    ]);
    if (requestId) idemMark_("finalExaminerAction", requestId);
    return {
      ok: true,
      appliedAmount,
      overkillLost,
      classHPAfter,
      bossHPAfter,
      raid: finalExaminerState_(raidId),
    };
  } finally {
    lock.releaseLock();
  }
}

// =========================================================
// Regular Battle Teacher Console Actions
// =========================================================
const TEACHER_AUTH = {
  PASSCODE_PROP: "LL_TEACHER_PASSCODE",
  TOKEN_PREFIX: "teacherToken:v1:",
  TOKEN_TTL_SECONDS: 60 * 60 * 12,
};

function teacherPasscode_() {
  return (
    PropertiesService.getScriptProperties().getProperty(
      TEACHER_AUTH.PASSCODE_PROP
    ) || "legends"
  );
}

function makeTeacherToken_() {
  return `teacher:${Date.now()}:${Utilities.getUuid()}`;
}

function teacherTokenKey_(token) {
  return `${TEACHER_AUTH.TOKEN_PREFIX}${String(token || "")}`;
}

function verifyTeacher_(args) {
  const token = norm_(args.teacherToken || "");
  const passcode = norm_(args.passcode || "");

  if (token) {
    const cached = CacheService.getScriptCache().get(teacherTokenKey_(token));
    if (cached === "1") return { ok: true, token };
  }

  if (passcode && passcode === teacherPasscode_()) {
    const nextToken = makeTeacherToken_();
    CacheService.getScriptCache().put(
      teacherTokenKey_(nextToken),
      "1",
      TEACHER_AUTH.TOKEN_TTL_SECONDS
    );
    return { ok: true, token: nextToken };
  }

  throw new Error("Teacher authorization failed.");
}

function clearBattleControlCache_() {
  cacheRemove_("battleControl:v1");
}

function regularBattleTeacherLogin_(args) {
  const verified = verifyTeacher_(args || {});
  return {
    ok: true,
    teacherToken: verified.token,
    expiresInSeconds: TEACHER_AUTH.TOKEN_TTL_SECONDS,
    now: new Date().toISOString(),
  };
}

function findBattleControlRowByHomeroom_(rows, homeroom) {
  const clean = norm_(homeroom);
  return rows.find((row) => norm_(row.homeroom) === clean) || null;
}

function clearRegularBattleRowValues_(rowValues, map) {
  rowValues[map["status"]] = "INACTIVE";
  rowValues[map["quest"]] = "";
  rowValues[map["round"]] = 1;
  rowValues[map["turn"]] = "BOSS";
  rowValues[map["pairto"]] = "";
  rowValues[map["leaderhomeroom"]] = "";
  rowValues[map["activebattlesessionid"]] = "";
  rowValues[map["bosskey"]] = "";
  rowValues[map["bossinstanceid"]] = "";
  rowValues[map["currentstatesummary"]] = "Inactive";
  rowValues[map["lastupdated"]] = new Date().toISOString();
}

function regularBattleTeacherSetBossHp_(bossInstanceId, bossHP) {
  const hp = Math.max(1, Math.floor(asNum_(bossHP, 0)));
  if (!bossInstanceId || !hp) return null;

  const sh = getSheet_(CFG.BOSS_STATE_SHEET);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return null;

  const headers = values[0].map((h) => String(h).trim().toLowerCase());
  const bossInstanceCol = headers.indexOf("bossinstanceid");
  const maxHpCol = headers.indexOf("maxhp");
  const currentHpCol = headers.indexOf("currenthp");
  const updatedAtCol = headers.indexOf("updatedat");

  if (bossInstanceCol < 0 || maxHpCol < 0 || currentHpCol < 0) {
    throw new Error(
      "Boss_State is missing bossInstanceId, maxHP, or currentHP columns."
    );
  }

  for (let r = 1; r < values.length; r++) {
    if (norm_(values[r][bossInstanceCol]) === norm_(bossInstanceId)) {
      sh.getRange(r + 1, maxHpCol + 1).setValue(hp);
      sh.getRange(r + 1, currentHpCol + 1).setValue(hp);

      if (updatedAtCol >= 0) {
        sh.getRange(r + 1, updatedAtCol + 1).setValue(new Date().toISOString());
      }

      cacheRemove_(bossStateCacheKey_(bossInstanceId));

      return {
        ok: true,
        bossInstanceId,
        maxHP: hp,
        currentHP: hp,
      };
    }
  }

  return null;
}

function regularBattleTeacherStart_(args) {
  const verified = verifyTeacher_(args || {});

  const leaderHomeroom = norm_(args.homeroom || args.leaderHomeroom || "");
  const pairTo = norm_(args.pairTo || "");
  const quest = norm_(args.quest || "");
  const initialTurn = norm_(args.turn || "GUILD").toUpperCase();
  const customBossHP = Math.max(0, Math.floor(asNum_(args.bossHP, 0)));

  if (!leaderHomeroom) throw new Error("Missing homeroom.");
  if (!quest) throw new Error("Missing quest.");
  if (pairTo && pairTo === leaderHomeroom) {
    throw new Error("Pair class must be different from the leader class.");
  }
  if (!["BOSS", "GUILD"].includes(initialTurn)) {
    throw new Error("Turn must be BOSS or GUILD.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, rows } = battleControlRows_();
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();
    const nowIso = new Date().toISOString();

    const leader = findBattleControlRowByHomeroom_(rows, leaderHomeroom);
    if (!leader) {
      throw new Error(`Homeroom not found in Battle_Control: ${leaderHomeroom}`);
    }

    const follower = pairTo
      ? findBattleControlRowByHomeroom_(rows, pairTo)
      : null;
    if (pairTo && !follower) {
      throw new Error(`Paired homeroom not found in Battle_Control: ${pairTo}`);
    }

    rows.forEach((row, index) => {
      const belongsToOldGroup =
        norm_(row.homeroom) === leaderHomeroom ||
        norm_(row.homeroom) === pairTo ||
        norm_(row.pairTo) === leaderHomeroom ||
        norm_(row.leaderHomeroom) === leaderHomeroom;

      if (belongsToOldGroup) {
        clearRegularBattleRowValues_(vals[index], map);
      }
    });

    const leaderIndex = leader.sheetRow - 2;
    vals[leaderIndex][map["homeroom"]] = leaderHomeroom;
    vals[leaderIndex][map["status"]] = "ACTIVE";
    vals[leaderIndex][map["quest"]] = quest;
    vals[leaderIndex][map["round"]] = 1;
    vals[leaderIndex][map["turn"]] = initialTurn;
    vals[leaderIndex][map["pairto"]] = "";
    vals[leaderIndex][map["leaderhomeroom"]] = leaderHomeroom;
    vals[leaderIndex][map["lastupdated"]] = nowIso;

    if (pairTo && follower) {
      const followerIndex = follower.sheetRow - 2;
      vals[followerIndex][map["homeroom"]] = pairTo;
      vals[followerIndex][map["status"]] = "ACTIVE";
      vals[followerIndex][map["quest"]] = quest;
      vals[followerIndex][map["round"]] = 1;
      vals[followerIndex][map["turn"]] = initialTurn;
      vals[followerIndex][map["pairto"]] = leaderHomeroom;
      vals[followerIndex][map["leaderhomeroom"]] = leaderHomeroom;
      vals[followerIndex][map["lastupdated"]] = nowIso;
    }

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    syncBossStateFromBattleControl_();

    let bossHpResult = null;

    if (customBossHP > 0) {
      const refreshed = battleControlRows_();

      refreshed.rows.forEach((row) => {
        const isStartedLeader =
          norm_(row.leaderHomeroom) === leaderHomeroom &&
          norm_(row.homeroom) === leaderHomeroom;

        if (isStartedLeader && row.bossInstanceId) {
          bossHpResult = regularBattleTeacherSetBossHp_(
            row.bossInstanceId,
            customBossHP
          );
        }
      });
    }

    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      started: true,
      bossHP: customBossHP || "",
      bossHpResult,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleFindRowsBySession_(sessionIdRaw) {
  const sessionId = norm_(sessionIdRaw || "");
  if (!sessionId) throw new Error("Missing battle session.");

  const data = battleControlRows_();
  const matches = data.rows.filter((row) => {
    return (
      norm_(row.activeBattleSessionId) === sessionId ||
      norm_(row.bossInstanceId) === sessionId
    );
  });

  if (!matches.length) {
    throw new Error(`No Battle_Control rows found for session: ${sessionId}`);
  }

  return { ...data, matches };
}

function regularBattleTeacherAdvance_(args) {
  const verified = verifyTeacher_(args || {});
  const sessionId = norm_(args.sessionId || args.activeBattleSessionId || "");
  const nextTurn = norm_(args.turn || "GUILD").toUpperCase();

  if (!["BOSS", "GUILD"].includes(nextTurn)) {
    throw new Error("Turn must be BOSS or GUILD.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, matches } = regularBattleFindRowsBySession_(sessionId);
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();

    const leader =
      matches.find(
        (row) => norm_(row.leaderHomeroom) === norm_(row.homeroom)
      ) || matches[0];

    const nextRound = Math.max(1, Math.floor(asNum_(leader.round, 1))) + 1;
    const nowIso = new Date().toISOString();

    matches.forEach((row) => {
      const i = row.sheetRow - 2;
      vals[i][map["round"]] = nextRound;
      vals[i][map["turn"]] = nextTurn;
      vals[i][map["lastupdated"]] = nowIso;
    });

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      advanced: true,
      round: nextRound,
      turn: nextTurn,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleTeacherSetTurn_(args) {
  const verified = verifyTeacher_(args || {});
  const sessionId = norm_(args.sessionId || args.activeBattleSessionId || "");
  const turn = norm_(args.turn || "").toUpperCase();

  if (!["BOSS", "GUILD"].includes(turn)) {
    throw new Error("Turn must be BOSS or GUILD.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, matches } = regularBattleFindRowsBySession_(sessionId);
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();
    const nowIso = new Date().toISOString();

    matches.forEach((row) => {
      const i = row.sheetRow - 2;
      vals[i][map["turn"]] = turn;
      vals[i][map["lastupdated"]] = nowIso;
    });

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      turn,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleTeacherPause_(args) {
  const verified = verifyTeacher_(args || {});
  const sessionId = norm_(args.sessionId || args.activeBattleSessionId || "");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, matches } = regularBattleFindRowsBySession_(sessionId);
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();
    const nowIso = new Date().toISOString();

    matches.forEach((row) => {
      const i = row.sheetRow - 2;
      vals[i][map["status"]] = "PAUSED";
      vals[i][map["currentstatesummary"]] = "Paused by teacher";
      vals[i][map["lastupdated"]] = nowIso;
    });

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      paused: true,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleTeacherResume_(args) {
  const verified = verifyTeacher_(args || {});
  const sessionId = norm_(args.sessionId || args.activeBattleSessionId || "");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, matches } = regularBattleFindRowsBySession_(sessionId);
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();
    const nowIso = new Date().toISOString();

    matches.forEach((row) => {
      const i = row.sheetRow - 2;
      vals[i][map["status"]] = "ACTIVE";
      vals[i][map["lastupdated"]] = nowIso;
    });

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    syncBossStateFromBattleControl_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      resumed: true,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleTeacherEnd_(args) {
  const verified = verifyTeacher_(args || {});
  const sessionId = norm_(args.sessionId || args.activeBattleSessionId || "");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh, map, matches } = regularBattleFindRowsBySession_(sessionId);
    const vals = sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).getValues();

    matches.forEach((row) => {
      const i = row.sheetRow - 2;
      clearRegularBattleRowValues_(vals[i], map);
    });

    sh.getRange(2, 1, BATTLE_UI.MAX_ROWS, 12).setValues(vals);

    syncBattleControlDerivedFields_();
    syncBossStateFromBattleControl_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      ended: true,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function regularBattleTeacherSync_(args) {
  const verified = verifyTeacher_(args || {});

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const derived = syncBattleControlDerivedFields_();
    const bosses = syncBossStateFromBattleControl_();
    clearBattleControlCache_();

    return {
      ok: true,
      teacherToken: verified.token,
      derived,
      bosses,
      battle: battleControlGet_(),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// =========================================================
// Global Teacher Admin: Student Import + Guild Manager
// =========================================================
const ADMIN_GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
];

// These match the ranges currently rolled into Master!A2.
const ADMIN_CLASS_MAX_ROW = {
  "8-1": 49,
  "8-2": 50,
  "8-3": 51,
  "8-4": 50,
  "8-5": 50,
  "8-6": 50,
  "8-7": 50,
  "8-8": 50,
  "8-9": 50,
  "8-10": 50,
};

function adminRosterName_(first, last) {
  const f = norm_(first || "");
  const l = norm_(last || "");

  if (l && f) return `${l}, ${f}`;
  return l || f || "";
}

function adminDisplayName_(first, last) {
  return [norm_(first || ""), norm_(last || "")]
    .filter(Boolean)
    .join(" ");
}

function adminClassSheet_(homeroomRaw) {
  const homeroom = norm_(homeroomRaw || "");

  if (!homeroom) {
    throw new Error("Missing homeroom.");
  }

  if (!ADMIN_CLASS_MAX_ROW[homeroom]) {
    throw new Error(`Unsupported homeroom: ${homeroom}`);
  }

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(homeroom);

  if (!sh) {
    throw new Error(`Missing class sheet: ${homeroom}`);
  }

  return sh;
}

function adminHeaderMapForSheet_(sh) {
  const lastCol = Math.max(sh.getLastColumn() || 1, 1);
  const headers = sh
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((h) => String(h || "").trim());

  return {
    headers,
    map: headerMap_(headers),
  };
}

function adminFindFirstEmptyRosterRow_(sh, homeroom, nameCol) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];

  if (!maxRow || maxRow < 2) {
    throw new Error(`No configured roster capacity for ${homeroom}.`);
  }

  const values = sh
    .getRange(2, nameCol, maxRow - 1, 1)
    .getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (!norm_(values[i][0])) {
      return i + 2;
    }
  }

  throw new Error(`${homeroom} has no empty roster rows left.`);
}

function adminGeneratedIdForClassRow_(homeroom, rowNumber) {
  return `${homeroom}-${String(Math.max(1, rowNumber - 1)).padStart(3, "0")}`;
}

function adminExistingRosterNameSet_(sh, homeroom, nameCol) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];
  const values = sh
    .getRange(2, nameCol, maxRow - 1, 1)
    .getDisplayValues();

  const out = new Set();

  values.forEach((row) => {
    const name = norm_(row[0]).toLowerCase();
    if (name) out.add(name);
  });

  return out;
}

function adminClearReusableRosterRow_(sh, rowNumber) {
  // Preserve columns B/C because they are ARRAYFORMULA outputs.
  sh.getRange(rowNumber, 1).clearContent();

  const lastCol = Math.max(sh.getLastColumn(), 4);
  if (lastCol >= 4) {
    sh.getRange(rowNumber, 4, 1, lastCol - 3).clearContent();
  }
}

function adminEnsureHpStudent_(student) {
  const sh = ensureHpStateSheet_();
  const existingRow = findRowByIdInCol_(sh, 1, student.studentId);

  if (existingRow >= 2) {
    const { col } = hpHeaderIdx_();
    sh.getRange(existingRow, col.Name).setValue(student.rosterName);
    sh.getRange(existingRow, col.Homeroom).setValue(student.homeroom);
    sh.getRange(existingRow, col.Guild).setValue(student.guild || "");
    return;
  }

  appendRowFast_(sh, [
    student.studentId,
    student.rosterName,
    student.homeroom,
    student.guild || "",
    CFG.MAX_HP_DEFAULT,
    CFG.MAX_HP_DEFAULT,
    new Date().toISOString(),
    0,
  ]);
}

function adminEnsureXpStudent_(student) {
  const sh = ensureXpStateSheet_();
  const values = sh.getDataRange().getValues();
  const map = headerMap_(values[0] || []);
  const iId = idx_(map, "StudentID", "ID");

  if (iId < 0) {
    throw new Error("XP_State is missing StudentID.");
  }

  const existingRow = findRowByIdInCol_(sh, iId + 1, student.studentId);

  if (existingRow >= 2) {
    const iName = idx_(map, "Name");
    const iHr = idx_(map, "Homeroom");

    if (iName >= 0) {
      sh.getRange(existingRow, iName + 1).setValue(student.rosterName);
    }

    if (iHr >= 0) {
      sh.getRange(existingRow, iHr + 1).setValue(student.homeroom);
    }

    return;
  }

  appendRowFast_(sh, [
    student.rosterName,
    student.homeroom,
    student.studentId,
    0,
  ]);
}

function adminEnsureSkillStudent_(student) {
  const sh = ensureSkillStateSheet_();
  const existingRow = findRowByIdInCol_(sh, 1, student.studentId);
  const nowIso = new Date().toISOString();

  if (existingRow >= 2) {
    sh.getRange(existingRow, 2).setValue(student.rosterName);
    return;
  }

  appendRowFast_(sh, [
    student.studentId,
    student.rosterName,
    0,
    nowIso,
  ]);
}

function adminSeedStudentState_(student) {
  adminEnsureHpStudent_(student);
  adminEnsureXpStudent_(student);
  adminEnsureSkillStudent_(student);
}

function adminFindFirstUnreservedRosterRow_(
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
}

function adminResolveClassRowForStudentId_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);

  if (!studentId) {
    throw new Error("Missing studentId.");
  }

  const parts = studentId.match(/^(8-\d+)-(\d+)$/);

  if (!parts) {
    throw new Error(`Invalid generated student ID: ${studentId}`);
  }

  const homeroom = parts[1];
  const rowNumber = Number(parts[2]) + 1;
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];

  if (!maxRow || rowNumber < 2 || rowNumber > maxRow) {
    throw new Error(
      `Student ID is outside the ${homeroom} roster range: ${studentId}`
    );
  }

  const sh = adminClassSheet_(homeroom);
  const { map } = adminHeaderMapForSheet_(sh);
  const iName = idx_(map, "Name", "StudentName", "Student Name");

  if (iName < 0) {
    throw new Error(`${homeroom} is missing a Name column.`);
  }

  const currentName = norm_(sh.getRange(rowNumber, iName + 1).getValue());

  if (!currentName) {
    throw new Error(`No student currently exists at ${studentId}.`);
  }

  return {
    sh,
    map,
    homeroom,
    rowNumber,
    studentId,
    currentName,
  };
}

function adminAssignGuildBatch_(args) {
  const verified = verifyTeacher_(args || {});
  const studentIds = Array.isArray(args.studentIds)
    ? args.studentIds.map(normId_).filter(Boolean)
    : [];
  const guild = norm_(args.guild || "");

  if (!studentIds.length) {
    throw new Error("No students selected.");
  }

  if (guild && ADMIN_GUILDS.indexOf(guild) === -1) {
    throw new Error(`Invalid guild: ${guild}`);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const nowIso = new Date().toISOString();
    const hp = loadHpIndex_();
    let updated = 0;

    studentIds.forEach((studentId) => {
      const resolved = adminResolveClassRowForStudentId_(studentId);
      const iGuild = idx_(resolved.map, "Guild");

      if (iGuild < 0) {
        throw new Error(`${resolved.homeroom} is missing a Guild column.`);
      }

      resolved.sh
        .getRange(resolved.rowNumber, iGuild + 1)
        .setValue(guild || "");

      const hpRow = hp.index.get(studentId);

      if (hpRow) {
        hp.sh.getRange(hpRow.sheetRow, hp.col.Guild).setValue(guild || "");
      }

      updated++;
    });

    SpreadsheetApp.flush();

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");

    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      updated,
      guild: guild || "",
      studentIds,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// =========================================================
// Global Teacher Admin: Currency Manager
// =========================================================
function adminCurrencySnapshot_(args) {
  const verified = verifyTeacher_(args || {});
  const students = loadStudentsMap_();
  const { index: xpIndex } = loadXpIndex_();
  const { index: skillIndex } = loadSkillStateIndex_();
  const rows = [];

  students.forEach((student, studentId) => {
    const xp = xpIndex.get(studentId);
    const skill = skillIndex.get(studentId);

    rows.push({
      studentId,
      xp: xp ? Math.max(0, Math.round(asNum_(xp.balance, 0))) : 0,
      skillTokens: skill
        ? Math.max(0, Math.round(asNum_(skill.skillTokens, 0)))
        : 0,
    });
  });

  rows.sort((a, b) =>
    String(a.studentId).localeCompare(String(b.studentId), "en", {
      numeric: true,
    })
  );

  return {
    ok: true,
    teacherToken: verified.token,
    rows,
    now: new Date().toISOString(),
  };
}

function adminEnsureCurrencyStateRows_(studentIds, studentsMap) {
  const xpSh = ensureXpStateSheet_();
  const skillSh = ensureSkillStateSheet_();
  let xp = loadXpIndex_();
  let skill = loadSkillStateIndex_();
  let xpChanged = false;
  let skillChanged = false;
  const nowIso = new Date().toISOString();

  studentIds.forEach((studentId) => {
    const student = studentsMap.get(studentId);

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    if (!xp.index.get(studentId)) {
      appendRowFast_(xpSh, [
        student.name || "",
        student.homeroom || "",
        studentId,
        0,
      ]);
      xpChanged = true;
    }

    if (!skill.index.get(studentId)) {
      appendRowFast_(skillSh, [
        studentId,
        student.name || "",
        0,
        nowIso,
      ]);
      skillChanged = true;
    }
  });

  if (xpChanged) {
    xp = loadXpIndex_();
  }

  if (skillChanged) {
    skill = loadSkillStateIndex_();
  }

  return {
    xp,
    skill,
  };
}

function adminAdjustCurrency_(args) {
  const verified = verifyTeacher_(args || {});
  const studentIds = Array.isArray(args.studentIds)
    ? Array.from(new Set(args.studentIds.map(normId_).filter(Boolean)))
    : [];
  const currency = norm_(args.currency || "").toUpperCase();
  const mode = norm_(args.mode || "").toUpperCase();
  const amount = Math.max(0, Math.floor(asNum_(args.amount, 0)));
  const reason = norm_(args.reason || "");

  if (!studentIds.length) {
    throw new Error("No students selected.");
  }

  if (!["XP", "SKILL_TOKENS"].includes(currency)) {
    throw new Error("Currency must be XP or SKILL_TOKENS.");
  }

  if (!["ADD", "REMOVE"].includes(mode)) {
    throw new Error("Mode must be ADD or REMOVE.");
  }

  if (!amount || amount < 1) {
    throw new Error("Amount must be at least 1.");
  }

  if (!reason) {
    throw new Error("A reason is required for teacher currency adjustments.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const students = loadStudentsMap_();
    const state = adminEnsureCurrencyStateRows_(studentIds, students);
    const plans = [];

    studentIds.forEach((studentId) => {
      const student = students.get(studentId);

      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      if (currency === "XP") {
        const row = state.xp.index.get(studentId);

        if (!row) {
          throw new Error(`XP state missing after seed: ${studentId}`);
        }

        const before = Math.max(0, Math.round(asNum_(row.balance, 0)));

        if (mode === "REMOVE" && before < amount) {
          throw new Error(`${student.name || studentId} only has ${before} XP.`);
        }

        plans.push({
          studentId,
          student,
          stateRow: row,
          before,
          after: mode === "ADD" ? before + amount : before - amount,
        });

        return;
      }

      const row = state.skill.index.get(studentId);

      if (!row) {
        throw new Error(`Skill Token state missing after seed: ${studentId}`);
      }

      const before = Math.max(0, Math.round(asNum_(row.skillTokens, 0)));

      if (mode === "REMOVE" && before < amount) {
        throw new Error(
          `${student.name || studentId} only has ${before} Skill Tokens.`
        );
      }

      plans.push({
        studentId,
        student,
        stateRow: row,
        before,
        after: mode === "ADD" ? before + amount : before - amount,
      });
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const results = [];

    if (currency === "XP") {
      const txn = ensureXpTxnSheet_();
      const txnRows = [];

      plans.forEach((plan) => {
        state.xp.sh.getRange(plan.stateRow.sheetRow, 4).setValue(plan.after);

        txnRows.push([
          now,
          plan.studentId,
          plan.student.name || "",
          plan.student.homeroom || "",
          mode === "ADD" ? "EARN" : "SPEND",
          amount,
          "ADMIN",
          0,
          plan.before,
          plan.after,
          reason,
          "Teacher Admin",
          "",
          "",
        ]);

        results.push({
          studentId: plan.studentId,
          studentName: plan.student.name || "",
          before: plan.before,
          after: plan.after,
        });
      });

      if (txnRows.length) {
        txn
          .getRange(
            txn.getLastRow() + 1,
            1,
            txnRows.length,
            txnRows[0].length
          )
          .setValues(txnRows);
      }
    } else {
      const txn = ensureSkillTxnSheet_();
      const txnRows = [];
      const signedAmount = mode === "ADD" ? amount : -amount;

      plans.forEach((plan) => {
        state.skill.sh
          .getRange(plan.stateRow.sheetRow, plan.stateRow.col.SkillTokens)
          .setValue(plan.after);

        state.skill.sh
          .getRange(plan.stateRow.sheetRow, plan.stateRow.col.UpdatedAt)
          .setValue(nowIso);

        txnRows.push([
          now,
          plan.studentId,
          plan.student.name || "",
          mode === "ADD" ? "EARN" : "SPEND",
          "",
          "",
          signedAmount,
          plan.before,
          plan.after,
          "ADMIN",
          "",
          reason,
        ]);

        results.push({
          studentId: plan.studentId,
          studentName: plan.student.name || "",
          before: plan.before,
          after: plan.after,
        });
      });

      if (txnRows.length) {
        txn
          .getRange(
            txn.getLastRow() + 1,
            1,
            txnRows.length,
            txnRows[0].length
          )
          .setValues(txnRows);
      }
    }

    SpreadsheetApp.flush();
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      teacherToken: verified.token,
      updated: results.length,
      currency,
      mode,
      amount,
      reason,
      results,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

// =========================================================
// Global Teacher Admin: StudentID-keyed Player State
// =========================================================
const ADMIN_PLAYER_STATE = {
  SHEET: "Player_State",
  INVENTORY_TXN_SHEET: "Inventory_Transactions",
  ROSTER_TXN_SHEET: "Roster_Transactions",
};

function ensurePlayerStateSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_PLAYER_STATE.SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_PLAYER_STATE.SHEET);

  sh = ensureHeaders_(sh, [
    "StudentID",
    "CompanionURL",
    "Inventory",
    "STR_Bonus",
    "DEX_Bonus",
    "CON_Bonus",
    "INT_Bonus",
    "WIS_Bonus",
    "CHA_Bonus",
    "CompanionStatus",
    "RosterStatus",
    "ArchivedAt",
    "UpdatedAt",
  ]);

  // CRITICAL: IDs such as 8-1-001 look like dates to Google Sheets.
  // Force the entire StudentID data column to plain text before every write.
  const dataRows = Math.max(1, sh.getMaxRows() - 1);
  sh.getRange(2, 1, dataRows, 1).setNumberFormat("@");

  return sh;
}

function ensureInventoryTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_PLAYER_STATE.INVENTORY_TXN_SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_PLAYER_STATE.INVENTORY_TXN_SHEET);

  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Type",
    "CardKey",
    "CardName",
    "Quantity",
    "BeforeInventory",
    "AfterInventory",
    "Source",
    "Note",
  ]);
}

function ensureRosterTxnSheet_() {
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

function splitPlayerInventory_(raw) {
  if (Array.isArray(raw)) {
    return raw.map((x) => norm_(x)).filter(Boolean);
  }

  const text = norm_(raw || "");
  if (!text) return [];

  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((x) => norm_(x)).filter(Boolean);
      }
    } catch (_) {}
  }

  return text
    .split(/[;,|\n\r]/g)
    .map((x) => norm_(x))
    .filter(Boolean);
}

function joinPlayerInventory_(items) {
  return (items || []).map((x) => norm_(x)).filter(Boolean).join(", ");
}

function loadPlayerStateIndex_() {
  const sh = ensurePlayerStateSheet_();
  const values = sh.getDataRange().getValues();
  const headers = values[0] || [];
  const map = headerMap_(headers);

  const iId = idx_(map, "StudentID", "ID");
  const iCompanion = idx_(map, "CompanionURL", "Companion URL");
  const iInventory = idx_(map, "Inventory");
  const iStr = idx_(map, "STR_Bonus", "STR Bonus");
  const iDex = idx_(map, "DEX_Bonus", "DEX Bonus");
  const iCon = idx_(map, "CON_Bonus", "CON Bonus");
  const iInt = idx_(map, "INT_Bonus", "INT Bonus");
  const iWis = idx_(map, "WIS_Bonus", "WIS Bonus");
  const iCha = idx_(map, "CHA_Bonus", "CHA Bonus");
  const iCompanionStatus = idx_(map, "CompanionStatus", "Companion Status");
  const iRosterStatus = idx_(map, "RosterStatus", "Roster Status");
  const iArchivedAt = idx_(map, "ArchivedAt", "Archived At");
  const iUpdatedAt = idx_(map, "UpdatedAt", "Updated At");

  if (iId < 0) throw new Error("Player_State missing StudentID header.");

  const index = new Map();

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const studentId = normId_(row[iId]);
    if (!studentId) continue;

    index.set(studentId, {
      sheetRow: r + 1,
      studentId,
      companionUrl: norm_(iCompanion >= 0 ? row[iCompanion] : ""),
      inventory: splitPlayerInventory_(iInventory >= 0 ? row[iInventory] : ""),
      strBonus: Math.round(asNum_(iStr >= 0 ? row[iStr] : 0, 0)),
      dexBonus: Math.round(asNum_(iDex >= 0 ? row[iDex] : 0, 0)),
      conBonus: Math.round(asNum_(iCon >= 0 ? row[iCon] : 0, 0)),
      intBonus: Math.round(asNum_(iInt >= 0 ? row[iInt] : 0, 0)),
      wisBonus: Math.round(asNum_(iWis >= 0 ? row[iWis] : 0, 0)),
      chaBonus: Math.round(asNum_(iCha >= 0 ? row[iCha] : 0, 0)),
      companionStatus: norm_(iCompanionStatus >= 0 ? row[iCompanionStatus] : ""),
      rosterStatus: norm_(iRosterStatus >= 0 ? row[iRosterStatus] : "ACTIVE").toUpperCase() || "ACTIVE",
      archivedAt: norm_(iArchivedAt >= 0 ? row[iArchivedAt] : ""),
      updatedAt: norm_(iUpdatedAt >= 0 ? row[iUpdatedAt] : ""),
      col: {
        StudentID: iId + 1,
        CompanionURL: iCompanion + 1,
        Inventory: iInventory + 1,
        STR_Bonus: iStr + 1,
        DEX_Bonus: iDex + 1,
        CON_Bonus: iCon + 1,
        INT_Bonus: iInt + 1,
        WIS_Bonus: iWis + 1,
        CHA_Bonus: iCha + 1,
        CompanionStatus: iCompanionStatus + 1,
        RosterStatus: iRosterStatus + 1,
        ArchivedAt: iArchivedAt + 1,
        UpdatedAt: iUpdatedAt + 1,
      },
    });
  }

  return { sh, index };
}

function playerStateReservedIds_() {
  const { index } = loadPlayerStateIndex_();
  return Array.from(index.keys()).sort((a, b) =>
    String(a).localeCompare(String(b), "en", { numeric: true })
  );
}

function masterPlayerStateLookupWired_() {
  const master = getSheet_(CFG.STUDENTS_SHEET);
  if (master.getMaxRows() < 2 || master.getMaxColumns() < 21) return false;

  const formulas = master.getRange(2, 13, 1, 9).getFormulas()[0];
  return formulas.every((formula) =>
    String(formula || "").toLowerCase().includes("player_state")
  );
}

function installMasterPlayerStateLookups_() {
  const master = getSheet_(CFG.STUDENTS_SHEET);
  const maxRows = Math.max(master.getMaxRows(), 2);

  master.getRange(2, 13, maxRows - 1, 9).clearContent();

  const formulas = [];
  for (let lookupColumn = 2; lookupColumn <= 10; lookupColumn++) {
    formulas.push(
      `=ARRAYFORMULA(IF(C2:C="","",IFNA(VLOOKUP(C2:C,Player_State!A:J,${lookupColumn},FALSE),"")))`
    );
  }

  master.getRange(2, 13, 1, 9).setFormulas([formulas]);
  SpreadsheetApp.flush();

  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Master Player_State lookup formulas did not install correctly.");
  }
}

function backupMasterBeforePlayerStateMigration_() {
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
}

function playerStateIdIntegrity_() {
  const master = getSheet_(CFG.STUDENTS_SHEET);
  const masterHeaders = master
    .getRange(1, 1, 1, Math.max(master.getLastColumn(), 3))
    .getDisplayValues()[0];
  const masterMap = headerMap_(masterHeaders);
  const masterIdIndex = idx_(masterMap, "StudentID", "ID");
  if (masterIdIndex < 0) throw new Error("Master missing StudentID column.");

  const masterRowCount = Math.max(0, master.getLastRow() - 1);
  const activeIds = masterRowCount
    ? master
        .getRange(2, masterIdIndex + 1, masterRowCount, 1)
        .getDisplayValues()
        .map((row) => normId_(row[0]))
        .filter(Boolean)
    : [];

  const state = ensurePlayerStateSheet_();
  const stateRowCount = Math.max(0, state.getLastRow() - 1);
  const stateIds = stateRowCount
    ? state
        .getRange(2, 1, stateRowCount, 1)
        .getDisplayValues()
        .map((row) => normId_(row[0]))
        .filter(Boolean)
    : [];

  const validPattern = /^8-(?:10|[1-9])-\d{3}$/;
  const invalidPlayerStateIds = Array.from(
    new Set(stateIds.filter((id) => !validPattern.test(id)))
  );
  const seen = new Set();
  const duplicatePlayerStateIds = [];
  stateIds.forEach((id) => {
    if (seen.has(id)) duplicatePlayerStateIds.push(id);
    seen.add(id);
  });

  const stateSet = new Set(stateIds);
  const missingPlayerStateIds = Array.from(
    new Set(activeIds.filter((id) => !stateSet.has(id)))
  );

  return {
    ok:
      invalidPlayerStateIds.length === 0 &&
      duplicatePlayerStateIds.length === 0 &&
      missingPlayerStateIds.length === 0,
    invalidPlayerStateIds,
    duplicatePlayerStateIds: Array.from(new Set(duplicatePlayerStateIds)),
    missingPlayerStateIds,
  };
}

function playerStateStatusPayload_(teacherToken) {
  const { index } = loadPlayerStateIndex_();
  const masterLookupWired = masterPlayerStateLookupWired_();
  const integrity = playerStateIdIntegrity_();
  const playerStateReady = masterLookupWired && integrity.ok;

  return {
    ok: true,
    teacherToken: teacherToken || "",
    playerStateReady,
    masterLookupWired,
    idIntegrityOk: integrity.ok,
    invalidPlayerStateIds: integrity.invalidPlayerStateIds,
    duplicatePlayerStateIds: integrity.duplicatePlayerStateIds,
    missingPlayerStateIds: integrity.missingPlayerStateIds,
    migrationRequired: !playerStateReady,
    playerStateRows: index.size,
    reservedStudentIds: Array.from(index.keys()).sort((a, b) =>
      String(a).localeCompare(String(b), "en", { numeric: true })
    ),
    now: new Date().toISOString(),
  };
}

function adminSystemStatus_(args) {
  const verified = verifyTeacher_(args || {});
  return playerStateStatusPayload_(verified.token);
}

function migratePlayerStateFromMaster_(args) {
  const verified = verifyTeacher_(args || {});

  const initialStatus = playerStateStatusPayload_(verified.token);
  if (initialStatus.playerStateReady) {
    return initialStatus;
  }

  if (initialStatus.masterLookupWired && !initialStatus.idIntegrityOk) {
    throw new Error(
      "Player_State StudentID integrity failed. Restore from the latest PlayerState_Backup before running migration again."
    );
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const lockedStatus = playerStateStatusPayload_(verified.token);
    if (lockedStatus.playerStateReady) {
      return lockedStatus;
    }

    const master = getSheet_(CFG.STUDENTS_SHEET);
    const values = master.getDataRange().getValues();
    if (values.length < 2) throw new Error("Master has no student rows to migrate.");

    const headers = values[0] || [];
    const map = headerMap_(headers);
    const iId = idx_(map, "StudentID", "ID");
    const iCompanion = idx_(map, "CompanionURL", "Companion URL");
    const iInventory = idx_(map, "Inventory");
    const iStr = idx_(map, "STR_Bonus", "STR Bonus");
    const iDex = idx_(map, "DEX_Bonus", "DEX Bonus");
    const iCon = idx_(map, "CON_Bonus", "CON Bonus");
    const iInt = idx_(map, "INT_Bonus", "INT Bonus");
    const iWis = idx_(map, "WIS_Bonus", "WIS Bonus");
    const iCha = idx_(map, "CHA_Bonus", "CHA Bonus");
    const iCompanionStatus = idx_(map, "CompanionStatus", "Companion Status");

    if (iId < 0) throw new Error("Master is missing StudentID.");

    const backupSheet = backupMasterBeforePlayerStateMigration_();
    const existing = loadPlayerStateIndex_().index;
    const activeIds = new Set();
    const rows = [];
    const nowIso = new Date().toISOString();

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const studentId = normId_(row[iId]);
      if (!studentId) continue;

      activeIds.add(studentId);
      const prior = existing.get(studentId);

      rows.push([
        studentId,
        prior ? prior.companionUrl : norm_(iCompanion >= 0 ? row[iCompanion] : ""),
        prior ? joinPlayerInventory_(prior.inventory) : joinPlayerInventory_(splitPlayerInventory_(iInventory >= 0 ? row[iInventory] : "")),
        prior ? prior.strBonus : Math.round(asNum_(iStr >= 0 ? row[iStr] : 0, 0)),
        prior ? prior.dexBonus : Math.round(asNum_(iDex >= 0 ? row[iDex] : 0, 0)),
        prior ? prior.conBonus : Math.round(asNum_(iCon >= 0 ? row[iCon] : 0, 0)),
        prior ? prior.intBonus : Math.round(asNum_(iInt >= 0 ? row[iInt] : 0, 0)),
        prior ? prior.wisBonus : Math.round(asNum_(iWis >= 0 ? row[iWis] : 0, 0)),
        prior ? prior.chaBonus : Math.round(asNum_(iCha >= 0 ? row[iCha] : 0, 0)),
        prior ? prior.companionStatus : norm_(iCompanionStatus >= 0 ? row[iCompanionStatus] : ""),
        "ACTIVE",
        "",
        nowIso,
      ]);
    }

    existing.forEach((prior, studentId) => {
      if (activeIds.has(studentId)) return;
      rows.push([
        studentId,
        prior.companionUrl,
        joinPlayerInventory_(prior.inventory),
        prior.strBonus,
        prior.dexBonus,
        prior.conBonus,
        prior.intBonus,
        prior.wisBonus,
        prior.chaBonus,
        prior.companionStatus,
        prior.rosterStatus || "ARCHIVED",
        prior.archivedAt || "",
        prior.updatedAt || nowIso,
      ]);
    });

    const state = ensurePlayerStateSheet_();
    state.clearContents();
    ensurePlayerStateSheet_();

    if (rows.length) {
      state.getRange(2, 1, rows.length, 1).setNumberFormat("@");
      state.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    installMasterPlayerStateLookups_();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);

    return {
      ...playerStateStatusPayload_(verified.token),
      migrated: true,
      backupSheet,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function ensurePlayerStateStudent_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  if (!studentId) throw new Error("Missing studentId.");

  let loaded = loadPlayerStateIndex_();
  let row = loaded.index.get(studentId);
  const nowIso = new Date().toISOString();

  if (!row) {
    const newRow = loaded.sh.getLastRow() + 1;
    loaded.sh.getRange(newRow, 1).setNumberFormat("@").setValue(studentId);
    loaded.sh.getRange(newRow, 2, 1, 12).setValues([[
      "",
      "",
      0,
      0,
      0,
      0,
      0,
      0,
      "",
      "ACTIVE",
      "",
      nowIso,
    ]]);
    loaded = loadPlayerStateIndex_();
    row = loaded.index.get(studentId);
  } else if (row.rosterStatus !== "ACTIVE") {
    loaded.sh.getRange(row.sheetRow, row.col.RosterStatus).setValue("ACTIVE");
    loaded.sh.getRange(row.sheetRow, row.col.ArchivedAt).setValue("");
    loaded.sh.getRange(row.sheetRow, row.col.UpdatedAt).setValue(nowIso);
    loaded = loadPlayerStateIndex_();
    row = loaded.index.get(studentId);
  }

  if (!row) throw new Error(`Unable to create Player_State row for ${studentId}.`);
  return { sh: loaded.sh, row };
}

function writePlayerStateBonus_(studentIdRaw, targetRaw, pointsRaw) {
  const studentId = normId_(studentIdRaw);
  const target = norm_(targetRaw).toUpperCase();
  const points = Math.round(asNum_(pointsRaw, 0));

  const colName = {
    STR: "STR_Bonus",
    DEX: "DEX_Bonus",
    CON: "CON_Bonus",
    INT: "INT_Bonus",
    WIS: "WIS_Bonus",
    CHA: "CHA_Bonus",
  }[target];

  if (!colName) throw new Error(`Invalid attribute target: ${target}`);

  const { sh, row } = ensurePlayerStateStudent_(studentId);
  const col = row.col[colName];
  const beforeAttr = Math.round(asNum_(sh.getRange(row.sheetRow, col).getValue(), 0));
  const afterAttr = beforeAttr + points;
  const nowIso = new Date().toISOString();

  sh.getRange(row.sheetRow, col).setValue(afterAttr);
  sh.getRange(row.sheetRow, row.col.UpdatedAt).setValue(nowIso);

  return { beforeAttr, afterAttr };
}

function legacyMasterBonusWrite_(studentId, target, points) {
  const master = getSheet_(CFG.STUDENTS_SHEET);
  const mh = headerMap_(master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0] || []);
  const iId = idx_(mh, "StudentID", "ID");
  if (iId < 0) throw new Error("Master missing StudentID column.");

  const colMap = {
    STR: idx_(mh, "STR_Bonus", "STR BONUS", "STR_BONUS"),
    DEX: idx_(mh, "DEX_Bonus", "DEX BONUS", "DEX_BONUS"),
    CON: idx_(mh, "CON_Bonus", "CON BONUS", "CON_BONUS"),
    INT: idx_(mh, "INT_Bonus", "INT BONUS", "INT_BONUS"),
    WIS: idx_(mh, "WIS_Bonus", "WIS BONUS", "WIS_BONUS"),
    CHA: idx_(mh, "CHA_Bonus", "CHA BONUS", "CHA_BONUS"),
  };

  const attrCol = colMap[target];
  if (attrCol == null || attrCol < 0) throw new Error(`Master missing bonus column for ${target}.`);

  const rowCount = Math.max(0, master.getLastRow() - 1);
  if (rowCount < 1) throw new Error("Master has no student rows.");
  const idValues = master.getRange(2, iId + 1, rowCount, 1).getDisplayValues();
  let masterRow = -1;

  for (let i = 0; i < idValues.length; i++) {
    if (normId_(idValues[i][0]) === studentId) {
      masterRow = i + 2;
      break;
    }
  }

  if (masterRow < 0) throw new Error("Student not found in Master.");

  const bonusCell = master.getRange(masterRow, attrCol + 1);
  const beforeAttr = Math.round(asNum_(bonusCell.getValue(), 0));
  const afterAttr = beforeAttr + points;
  bonusCell.setValue(afterAttr);

  // Mirror the value into Player_State so the later migration does not lose it.
  const state = ensurePlayerStateStudent_(studentId);
  const stateCol = state.row.col[`${target}_Bonus`];
  state.sh.getRange(state.row.sheetRow, stateCol).setValue(afterAttr);
  state.sh.getRange(state.row.sheetRow, state.row.col.UpdatedAt).setValue(new Date().toISOString());

  return { beforeAttr, afterAttr };
}

function writeAttributeBonusSafely_(studentId, target, points) {
  return masterPlayerStateLookupWired_()
    ? writePlayerStateBonus_(studentId, target, points)
    : legacyMasterBonusWrite_(studentId, target, points);
}

// =========================================================
// Global Teacher Admin: Inventory Manager
// =========================================================
function adminInventorySnapshot_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data upgrade required before Inventory Manager can be used.");
  }

  const students = loadStudentsMap_();
  const { index } = loadPlayerStateIndex_();
  const rows = [];

  students.forEach((student, studentId) => {
    const state = index.get(studentId);
    rows.push({
      studentId,
      inventory: state ? state.inventory : [],
    });
  });

  return {
    ok: true,
    teacherToken: verified.token,
    rows,
    now: new Date().toISOString(),
  };
}

function adminAdjustInventory_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data upgrade required before Inventory Manager can be used.");
  }

  const studentIds = Array.isArray(args.studentIds)
    ? Array.from(new Set(args.studentIds.map(normId_).filter(Boolean)))
    : [];
  const mode = norm_(args.mode || "").toUpperCase();
  const cardKey = norm_(args.cardKey || "");
  const cardName = norm_(args.cardName || cardKey);
  const quantity = Math.max(0, Math.floor(asNum_(args.quantity, 0)));
  const reason = norm_(args.reason || "");

  if (!studentIds.length) throw new Error("No students selected.");
  if (!["GIVE", "REMOVE"].includes(mode)) throw new Error("Inventory mode must be GIVE or REMOVE.");
  if (!cardKey) throw new Error("Missing card key.");
  if (quantity < 1) throw new Error("Quantity must be at least 1.");
  if (!reason) throw new Error("A reason is required for inventory changes.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const students = loadStudentsMap_();
    const plans = [];

    studentIds.forEach((studentId) => {
      const student = students.get(studentId);
      if (!student) throw new Error(`Active student not found: ${studentId}`);

      const state = ensurePlayerStateStudent_(studentId);
      const before = splitPlayerInventory_(
        state.sh.getRange(state.row.sheetRow, state.row.col.Inventory).getValue()
      );
      const wanted = cardKey.toLowerCase();
      const ownedCount = before.filter((item) => item.toLowerCase() === wanted).length;

      if (mode === "REMOVE" && ownedCount < quantity) {
        throw new Error(
          `${student.name || studentId} only has ${ownedCount} × ${cardName}.`
        );
      }

      let after = before.slice();

      if (mode === "GIVE") {
        for (let i = 0; i < quantity; i++) after.push(cardKey);
      } else {
        let remaining = quantity;
        after = after.filter((item) => {
          if (remaining > 0 && item.toLowerCase() === wanted) {
            remaining--;
            return false;
          }
          return true;
        });
      }

      plans.push({ studentId, student, state, before, after });
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const txn = ensureInventoryTxnSheet_();
    const txnRows = [];
    const results = [];

    plans.forEach((plan) => {
      plan.state.sh
        .getRange(plan.state.row.sheetRow, plan.state.row.col.Inventory)
        .setValue(joinPlayerInventory_(plan.after));
      plan.state.sh
        .getRange(plan.state.row.sheetRow, plan.state.row.col.UpdatedAt)
        .setValue(nowIso);

      txnRows.push([
        now,
        plan.studentId,
        plan.student.name || "",
        mode,
        cardKey,
        cardName,
        quantity,
        joinPlayerInventory_(plan.before),
        joinPlayerInventory_(plan.after),
        "ADMIN",
        reason,
      ]);

      results.push({
        studentId: plan.studentId,
        studentName: plan.student.name || "",
        inventory: plan.after,
      });
    });

    if (txnRows.length) {
      txn.getRange(txn.getLastRow() + 1, 1, txnRows.length, txnRows[0].length).setValues(txnRows);
    }

    SpreadsheetApp.flush();

    return {
      ok: true,
      teacherToken: verified.token,
      updated: results.length,
      mode,
      cardKey,
      cardName,
      quantity,
      reason,
      results,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// =========================================================
// Global Teacher Admin: Student Edit + Archive
// =========================================================
function adminUpdateStudent_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data upgrade required before student edits can be used.");
  }

  const studentId = normId_(args.studentId);
  const first = norm_(args.first || "");
  const last = norm_(args.last || "");
  if (!studentId) throw new Error("Missing studentId.");
  if (!first || !last) throw new Error("First and last name are required.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const resolved = adminResolveClassRowForStudentId_(studentId);
    const iName = idx_(resolved.map, "Name", "StudentName", "Student Name");
    if (iName < 0) throw new Error(`${resolved.homeroom} is missing a Name column.`);

    const nextRosterName = adminRosterName_(first, last);
    const maxRow = ADMIN_CLASS_MAX_ROW[resolved.homeroom];
    const names = resolved.sh.getRange(2, iName + 1, maxRow - 1, 1).getDisplayValues();

    for (let i = 0; i < names.length; i++) {
      const sheetRow = i + 2;
      if (sheetRow === resolved.rowNumber) continue;
      if (norm_(names[i][0]).toLowerCase() === nextRosterName.toLowerCase()) {
        throw new Error(`${nextRosterName} already exists in ${resolved.homeroom}.`);
      }
    }

    const beforeName = resolved.currentName;
    resolved.sh.getRange(resolved.rowNumber, iName + 1).setValue(nextRosterName);

    const hp = hpHeaderIdx_();
    const hpRow = findRowByIdInCol_(hp.sh, hp.col.StudentID, studentId);
    if (hpRow >= 2) hp.sh.getRange(hpRow, hp.col.Name).setValue(nextRosterName);

    const xp = ensureXpStateSheet_();
    const xpValues = xp.getDataRange().getValues();
    const xpMap = headerMap_(xpValues[0] || []);
    const xpIdCol = idx_(xpMap, "StudentID", "ID");
    const xpNameCol = idx_(xpMap, "Name");
    if (xpIdCol >= 0 && xpNameCol >= 0) {
      const xpRow = findRowByIdInCol_(xp, xpIdCol + 1, studentId);
      if (xpRow >= 2) xp.getRange(xpRow, xpNameCol + 1).setValue(nextRosterName);
    }

    const skill = ensureSkillStateSheet_();
    const skillValues = skill.getDataRange().getValues();
    const skillMap = headerMap_(skillValues[0] || []);
    const skillIdCol = idx_(skillMap, "StudentID", "ID");
    const skillNameCol = idx_(skillMap, "StudentName", "Student Name", "Name");
    if (skillIdCol >= 0 && skillNameCol >= 0) {
      const skillRow = findRowByIdInCol_(skill, skillIdCol + 1, studentId);
      if (skillRow >= 2) skill.getRange(skillRow, skillNameCol + 1).setValue(nextRosterName);
    }

    appendRowFast_(ensureRosterTxnSheet_(), [
      new Date(),
      studentId,
      nextRosterName,
      "RENAME",
      resolved.homeroom,
      (() => {
        const iGuild = idx_(resolved.map, "Guild");
        return iGuild >= 0
          ? norm_(resolved.sh.getRange(resolved.rowNumber, iGuild + 1).getValue())
          : "";
      })(),
      "Teacher Admin",
      `${beforeName} -> ${nextRosterName}`,
    ]);

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");

    return {
      ok: true,
      teacherToken: verified.token,
      studentId,
      first,
      last,
      name: `${first} ${last}`,
      rosterName: nextRosterName,
      now: new Date().toISOString(),
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminArchiveStudent_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data upgrade required before students can be archived.");
  }

  const studentId = normId_(args.studentId);
  const reason = norm_(args.reason || "");
  if (!studentId) throw new Error("Missing studentId.");
  if (!reason) throw new Error("A reason is required to archive a student.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const resolved = adminResolveClassRowForStudentId_(studentId);
    const iGuild = idx_(resolved.map, "Guild");
    const guild = iGuild >= 0 ? norm_(resolved.sh.getRange(resolved.rowNumber, iGuild + 1).getValue()) : "";
    const studentName = resolved.currentName;
    const nowIso = new Date().toISOString();

    const state = ensurePlayerStateStudent_(studentId);
    state.sh.getRange(state.row.sheetRow, state.row.col.RosterStatus).setValue("ARCHIVED");
    state.sh.getRange(state.row.sheetRow, state.row.col.ArchivedAt).setValue(nowIso);
    state.sh.getRange(state.row.sheetRow, state.row.col.UpdatedAt).setValue(nowIso);

    // Preserve B/C formulas. Clear only teacher-owned roster cells.
    adminClearReusableRosterRow_(resolved.sh, resolved.rowNumber);

    // HP_State drives Guild_Totals, so archived students must leave active HP state.
    const hp = hpHeaderIdx_();
    const hpRow = findRowByIdInCol_(hp.sh, hp.col.StudentID, studentId);
    if (hpRow >= 2) hp.sh.deleteRow(hpRow);

    appendRowFast_(ensureRosterTxnSheet_(), [
      new Date(),
      studentId,
      studentName,
      "ARCHIVE",
      resolved.homeroom,
      guild,
      reason,
      "StudentID reserved; XP, skills, inventory, and transaction history retained.",
    ]);

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      studentId,
      archived: true,
      reason,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

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

// =========================================================
// Web App Routing + Endpoints
// =========================================================
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = norm_(p.action || "").toLowerCase();
    if (
      action === "options" ||
      String(p.method || "").toUpperCase() === "OPTIONS"
    )
      return textOut_("");
    if (!action || action === "ping")
      return jsonOut_({
        ok: true,
        message: "Lakeshore Legends API is live",
        ts: new Date().toISOString(),
      });

    switch (action) {
      case "versions":
        return jsonOut_({
          ok: true,
          hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "",
          xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "",
          now: new Date().toISOString(),
        });

      case "hp":
        return jsonOut_(hpGetAll_());

      case "bossstate": {
        const bossInstanceId = norm_(p.bossInstanceId || "");
        const bossKey = norm_(p.bossKey || "");
        const st = bossGetState_(bossInstanceId, bossKey);
        return jsonOut_({ ok: true, boss: st, now: new Date().toISOString() });
      }

      case "finalexaminerstate":
        return jsonOut_(finalExaminerState_(p.raidId || ""));

      case "battlecontrol":
        return jsonOut_(battleControlGet_());

      case "xpstate":
        return jsonOut_(xpState_());

      case "xpsummary": {
        const studentId = norm_(p.studentId || "");
        const sum = xpSummary_(studentId);

        return jsonOut_({
          ok: true,
          ...sum,
          now: new Date().toISOString(),
        });
      }

      case "skillsummary": {
        const studentId = norm_(p.studentId || "");
        return jsonOut_(skillSummary_(studentId));
      }

      case "skillsnapshot":
        return jsonOut_(skillSnapshot_());

      case "guildtotals":
        return jsonOut_(guildTotalsGet_(norm_(p.homeroom || "")));

      case "recomputeguildtotals":
        return jsonOut_(recomputeGuildTotals_());

      case "battleguildtotals":
      case "recomputebattleguildtotals":
        return jsonOut_({
          ok: false,
          disabled: true,
          error: "Battle_GuildTotals has been disabled for performance.",
        });

      case "battlecontext":
        return jsonOut_({
          ok: true,
          ...resolveBattleContext_(norm_(p.homeroom || "")),
          now: new Date().toISOString(),
        });

      case "ensure": {
        ensureHpStateSheet_();
        ensureHpLogSheet_();
        ensureBossStateSheet_();
        ensureBossLogSheet_();
        ensureGuildTotalsSheet_();
        ensureBattleControlSheet_();
        ensureXpStateSheet_();
        ensureXpTxnSheet_();
        ensureSkillStateSheet_();
        ensurePurchasedSkillsSheet_();
        ensureSkillTxnSheet_();
        ensurePlayerStateSheet_();
        ensureInventoryTxnSheet_();
        ensureRosterTxnSheet_();
        ensureAbilityTxnSheet_();
        ensureFinalExaminerSheets_();
        getSheet_("FinalExaminer_Config");
        syncBattleControlDerivedFields_();

        return jsonOut_({
          ok: true,
          ensured: true,
          now: new Date().toISOString(),
        });
      }

      default:
        return jsonOut_({ ok: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return jsonOut_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function doPost(e) {
  try {
    const { action, body } = parsePost_(e);

    switch (action) {
      case "log":
        return jsonOut_(hpLogDelta_(body));

      case "logbatch":
        return jsonOut_(hpLogBatch_(body));

      case "bossdelta":
        return jsonOut_(bossApplyDelta_(body));

      case "battleteacherlogin":
        return jsonOut_(regularBattleTeacherLogin_(body));

      case "battleteacherstart":
        return jsonOut_(regularBattleTeacherStart_(body));

      case "battleteacheradvance":
        return jsonOut_(regularBattleTeacherAdvance_(body));

      case "battleteachersetturn":
        return jsonOut_(regularBattleTeacherSetTurn_(body));

      case "battleteacherpause":
        return jsonOut_(regularBattleTeacherPause_(body));

      case "battleteacherresume":
        return jsonOut_(regularBattleTeacherResume_(body));

      case "battleteacherend":
        return jsonOut_(regularBattleTeacherEnd_(body));

      case "battleteachersync":
        return jsonOut_(regularBattleTeacherSync_(body));

      case "finalexaminerstart":
        return jsonOut_(finalExaminerStart_(body));

      case "finalexamineraction":
        return jsonOut_(finalExaminerAction_(body));

      case "spendxp":
        return jsonOut_(spendXpWrite_(body));

      case "purchaseskill":
        return jsonOut_(purchaseSkill_(body));

      case "adminimportstudents":
        return jsonOut_(adminImportStudents_(body));

      case "adminassignguildbatch":
        return jsonOut_(adminAssignGuildBatch_(body));

      case "admincurrencysnapshot":
        return jsonOut_(adminCurrencySnapshot_(body));

      case "adminadjustcurrency":
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

      case "adminabilitysnapshot":
        return jsonOut_(adminAbilitySnapshot_(body));

      case "adminupdateabilities":
        return jsonOut_(adminUpdateAbilities_(body));

      case "adminadjustskill":
        return jsonOut_(adminAdjustSkill_(body));

      default:
        return jsonOut_({
          ok: false,
          error: `Unknown action: ${action}`,
        });
    }
  } catch (err) {
    return jsonOut_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function parsePost_(e) {
  const qp = e && e.parameter ? { ...e.parameter } : {};
  let body = {};
  const raw =
    e && e.postData && e.postData.contents ? e.postData.contents : "";
  const ct =
    e && e.postData && e.postData.type
      ? String(e.postData.type).toLowerCase()
      : "";
  if (raw) {
    const t = String(raw).trim();
    const looksJson = t.startsWith("{") || t.startsWith("[");
    if (ct.indexOf("application/json") !== -1 || looksJson) {
      try {
        body = JSON.parse(t) || {};
      } catch (_) {
        body = {};
      }
    } else {
      t.split("&").forEach((kv) => {
        const [k, v] = kv.split("=");
        if (!k) return;
        body[decodeURIComponent(k)] = decodeURIComponent(v || "");
      });
    }
  }
  body = { ...body, ...qp };
  let action = norm_(qp.action || "").toLowerCase();
  if (!action) action = norm_(body.action || "").toLowerCase();
  if (!action) throw new Error("Missing action");
  return { action, body };
}

// =========================================================
// Manual run helpers
// =========================================================
function RUN_seedXpState_DISABLED() {
  return seedXpStateFromMaster_();
}

function RUN_recomputeGuildTotals() {
  return recomputeGuildTotals_();
}

function RUN_recomputeBattleGuildTotals() {
  return recomputeBattleGuildTotals_("", "");
}

function RUN_ensureAllSheets() {
  ensureHpStateSheet_();
  ensureHpLogSheet_();
  ensureBossStateSheet_();
  ensureBossLogSheet_();
  ensureGuildTotalsSheet_();
  ensureBattleControlSheet_();
  ensureXpStateSheet_();
  ensureXpTxnSheet_();
  ensureSkillStateSheet_();
  ensurePurchasedSkillsSheet_();
  ensureSkillTxnSheet_();
  ensurePlayerStateSheet_();
  ensureInventoryTxnSheet_();
  ensureRosterTxnSheet_();
  ensureAbilityTxnSheet_();
  ensureFinalExaminerSheets_();
  syncBattleControlDerivedFields_();

  return { ok: true };
}

function RUN_startFinalExaminer() {
  return finalExaminerStart_({
    raidId: "final_examiner_2026",
    requestId: `manual-start-${Date.now()}`,
  });
}

function RUN_unlockFinalExaminer() {
  const raidId = "final_examiner_2026";
  const { bossSh } = ensureFinalExaminerSheets_();
  const rows = bossSh.getDataRange().getValues();
  const minions = rows
    .slice(1)
    .filter(
      (row) =>
        norm_(row[0]) === raidId && norm_(row[1]) !== "FINAL_EXAMINER"
    );
  const allMinionsDefeated =
    minions.length > 0 &&
    minions.every(
      (row) =>
        toBool_(row[6], false) || Math.max(0, asNum_(row[4], 0)) <= 0
    );
  if (!allMinionsDefeated)
    throw new Error("The Final Examiner cannot be unsealed yet.");
  const finalRowIndex = rows.findIndex(
    (row, index) =>
      index > 0 &&
      norm_(row[0]) === raidId &&
      norm_(row[1]) === "FINAL_EXAMINER"
  );
  if (finalRowIndex < 1)
    throw new Error("Final Examiner row was not found.");
  bossSh
    .getRange(finalRowIndex + 1, 6, 1, 3)
    .setValues([
      [
        false,
        toBool_(rows[finalRowIndex][6], false),
        new Date().toISOString(),
      ],
    ]);
  return finalExaminerState_(raidId);
}
