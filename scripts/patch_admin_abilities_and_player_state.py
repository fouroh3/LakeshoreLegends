from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src/pages/admin/AdminPage.tsx"
GS = ROOT / "docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"
ABILITIES_DOC = ROOT / "docs/admin-abilities-backend.md"


def replace_between(source: str, start: str, end: str, replacement: str) -> str:
    a = source.find(start)
    if a < 0:
        raise RuntimeError(f"Start marker not found: {start[:100]}")
    b = source.find(end, a)
    if b < 0:
        raise RuntimeError(f"End marker not found: {end[:100]}")
    return source[:a] + replacement.rstrip() + "\n\n" + source[b:]


# -----------------------------------------------------------------------------
# AdminPage: add Abilities Manager section + handlers.
# -----------------------------------------------------------------------------
app = APP.read_text(encoding="utf-8")

app = app.replace(
    "  adminAdjustInventory,\n  adminArchiveStudent,",
    "  adminAdjustInventory,\n  adminAdjustSkill,\n  adminArchiveStudent,",
    1,
)
app = app.replace(
    "  adminSystemStatus,\n  adminUpdateStudent,",
    "  adminSystemStatus,\n  adminUpdateAbilities,\n  adminUpdateStudent,",
    1,
)
app = app.replace(
    "  type AdminArchiveStudentResult,\n  type AdminCurrencyAdjustmentResult,",
    "  type AdminAbilityUpdateResult,\n  type AdminArchiveStudentResult,\n  type AdminCurrencyAdjustmentResult,",
    1,
)
app = app.replace(
    "  type AdminInventoryAdjustmentResult,\n  type AdminSystemStatusResult,",
    "  type AdminInventoryAdjustmentResult,\n  type AdminSkillAdjustmentResult,\n  type AdminSystemStatusResult,",
    1,
)
app = app.replace(
    "  type AdminCurrency,\n  type AdminCurrencyMode,\n  type AdminInventoryMode,",
    "  type AdminAttributeValues,\n  type AdminCurrency,\n  type AdminCurrencyMode,\n  type AdminInventoryMode,\n  type AdminSkillMode,",
    1,
)
app = app.replace(
    'import InventoryManagerPanel from "./components/InventoryManagerPanel";',
    'import InventoryManagerPanel from "./components/InventoryManagerPanel";\nimport AbilitiesManagerPanel from "./components/AbilitiesManagerPanel";',
    1,
)

handler_anchor = "  const handleAdjustInventory = async (args: {"
if "const handleUpdateAbilities" not in app:
    pos = app.find(handler_anchor)
    if pos < 0:
        raise RuntimeError("Inventory handler anchor not found")
    handlers = r'''  const handleUpdateAbilities = async (args: {
    studentId: string;
    baseAttributes: AdminAttributeValues;
    bonusAttributes: AdminAttributeValues;
    rosterSkills: string[];
    reason: string;
  }): Promise<AdminAbilityUpdateResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminUpdateAbilities(args);
      await reloadStudents();
      setNotice({
        type: "ok",
        msg: "Updated attributes and roster skills. Changes were recorded in the ability audit log.",
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Ability update failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleAdjustSkill = async (args: {
    studentId: string;
    mode: AdminSkillMode;
    skillName: string;
    reason: string;
  }): Promise<AdminSkillAdjustmentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminAdjustSkill(args);
      setNotice({
        type: "ok",
        msg: `${args.mode === "GRANT" ? "Granted" : "Revoked"} ${args.skillName}.`,
      });
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Skill change failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

'''
    app = app[:pos] + handlers + app[pos:]

app = app.replace(
    '<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">',
    '<div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">',
    1,
)

inventory_button = '''          <SectionButton
            active={section === "inventory"}
            title="Inventory Manager"
            detail="Give or remove cards for students, guilds, or classes."
            onClick={() => setSection("inventory")}
          />'''
if 'title="Abilities Manager"' not in app:
    abilities_button = '''          <SectionButton
            active={section === "abilities"}
            title="Abilities Manager"
            detail="Edit attributes, bonuses, roster skills, and teacher-granted skills."
            onClick={() => setSection("abilities")}
          />
'''
    app = app.replace(inventory_button, abilities_button + inventory_button, 1)

inventory_render = '''        {section === "inventory" && (
          <AdminPanel'''
if 'section === "abilities"' not in app.split(inventory_render)[0]:
    abilities_render = '''        {section === "abilities" && (
          <AdminPanel
            kicker="Attributes & Skills"
            title="Abilities Manager"
            description="Correct base attributes, purchased/admin bonuses, roster skills, and purchased or teacher-granted skills without editing class sheets by hand."
          >
            <AbilitiesManagerPanel
              students={students}
              busy={busy || !playerStateReady}
              onSave={handleUpdateAbilities}
              onAdjustSkill={handleAdjustSkill}
            />
          </AdminPanel>
        )}

'''
    app = app.replace(inventory_render, abilities_render + inventory_render, 1)

APP.write_text(app, encoding="utf-8")

# -----------------------------------------------------------------------------
# Apps Script: protect StudentID from date coercion + integrity checks + abilities.
# -----------------------------------------------------------------------------
gs = GS.read_text(encoding="utf-8")
abilities_doc = ABILITIES_DOC.read_text(encoding="utf-8")
try:
    abilities = abilities_doc.split("```js", 1)[1].split("```", 1)[0].strip()
except IndexError as exc:
    raise RuntimeError("Could not extract abilities backend block") from exc

# Accurate build header.
gs = gs.replace(
    " *   - Student rename + archive lifecycle\n",
    " *   - Student rename + archive lifecycle\n *   - Attribute + skill management\n *   - Player_State StudentID integrity protection\n",
    1,
)

ensure_player_state = r'''function ensurePlayerStateSheet_() {
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
}'''
gs = replace_between(
    gs,
    "function ensurePlayerStateSheet_() {",
    "function ensureInventoryTxnSheet_() {",
    ensure_player_state,
)

status_block = r'''function playerStateIdIntegrity_() {
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
}'''
gs = replace_between(
    gs,
    "function playerStateStatusPayload_(teacherToken) {",
    "function adminSystemStatus_(args) {",
    status_block,
)

# Migration must only return early when lookup + ID integrity are both healthy.
gs = gs.replace(
    '''  if (masterPlayerStateLookupWired_()) {
    return playerStateStatusPayload_(verified.token);
  }

  const lock = LockService.getScriptLock();''',
    '''  const initialStatus = playerStateStatusPayload_(verified.token);
  if (initialStatus.playerStateReady) {
    return initialStatus;
  }

  if (initialStatus.masterLookupWired && !initialStatus.idIntegrityOk) {
    throw new Error(
      "Player_State StudentID integrity failed. Restore from the latest PlayerState_Backup before running migration again."
    );
  }

  const lock = LockService.getScriptLock();''',
    1,
)
gs = gs.replace(
    '''    if (masterPlayerStateLookupWired_()) {
      return playerStateStatusPayload_(verified.token);
    }

    const master = getSheet_(CFG.STUDENTS_SHEET);''',
    '''    const lockedStatus = playerStateStatusPayload_(verified.token);
    if (lockedStatus.playerStateReady) {
      return lockedStatus;
    }

    const master = getSheet_(CFG.STUDENTS_SHEET);''',
    1,
)

# Force migration destination IDs to text before bulk setValues.
gs = gs.replace(
    '''    if (rows.length) {
      state.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    installMasterPlayerStateLookups_();''',
    '''    if (rows.length) {
      state.getRange(2, 1, rows.length, 1).setNumberFormat("@");
      state.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }

    installMasterPlayerStateLookups_();''',
    1,
)

# New Player_State rows must also write the ID into a text-formatted cell first.
old_append = '''  if (!row) {
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
    row = loaded.index.get(studentId);'''
new_append = '''  if (!row) {
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
    row = loaded.index.get(studentId);'''
if old_append not in gs:
    raise RuntimeError("ensurePlayerStateStudent append block not found")
gs = gs.replace(old_append, new_append, 1)

# Add abilities backend before routing.
route_marker = "// =========================================================\n// Web App Routing + Endpoints"
if "const ADMIN_ABILITIES = {" not in gs:
    pos = gs.find(route_marker)
    if pos < 0:
        raise RuntimeError("Web routing marker not found")
    gs = gs[:pos] + abilities.rstrip() + "\n\n" + gs[pos:]

# Prevent buying a skill already present on the roster, not just in Purchased_Skills.
purchase_anchor = '''    const purchased = purchasedSkillIdsForStudent_(studentId);

    if (purchased.ids.has(skillId)) {'''
if "adminRosterSkillsForStudent_(studentId)" not in gs.split("function purchaseSkill_(args) {", 1)[1].split("// ================================================================\n// ========================= FINAL EXAMINER", 1)[0]:
    purchase_replacement = '''    const rosterSkillIds = new Set(
      adminRosterSkillsForStudent_(studentId).map((name) => normalizeSkillId_(name))
    );
    if (rosterSkillIds.has(skillId)) {
      throw new Error("Skill already owned.");
    }

    const purchased = purchasedSkillIdsForStudent_(studentId);

    if (purchased.ids.has(skillId)) {'''
    if purchase_anchor not in gs:
        raise RuntimeError("Purchase skill duplicate anchor not found")
    gs = gs.replace(purchase_anchor, purchase_replacement, 1)

# Add ability routes.
route_anchor = '''      case "adminarchivestudent":
        return jsonOut_(adminArchiveStudent_(body));

      default:'''
route_replacement = '''      case "adminarchivestudent":
        return jsonOut_(adminArchiveStudent_(body));

      case "adminabilitysnapshot":
        return jsonOut_(adminAbilitySnapshot_(body));

      case "adminupdateabilities":
        return jsonOut_(adminUpdateAbilities_(body));

      case "adminadjustskill":
        return jsonOut_(adminAdjustSkill_(body));

      default:'''
if 'case "adminabilitysnapshot"' not in gs:
    if route_anchor not in gs:
        raise RuntimeError("Ability route anchor not found")
    gs = gs.replace(route_anchor, route_replacement, 1)

# Ensure ability audit sheet through normal ensure paths.
for anchor in [
    '''        ensureRosterTxnSheet_();
        ensureFinalExaminerSheets_();''',
    '''  ensureRosterTxnSheet_();
  ensureFinalExaminerSheets_();''',
]:
    if anchor in gs:
        gs = gs.replace(
            anchor,
            anchor.replace("ensureFinalExaminerSheets_();", "ensureAbilityTxnSheet_();\n" + ("        " if anchor.startswith("        ") else "  ") + "ensureFinalExaminerSheets_();"),
            1,
        )

GS.write_text(gs, encoding="utf-8")

# Validate the generated Apps Script as JavaScript.
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
    tmp.write(gs)
    check_path = tmp.name
subprocess.run(["node", "--check", check_path], check=True)
print("Patched AdminPage and full Apps Script; Apps Script syntax check passed.")
