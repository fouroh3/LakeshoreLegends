/** =========================================================
 * Lakeshore Legends API (HP + XP Store + Boss Instances) — Single Web App
 * CLEANED BUILD (2026-03-17)
 *
 * Keeps:
 * - HP API
 * - Boss API
 * - XP Store API
 * - Guild_Totals
 * - Battle_GuildTotals
 * - Battle_Control using the CURRENT 12-column layout
 *
 * Battle_Control columns:
 * A Homeroom
 * B Status
 * C Quest
 * D Round
 * E Turn
 * F PairTo
 * G LeaderHomeroom
 * H ActiveBattleSessionId
 * I BossKey
 * J BossInstanceId
 * K CurrentStateSummary
 * L LastUpdated
 *
 * Notes:
 * - Paired homerooms inherit leader quest / round / turn / session / boss
 * - Only leader rows create/reset Boss_State entries
 * - Boss ATTACK round-lock applies only when both round + guild are provided
 *
 * Boss API:
 * - GET  ?action=bossstate&bossInstanceId=...&bossKey=...
 * - POST ?action=bossdelta   (JSON body)
 *
 * HP API:
 * - GET  ?action=hp
 * - POST ?action=log         (JSON body)
 *
 * XP STORE API:
 * - GET  ?action=xpState
 * - GET  ?action=xpSummary&studentId=...
 * - POST ?action=spendXp     (JSON body)
 *
 * Battle Control API:
 * - GET  ?action=battlecontrol
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
      const existingMax = Math.max(1, Math.round(asNum_(existing[3], CFG.MAX_BOSS_HP_DEFAULT)));
      const existingCur = Math.max(0, Math.min(existingMax, Math.round(asNum_(existing[4], existingMax))));
      bossState.getRange(row, 1, 1, 6).setValues([[b.bossInstanceId, b.bossKey, b.bossName, existingMax, existingCur, nowIso]]);
      updated++;
    } else {
      appendRowFast_(bossState, [b.bossInstanceId, b.bossKey, b.bossName, CFG.MAX_BOSS_HP_DEFAULT, CFG.MAX_BOSS_HP_DEFAULT, nowIso]);
      created++;
    }
  });

  for (let r = 1; r < vals.length; r++) {
    const sheetRow = r + 1;
    const bossInstanceId = norm_(vals[r][0]);
    if (!bossInstanceId) continue;
    if (!activeLeaders.has(bossInstanceId)) rowsToDelete.push(sheetRow);
  }

  rowsToDelete.sort((a, b) => b - a).forEach((rowNum) => {
    bossState.deleteRow(rowNum);
    deleted++;
  });

  return { ok: true, synced: activeLeaders.size, created, updated, deleted, at: nowIso };
}

function resolveBattleContext_(homeroom) {
  const { rows } = battleControlRows_();
  const row = rows.find((r) => r.homeroom === norm_(homeroom));
  if (!row) throw new Error(`Homeroom not found in Battle_Control: ${homeroom}`);
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
      lastUpdated: r.lastUpdated instanceof Date ? r.lastUpdated.toISOString() : String(r.lastUpdated || ""),
      guildAttacks: String(r.turn || "").toUpperCase() === "GUILD" ? "OPEN" : "CLOSED",
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
  const headers = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn() || 1, 8)).getDisplayValues()[0].map((h) => String(h || "").trim());
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
    const baseHP = Math.max(1, Math.round(asNum_(row[iBase], CFG.MAX_HP_DEFAULT)));
    const cappedBase = Math.min(CFG.MAX_HP_DEFAULT, baseHP);
    const currentHP = Math.max(0, Math.min(cappedBase, Math.round(asNum_(row[iCur], cappedBase))));
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
  index.forEach((v, id) => out.push({ studentId: id, baseHP: v.baseHP, currentHP: v.currentHP }));
  out.sort((a, b) => String(a.studentId).localeCompare(String(b.studentId)));
  const payload = { ok: true, hp: out, hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "", now: new Date().toISOString() };
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
    return { ok: true, deduped: true, studentId, sessionId, requestId, hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "", now: new Date().toISOString() };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { sh, col, index } = loadHpIndex_();
    let row = index.get(studentId);
    if (!row) {
      const studentsMap = loadStudentsMap_();
      const s = studentsMap.get(studentId) || { studentId, name: "", homeroom: "", guild: "" };
      const base = CFG.MAX_HP_DEFAULT;
      const cur = base;
      const nowIso = new Date().toISOString();
      appendRowFast_(sh, [studentId, s.name || "", s.homeroom || "", s.guild || "", base, cur, nowIso, 0]);
      const re = loadHpIndex_();
      row = re.index.get(studentId);
      if (!row) throw new Error(`Student not found in HP_State after seed: ${studentId}`);
    }

    const baseHP = Math.min(CFG.MAX_HP_DEFAULT, Math.max(1, row.baseHP || CFG.MAX_HP_DEFAULT));
    const before = Math.max(0, Math.min(baseHP, row.currentHP));
    const after = Math.max(0, Math.min(baseHP, before + delta));
    sh.getRange(row.sheetRow, col.CurrentHP).setValue(after);
    sh.getRange(row.sheetRow, col.UpdatedAt).setValue(new Date().toISOString());
    sh.getRange(row.sheetRow, col.LastDelta).setValue(delta);
    const log = ensureHpLogSheet_();
    appendRowFast_(log, [new Date(), sessionId, studentId, delta, before, after, note]);
    const iso = new Date().toISOString();
    setProp_(CFG.PROP_LAST_WRITE_ISO, iso);
    cacheRemove_("hpAll:v1");
    if (requestId) idemMark_("hpLogDelta", requestId);
    return { ok: true, studentId, baseHP, before, after, hpLastWriteIso: iso };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
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
    return { ok: true, deduped: true, sessionId, requestId, hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "", now: new Date().toISOString() };
  }

  const cleaned = entries.map((x) => ({ studentId: normId_(x && x.studentId), delta: Math.round(asNum_(x && x.delta, 0)), note: norm_((x && x.note) || note || "") })).filter((x) => x.studentId && Number.isFinite(x.delta) && x.delta !== 0);
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
        const s = studentsMap.get(item.studentId) || { studentId: item.studentId, name: "", homeroom: "", guild: "" };
        seedRows.push([item.studentId, s.name || "", s.homeroom || "", s.guild || "", CFG.MAX_HP_DEFAULT, CFG.MAX_HP_DEFAULT, nowIso, 0]);
      }
    });
    if (seedRows.length) {
      sh.getRange(sh.getLastRow() + 1, 1, seedRows.length, seedRows[0].length).setValues(seedRows);
      const reloaded = loadHpIndex_();
      sh = reloaded.sh;
      col = reloaded.col;
      index = reloaded.index;
    }

    cleaned.forEach((item) => { if (!index.get(item.studentId)) throw new Error(`Student missing from HP_State: ${item.studentId}`); });
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    const sheetData = sh.getRange(1, 1, lastRow, lastCol).getValues();
    const results = [];
    const logRows = [];

    cleaned.forEach((item) => {
      const row = index.get(item.studentId);
      if (!row) throw new Error(`Student not found during apply: ${item.studentId}`);
      const sheetRowIndex = row.sheetRow - 1;
      const rowValues = sheetData[sheetRowIndex];
      const baseHP = Math.min(CFG.MAX_HP_DEFAULT, Math.max(1, Math.round(asNum_(row.baseHP, CFG.MAX_HP_DEFAULT))));
      const before = Math.max(0, Math.min(baseHP, Math.round(asNum_(row.currentHP, baseHP))));
      const after = Math.max(0, Math.min(baseHP, before + item.delta));
      rowValues[col.CurrentHP - 1] = after;
      rowValues[col.UpdatedAt - 1] = nowIso;
      rowValues[col.LastDelta - 1] = item.delta;
      row.currentHP = after;
      results.push({ studentId: item.studentId, baseHP, before, after, delta: item.delta });
      logRows.push([now, sessionId, item.studentId, item.delta, before, after, item.note || ""]);
    });

    sh.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
    if (logRows.length) {
      const log = ensureHpLogSheet_();
      log.getRange(log.getLastRow() + 1, 1, logRows.length, logRows[0].length).setValues(logRows);
    }
    setProp_(CFG.PROP_LAST_WRITE_ISO, nowIso);
    cacheRemove_("hpAll:v1");
    if (requestId) idemMark_("hpLogBatch", requestId);
    return { ok: true, sessionId, requestId, count: results.length, results, hpLastWriteIso: nowIso, now: nowIso };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
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
    if (last > 1) outSh.getRange(2, 1, last - 1, outSh.getLastColumn()).clearContent();
    return { ok: true, written: 0, updatedAt: new Date().toISOString(), note: "HP_State empty" };
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
    if (!agg.has(key)) agg.set(key, { Homeroom: homeroom, Guild: guild, Members: 0, TotalBaseHP: 0, TotalCurrentHP: 0 });
    const a = agg.get(key);
    a.Members += 1;
    a.TotalBaseHP += baseHP;
    a.TotalCurrentHP += curHP;
  }

  const updatedAt = new Date().toISOString();
  const rows = Array.from(agg.values()).sort((a, b) => {
    const hr = String(a.Homeroom).localeCompare(String(b.Homeroom));
    return hr !== 0 ? hr : String(a.Guild).localeCompare(String(b.Guild));
  }).map((a) => {
    const pct = a.TotalBaseHP > 0 ? a.TotalCurrentHP / a.TotalBaseHP : 0;
    return [updatedAt, a.Homeroom, a.Guild, a.Members, Math.round(a.TotalBaseHP), Math.round(a.TotalCurrentHP), Math.round(pct * 10000) / 10000];
  });

  const last = outSh.getLastRow();
  if (last > 1) outSh.getRange(2, 1, last - 1, outSh.getLastColumn()).clearContent();
  if (rows.length) outSh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  return { ok: true, written: rows.length, updatedAt };
}

function guildTotalsGet_(homeroomFilter) {
  const sh = ensureGuildTotalsSheet_();
  const vals = sh.getDataRange().getValues();
  if (!vals || vals.length < 2) return { ok: true, updatedAt: "", rows: [] };
  const headers = vals[0].map((h) => String(h || "").trim());
  const rows = [];
  for (let r = 1; r < vals.length; r++) {
    const row = vals[r];
    const obj = {};
    for (let c = 0; c < headers.length; c++) obj[headers[c]] = row[c];
    if (homeroomFilter && String(obj.Homeroom || "") !== String(homeroomFilter)) continue;
    rows.push(obj);
  }
  const updatedAt = rows.length ? String(rows[0].UpdatedAt || "") : "";
  return { ok: true, updatedAt, rows };
}

// ================================================================
// ====================== BATTLE GUILD TOTALS ======================
// ================================================================
function recomputeBattleGuildTotals_() {
  return { ok: false, disabled: true, error: "Battle_GuildTotals has been disabled for performance." };
}

function battleGuildTotalsGet_() {
  return { ok: false, disabled: true, error: "Battle_GuildTotals has been disabled for performance.", rows: [], updatedAt: "" };
}

// ================================================================
// ========================= BOSS INSTANCES =======================
// ================================================================
function bossFindRow_(sh, bossInstanceId) {
  return findRowByIdInCol_(sh, 1, String(bossInstanceId));
}

function bossDefaultsFromKey_(bossKey) {
  const key = norm_(bossKey);
  const name = key.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()).trim() || "Boss";
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
    const payload = { bossInstanceId: String(r[0] || ""), bossKey: String(r[1] || ""), bossName: String(r[2] || ""), maxHP: Math.round(asNum_(r[3], CFG.MAX_BOSS_HP_DEFAULT)), currentHP: Math.round(asNum_(r[4], 0)), updatedAt: String(r[5] || "") };
    cachePutJson_(cacheKey, payload, 3);
    return payload;
  }

  const def = bossDefaultsFromKey_(bossKey);
  const nowIso = new Date().toISOString();
  const maxHP = Math.max(1, Math.round(def.maxHP || CFG.MAX_BOSS_HP_DEFAULT));
  const cur = maxHP;
  appendRowFast_(state, [id, norm_(bossKey), def.bossName, maxHP, cur, nowIso]);
  const payload = { bossInstanceId: id, bossKey: norm_(bossKey), bossName: def.bossName, maxHP, currentHP: cur, updatedAt: nowIso };
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
    return { ok: true, deduped: true, requestId, ...st, now: new Date().toISOString() };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const state = ensureBossStateSheet_();
    const log = ensureBossLogSheet_();
    const st0 = bossGetState_(bossInstanceId, bossKey);
    const row = bossFindRow_(state, bossInstanceId);
    if (row < 2) throw new Error("Boss instance row not found after ensure");
    const maxHP = Math.max(1, Math.round(asNum_(st0.maxHP, CFG.MAX_BOSS_HP_DEFAULT)));
    const before = Math.max(0, Math.min(maxHP, Math.round(asNum_(st0.currentHP, maxHP))));
    const after = Math.max(0, Math.min(maxHP, before + delta));
    const nowIso = new Date().toISOString();
    state.getRange(row, 4, 1, 3).setValues([[maxHP, after, nowIso]]);
    appendRowFast_(log, [new Date(), bossInstanceId, bossKey || st0.bossKey, AT, round || "", homeroom || "", guild || "", delta, after, source, requestId || ""]);
    cacheRemove_(bossStateCacheKey_(bossInstanceId));
    if (requestId) idemMark_("bossDelta", requestId);
    return { ok: true, bossInstanceId, bossKey: bossKey || st0.bossKey, bossName: st0.bossName, maxHP, currentHP: after, updatedAt: nowIso };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
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
  throw new Error(`Missing control sheet. Create '${CFG.XP_CONTROL_SHEET_PRIMARY}' (preferred) or '${CFG.XP_CONTROL_SHEET_FALLBACK}'.`);
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
  const maxPointsPerOpen = Math.max(1, Math.round(asNum_(out.MaxPointsPerOpen, 999)));
  const openNonce = norm_(out.OpenNonce ?? "");
  return { storeLocked, storePin, xpPerPoint, windowLabel, maxPointsPerOpen, openNonce };
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
  return ensureHeaders_(sh, ["Timestamp", "StudentID", "StudentName", "Homeroom", "Type", "XP", "Target", "Points", "BalanceBefore", "BalanceAfter", "Note", "WindowLabel", "OpenNonce", "RequestId"]);
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
  if (iId < 0 || iBal < 0) throw new Error("XP_State must include headers: Name, Homeroom, StudentID, Balance");
  const index = new Map();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const id = normId_(row[iId]);
    if (!id) continue;
    const bal = Math.round(asNum_(row[iBal], 0));
    index.set(id, { sheetRow: r + 1, name: norm_(iName >= 0 ? row[iName] : ""), homeroom: norm_(iHr >= 0 ? row[iHr] : ""), balance: bal });
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
  const headers = values[0].map((h) => String(h || "").trim().toLowerCase());
  const iName = headers.indexOf("name");
  const iHr = headers.indexOf("homeroom");
  const iId = headers.indexOf("studentid");
  if (iName < 0 || iHr < 0 || iId < 0) throw new Error("Master must include headers: Name, Homeroom, StudentID");
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
    const type = String(tvals[r][4] || "").toUpperCase() === "SPEND" ? "SPEND" : "EARN";
    const xp = Math.round(asNum_(tvals[r][5], 0));
    const target = String(tvals[r][6] || "").toUpperCase() || "";
    const ts = tvals[r][0] instanceof Date ? tvals[r][0].toISOString() : String(tvals[r][0] || "");
    recent.push({ timestamp: ts, type, xp, target: target ? target : undefined, note: tvals[r][10] ? String(tvals[r][10]) : undefined });
  }
  for (let r = 1; r < tvals.length; r++) {
    const rid = normId_(tvals[r][1]);
    if (rid !== studentId) continue;
    const type = String(tvals[r][4] || "").toUpperCase();
    const xp = Math.round(asNum_(tvals[r][5], 0));
    if (type === "SPEND") spent += xp;
    else earned += xp;
  }
  return { studentId, earned, spent, balance, spendablePoints: Math.floor(Math.max(0, balance) / xpPerPoint), recent };
}

function xpState_() {
  const ctl = readXpControl_();
  return { ok: true, storeLocked: ctl.storeLocked, windowLabel: ctl.windowLabel || "", xpPerPoint: ctl.xpPerPoint, maxPointsPerOpen: ctl.maxPointsPerOpen, openNonce: ctl.openNonce || "", now: new Date().toISOString(), xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "" };
}

function spendXpWrite_(args) {
  const ctl = readXpControl_();
  if (ctl.storeLocked) throw new Error("Store is closed.");
  if (!ctl.storePin) throw new Error("Store PIN is not set.");
  const pin = normPin_(args.pin || "");
  if (!pin || pin !== normPin_(ctl.storePin)) throw new Error("Invalid Store PIN.");
  const reqNonce = norm_(args.openNonce || "");
  if (ctl.openNonce && reqNonce && reqNonce !== ctl.openNonce) throw new Error("Invalid store window.");
  if (ctl.openNonce && !reqNonce) throw new Error("Missing store window token.");
  const requestId = norm_(args.requestId || "");
  if (requestId && idemIsDuplicate_("spendXp", requestId)) return { ok: true, deduped: true, requestId, xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "", now: new Date().toISOString() };

  const studentId = normId_(args.studentId);
  const target = String(args.target || "").toUpperCase();
  const points = Math.max(1, Math.round(asNum_(args.points, 1)));
  if (!studentId) throw new Error("Missing studentId.");
  if (!["STR", "DEX", "CON", "INT", "WIS", "CHA"].includes(target)) throw new Error("Invalid target.");
  if (!Number.isFinite(points) || points < 1) throw new Error("Invalid points.");
  if (points > ctl.maxPointsPerOpen) throw new Error("Too many points for this store window.");

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
    const master = getSheet_(CFG.STUDENTS_SHEET);
    const mh = headerMap_(master.getRange(1, 1, 1, master.getLastColumn()).getValues()[0] || []);
    const iId = idx_(mh, "StudentID", "ID");
    if (iId < 0) throw new Error("Master missing StudentID column.");
    const colMap = { STR: idx_(mh, "STR_Bonus", "STR BONUS", "STR_BONUS"), DEX: idx_(mh, "DEX_Bonus", "DEX BONUS", "DEX_BONUS"), CON: idx_(mh, "CON_Bonus", "CON BONUS", "CON_BONUS"), INT: idx_(mh, "INT_Bonus", "INT BONUS", "INT_BONUS"), WIS: idx_(mh, "WIS_Bonus", "WIS BONUS", "WIS_BONUS"), CHA: idx_(mh, "CHA_Bonus", "CHA BONUS", "CHA_BONUS") };
    const attrCol = colMap[target];
    if (attrCol == null || attrCol < 0) throw new Error(`Master missing bonus column for ${target}.`);
    const idCol = iId + 1;
    const rowCount = Math.max(0, master.getLastRow() - 1);
    if (rowCount < 1) throw new Error("Master has no student rows.");
    const idValues = master.getRange(2, idCol, rowCount, 1).getDisplayValues();
    let masterRow = -1;
    for (let i = 0; i < idValues.length; i++) {
      if (normId_(idValues[i][0]) === studentId) { masterRow = i + 2; break; }
    }
    if (masterRow < 0) throw new Error("Student not found in Master.");
    const bonusCell = master.getRange(masterRow, attrCol + 1);
    const beforeAttr = Math.round(asNum_(bonusCell.getValue(), 0));
    const afterAttr = beforeAttr + points;
    xpSh.getRange(row.sheetRow, 4).setValue(afterBal);
    bonusCell.setValue(afterAttr);
    SpreadsheetApp.flush();
    const verifyBal = Math.round(asNum_(xpSh.getRange(row.sheetRow, 4).getValue(), -999999));
    const verifyAttr = Math.round(asNum_(bonusCell.getValue(), -999999));
    if (verifyBal !== afterBal || verifyAttr !== afterAttr) throw new Error(`Write verification failed for ${studentId}. Expected balance ${afterBal}, attr ${afterAttr}; got balance ${verifyBal}, attr ${verifyAttr}.`);
    const tx = ensureXpTxnSheet_();
    appendRowFast_(tx, [new Date(), studentId, row.name || "", row.homeroom || "", "SPEND", costXp, target, points, beforeBal, afterBal, "", ctl.windowLabel || "", ctl.openNonce || "", requestId || ""]);
    stampXpControlUpdatedAt_();
    const iso = new Date().toISOString();
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, iso);
    if (requestId) idemMark_("spendXp", requestId);
    return { ok: true, studentId, target, points, costXp, balanceBefore: beforeBal, balanceAfter: afterBal, beforeAttr, afterAttr, xpLastWriteIso: iso, summary: xpSummary_(studentId) };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

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
  ensureHeaders_(classSh, ["RaidId", "ClassKey", "Label", "Homerooms", "StartingHP", "CurrentHP", "UpdatedAt"]);
  ensureHeaders_(bossSh, ["RaidId", "BossKey", "BossName", "MaxHP", "CurrentHP", "Locked", "Defeated", "UpdatedAt"]);
  ensureHeaders_(logSh, ["Timestamp", "RaidId", "ClassKey", "ClassLabel", "Action", "TargetBossKey", "RequestedAmount", "AppliedAmount", "OverkillLost", "ClassHPAfter", "BossHPAfter", "Note", "RequestId"]);
  return { classSh, bossSh, logSh };
}

function finalExaminerActiveLeaderUnits_() {
  const sh = getSheet_("FinalExaminer_Config");
  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error("FinalExaminer_Config has no class rows. Add the three Final Examiner units first.");
  const headers = values[0];
  const map = headerMap_(headers);
  const iClassKey = idx_(map, "ClassKey");
  const iLabel = idx_(map, "Label");
  const iHomerooms = idx_(map, "Homerooms");
  if (iClassKey < 0 || iLabel < 0 || iHomerooms < 0) throw new Error("FinalExaminer_Config needs these headers: ClassKey, Label, Homerooms");
  const units = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const classKey = norm_(row[iClassKey]);
    const label = norm_(row[iLabel]);
    const homerooms = String(row[iHomerooms] || "").split(/[;,|]/).map((value) => norm_(value)).filter(Boolean);
    if (!classKey && !label && homerooms.length === 0) continue;
    if (!classKey || !label || homerooms.length === 0) throw new Error(`FinalExaminer_Config row ${r + 1} is incomplete. Every row needs ClassKey, Label, and Homerooms.`);
    units.push({ classKey, label, homerooms });
  }
  if (!units.length) throw new Error("FinalExaminer_Config has no usable Final Examiner units.");
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
    totals.set(homeroom, (totals.get(homeroom) || 0) + Math.max(0, Math.round(asNum_(hp.currentHP, 0))));
  });
  return totals;
}

function finalExaminerStart_(args) {
  const raidId = norm_(args && args.raidId) || FINAL_EXAMINER.RAID_ID;
  const requestId = norm_(args && args.requestId);
  if (requestId && idemIsDuplicate_("finalExaminerStart", requestId)) return finalExaminerState_(raidId);
  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const { classSh, bossSh } = ensureFinalExaminerSheets_();
    const units = finalExaminerActiveLeaderUnits_();
    if (!units.length) throw new Error("No Final Examiner classes found. Configure FinalExaminer_Config first.");
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
      for (let i = 1; i < values.length; i++) if (norm_(values[i][0]) !== raidId) keep.push(values[i]);
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
  const { classSh, bossSh, logSh } = ensureFinalExaminerSheets_();
  const classValues = classSh.getDataRange().getValues();
  const bossValues = bossSh.getDataRange().getValues();
  const logValues = logSh.getDataRange().getValues();

  const classes = classValues.slice(1).filter((r) => norm_(r[0]) === raidId).map((r) => ({
    classKey: norm_(r[1]),
    label: norm_(r[2]),
    startingHP: Math.max(0, Math.round(asNum_(r[4], 0))),
    currentHP: Math.max(0, Math.round(asNum_(r[5], 0))),
    updatedAt: String(r[6] || ""),
  }));

  const bosses = bossValues.slice(1).filter((r) => norm_(r[0]) === raidId).map((r) => ({
    bossKey: norm_(r[1]),
    bossName: norm_(r[2]),
    maxHP: Math.max(1, Math.round(asNum_(r[3], 1))),
    currentHP: Math.max(0, Math.round(asNum_(r[4], 0))),
    locked: toBool_(r[5], false),
    defeated: toBool_(r[6], false),
    updatedAt: String(r[7] || ""),
  }));

  const bossNameByKey = new Map(bosses.map((boss) => [boss.bossKey, boss.bossName]));
  const events = logValues.slice(1).filter((row) => norm_(row[1]) === raidId).slice(-80).reverse().map((row) => {
    const targetBossKey = norm_(row[5]).toUpperCase();
    return {
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ""),
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
  const allMinionsDefeated = minions.length > 0 && minions.every((b) => b.defeated || b.currentHP <= 0);
  const phase = finalBoss && finalBoss.defeated ? "VICTORY" : allMinionsDefeated ? "FINAL_EXAMINER" : "MINIONS";

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
  if (!["HEAL", "STRIKE", "DAMAGE"].includes(actionType)) throw new Error("Action must be HEAL, STRIKE, or DAMAGE.");
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
    let classHPAfter = classHPBefore;
    let bossHPAfter = "";
    let appliedAmount = 0;
    let overkillLost = 0;
    const nowIso = new Date().toISOString();

    if (actionType === "HEAL") {
      classHPAfter = classHPBefore + amount;
      appliedAmount = amount;
      classSh.getRange(classRowIndex + 1, 6, 1, 2).setValues([[classHPAfter, nowIso]]);
    } else if (actionType === "DAMAGE") {
      appliedAmount = Math.min(amount, classHPBefore);
      overkillLost = Math.max(0, amount - appliedAmount);
      classHPAfter = Math.max(0, classHPBefore - appliedAmount);
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

// =========================================================
// Web App Routing + Endpoints
// =========================================================
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = norm_(p.action || "").toLowerCase();
    if (action === "options" || String(p.method || "").toUpperCase() === "OPTIONS") return textOut_("");
    if (!action || action === "ping") return jsonOut_({ ok: true, message: "Lakeshore Legends API is live", ts: new Date().toISOString() });

    switch (action) {
      case "versions": return jsonOut_({ ok: true, hpLastWriteIso: getProp_(CFG.PROP_LAST_WRITE_ISO) || "", xpLastWriteIso: getProp_(CFG.PROP_LAST_XP_WRITE_ISO) || "", now: new Date().toISOString() });
      case "hp": return jsonOut_(hpGetAll_());
      case "bossstate": {
        const bossInstanceId = norm_(p.bossInstanceId || "");
        const bossKey = norm_(p.bossKey || "");
        const st = bossGetState_(bossInstanceId, bossKey);
        return jsonOut_({ ok: true, boss: st, now: new Date().toISOString() });
      }
      case "finalexaminerstate": return jsonOut_(finalExaminerState_(p.raidId || ""));
      case "battlecontrol": return jsonOut_(battleControlGet_());
      case "xpstate": return jsonOut_(xpState_());
      case "xpsummary": {
        const studentId = norm_(p.studentId || "");
        const sum = xpSummary_(studentId);
        return jsonOut_({ ok: true, ...sum, now: new Date().toISOString() });
      }
      case "guildtotals": return jsonOut_(guildTotalsGet_(norm_(p.homeroom || "")));
      case "recomputeguildtotals": return jsonOut_(recomputeGuildTotals_());
      case "battleguildtotals":
      case "recomputebattleguildtotals": return jsonOut_({ ok: false, disabled: true, error: "Battle_GuildTotals has been disabled for performance." });
      case "battlecontext": return jsonOut_({ ok: true, ...resolveBattleContext_(norm_(p.homeroom || "")), now: new Date().toISOString() });
      case "ensure": {
        ensureHpStateSheet_();
        ensureHpLogSheet_();
        ensureBossStateSheet_();
        ensureBossLogSheet_();
        ensureGuildTotalsSheet_();
        ensureBattleControlSheet_();
        ensureXpStateSheet_();
        ensureXpTxnSheet_();
        ensureFinalExaminerSheets_();
        getSheet_("FinalExaminer_Config");
        syncBattleControlDerivedFields_();
        return jsonOut_({ ok: true, ensured: true, now: new Date().toISOString() });
      }
      default: return jsonOut_({ ok: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const { action, body } = parsePost_(e);
    switch (action) {
      case "log": return jsonOut_(hpLogDelta_(body));
      case "logbatch": return jsonOut_(hpLogBatch_(body));
      case "bossdelta": return jsonOut_(bossApplyDelta_(body));
      case "finalexaminerstart": return jsonOut_(finalExaminerStart_(body));
      case "finalexamineraction": return jsonOut_(finalExaminerAction_(body));
      case "spendxp": return jsonOut_(spendXpWrite_(body));
      default: return jsonOut_({ ok: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function parsePost_(e) {
  const qp = e && e.parameter ? { ...e.parameter } : {};
  let body = {};
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
  const ct = (e && e.postData && e.postData.type ? String(e.postData.type) : "").toLowerCase();
  if (raw) {
    const t = String(raw).trim();
    const looksJson = t.startsWith("{") || t.startsWith("[");
    if (ct.indexOf("application/json") !== -1 || looksJson) {
      try { body = JSON.parse(t) || {}; } catch (_) { body = {}; }
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
  ensureFinalExaminerSheets_();
  syncBattleControlDerivedFields_();
  return { ok: true };
}

function RUN_startFinalExaminer() {
  return finalExaminerStart_({ raidId: "final_examiner_2026", requestId: `manual-start-${Date.now()}` });
}

function RUN_unlockFinalExaminer() {
  const raidId = "final_examiner_2026";
  const { bossSh } = ensureFinalExaminerSheets_();
  const rows = bossSh.getDataRange().getValues();
  const minions = rows.slice(1).filter((row) => norm_(row[0]) === raidId && norm_(row[1]) !== "FINAL_EXAMINER");
  const allMinionsDefeated = minions.length > 0 && minions.every((row) => toBool_(row[6], false) || Math.max(0, asNum_(row[4], 0)) <= 0);
  if (!allMinionsDefeated) throw new Error("The Final Examiner cannot be unsealed yet.");
  const finalRowIndex = rows.findIndex((row, index) => index > 0 && norm_(row[0]) === raidId && norm_(row[1]) === "FINAL_EXAMINER");
  if (finalRowIndex < 1) throw new Error("Final Examiner row was not found.");
  bossSh.getRange(finalRowIndex + 1, 6, 1, 3).setValues([[false, toBool_(rows[finalRowIndex][6], false), new Date().toISOString()]]);
  return finalExaminerState_(raidId);
}
