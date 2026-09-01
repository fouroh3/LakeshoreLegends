from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "src/pages/admin/AdminPage.tsx"
GS = ROOT / "docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


# -----------------------------------------------------------------------------
# React AdminPage wiring + teacher-friendly navigation.
# -----------------------------------------------------------------------------
app = APP.read_text(encoding="utf-8")

app = replace_once(
    app,
    'import { loadStudents } from "../../data";',
    'import {\n  Activity,\n  Coins,\n  Database,\n  Image as ImageIcon,\n  LayoutDashboard,\n  PackageOpen,\n  PawPrint,\n  Shield,\n  Sparkles,\n  Users,\n} from "lucide-react";\nimport { loadStudents } from "../../data";',
    "lucide import",
)

app = replace_once(
    app,
    '  adminArchiveStudent,\n  adminAssignGuildBatch,\n  adminImportStudents,',
    '  adminArchiveStudent,\n  adminAssignGuildBatch,\n  adminConfigureMedia,\n  adminImportStudents,\n  adminMoveStudent,',
    "admin function imports 1",
)
app = replace_once(
    app,
    '  adminUpdateAbilities,\n  adminUpdateStudent,',
    '  adminUpdateAbilities,\n  adminUpdateCompanion,\n  adminUpdateStudent,\n  adminUploadMedia,',
    "admin function imports 2",
)
app = replace_once(
    app,
    '  type AdminInventoryAdjustmentResult,\n  type AdminSkillAdjustmentResult,',
    '  type AdminConfigureMediaResult,\n  type AdminCompanionUpdateResult,\n  type AdminInventoryAdjustmentResult,\n  type AdminMediaUploadResult,\n  type AdminMoveStudentResult,\n  type AdminSkillAdjustmentResult,',
    "admin type imports",
)
app = replace_once(
    app,
    '  type AdminAttributeValues,\n  type AdminCurrency,',
    '  type AdminAttributeValues,\n  type AdminCompanionStatus,\n  type AdminCurrency,',
    "admin constants import",
)
app = replace_once(
    app,
    'import AbilitiesManagerPanel from "./components/AbilitiesManagerPanel";',
    'import AbilitiesManagerPanel from "./components/AbilitiesManagerPanel";\nimport HeroImageManagerPanel from "./components/HeroImageManagerPanel";\nimport CompanionManagerPanel from "./components/CompanionManagerPanel";',
    "new component imports",
)

app = app.replace(
    '"rounded-2xl border px-4 py-3 text-left transition",',
    '"w-full rounded-2xl border px-4 py-3 text-left transition",',
    1,
)
app = app.replace(
    'const [section, setSection] = useState<AdminSection>("students");',
    'const [section, setSection] = useState<AdminSection>("overview");',
    1,
)

count_anchor = '''  const unassignedCount = useMemo(
    () => students.filter((student) => !String(student.guild || "").trim()).length,
    [students]
  );
'''
count_replacement = count_anchor + '''
  const missingHeroCount = useMemo(
    () => students.filter((student) => !String(student.portraitUrl || "").trim()).length,
    [students]
  );

  const missingCompanionCount = useMemo(
    () => students.filter((student) => !String(student.companionUrl || "").trim()).length,
    [students]
  );
'''
app = replace_once(app, count_anchor, count_replacement, "admin stat counts")

handler_anchor = '  const handleArchiveStudent = async (args: {'
handler_pos = app.find(handler_anchor)
if handler_pos < 0:
    raise RuntimeError("Missing handler insertion anchor")

handlers = r'''  const handleMoveStudent = async (args: {
    studentId: string;
    homeroom: string;
    reason: string;
  }): Promise<AdminMoveStudentResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminMoveStudent(args);
      const oldId = normId(args.studentId);
      const nextId = normId(result.studentId || args.studentId);

      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === oldId
            ? { ...student, id: nextId, homeroom: args.homeroom }
            : student
        )
      );

      setNotice({
        type: "ok",
        msg: `Moved student to ${args.homeroom}. New StudentID: ${nextId}. All linked game state migrated automatically.`,
      });
      await reloadSystemStatus();
      return result;
    } catch (err: any) {
      setNotice({
        type: "err",
        msg: err?.message || "Homeroom move failed.",
      });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleConfigureMedia = async (args: {
    token: string;
    branch?: string;
  }): Promise<AdminConfigureMediaResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminConfigureMedia(args);
      setSystemStatus((prev) => ({ ...(prev || {}), ...result }));
      setNotice({
        type: "ok",
        msg: "Image storage connected. Hero and companion uploads are ready.",
      });
      return result;
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Media connection failed." });
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleHeroUpload = async (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
  }): Promise<AdminMediaUploadResult> => {
    const result = await adminUploadMedia({ ...args, kind: "PORTRAIT" });
    const id = normId(args.studentId);
    setStudents((prev) =>
      prev.map((student) =>
        normId(student.id) === id
          ? { ...student, portraitUrl: result.publicUrl || student.portraitUrl }
          : student
      )
    );
    return result;
  };

  const handleCompanionUpload = async (args: {
    studentId: string;
    fileName: string;
    mimeType: string;
    base64: string;
    companionStatus: AdminCompanionStatus;
  }): Promise<AdminMediaUploadResult> => {
    const result = await adminUploadMedia({ ...args, kind: "COMPANION" });
    const id = normId(args.studentId);
    setStudents((prev) =>
      prev.map((student) =>
        normId(student.id) === id
          ? {
              ...student,
              companionUrl: result.publicUrl || student.companionUrl,
              companionStatus: args.companionStatus,
            }
          : student
      )
    );
    return result;
  };

  const handleUpdateCompanion = async (args: {
    studentId: string;
    companionUrl: string;
    companionStatus: AdminCompanionStatus;
  }): Promise<AdminCompanionUpdateResult> => {
    setBusy(true);
    setNotice(null);

    try {
      const result = await adminUpdateCompanion(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? {
                ...student,
                companionUrl: result.companionUrl ?? args.companionUrl,
                companionStatus: result.companionStatus ?? args.companionStatus,
              }
            : student
        )
      );
      setNotice({ type: "ok", msg: "Companion record updated." });
      return result;
    } catch (err: any) {
      setNotice({ type: "err", msg: err?.message || "Companion update failed." });
      throw err;
    } finally {
      setBusy(false);
    }
  };

'''
app = app[:handler_pos] + handlers + app[handler_pos:]

nav_start = app.find('        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">')
if nav_start < 0:
    raise RuntimeError("Missing old admin navigation start")
outer_close = app.rfind('      </div>\n    </div>\n  );')
if outer_close < 0 or outer_close <= nav_start:
    raise RuntimeError("Missing AdminPage outer close")

new_body = r'''        <div className="grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="self-start rounded-[28px] border border-white/10 bg-zinc-950/65 p-3 lg:sticky lg:top-5">
            <div className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Overview
            </div>
            <SectionButton
              active={section === "overview"}
              title="Control Center"
              detail="See what needs attention and jump to common tasks."
              onClick={() => setSection("overview")}
            />

            <div className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Players
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "students"}
                title="Roster & Demographics"
                detail="Import, rename, move classes, or archive students."
                onClick={() => setSection("students")}
              />
              <SectionButton
                active={section === "heroImages"}
                title="Hero Images"
                detail="Bulk-match and upload student portraits."
                onClick={() => setSection("heroImages")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Characters
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "companions"}
                title="Companions"
                detail="Images, living/fallen status, and replacements."
                onClick={() => setSection("companions")}
              />
              <SectionButton
                active={section === "abilities"}
                title="Attributes & Skills"
                detail="Base values, bonuses, roster skills, and grants."
                onClick={() => setSection("abilities")}
              />
              <SectionButton
                active={section === "inventory"}
                title="Inventory & Cards"
                detail="Give or remove cards for any group."
                onClick={() => setSection("inventory")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              Groups & Rewards
            </div>
            <div className="space-y-2">
              <SectionButton
                active={section === "guilds"}
                title="Guilds"
                detail="Assign and move students in bulk."
                onClick={() => setSection("guilds")}
              />
              <SectionButton
                active={section === "currency"}
                title="XP & Skill Tokens"
                detail="Balances, rewards, and corrections."
                onClick={() => setSection("currency")}
              />
            </div>

            <div className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
              System
            </div>
            <SectionButton
              active={section === "system"}
              title="Data Health"
              detail="Player State, media connection, and integrity checks."
              onClick={() => setSection("system")}
            />
          </aside>

          <main className="min-w-0">
            {section === "overview" && (
              <div className="space-y-5">
                <AdminPanel
                  kicker="Teacher Control Center"
                  title="Everything important, at a glance"
                  description="Use the cards below to jump directly to the task you need. Live battle controls remain separate in the Battle Console."
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: "Active Players", value: students.length, icon: <Users size={20} />, section: "students" as AdminSection, tone: "text-cyan-100" },
                      { label: "Missing Hero Images", value: missingHeroCount, icon: <ImageIcon size={20} />, section: "heroImages" as AdminSection, tone: missingHeroCount ? "text-amber-100" : "text-emerald-100" },
                      { label: "Missing Companions", value: missingCompanionCount, icon: <PawPrint size={20} />, section: "companions" as AdminSection, tone: missingCompanionCount ? "text-amber-100" : "text-emerald-100" },
                      { label: "Unassigned Guilds", value: unassignedCount, icon: <Shield size={20} />, section: "guilds" as AdminSection, tone: unassignedCount ? "text-amber-100" : "text-emerald-100" },
                      { label: "Homerooms", value: homeroomCount, icon: <Activity size={20} />, section: "students" as AdminSection, tone: "text-violet-100" },
                      { label: "Game Data", value: playerStateReady ? "Healthy" : "Needs attention", icon: <Database size={20} />, section: "system" as AdminSection, tone: playerStateReady ? "text-emerald-100" : "text-red-100" },
                    ].map((card) => (
                      <button
                        key={card.label}
                        type="button"
                        onClick={() => setSection(card.section)}
                        className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/20 hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="rounded-2xl border border-white/10 bg-black/25 p-2.5 text-cyan-100/80">{card.icon}</div>
                          <div className={`text-2xl font-black ${card.tone}`}>{card.value}</div>
                        </div>
                        <div className="mt-4 text-sm font-black text-white">{card.label}</div>
                        <div className="mt-1 text-xs text-zinc-600 group-hover:text-zinc-500">Open manager →</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <button type="button" onClick={() => setSection("students")} className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.06] p-4 text-left hover:bg-cyan-300/[0.09]">
                      <Users size={19} className="text-cyan-100" />
                      <div className="mt-3 font-black text-white">Add / Move Students</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">Beginning-of-year import, corrections, class changes.</div>
                    </button>
                    <button type="button" onClick={() => setSection("heroImages")} className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.05] p-4 text-left hover:bg-violet-300/[0.08]">
                      <ImageIcon size={19} className="text-violet-100" />
                      <div className="mt-3 font-black text-white">Import Hero Images</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">Drop a whole folder and review only uncertain matches.</div>
                    </button>
                    <button type="button" onClick={() => setSection("currency")} className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-left hover:bg-emerald-300/[0.08]">
                      <Coins size={19} className="text-emerald-100" />
                      <div className="mt-3 font-black text-white">Give Rewards</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">XP or Skill Tokens to students, guilds, or classes.</div>
                    </button>
                    <button type="button" onClick={() => setSection("inventory")} className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4 text-left hover:bg-amber-300/[0.08]">
                      <PackageOpen size={19} className="text-amber-100" />
                      <div className="mt-3 font-black text-white">Manage Cards</div>
                      <div className="mt-1 text-xs leading-5 text-zinc-500">View, give, or remove inventory cards.</div>
                    </button>
                  </div>
                </AdminPanel>
              </div>
            )}

            {section === "students" && (
              <div className="space-y-5">
                <AdminPanel
                  kicker="Roster Setup"
                  title="Bulk Paste Students"
                  description="Copy names directly from your school spreadsheet. Choose the class once, paste the names, verify the generated IDs, and import the whole group together."
                >
                  <StudentImportPanel
                    students={students}
                    busy={busy || !playerStateReady}
                    onImport={handleImport}
                  />
                </AdminPanel>

                <AdminPanel
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
                </AdminPanel>
              </div>
            )}

            {section === "heroImages" && (
              <AdminPanel
                kicker="Player Media"
                title="Hero Image Import"
                description="Drop a whole batch of student hero images. Global Manager matches filenames automatically, flags only uncertain rows, and updates PortraitURL after upload."
              >
                <HeroImageManagerPanel
                  students={students}
                  busy={busy}
                  mediaConfigured={Boolean(systemStatus?.mediaConfigured)}
                  mediaRepo={systemStatus?.mediaRepo}
                  mediaBranch={systemStatus?.mediaBranch}
                  onConfigureMedia={handleConfigureMedia}
                  onUpload={handleHeroUpload}
                />
              </AdminPanel>
            )}

            {section === "companions" && (
              <AdminPanel
                kicker="Companion Records"
                title="Companion Manager"
                description="Upload or replace companion images, remove outdated images, and set each companion to Living or Fallen without touching Player_State or class sheets."
              >
                <CompanionManagerPanel
                  students={students}
                  busy={busy || !playerStateReady}
                  mediaConfigured={Boolean(systemStatus?.mediaConfigured)}
                  onUpload={handleCompanionUpload}
                  onUpdate={handleUpdateCompanion}
                />
              </AdminPanel>
            )}

            {section === "guilds" && (
              <AdminPanel
                kicker="Guilds"
                title="Assign / Manage Guilds"
                description="Filter the roster, select any group of students, then move them together. Guild changes synchronize the roster and HP guild state."
              >
                <GuildManagerPanel
                  students={students}
                  loading={loading}
                  busy={busy}
                  onAssign={handleAssignGuild}
                  onRefresh={reloadStudents}
                />
              </AdminPanel>
            )}

            {section === "currency" && (
              <AdminPanel
                kicker="Rewards & Corrections"
                title="XP / Skill Token Manager"
                description="See current balances, target a student, guild, class, or filtered group, and add or remove currency with a reason recorded in the transaction logs."
              >
                <CurrencyManagerPanel
                  students={students}
                  busy={busy}
                  onAdjust={handleAdjustCurrency}
                />
              </AdminPanel>
            )}

            {section === "abilities" && (
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

            {section === "inventory" && (
              <AdminPanel
                kicker="Cards & Rewards"
                title="Inventory / Card Manager"
                description="Choose any card from the live card library, target students by class or guild, and give or remove cards with an audit reason."
              >
                <InventoryManagerPanel
                  students={students}
                  busy={busy || !playerStateReady}
                  onAdjust={handleAdjustInventory}
                />
              </AdminPanel>
            )}

            {section === "system" && (
              <AdminPanel
                kicker="System Health"
                title="Data Health & Connections"
                description="A plain-language view of the protections underneath the game. Normal teacher work should never require opening these sheets directly."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <Database size={20} className={playerStateReady ? "text-emerald-200" : "text-red-200"} />
                    <div className="mt-3 font-black text-white">Player Data</div>
                    <div className={`mt-1 text-sm font-bold ${playerStateReady ? "text-emerald-100" : "text-red-100"}`}>
                      {playerStateReady ? "Healthy & StudentID-keyed" : "Needs attention"}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-500">
                      {systemStatus?.playerStateRows ?? 0} Player_State records • ID integrity {systemStatus?.idIntegrityOk ? "passed" : "not confirmed"}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <ImageIcon size={20} className={systemStatus?.mediaConfigured ? "text-emerald-200" : "text-amber-200"} />
                    <div className="mt-3 font-black text-white">Image Storage</div>
                    <div className={`mt-1 text-sm font-bold ${systemStatus?.mediaConfigured ? "text-emerald-100" : "text-amber-100"}`}>
                      {systemStatus?.mediaConfigured ? "Connected" : "Not connected"}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-zinc-500">
                      {systemStatus?.mediaRepo || "LakeshoreLegends"}{systemStatus?.mediaBranch ? ` • ${systemStatus.mediaBranch}` : ""}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <Sparkles size={20} className="text-cyan-200" />
                    <div className="mt-3 font-black text-white">Teacher Tools</div>
                    <div className="mt-1 text-sm font-bold text-cyan-100">Ready</div>
                    <button type="button" onClick={reloadSystemStatus} disabled={statusLoading} className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-xs font-black text-cyan-100 disabled:opacity-50">
                      {statusLoading ? "Checking..." : "Recheck System"}
                    </button>
                  </div>
                </div>
              </AdminPanel>
            )}
          </main>
        </div>
'''

app = app[:nav_start] + new_body + app[outer_close:]
APP.write_text(app, encoding="utf-8")


# -----------------------------------------------------------------------------
# Apps Script: homeroom migration + media/companion manager.
# -----------------------------------------------------------------------------
gs = GS.read_text(encoding="utf-8")

# Accurate build header.
if "Hero portrait + companion media uploads" not in gs:
    gs = gs.replace(
        " *   - Player_State StudentID integrity protection\n",
        " *   - Player_State StudentID integrity protection\n *   - Safe homeroom migration\n *   - Hero portrait + companion media uploads\n *   - Companion living/fallen management\n",
        1,
    )

# Add a moved-to field to Player_State while preserving A:J used by Master lookups.
if '"MovedToStudentID"' not in gs:
    gs = gs.replace(
        '    "UpdatedAt",\n  ]);',
        '    "UpdatedAt",\n    "MovedToStudentID",\n  ]);',
        1,
    )
    gs = gs.replace(
        '  const iUpdatedAt = idx_(map, "UpdatedAt", "Updated At");',
        '  const iUpdatedAt = idx_(map, "UpdatedAt", "Updated At");\n  const iMovedTo = idx_(map, "MovedToStudentID", "Moved To Student ID");',
        1,
    )
    gs = gs.replace(
        '      updatedAt: norm_(iUpdatedAt >= 0 ? row[iUpdatedAt] : ""),\n      col: {',
        '      updatedAt: norm_(iUpdatedAt >= 0 ? row[iUpdatedAt] : ""),\n      movedToStudentId: normId_(iMovedTo >= 0 ? row[iMovedTo] : ""),\n      col: {',
        1,
    )
    gs = gs.replace(
        '        UpdatedAt: iUpdatedAt + 1,\n      },',
        '        UpdatedAt: iUpdatedAt + 1,\n        MovedToStudentID: iMovedTo + 1,\n      },',
        1,
    )
    gs = gs.replace(
        '    loaded.sh.getRange(newRow, 2, 1, 12).setValues([[',
        '    loaded.sh.getRange(newRow, 2, 1, 13).setValues([[',
        1,
    )
    gs = gs.replace(
        '      "",\n      nowIso,\n    ]]);',
        '      "",\n      nowIso,\n      "",\n    ]]);',
        1,
    )

backend = r'''
// =========================================================
// Global Teacher Admin: Homeroom Moves + Media + Companions
// =========================================================
const ADMIN_MEDIA = {
  TOKEN_PROP: "LL_GITHUB_TOKEN",
  REPO_PROP: "LL_GITHUB_REPO",
  BRANCH_PROP: "LL_GITHUB_MEDIA_BRANCH",
  DEFAULT_REPO: "fouroh3/LakeshoreLegends",
  DEFAULT_BRANCH: "main",
  TXN_SHEET: "Media_Transactions",
  MAX_BYTES: 8 * 1024 * 1024,
};

function adminMediaConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    token: String(props.getProperty(ADMIN_MEDIA.TOKEN_PROP) || "").trim(),
    repo: norm_(props.getProperty(ADMIN_MEDIA.REPO_PROP) || ADMIN_MEDIA.DEFAULT_REPO),
    branch: norm_(props.getProperty(ADMIN_MEDIA.BRANCH_PROP) || ADMIN_MEDIA.DEFAULT_BRANCH),
  };
}

function adminMediaPublicStatus_() {
  const cfg = adminMediaConfig_();
  return {
    mediaConfigured: !!cfg.token,
    mediaRepo: cfg.repo,
    mediaBranch: cfg.branch,
  };
}

function ensureMediaTxnSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(ADMIN_MEDIA.TXN_SHEET);
  if (!sh) sh = ss.insertSheet(ADMIN_MEDIA.TXN_SHEET);
  return ensureHeaders_(sh, [
    "Timestamp",
    "StudentID",
    "StudentName",
    "Kind",
    "Action",
    "RepoPath",
    "PublicURL",
    "Branch",
    "Note",
  ]);
}

function adminGithubHeaders_(token) {
  return {
    Authorization: `Bearer ${String(token || "")}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "Lakeshore-Legends-Teacher-Admin",
  };
}

function adminGithubContentsUrl_(repo, path) {
  const encodedPath = String(path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `https://api.github.com/repos/${repo}/contents/${encodedPath}`;
}

function adminGithubValidateConfig_(cfg) {
  if (!cfg.token) throw new Error("Image storage is not connected yet.");
  if (!cfg.repo || cfg.repo.indexOf("/") < 1) throw new Error("Invalid GitHub repository setting.");

  const response = UrlFetchApp.fetch(`https://api.github.com/repos/${cfg.repo}`, {
    method: "get",
    headers: adminGithubHeaders_(cfg.token),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  if (code !== 200) {
    throw new Error(
      `GitHub connection failed (${code}). Make sure the token can read and write repository Contents.`
    );
  }
  return true;
}

function adminGithubPutFile_(cfg, repoPath, base64, message) {
  const url = adminGithubContentsUrl_(cfg.repo, repoPath);
  const existing = UrlFetchApp.fetch(
    `${url}?ref=${encodeURIComponent(cfg.branch)}`,
    {
      method: "get",
      headers: adminGithubHeaders_(cfg.token),
      muteHttpExceptions: true,
    }
  );

  const existingCode = existing.getResponseCode();
  let existingSha = "";
  if (existingCode === 200) {
    try {
      existingSha = String(JSON.parse(existing.getContentText()).sha || "");
    } catch (_) {}
  } else if (existingCode !== 404) {
    throw new Error(`Could not check existing image in GitHub (${existingCode}).`);
  }

  const payload = {
    message: message || "Update Lakeshore Legends player media",
    content: String(base64 || "").replace(/\s+/g, ""),
    branch: cfg.branch,
  };
  if (existingSha) payload.sha = existingSha;

  const response = UrlFetchApp.fetch(url, {
    method: "put",
    headers: adminGithubHeaders_(cfg.token),
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    let detail = "";
    try {
      detail = norm_(JSON.parse(response.getContentText()).message || "");
    } catch (_) {}
    throw new Error(`GitHub image upload failed (${code})${detail ? `: ${detail}` : "."}`);
  }

  return { created: !existingSha, replaced: !!existingSha };
}

function adminMediaExtension_(mimeTypeRaw, fileNameRaw) {
  const mime = norm_(mimeTypeRaw).toLowerCase();
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/webp") return "webp";

  const match = norm_(fileNameRaw).toLowerCase().match(/\.(png|jpe?g|webp)$/);
  if (match) return match[1] === "jpeg" ? "jpg" : match[1];
  throw new Error("Image must be PNG, JPG, or WebP.");
}

function adminNormalizeCompanionStatus_(raw) {
  const status = norm_(raw).toUpperCase();
  return status === "FALLEN" || status === "DEAD" ? "Fallen" : "Active";
}

function adminWritePortraitUrl_(studentIdRaw, publicUrl) {
  const resolved = adminResolveClassRowForStudentId_(studentIdRaw);
  const iPortrait = idx_(resolved.map, "PortraitURL", "Portrait URL", "Portrait");
  if (iPortrait < 0) throw new Error(`${resolved.homeroom} is missing PortraitURL.`);
  resolved.sh.getRange(resolved.rowNumber, iPortrait + 1).setValue(norm_(publicUrl));
}

function adminWriteCompanionState_(studentIdRaw, companionUrlRaw, statusRaw) {
  const studentId = normId_(studentIdRaw);
  const companionUrl = norm_(companionUrlRaw);
  const companionStatus = adminNormalizeCompanionStatus_(statusRaw);
  const state = ensurePlayerStateStudent_(studentId);
  const nowIso = new Date().toISOString();

  state.sh
    .getRange(state.row.sheetRow, state.row.col.CompanionURL)
    .setValue(companionUrl);
  state.sh
    .getRange(state.row.sheetRow, state.row.col.CompanionStatus)
    .setValue(companionStatus);
  state.sh
    .getRange(state.row.sheetRow, state.row.col.UpdatedAt)
    .setValue(nowIso);

  // Keep the legacy class-sheet CompanionURL visible for teachers, although
  // Master now reads the canonical value from Player_State.
  const resolved = adminResolveClassRowForStudentId_(studentId);
  const iCompanion = idx_(resolved.map, "CompanionURL", "Companion URL", "Companion");
  if (iCompanion >= 0) {
    resolved.sh.getRange(resolved.rowNumber, iCompanion + 1).setValue(companionUrl);
  }

  return { studentId, companionUrl, companionStatus, now: nowIso };
}

function adminConfigureMedia_(args) {
  const verified = verifyTeacher_(args || {});
  const token = String(args.token || "").trim();
  const branch = norm_(args.branch || ADMIN_MEDIA.DEFAULT_BRANCH) || ADMIN_MEDIA.DEFAULT_BRANCH;
  if (!token) throw new Error("Paste the GitHub token first.");

  const cfg = {
    token,
    repo: ADMIN_MEDIA.DEFAULT_REPO,
    branch,
  };
  adminGithubValidateConfig_(cfg);

  const props = PropertiesService.getScriptProperties();
  props.setProperty(ADMIN_MEDIA.TOKEN_PROP, token);
  props.setProperty(ADMIN_MEDIA.REPO_PROP, cfg.repo);
  props.setProperty(ADMIN_MEDIA.BRANCH_PROP, cfg.branch);

  return {
    ok: true,
    teacherToken: verified.token,
    ...adminMediaPublicStatus_(),
    now: new Date().toISOString(),
  };
}

function adminUploadMedia_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  const kind = norm_(args.kind).toUpperCase();
  const mimeType = norm_(args.mimeType);
  const fileName = norm_(args.fileName);
  const base64 = String(args.base64 || "").replace(/\s+/g, "");

  if (!studentId) throw new Error("Missing studentId.");
  if (!["PORTRAIT", "COMPANION"].includes(kind)) throw new Error("Media kind must be PORTRAIT or COMPANION.");
  if (!base64) throw new Error("Image data is empty.");

  const students = loadStudentsMap_();
  const student = students.get(studentId);
  if (!student) throw new Error(`Active student not found: ${studentId}`);

  const approximateBytes = Math.floor((base64.length * 3) / 4);
  if (approximateBytes > ADMIN_MEDIA.MAX_BYTES) {
    throw new Error("Image is larger than the 8 MB upload limit.");
  }

  const cfg = adminMediaConfig_();
  adminGithubValidateConfig_(cfg);
  const ext = adminMediaExtension_(mimeType, fileName);
  const folder = kind === "PORTRAIT" ? "portraits" : "companions";
  const repoPath = `public/${folder}/${studentId}.${ext}`;
  const publicUrl = `/${folder}/${studentId}.${ext}`;
  const result = adminGithubPutFile_(
    cfg,
    repoPath,
    base64,
    `Teacher Admin: ${kind === "PORTRAIT" ? "hero portrait" : "companion"} for ${studentId}`
  );

  if (kind === "PORTRAIT") {
    adminWritePortraitUrl_(studentId, publicUrl);
  } else {
    adminWriteCompanionState_(
      studentId,
      publicUrl,
      args.companionStatus || "Active"
    );
  }

  appendRowFast_(ensureMediaTxnSheet_(), [
    new Date(),
    studentId,
    student.name || "",
    kind,
    result.replaced ? "REPLACE" : "UPLOAD",
    repoPath,
    publicUrl,
    cfg.branch,
    fileName,
  ]);

  SpreadsheetApp.flush();
  cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);

  return {
    ok: true,
    teacherToken: verified.token,
    studentId,
    kind,
    publicUrl,
    repoPath,
    branch: cfg.branch,
    replaced: result.replaced,
    now: new Date().toISOString(),
  };
}

function adminUpdateCompanion_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  if (!studentId) throw new Error("Missing studentId.");

  const result = adminWriteCompanionState_(
    studentId,
    args.companionUrl || "",
    args.companionStatus || "Active"
  );

  const students = loadStudentsMap_();
  const student = students.get(studentId);
  appendRowFast_(ensureMediaTxnSheet_(), [
    new Date(),
    studentId,
    student ? student.name || "" : "",
    "COMPANION",
    "UPDATE_STATE",
    "",
    result.companionUrl,
    adminMediaConfig_().branch,
    `Status=${result.companionStatus}`,
  ]);

  return {
    ok: true,
    teacherToken: verified.token,
    ...result,
  };
}

function adminReplaceStudentIdInSheet_(sheetName, oldStudentIdRaw, newStudentIdRaw) {
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
}

function adminMoveStudent_(args) {
  const verified = verifyTeacher_(args || {});
  if (!masterPlayerStateLookupWired_()) {
    throw new Error("Player data protection is required before homeroom moves can be used.");
  }

  const oldStudentId = normId_(args.studentId);
  const newHomeroom = norm_(args.homeroom);
  const reason = norm_(args.reason || "");
  if (!oldStudentId) throw new Error("Missing studentId.");
  if (!newHomeroom || !ADMIN_CLASS_MAX_ROW[newHomeroom]) throw new Error("Choose a valid destination homeroom.");
  if (!reason) throw new Error("A reason is required for a homeroom move.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const source = adminResolveClassRowForStudentId_(oldStudentId);
    if (source.homeroom === newHomeroom) throw new Error("Student is already in that homeroom.");

    const destination = adminClassSheet_(newHomeroom);
    const destInfo = adminHeaderMapForSheet_(destination);
    const destName = idx_(destInfo.map, "Name", "StudentName", "Student Name");
    if (destName < 0) throw new Error(`${newHomeroom} is missing a Name column.`);

    const reservedIds = new Set(playerStateReservedIds_());
    const destinationRow = adminFindFirstUnreservedRosterRow_(
      destination,
      newHomeroom,
      destName + 1,
      reservedIds
    );
    const newStudentId = adminGeneratedIdForClassRow_(newHomeroom, destinationRow);
    if (reservedIds.has(newStudentId)) throw new Error(`Destination ID is already reserved: ${newStudentId}`);

    const stateLoaded = loadPlayerStateIndex_();
    const priorState = stateLoaded.index.get(oldStudentId);
    if (!priorState) throw new Error(`Player_State is missing ${oldStudentId}.`);

    const sourceInfo = adminHeaderMapForSheet_(source.sh);
    const copyHeaders = [
      "Name",
      "Guild",
      "Strength",
      "Dexterity",
      "Constitution",
      "Intelligence",
      "Wisdom",
      "Charisma",
      "PortraitURL",
      "Skills",
      "CompanionURL",
    ];

    adminClearReusableRosterRow_(destination, destinationRow);
    copyHeaders.forEach((header) => {
      const src = idx_(sourceInfo.map, header);
      const dst = idx_(destInfo.map, header);
      if (src < 0 || dst < 0) return;
      destination
        .getRange(destinationRow, dst + 1)
        .setValue(source.sh.getRange(source.rowNumber, src + 1).getValue());
    });

    SpreadsheetApp.flush();
    const destIdCol = idx_(destInfo.map, "StudentID", "Student Id", "ID");
    const formulaId = destIdCol >= 0
      ? normId_(destination.getRange(destinationRow, destIdCol + 1).getDisplayValue())
      : "";
    if (formulaId && formulaId !== newStudentId) {
      throw new Error(`Destination StudentID formula returned ${formulaId}; expected ${newStudentId}.`);
    }

    const nowIso = new Date().toISOString();
    const newStateRow = stateLoaded.sh.getLastRow() + 1;
    stateLoaded.sh.getRange(newStateRow, 1).setNumberFormat("@");
    stateLoaded.sh.getRange(newStateRow, 1, 1, 14).setValues([[
      newStudentId,
      priorState.companionUrl,
      joinPlayerInventory_(priorState.inventory),
      priorState.strBonus,
      priorState.dexBonus,
      priorState.conBonus,
      priorState.intBonus,
      priorState.wisBonus,
      priorState.chaBonus,
      priorState.companionStatus,
      "ACTIVE",
      "",
      nowIso,
      "",
    ]]);

    stateLoaded.sh
      .getRange(priorState.sheetRow, priorState.col.RosterStatus)
      .setValue("MOVED");
    stateLoaded.sh
      .getRange(priorState.sheetRow, priorState.col.ArchivedAt)
      .setValue(nowIso);
    stateLoaded.sh
      .getRange(priorState.sheetRow, priorState.col.UpdatedAt)
      .setValue(nowIso);
    if (priorState.col.MovedToStudentID > 0) {
      stateLoaded.sh
        .getRange(priorState.sheetRow, priorState.col.MovedToStudentID)
        .setNumberFormat("@")
        .setValue(newStudentId);
    }

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
      ADMIN_PLAYER_STATE.ROSTER_TXN_SHEET,
    ].forEach((sheetName) =>
      adminReplaceStudentIdInSheet_(sheetName, oldStudentId, newStudentId)
    );

    const hp = loadHpIndex_();
    const hpRow = hp.index.get(newStudentId);
    if (hpRow) hp.sh.getRange(hpRow.sheetRow, hp.col.Homeroom).setValue(newHomeroom);

    const xp = ensureXpStateSheet_();
    const xpValues = xp.getDataRange().getValues();
    const xpMap = headerMap_(xpValues[0] || []);
    const xpId = idx_(xpMap, "StudentID", "ID");
    const xpHr = idx_(xpMap, "Homeroom");
    if (xpId >= 0 && xpHr >= 0) {
      const xpRow = findRowByIdInCol_(xp, xpId + 1, newStudentId);
      if (xpRow >= 2) xp.getRange(xpRow, xpHr + 1).setValue(newHomeroom);
    }

    // Only remove the source roster row after all linked state has migrated.
    adminClearReusableRosterRow_(source.sh, source.rowNumber);

    appendRowFast_(ensureRosterTxnSheet_(), [
      new Date(),
      newStudentId,
      source.currentName,
      "MOVE_HOMEROOM",
      newHomeroom,
      (() => {
        const iGuild = idx_(destInfo.map, "Guild");
        return iGuild >= 0 ? norm_(destination.getRange(destinationRow, iGuild + 1).getValue()) : "";
      })(),
      reason,
      `${oldStudentId} (${source.homeroom}) -> ${newStudentId} (${newHomeroom})`,
    ]);

    SpreadsheetApp.flush();
    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      oldStudentId,
      studentId: newStudentId,
      homeroom: newHomeroom,
      reason,
      now: nowIso,
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}
'''.strip()

route_marker = "// =========================================================\n// Web App Routing + Endpoints"
if "const ADMIN_MEDIA = {" not in gs:
    pos = gs.find(route_marker)
    if pos < 0:
        raise RuntimeError("Missing Apps Script routing marker")
    gs = gs[:pos] + backend + "\n\n" + gs[pos:]

# Expose media status through existing system health payload.
status_start = gs.find("function playerStateStatusPayload_(teacherToken) {")
status_end = gs.find("function adminSystemStatus_(args) {", status_start)
if status_start < 0 or status_end < 0:
    raise RuntimeError("Missing playerStateStatusPayload")
status = gs[status_start:status_end]
if "adminMediaPublicStatus_" not in status:
    status = status.replace(
        "  const playerStateReady = masterLookupWired && integrity.ok;\n",
        "  const playerStateReady = masterLookupWired && integrity.ok;\n  const mediaStatus = adminMediaPublicStatus_();\n",
        1,
    )
    status = status.replace(
        "    ok: true,\n",
        "    ok: true,\n    ...mediaStatus,\n",
        1,
    )
    gs = gs[:status_start] + status + gs[status_end:]

# Ensure Media_Transactions exists in ensure endpoints/helpers.
gs = gs.replace(
    "        ensureAbilityTxnSheet_();\n        ensureFinalExaminerSheets_();",
    "        ensureAbilityTxnSheet_();\n        ensureMediaTxnSheet_();\n        ensureFinalExaminerSheets_();",
    1,
)
gs = gs.replace(
    "  ensureAbilityTxnSheet_();\n  ensureFinalExaminerSheets_();",
    "  ensureAbilityTxnSheet_();\n  ensureMediaTxnSheet_();\n  ensureFinalExaminerSheets_();",
    1,
)

# Add POST routes before default.
route_anchor = '''      case "adminadjustskill":
        return jsonOut_(adminAdjustSkill_(body));

      default:'''
route_replacement = '''      case "adminadjustskill":
        return jsonOut_(adminAdjustSkill_(body));

      case "adminmovestudent":
        return jsonOut_(adminMoveStudent_(body));

      case "adminconfiguremedia":
        return jsonOut_(adminConfigureMedia_(body));

      case "adminuploadmedia":
        return jsonOut_(adminUploadMedia_(body));

      case "adminupdatecompanion":
        return jsonOut_(adminUpdateCompanion_(body));

      default:'''
if 'case "adminuploadmedia"' not in gs:
    gs = replace_once(gs, route_anchor, route_replacement, "media routes")

GS.write_text(gs, encoding="utf-8")
print("Patched Global Manager roster/media frontend and complete Apps Script.")
