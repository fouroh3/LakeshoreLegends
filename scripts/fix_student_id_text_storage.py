from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


apps_path = Path("docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs")
s = apps_path.read_text(encoding="utf-8")

s = replace_once(
    s,
    'const ADMIN_API_VERSION = "2026-09-01.5";',
    'const ADMIN_API_VERSION = "2026-09-01.6";',
    "Apps Script API version",
)

helpers = r'''function normStoredStudentId_(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const tz = Session.getScriptTimeZone() || "GMT";
    const month = Number(Utilities.formatDate(v, tz, "M"));
    const day = Number(Utilities.formatDate(v, tz, "d"));
    const year = Number(Utilities.formatDate(v, tz, "yyyy"));

    if (
      month === 8 &&
      day >= 1 &&
      day <= 10 &&
      Number.isFinite(year)
    ) {
      return `8-${day}-${String(year % 100).padStart(3, "0")}`;
    }
  }

  return normId_(v);
}

function normHomeroom_(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const tz = Session.getScriptTimeZone() || "GMT";
    const month = Number(Utilities.formatDate(v, tz, "M"));
    const day = Number(Utilities.formatDate(v, tz, "d"));

    if (month === 8 && day >= 1 && day <= 10) {
      return `8-${day}`;
    }
  }

  return norm_(v);
}

'''

s = replace_once(
    s,
    'function normPin_(v) {',
    helpers + 'function normPin_(v) {',
    "stored StudentID / homeroom normalizers",
)

old_fast_helpers = '''function appendRowFast_(sh, rowArr) {
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, rowArr.length).setValues([rowArr]);
  return r;
}'''

new_fast_helpers = '''const TEXT_COLUMNS_BY_SHEET_ = {
  HP_State: [1, 3],
  HP_Log: [3],
  XP_State: [2, 3],
  XP_Transactions: [2, 4],
  Skill_State: [1],
  Purchased_Skills: [2],
  Skill_Transactions: [2],
  Player_State: [1, 14],
  Inventory_Transactions: [2],
  Roster_Transactions: [2, 5],
  Archived_Roster: [1, 3],
  Ability_Transactions: [2],
  Media_Transactions: [2],
};

function prepareTextColumnsForWrite_(sh, startRow, rowCount, rowWidth) {
  if (!sh || rowCount < 1 || rowWidth < 1) return;
  const columns = TEXT_COLUMNS_BY_SHEET_[sh.getName()] || [];
  columns.forEach((column) => {
    if (column > 0 && column <= rowWidth) {
      sh.getRange(startRow, column, rowCount, 1).setNumberFormat("@");
    }
  });
}

function appendRowFast_(sh, rowArr) {
  const r = sh.getLastRow() + 1;
  prepareTextColumnsForWrite_(sh, r, 1, rowArr.length);
  sh.getRange(r, 1, 1, rowArr.length).setValues([rowArr]);
  return r;
}

function appendRowsFast_(sh, rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  const startRow = sh.getLastRow() + 1;
  prepareTextColumnsForWrite_(sh, startRow, rows.length, rows[0].length);
  sh.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
  return rows.length;
}'''

s = replace_once(s, old_fast_helpers, new_fast_helpers, "fast row helpers")

# Direct appendRow calls in purchased-skill and skill-transaction writers bypassed
# the text-safe helper. Route all of them through appendRowFast_.
purchased_old = 'ensurePurchasedSkillsSheet_().appendRow(['
skill_old = 'ensureSkillTxnSheet_().appendRow(['
if s.count(purchased_old) != 2:
    raise RuntimeError(f"Expected 2 Purchased_Skills appendRow calls, found {s.count(purchased_old)}")
if s.count(skill_old) != 3:
    raise RuntimeError(f"Expected 3 Skill_Transactions appendRow calls, found {s.count(skill_old)}")
s = s.replace(purchased_old, 'appendRowFast_(ensurePurchasedSkillsSheet_(), [')
s = s.replace(skill_old, 'appendRowFast_(ensureSkillTxnSheet_(), [')

currency_batch = '''      if (txnRows.length) {
        txn
          .getRange(
            txn.getLastRow() + 1,
            1,
            txnRows.length,
            txnRows[0].length
          )
          .setValues(txnRows);
      }'''
if s.count(currency_batch) != 2:
    raise RuntimeError(f"Expected 2 currency batch transaction writes, found {s.count(currency_batch)}")
s = s.replace(
    currency_batch,
    '''      if (txnRows.length) {
        appendRowsFast_(txn, txnRows);
      }''',
)

s = replace_once(
    s,
    '''    if (txnRows.length) {
      txn.getRange(txn.getLastRow() + 1, 1, txnRows.length, txnRows[0].length).setValues(txnRows);
    }''',
    '''    if (txnRows.length) {
      appendRowsFast_(txn, txnRows);
    }''',
    "inventory batch transaction write",
)

s = replace_once(
    s,
    '''    if (rows.length) {
      const txn = ensureAbilityTxnSheet_();
      txn
        .getRange(txn.getLastRow() + 1, 1, rows.length, rows[0].length)
        .setValues(rows);
    }''',
    '''    if (rows.length) {
      const txn = ensureAbilityTxnSheet_();
      appendRowsFast_(txn, rows);
    }''',
    "ability batch transaction write",
)

old_replace = '''function adminReplaceStudentIdInSheet_(sheetName, oldStudentIdRaw, newStudentIdRaw) {
  const sh = getSheetOptional_(sheetName);
  if (!sh || sh.getLastRow() < 2) return 0;

  const headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getDisplayValues()[0];
  const map = headerMap_(headers);
  const iId = idx_(map, "StudentID", "Student Id", "ID");
  if (iId < 0) return 0;

  const oldId = normId_(oldStudentIdRaw);
  const newId = normId_(newStudentIdRaw);
  const values = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getDisplayValues();
  let changed = 0;

  for (let i = 0; i < values.length; i++) {
    if (normId_(values[i][0]) !== oldId) continue;
    sh.getRange(i + 2, iId + 1).setNumberFormat("@").setValue(newId);
    changed++;
  }
  return changed;
}'''

new_replace = '''function adminReplaceStudentIdInSheet_(sheetName, oldStudentIdRaw, newStudentIdRaw) {
  const sh = getSheetOptional_(sheetName);
  if (!sh || sh.getLastRow() < 2) return 0;

  const headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getDisplayValues()[0];
  const map = headerMap_(headers);
  const iId = idx_(map, "StudentID", "Student Id", "ID");
  if (iId < 0) return 0;

  const oldId = normId_(oldStudentIdRaw);
  const newId = normId_(newStudentIdRaw);
  const values = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getValues();
  let changed = 0;

  for (let i = 0; i < values.length; i++) {
    if (normStoredStudentId_(values[i][0]) !== oldId) continue;
    sh.getRange(i + 2, iId + 1).setNumberFormat("@").setValue(newId);
    changed++;
  }
  return changed;
}'''

s = replace_once(s, old_replace, new_replace, "homeroom move ID migration")

old_delete = '''function adminDeleteRowsForStudentId_(sheetName, studentIdRaw) {
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
}'''

new_delete = '''function adminDeleteRowsForStudentId_(sheetName, studentIdRaw) {
  const sh = getSheetOptional_(sheetName);
  if (!sh || sh.getLastRow() < 2) return 0;
  const headers = sh
    .getRange(1, 1, 1, Math.max(1, sh.getLastColumn()))
    .getDisplayValues()[0];
  const map = headerMap_(headers);
  const iId = idx_(map, "StudentID", "Student Id", "ID");
  if (iId < 0) return 0;

  const studentId = normId_(studentIdRaw);
  const values = sh.getRange(2, iId + 1, sh.getLastRow() - 1, 1).getValues();
  const rows = [];
  values.forEach((row, index) => {
    if (normStoredStudentId_(row[0]) === studentId) rows.push(index + 2);
  });
  rows.sort((a, b) => b - a).forEach((rowNumber) => sh.deleteRow(rowNumber));
  return rows.length;
}'''

s = replace_once(s, old_delete, new_delete, "permanent delete ID cleanup")

# Skill_State is a canonical state table. Read any legacy date-coerced ID back as
# the intended row-derived StudentID until the row is rewritten/migrated.
skill_start = s.index('function loadSkillStateIndex_()')
skill_end = s.index('\nfunction ', skill_start + 1)
skill_block = s[skill_start:skill_end]
skill_block_new = replace_once(
    skill_block,
    '    const studentId = normId_(row[iId]);',
    '    const studentId = normStoredStudentId_(row[iId]);',
    "Skill_State legacy ID read",
)
s = s[:skill_start] + skill_block_new + s[skill_end:]

# Archived_Roster stores both StudentID and Homeroom; both must stay literal text.
s = replace_once(
    s,
    '    homeroom: norm_(values[2]),',
    '    homeroom: normHomeroom_(values[2]),',
    "archived snapshot homeroom read",
)
s = replace_once(
    s,
    '      homeroom: norm_(values[r][2]),',
    '      homeroom: normHomeroom_(values[r][2]),',
    "archived list homeroom read",
)
s = replace_once(
    s,
    '''  sh.getRange(rowNumber, 1).setNumberFormat("@");
  sh.getRange(rowNumber, 1, 1, payload.length).setValues([payload]);''',
    '''  sh.getRange(rowNumber, 1).setNumberFormat("@");
  sh.getRange(rowNumber, 3).setNumberFormat("@");
  sh.getRange(rowNumber, 1, 1, payload.length).setValues([payload]);''',
    "archived snapshot text formatting",
)

s = replace_once(
    s,
    '    sh.getRange(existingRow, col.Homeroom).setValue(student.homeroom);',
    '    sh.getRange(existingRow, col.Homeroom).setNumberFormat("@").setValue(student.homeroom);',
    "HP seed homeroom text formatting",
)
s = replace_once(
    s,
    '      hp.sh.getRange(hpSheetRow, hp.col.Homeroom).setValue(snapshot.homeroom);',
    '      hp.sh.getRange(hpSheetRow, hp.col.Homeroom).setNumberFormat("@").setValue(snapshot.homeroom);',
    "HP restore homeroom text formatting",
)
s = replace_once(
    s,
    '    if (hpRow) hp.sh.getRange(hpRow.sheetRow, hp.col.Homeroom).setValue(newHomeroom);',
    '    if (hpRow) hp.sh.getRange(hpRow.sheetRow, hp.col.Homeroom).setNumberFormat("@").setValue(newHomeroom);',
    "HP move homeroom text formatting",
)

apps_path.write_text(s, encoding="utf-8")

api_path = Path("src/pages/admin/adminApi.ts")
a = api_path.read_text(encoding="utf-8")
a = replace_once(
    a,
    'export const ADMIN_API_VERSION = "2026-09-01.5";',
    'export const ADMIN_API_VERSION = "2026-09-01.6";',
    "frontend API version",
)
api_path.write_text(a, encoding="utf-8")
