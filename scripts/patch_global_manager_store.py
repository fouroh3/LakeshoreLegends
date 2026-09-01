from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = ROOT / "src/pages/admin/adminApi.ts"
APP = ROOT / "src/pages/admin/AdminPage.tsx"
GS = ROOT / "docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"
SKILL_API = ROOT / "src/skillApi.ts"
SKILL_PANEL = ROOT / "src/pages/store/components/SkillTrainingPanel.tsx"


def once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


# ---------------- adminApi.ts ----------------
api = API.read_text(encoding="utf-8")
if "export type AdminStoreSettings" not in api:
    marker = "export type AdminMediaUploadResult = {"
    pos = api.find(marker)
    if pos < 0:
        raise RuntimeError("adminApi type insertion point missing")
    block = r'''export type AdminStoreSettings = {
  storeLocked: boolean;
  storePin: string;
  xpPerPoint: number;
  skillTokenCost: number;
  maxPointsPerOpen: number;
  windowLabel: string;
  updatedAt: string;
};

export type AdminStoreSnapshotResult = {
  ok?: boolean;
  error?: string;
  settings: AdminStoreSettings;
  [key: string]: any;
};

export type AdminStoreUpdateResult = AdminStoreSnapshotResult;

'''
    api = api[:pos] + block + api[pos:]

    api = once(
        api,
        '  | "adminupdatecompanion";',
        '  | "adminupdatecompanion"\n  | "adminstoresnapshot"\n  | "adminupdatestore";',
        "admin store actions",
    )

    api += r'''

export async function adminStoreSnapshot() {
  return postAdminAction<AdminStoreSnapshotResult>("adminstoresnapshot", {});
}

export async function adminUpdateStore(settings: AdminStoreSettings) {
  return postAdminAction<AdminStoreUpdateResult>("adminupdatestore", {
    settings,
  });
}
'''
API.write_text(api, encoding="utf-8")


# ---------------- AdminPage.tsx ----------------
app = APP.read_text(encoding="utf-8")
if 'StoreSettingsPanel' not in app:
    app = once(
        app,
        'import CompanionManagerPanel from "./components/CompanionManagerPanel";',
        'import CompanionManagerPanel from "./components/CompanionManagerPanel";\nimport StoreSettingsPanel from "./components/StoreSettingsPanel";',
        "store component import",
    )

    nav_anchor = '''              <SectionButton
                active={section === "currency"}
                title="XP & Skill Tokens"
                detail="Balances, rewards, and corrections."
                onClick={() => setSection("currency")}
              />'''
    nav_replacement = nav_anchor + '''
              <SectionButton
                active={section === "store"}
                title="Store"
                detail="Open/close, PIN, costs, and purchase limits."
                onClick={() => setSection("store")}
              />'''
    app = once(app, nav_anchor, nav_replacement, "store navigation")

    render_anchor = '''            {section === "system" && (
              <AdminPanel'''
    store_render = '''            {section === "store" && (
              <AdminPanel
                kicker="Student Store"
                title="Store Settings"
                description="Open or close student purchases, change the purchase PIN, and set the live XP and Skill Token costs without touching Store_Control."
              >
                <StoreSettingsPanel />
              </AdminPanel>
            )}

'''
    app = once(app, render_anchor, store_render + render_anchor, "store render")

APP.write_text(app, encoding="utf-8")


# ---------------- skillApi.ts ----------------
skill_api = SKILL_API.read_text(encoding="utf-8")
if "skillCost: number;" not in skill_api:
    skill_api = once(
        skill_api,
        "  skillTokens: number;\n  purchasedSkills: string[];",
        "  skillTokens: number;\n  skillCost: number;\n  purchasedSkills: string[];",
        "skill summary cost type",
    )
    skill_api = once(
        skill_api,
        "    skillTokens: Math.max(0, Math.round(toNum(data.skillTokens, 0))),\n    purchasedSkills:",
        "    skillTokens: Math.max(0, Math.round(toNum(data.skillTokens, 0))),\n    skillCost: Math.max(1, Math.round(toNum(data.skillCost, 1))),\n    purchasedSkills:",
        "skill summary cost parser",
    )
SKILL_API.write_text(skill_api, encoding="utf-8")


# ---------------- SkillTrainingPanel.tsx ----------------
panel = SKILL_PANEL.read_text(encoding="utf-8")
if "const skillCost =" not in panel:
    panel = once(
        panel,
        "  const skillTokens = summary?.skillTokens ?? 0;\n  const canAfford = skillTokens >= 1;",
        "  const skillTokens = summary?.skillTokens ?? 0;\n  const skillCost = Math.max(1, summary?.skillCost ?? 1);\n  const canAfford = skillTokens >= skillCost;",
        "skill cost logic",
    )
    panel = panel.replace("Cost: 1 Skill Token", "Cost: {skillCost} Skill Token{skillCost === 1 ? \"\" : \"s\"}")
    panel = panel.replace('{owned ? "Owned" : "1 Token"}', '{owned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}')
    panel = panel.replace('{selectedOwned ? "Owned" : "1 Token"}', '{selectedOwned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}')
    panel = panel.replace('<span className="font-semibold text-white">1 Skill Token</span>', '<span className="font-semibold text-white">{skillCost} Skill Token{skillCost === 1 ? "" : "s"}</span>')
    panel = panel.replace('Math.max(0, skillTokens - 1)', 'Math.max(0, skillTokens - skillCost)')
    panel = panel.replace('`Buy ${selectedSkill.name} (1 Token)`', '`Buy ${selectedSkill.name} (${skillCost} Token${skillCost === 1 ? "" : "s"})`')
SKILL_PANEL.write_text(panel, encoding="utf-8")


# ---------------- Apps Script ----------------
gs = GS.read_text(encoding="utf-8")
if "adminStoreSnapshot_" not in gs:
    # Extend Store_Control reader.
    gs = once(
        gs,
        '  const maxPointsPerOpen = Math.max(\n    1,\n    Math.round(asNum_(out.MaxPointsPerOpen, 999))\n  );\n  const openNonce = norm_(out.OpenNonce ?? "");',
        '  const maxPointsPerOpen = Math.max(\n    1,\n    Math.round(asNum_(out.MaxPointsPerOpen, 999))\n  );\n  const skillTokenCost = Math.max(1, Math.round(asNum_(out.SkillTokenCost, 1)));\n  const openNonce = norm_(out.OpenNonce ?? "");',
        "Store_Control skill cost reader",
    )
    gs = once(
        gs,
        '    maxPointsPerOpen,\n    openNonce,\n  };',
        '    maxPointsPerOpen,\n    skillTokenCost,\n    openNonce,\n  };',
        "Store_Control skill cost return",
    )

    # Public store state exposes cost.
    gs = once(
        gs,
        '    maxPointsPerOpen: ctl.maxPointsPerOpen,\n    openNonce: ctl.openNonce || "",',
        '    maxPointsPerOpen: ctl.maxPointsPerOpen,\n    skillTokenCost: ctl.skillTokenCost,\n    openNonce: ctl.openNonce || "",',
        "xpstate skill cost",
    )

    # Skill summary exposes live cost.
    gs = once(
        gs,
        '    skillTokens: state ? state.skillTokens : 0,\n    purchasedSkills: purchased.names,',
        '    skillTokens: state ? state.skillTokens : 0,\n    skillCost: Math.max(1, readXpControl_().skillTokenCost || 1),\n    purchasedSkills: purchased.names,',
        "skill summary live cost",
    )

    # Purchase uses Store_Control cost instead of hardcoded 1.
    gs = once(
        gs,
        '  const cost = SKILL_STORE.COST_PER_SKILL;',
        '  const cost = Math.max(1, ctl.skillTokenCost || SKILL_STORE.COST_PER_SKILL);',
        "purchase skill live cost",
    )

    store_backend = r'''
// =========================================================
// Global Teacher Admin: Store Settings
// =========================================================
function adminStoreControlValue_(keyRaw) {
  const key = norm_(keyRaw);
  const sh = getXpControlSheet_();
  const values = sh.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (norm_(values[r][0]) === key) return values[r][1];
  }
  return "";
}

function adminSetStoreControlValue_(keyRaw, value) {
  const key = norm_(keyRaw);
  const sh = getXpControlSheet_();
  const values = sh.getDataRange().getValues();
  for (let r = 1; r < values.length; r++) {
    if (norm_(values[r][0]) !== key) continue;
    sh.getRange(r + 1, 2).setValue(value);
    return r + 1;
  }
  const row = Math.max(2, sh.getLastRow() + 1);
  sh.getRange(row, 1, 1, 2).setValues([[key, value]]);
  return row;
}

function adminStoreSettingsPayload_() {
  const ctl = readXpControl_();
  const updatedRaw = adminStoreControlValue_("UpdatedAt");
  return {
    storeLocked: !!ctl.storeLocked,
    storePin: normPin_(ctl.storePin || ""),
    xpPerPoint: Math.max(1, Math.round(asNum_(ctl.xpPerPoint, 5))),
    skillTokenCost: Math.max(1, Math.round(asNum_(ctl.skillTokenCost, 1))),
    maxPointsPerOpen: Math.max(1, Math.round(asNum_(ctl.maxPointsPerOpen, 8))),
    windowLabel: norm_(ctl.windowLabel || ""),
    updatedAt:
      updatedRaw instanceof Date
        ? updatedRaw.toISOString()
        : norm_(updatedRaw || ""),
  };
}

function adminStoreSnapshot_(args) {
  const verified = verifyTeacher_(args || {});
  return {
    ok: true,
    teacherToken: verified.token,
    settings: adminStoreSettingsPayload_(),
    now: new Date().toISOString(),
  };
}

function adminUpdateStore_(args) {
  const verified = verifyTeacher_(args || {});
  const settings = args.settings || {};
  const storeLocked = toBool_(settings.storeLocked, true);
  const storePin = normPin_(settings.storePin || "");
  const xpPerPoint = Math.max(1, Math.min(999, Math.round(asNum_(settings.xpPerPoint, 5))));
  const skillTokenCost = Math.max(1, Math.min(99, Math.round(asNum_(settings.skillTokenCost, 1))));
  const maxPointsPerOpen = Math.max(1, Math.min(99, Math.round(asNum_(settings.maxPointsPerOpen, 8))));
  const windowLabel = norm_(settings.windowLabel || "");

  if (!storePin) throw new Error("Store PIN cannot be blank.");
  if (!windowLabel) throw new Error("Store window label cannot be blank.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);
  try {
    const nowIso = new Date().toISOString();
    const openNonce = Utilities.getUuid();

    adminSetStoreControlValue_("StoreLocked", storeLocked);
    adminSetStoreControlValue_("StorePIN", storePin);
    adminSetStoreControlValue_("XPPerPoint", xpPerPoint);
    adminSetStoreControlValue_("SkillTokenCost", skillTokenCost);
    adminSetStoreControlValue_("WindowLabel", windowLabel);
    adminSetStoreControlValue_("MaxPointsPerOpen", maxPointsPerOpen);
    adminSetStoreControlValue_("OpenNonce", openNonce);
    adminSetStoreControlValue_("UpdatedAt", nowIso);

    SpreadsheetApp.flush();
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      teacherToken: verified.token,
      settings: adminStoreSettingsPayload_(),
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
'''.strip()

    routing_marker = "// =========================================================\n// Web App Routing + Endpoints"
    pos = gs.find(routing_marker)
    if pos < 0:
        raise RuntimeError("Apps Script routing marker missing")
    gs = gs[:pos] + store_backend + "\n\n" + gs[pos:]

    route_anchor = '''      case "adminupdatecompanion":
        return jsonOut_(adminUpdateCompanion_(body));

      default:'''
    route_replacement = '''      case "adminupdatecompanion":
        return jsonOut_(adminUpdateCompanion_(body));

      case "adminstoresnapshot":
        return jsonOut_(adminStoreSnapshot_(body));

      case "adminupdatestore":
        return jsonOut_(adminUpdateStore_(body));

      default:'''
    gs = once(gs, route_anchor, route_replacement, "store admin routes")

GS.write_text(gs, encoding="utf-8")
print("Patched Store Manager, dynamic skill cost, and Apps Script store controls.")
