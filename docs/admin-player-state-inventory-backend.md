# Player_State Migration + Inventory / Student Lifecycle Backend

This is the next global Teacher Admin backend layer.

It fixes a structural problem in the current spreadsheet before student archive/delete and inventory writes are enabled:

- `Master!A:L` is a packed roster array.
- `Master!M:U` has historically been row-position data.
- Adding/removing a roster row can therefore shift CompanionURL / Inventory / bonus / CompanionStatus data onto the wrong student.

The safe model is a StudentID-keyed `Player_State` table. `Master!M:U` remains the published shape the frontend expects, but those columns become lookup formulas keyed by `Master!C:C` StudentID.

## New sheets

`Player_State`

```txt
StudentID | CompanionURL | Inventory | STR_Bonus | DEX_Bonus | CON_Bonus | INT_Bonus | WIS_Bonus | CHA_Bonus | CompanionStatus | RosterStatus | ArchivedAt | UpdatedAt
```

`Inventory_Transactions`

```txt
Timestamp | StudentID | StudentName | Type | CardKey | CardName | Quantity | BeforeInventory | AfterInventory | Source | Note
```

`Roster_Transactions`

```txt
Timestamp | StudentID | StudentName | Action | Homeroom | Guild | Reason | Detail
```

## Backend block

Paste this block after the Teacher Admin auth helpers and before `doGet` / `doPost`. The final merged replacement `.gs` file will include this automatically.

```js
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

  return ensureHeaders_(sh, [
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
  const backup = ss.insertSheet(name);
  const lastRow = Math.max(master.getLastRow(), 1);
  const values = master.getRange(1, 1, lastRow, 21).getValues();

  backup.getRange(1, 1, values.length, values[0].length).setValues(values);
  backup.setFrozenRows(1);

  return name;
}

function playerStateStatusPayload_(teacherToken) {
  const { index } = loadPlayerStateIndex_();
  const masterLookupWired = masterPlayerStateLookupWired_();

  return {
    ok: true,
    teacherToken: teacherToken || "",
    playerStateReady: masterLookupWired,
    masterLookupWired,
    migrationRequired: !masterLookupWired,
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

  if (masterPlayerStateLookupWired_()) {
    return playerStateStatusPayload_(verified.token);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    if (masterPlayerStateLookupWired_()) {
      return playerStateStatusPayload_(verified.token);
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
    appendRowFast_(loaded.sh, [
      studentId,
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
    ]);
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

  const idValues = master.getRange(2, iId + 1, Math.max(0, master.getLastRow() - 1), 1).getDisplayValues();
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
      norm_(resolved.sh.getRange(resolved.rowNumber, idx_(resolved.map, "Guild") + 1).getValue()),
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
```

## Existing `spendXpWrite_` change

The current function writes attribute bonuses directly into `Master`. Replace the block that finds/writes the Master bonus cell with:

```js
    const attrWrite = writeAttributeBonusSafely_(studentId, target, points);
    const beforeAttr = attrWrite.beforeAttr;
    const afterAttr = attrWrite.afterAttr;
```

Keep the existing XP balance write, verification, transaction append, and return shape.

When the migration is not yet installed, `writeAttributeBonusSafely_` uses the legacy Master cell and mirrors the result to Player_State. After migration, it writes Player_State only and Master displays it through the StudentID lookup.

## Existing student import change

At the start of `adminImportStudents_`, after teacher verification:

```js
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data upgrade required before students can be imported.");
  }
```

Use `playerStateReservedIds_()` to prevent archived IDs from ever being reused. When choosing an empty class-sheet row, skip any generated StudentID already present in Player_State.

After creating each imported student, call:

```js
ensurePlayerStateStudent_(studentId);
```

## New routes

Add to `doPost`:

```js
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
```

## Ensure helpers

Add to both `GET ?action=ensure` and `RUN_ensureAllSheets()`:

```js
ensurePlayerStateSheet_();
ensureInventoryTxnSheet_();
ensureRosterTxnSheet_();
```

Do **not** run the migration automatically from `ensure`. Migration intentionally requires a teacher-authenticated explicit action because it creates a backup and changes `Master!M:U` from row values to StudentID lookup formulas.
