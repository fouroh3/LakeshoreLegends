from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data.ts"
ADMIN = ROOT / "src/pages/admin/AdminPage.tsx"
ARCHIVED = ROOT / "src/pages/admin/components/ArchivedStudentsPanel.tsx"
GS = ROOT / "docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


# Force-refresh option for teacher admin so roster writes appear immediately.
data = DATA.read_text(encoding="utf-8")
data = replace_once(
    data,
    "export async function loadStudents(): Promise<Student[]> {\n  const now = Date.now();\n\n  if (cache && now - cache.at < CACHE_MS) {",
    "export async function loadStudents(options?: { force?: boolean }): Promise<Student[]> {\n  const now = Date.now();\n\n  if (!options?.force && cache && now - cache.at < CACHE_MS) {",
    "loadStudents force option",
)
DATA.write_text(data, encoding="utf-8")

admin = ADMIN.read_text(encoding="utf-8")
admin = replace_once(
    admin,
    "      const data = await loadStudents();",
    "      const data = await loadStudents({ force: true });",
    "admin forced roster refresh",
)
ADMIN.write_text(admin, encoding="utf-8")

# Surface partial media cleanup clearly after permanent deletion.
archived = ARCHIVED.read_text(encoding="utf-8")
archived = replace_once(
    archived,
    "      await adminDeleteArchivedStudent({\n        studentId: row.studentId,\n        reason: reason.trim(),\n      });\n      setNotice(`Permanently deleted stored data for ${row.studentName || row.studentId}.`);",
    "      const result = await adminDeleteArchivedStudent({\n        studentId: row.studentId,\n        reason: reason.trim(),\n      });\n      setNotice(\n        result.mediaCleanupRequired\n          ? `Stored data for ${row.studentName || row.studentId} was deleted, but one or more managed image files could not be removed automatically. Check Image Storage in System.`\n          : `Permanently deleted stored data for ${row.studentName || row.studentId}.`\n      );",
    "permanent delete cleanup notice",
)
ARCHIVED.write_text(archived, encoding="utf-8")

# Keep one minimal deletion audit/tombstone after all student transaction rows are erased.
gs = GS.read_text(encoding="utf-8")
old = '''    loaded.sh.getRange(state.sheetRow, 2, 1, 13).setValues([[
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

    SpreadsheetApp.flush();'''
new = '''    loaded.sh.getRange(state.sheetRow, 2, 1, 13).setValues([[
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

    // All prior roster transactions are erased above. Keep only a minimal
    // deletion tombstone so teachers can tell why this reserved ID can never
    // be reused without retaining the student's name or class details.
    appendRowFast_(ensureRosterTxnSheet_(), [
      new Date(),
      studentId,
      "",
      "PERMANENT_DELETE",
      "",
      "",
      reason,
      mediaCleanupRequired
        ? "Player data erased; one or more managed media files require manual cleanup."
        : "Player data erased; StudentID remains permanently reserved.",
    ]);

    SpreadsheetApp.flush();'''
gs = replace_once(gs, old, new, "permanent deletion tombstone audit")
GS.write_text(gs, encoding="utf-8")
