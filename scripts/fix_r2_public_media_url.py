from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label, flags=0):
    new, count = re.subn(pattern, lambda m: replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one {label}, found {count}")
    return new

# ---------------- Apps Script ----------------
gp = Path('docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs')
gs = gp.read_text(encoding='utf-8')
gs = replace_once(gs, 'const ADMIN_API_VERSION = "2026-09-01.7";', 'const ADMIN_API_VERSION = "2026-09-01.8";', 'Apps Script version')

old_validate = '''function adminR2ValidateConfig_(cfg) {\n  if (!cfg.accountId) throw new Error("Paste the Cloudflare R2 Account ID.");\n  if (!cfg.accessKeyId) throw new Error("Paste the R2 Access Key ID.");\n  if (!cfg.secretAccessKey) throw new Error("Paste the R2 Secret Access Key.");\n  if (!cfg.bucket) throw new Error("Enter the R2 bucket name.");\n  if (!/^https:\\/\\//i.test(cfg.publicBaseUrl || "")) {\n    throw new Error("Public media URL must start with https://");\n  }\n\n  const objectKey = `__lakeshore_legends_connection_test_${Date.now()}.txt`;\n'''
new_validate = '''function adminR2NormalizePublicBaseUrl_(raw) {\n  const value = String(raw || "").trim().replace(/\\/+$/, "");\n  if (!/^https:\\/\\//i.test(value)) {\n    throw new Error("Public media URL must start with https://");\n  }\n  if (/\\.r2\\.cloudflarestorage\\.com(?:\\/|$)/i.test(value)) {\n    throw new Error(\n      "That is the private R2 S3 API endpoint. Use the bucket Public Development URL ending in r2.dev, or a custom public media domain."\n    );\n  }\n  return value;\n}\n\nfunction adminR2ValidateConfig_(cfg) {\n  if (!cfg.accountId) throw new Error("Paste the Cloudflare R2 Account ID.");\n  if (!cfg.accessKeyId) throw new Error("Paste the R2 Access Key ID.");\n  if (!cfg.secretAccessKey) throw new Error("Paste the R2 Secret Access Key.");\n  if (!cfg.bucket) throw new Error("Enter the R2 bucket name.");\n  adminR2NormalizePublicBaseUrl_(cfg.publicBaseUrl);\n\n  const objectKey = `__lakeshore_legends_connection_test_${Date.now()}.txt`;\n'''
gs = replace_once(gs, old_validate, new_validate, 'R2 validation block')

gs = replace_once(
    gs,
    '    publicBaseUrl: String(args.publicBaseUrl || "").trim().replace(/\\/+$/, ""),',
    '    publicBaseUrl: adminR2NormalizePublicBaseUrl_(args.publicBaseUrl),',
    'R2 configure public URL normalization',
)

marker = '''function adminUploadMedia_(args) {\n'''
insert = r'''function adminR2MediaPathFromUrl_(raw) {
  const value = String(raw || "").trim();
  const match = value.match(/\/((?:portraits|companions)\/[^?#]+)(\?[^#]*)?$/i);
  if (!match) return null;
  return { objectKey: match[1], query: match[2] || "" };
}

function adminR2RebaseStoredUrl_(raw, oldBaseRaw, newBaseRaw) {
  const value = String(raw || "").trim();
  if (!value) return value;
  const oldBase = String(oldBaseRaw || "").trim().replace(/\/+$/, "");
  const newBase = String(newBaseRaw || "").trim().replace(/\/+$/, "");
  const fromPrivateS3 = /\.r2\.cloudflarestorage\.com(?:\/|$)/i.test(value);
  const fromOldPublicBase = !!oldBase && value.indexOf(`${oldBase}/`) === 0;
  if (!fromPrivateS3 && !fromOldPublicBase) return value;
  const parsed = adminR2MediaPathFromUrl_(value);
  if (!parsed) return value;
  return `${newBase}/${parsed.objectKey}${parsed.query}`;
}

function adminRepairStoredR2MediaUrls_(oldBase, newBase) {
  let companionUrls = 0;
  let rosterUrls = 0;

  const playerState = ensurePlayerStateSheet_();
  if (playerState.getLastRow() >= 2) {
    const headers = playerState.getRange(1, 1, 1, playerState.getLastColumn()).getDisplayValues()[0];
    const map = headerMap_(headers);
    const iCompanion = idx_(map, "CompanionURL", "Companion URL");
    if (iCompanion >= 0) {
      const range = playerState.getRange(2, iCompanion + 1, playerState.getLastRow() - 1, 1);
      const values = range.getValues();
      let changed = false;
      values.forEach((row) => {
        const before = String(row[0] || "").trim();
        const after = adminR2RebaseStoredUrl_(before, oldBase, newBase);
        if (after !== before) {
          row[0] = after;
          companionUrls++;
          changed = true;
        }
      });
      if (changed) range.setValues(values);
    }
  }

  Object.keys(ADMIN_CLASS_MAX_ROW).forEach((homeroom) => {
    const sh = adminClassSheet_(homeroom);
    const info = adminHeaderMapForSheet_(sh);
    ["PortraitURL", "CompanionURL"].forEach((header) => {
      const col = idx_(info.map, header, header.replace("URL", " URL"));
      if (col < 0) return;
      const rows = Math.max(0, Math.min(ADMIN_CLASS_MAX_ROW[homeroom], sh.getMaxRows()) - 1);
      if (!rows) return;
      const range = sh.getRange(2, col + 1, rows, 1);
      const values = range.getValues();
      let changed = false;
      values.forEach((row) => {
        const before = String(row[0] || "").trim();
        const after = adminR2RebaseStoredUrl_(before, oldBase, newBase);
        if (after !== before) {
          row[0] = after;
          rosterUrls++;
          changed = true;
        }
      });
      if (changed) range.setValues(values);
    });
  });

  return { companionUrls, rosterUrls, total: companionUrls + rosterUrls };
}

function adminUpdateMediaPublicUrl_(args) {
  const verified = verifyTeacher_(args || {});
  const cfg = adminMediaConfig_();
  if (!(cfg.accountId && cfg.accessKeyId && cfg.secretAccessKey && cfg.bucket)) {
    throw new Error("Cloudflare R2 image storage is not connected yet.");
  }

  const nextBase = adminR2NormalizePublicBaseUrl_(args.publicBaseUrl);
  const oldBase = cfg.publicBaseUrl;
  PropertiesService.getScriptProperties().setProperty(
    ADMIN_MEDIA.R2_PUBLIC_BASE_URL_PROP,
    nextBase
  );
  const repaired = adminRepairStoredR2MediaUrls_(oldBase, nextBase);
  SpreadsheetApp.flush();
  cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);

  return {
    ok: true,
    teacherToken: verified.token,
    ...adminMediaPublicStatus_(),
    repaired,
    now: new Date().toISOString(),
  };
}

'''
if marker not in gs:
    raise RuntimeError('Missing adminUploadMedia marker')
gs = gs.replace(marker, insert + marker, 1)

cleanup_pattern = r'''function adminGithubDeletePublicUrl_\(publicUrlRaw\) \{.*?\n\}\n\nfunction adminDeleteArchivedStudent_\(args\) \{'''
cleanup_replacement = r'''function adminDeleteManagedPublicUrl_(publicUrlRaw) {
  const publicUrl = String(publicUrlRaw || "").trim();
  if (!publicUrl) return true;
  const cfg = adminMediaConfig_();
  if (!adminMediaPublicStatus_().mediaConfigured) return false;

  const isCurrentR2Url =
    !!cfg.publicBaseUrl && publicUrl.indexOf(`${cfg.publicBaseUrl}/`) === 0;
  const isPrivateR2Url = /\.r2\.cloudflarestorage\.com(?:\/|$)/i.test(publicUrl);
  if (!isCurrentR2Url && !isPrivateR2Url) return true;

  const parsed = adminR2MediaPathFromUrl_(publicUrl);
  if (!parsed || !parsed.objectKey) return true;
  try {
    adminR2DeleteObject_(cfg, parsed.objectKey);
    return true;
  } catch (_) {
    return false;
  }
}

function adminDeleteArchivedStudent_(args) {'''
gs = sub_once(gs, cleanup_pattern, cleanup_replacement, 'legacy GitHub media cleanup', re.S)
gs = gs.replace('adminGithubDeletePublicUrl_(url)', 'adminDeleteManagedPublicUrl_(url)')

route_old = '''      case "adminconfiguremedia":\n        return jsonOut_(adminConfigureMedia_(body));\n\n      case "adminuploadmedia":\n'''
route_new = '''      case "adminconfiguremedia":\n        return jsonOut_(adminConfigureMedia_(body));\n\n      case "adminupdatemediapublicurl":\n        return jsonOut_(adminUpdateMediaPublicUrl_(body));\n\n      case "adminuploadmedia":\n'''
gs = replace_once(gs, route_old, route_new, 'media public URL route')
gp.write_text(gs, encoding='utf-8')

# ---------------- adminApi.ts ----------------
ap = Path('src/pages/admin/adminApi.ts')
a = ap.read_text(encoding='utf-8')
a = replace_once(a, 'export const ADMIN_API_VERSION = "2026-09-01.7";', 'export const ADMIN_API_VERSION = "2026-09-01.8";', 'frontend API version')

a = replace_once(
    a,
    '''export type AdminConfigureMediaResult = {\n  ok?: boolean;\n  error?: string;\n  mediaConfigured?: boolean;\n  mediaProvider?: string;\n  mediaBucket?: string;\n  mediaPublicBaseUrl?: string;\n  [key: string]: any;\n};\n''',
    '''export type AdminConfigureMediaResult = {\n  ok?: boolean;\n  error?: string;\n  mediaConfigured?: boolean;\n  mediaProvider?: string;\n  mediaBucket?: string;\n  mediaPublicBaseUrl?: string;\n  [key: string]: any;\n};\n\nexport type AdminUpdateMediaPublicUrlResult = AdminConfigureMediaResult & {\n  repaired?: {\n    companionUrls?: number;\n    rosterUrls?: number;\n    total?: number;\n  };\n};\n''',
    'media public URL result type',
)

a = replace_once(a, '  | "adminconfiguremedia"\n  | "adminuploadmedia"', '  | "adminconfiguremedia"\n  | "adminupdatemediapublicurl"\n  | "adminuploadmedia"', 'admin action union')

configure_fn = '''export async function adminConfigureMedia(args: {\n  accountId: string;\n  accessKeyId: string;\n  secretAccessKey: string;\n  bucket: string;\n  publicBaseUrl: string;\n}) {\n  return postAdminAction<AdminConfigureMediaResult>(\n    "adminconfiguremedia",\n    args\n  );\n}\n\n'''
update_fn = configure_fn + '''export async function adminUpdateMediaPublicUrl(publicBaseUrl: string) {\n  return postAdminAction<AdminUpdateMediaPublicUrlResult>(\n    "adminupdatemediapublicurl",\n    { publicBaseUrl }\n  );\n}\n\n'''
a = replace_once(a, configure_fn, update_fn, 'admin media configure function')
ap.write_text(a, encoding='utf-8')

# ---------------- HeroImageManagerPanel.tsx ----------------
hp = Path('src/pages/admin/components/HeroImageManagerPanel.tsx')
h = hp.read_text(encoding='utf-8')
h = h.replace('import { useMemo, useRef, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";', 1)
h = h.replace('  AdminMediaUploadResult,\n} from "../adminApi";', '  AdminMediaUploadResult,\n  AdminUpdateMediaPublicUrlResult,\n} from "../adminApi";', 1)
h = replace_once(h, '''  onUpload: (args: {\n    studentId: string;\n    fileName: string;\n    mimeType: string;\n    base64: string;\n  }) => Promise<AdminMediaUploadResult>;\n};\n''', '''  onUpload: (args: {\n    studentId: string;\n    fileName: string;\n    mimeType: string;\n    base64: string;\n  }) => Promise<AdminMediaUploadResult>;\n  onUpdatePublicUrl: (publicBaseUrl: string) => Promise<AdminUpdateMediaPublicUrlResult>;\n};\n''', 'Hero image props')
h = h.replace('  onConfigureMedia,\n  onUpload,\n}: Props)', '  onConfigureMedia,\n  onUpload,\n  onUpdatePublicUrl,\n}: Props)', 1)
h = h.replace('  const [connectionError, setConnectionError] = useState("");', '  const [connectionError, setConnectionError] = useState("");\n  const [savingPublicUrl, setSavingPublicUrl] = useState(false);', 1)

state_marker = '''  const sortedStudents = useMemo(\n'''
state_insert = '''  useEffect(() => {\n    if (mediaPublicBaseUrl) setPublicBaseUrl(mediaPublicBaseUrl);\n  }, [mediaPublicBaseUrl]);\n\n  const savePublicUrl = async () => {\n    if (!publicBaseUrl.trim()) return;\n    setSavingPublicUrl(true);\n    setConnectionError("");\n    try {\n      const result = await onUpdatePublicUrl(publicBaseUrl.trim());\n      if (result.mediaPublicBaseUrl) setPublicBaseUrl(result.mediaPublicBaseUrl);\n    } catch (err: any) {\n      setConnectionError(err?.message || "Could not update the public media URL.");\n    } finally {\n      setSavingPublicUrl(false);\n    }\n  };\n\n'''
if state_marker not in h:
    raise RuntimeError('Missing Hero state marker')
h = h.replace(state_marker, state_insert + state_marker, 1)

connected_old = '''      {mediaConfigured && (\n        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">\n          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 font-semibold text-emerald-100/80">\n            <CheckCircle2 size={13} /> Media connected\n          </span>\n          <span>Cloudflare R2</span>\n          {mediaBucket && <span>• bucket {mediaBucket}</span>}\n          {mediaPublicBaseUrl && <span>• {mediaPublicBaseUrl}</span>}\n        </div>\n      )}\n'''
connected_new = '''      {mediaConfigured && (\n        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">\n          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">\n            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 font-semibold text-emerald-100/80">\n              <CheckCircle2 size={13} /> Media connected\n            </span>\n            <span>Cloudflare R2</span>\n            {mediaBucket && <span>• bucket {mediaBucket}</span>}\n          </div>\n          <div className="mt-3 flex flex-col gap-2 sm:flex-row">\n            <input\n              value={publicBaseUrl}\n              onChange={(event) => setPublicBaseUrl(event.target.value)}\n              placeholder="https://...r2.dev"\n              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n            />\n            <button\n              type="button"\n              onClick={savePublicUrl}\n              disabled={savingPublicUrl || !publicBaseUrl.trim()}\n              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-50"\n            >\n              {savingPublicUrl ? "Saving..." : "Save Public URL"}\n            </button>\n          </div>\n          {/\\.r2\\.cloudflarestorage\\.com(?:\\/|$)/i.test(publicBaseUrl) && (\n            <div className="mt-2 text-xs font-semibold leading-5 text-red-200">\n              This is the private S3 API endpoint and cannot display images in the browser. Paste the bucket Public Development URL ending in r2.dev instead.\n            </div>\n          )}\n          {connectionError && (\n            <div className="mt-2 text-sm font-semibold text-red-200">{connectionError}</div>\n          )}\n        </div>\n      )}\n'''
h = replace_once(h, connected_old, connected_new, 'connected R2 panel')
hp.write_text(h, encoding='utf-8')

# ---------------- AdminPage.tsx ----------------
pp = Path('src/pages/admin/AdminPage.tsx')
p = pp.read_text(encoding='utf-8')
p = p.replace('  adminUpdateCompanion,\n  adminUpdateStudent,', '  adminUpdateCompanion,\n  adminUpdateMediaPublicUrl,\n  adminUpdateStudent,', 1)
p = p.replace('  type AdminMediaUploadResult,\n  type AdminMoveStudentResult,', '  type AdminMediaUploadResult,\n  type AdminUpdateMediaPublicUrlResult,\n  type AdminMoveStudentResult,', 1)

utility_marker = '''export default function AdminPage() {\n'''
utility = r'''function rebaseR2MediaUrl(value: unknown, newBaseRaw: string) {
  const url = String(value || "").trim();
  const newBase = String(newBaseRaw || "").trim().replace(/\/+$/, "");
  const match = url.match(/\/((?:portraits|companions)\/[^?#]+)(\?[^#]*)?$/i);
  if (!match || !newBase) return url;
  if (!/\.r2\.cloudflarestorage\.com(?:\/|$)/i.test(url) && !/^https:\/\//i.test(url)) {
    return url;
  }
  return `${newBase}/${match[1]}${match[2] || ""}`;
}

'''
if utility_marker not in p:
    raise RuntimeError('Missing AdminPage component marker')
p = p.replace(utility_marker, utility + utility_marker, 1)

handler_marker = '''  const handleHeroUpload = async (args: {\n'''
handler = '''  const handleUpdateMediaPublicUrl = async (\n    publicBaseUrl: string\n  ): Promise<AdminUpdateMediaPublicUrlResult> => {\n    setBusy(true);\n    setNotice(null);\n\n    try {\n      const result = await adminUpdateMediaPublicUrl(publicBaseUrl);\n      const nextBase = result.mediaPublicBaseUrl || publicBaseUrl;\n      setSystemStatus((prev) => ({ ...(prev || {}), ...result }));\n      setStudents((prev) =>\n        prev.map((student) => ({\n          ...student,\n          portraitUrl: rebaseR2MediaUrl(student.portraitUrl, nextBase),\n          companionUrl: rebaseR2MediaUrl(student.companionUrl, nextBase),\n        }))\n      );\n      setNotice({\n        type: "ok",\n        msg: `Public media URL updated${result.repaired?.total ? ` and ${result.repaired.total} stored media URL${result.repaired.total === 1 ? "" : "s"} repaired` : ""}.`,\n      });\n      return result;\n    } catch (err: any) {\n      setNotice({ type: "err", msg: err?.message || "Public media URL update failed." });\n      throw err;\n    } finally {\n      setBusy(false);\n    }\n  };\n\n'''
if handler_marker not in p:
    raise RuntimeError('Missing hero upload handler marker')
p = p.replace(handler_marker, handler + handler_marker, 1)

p = replace_once(p, '                  onConfigureMedia={handleConfigureMedia}\n                  onUpload={handleHeroUpload}', '                  onConfigureMedia={handleConfigureMedia}\n                  onUpdatePublicUrl={handleUpdateMediaPublicUrl}\n                  onUpload={handleHeroUpload}', 'HeroImageManager handler prop')
pp.write_text(p, encoding='utf-8')
