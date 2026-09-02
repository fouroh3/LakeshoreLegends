from pathlib import Path

p = Path('docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs')
s = p.read_text()

old = '''function adminYearRolloverActiveBattles_() {
  try {
    const battle = battleControlRows_();
    return (battle.rows || [])
      .filter((row) => norm_(row.status).toUpperCase() === "ACTIVE")
      .map((row) => norm_(row.homeroom))
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}'''
new = '''function adminYearRolloverActiveBattles_() {
  // Fail closed. If Battle_Control cannot be read, annual rollover must stop
  // rather than assuming there are no active battles.
  const battle = battleControlRows_();
  return (battle.rows || [])
    .filter((row) => norm_(row.status).toUpperCase() === "ACTIVE")
    .map((row) => norm_(row.homeroom))
    .filter(Boolean);
}'''
if old not in s:
    raise SystemExit('active battle helper anchor not found')
s = s.replace(old, new, 1)

old = '''  source.getSheets().forEach((sourceSheet) => {
    const copied = sourceSheet.copyTo(archive);
    copied.setName(sourceSheet.getName());

    const sourceRange = sourceSheet.getDataRange();
    const rows = sourceRange.getNumRows();
    const cols = sourceRange.getNumColumns();
    if (rows > 0 && cols > 0) {
      copied.getRange(1, 1, rows, cols).setValues(sourceRange.getValues());
    }
  });'''
new = '''  source.getSheets().forEach((sourceSheet) => {
    const copied = sourceSheet.copyTo(archive);
    copied.setName(sourceSheet.getName());

    const sourceRange = sourceSheet.getDataRange();
    const rows = sourceRange.getNumRows();
    const cols = sourceRange.getNumColumns();
    if (rows > 0 && cols > 0) {
      // CopyTo preserves formatting, validation, widths, and merged cells. To
      // freeze formulas safely, temporarily break merges in the copied data
      // range, write the source's evaluated values, then restore the merges.
      // This avoids setValues failures on presentation-style sheets.
      const mergedRanges = sourceRange
        .getMergedRanges()
        .map((range) => range.getA1Notation());
      const copiedRange = copied.getRange(1, 1, rows, cols);
      copiedRange.breakApart();
      copiedRange.setValues(sourceRange.getValues());
      mergedRanges.forEach((a1) => copied.getRange(a1).merge());
    }
  });'''
if old not in s:
    raise SystemExit('archive copy block anchor not found')
s = s.replace(old, new, 1)

p.write_text(s)
print('Hardened annual rollover archive + active-battle safety')
