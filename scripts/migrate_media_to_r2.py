from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing {label}")
    return text.replace(old, new, 1)


def sub_once(text, pattern, replacement, label, flags=0):
    new, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"Expected one {label}, found {count}")
    return new

# ------------------------------------------------------------------
# Apps Script backend
# ------------------------------------------------------------------
gs_path = Path("docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs")
gs = gs_path.read_text(encoding="utf-8")
gs = replace_once(gs, 'const ADMIN_API_VERSION = "2026-09-01.6";', 'const ADMIN_API_VERSION = "2026-09-01.7";', "Apps Script API version")

media_block = r'''const ADMIN_MEDIA = \{.*?function adminMediaExtension_\(mimeTypeRaw, fileNameRaw\) \{'''
media_replacement = r'''const ADMIN_MEDIA = {
  R2_ACCOUNT_ID_PROP: "LL_R2_ACCOUNT_ID",
  R2_ACCESS_KEY_PROP: "LL_R2_ACCESS_KEY_ID",
  R2_SECRET_KEY_PROP: "LL_R2_SECRET_ACCESS_KEY",
  R2_BUCKET_PROP: "LL_R2_BUCKET",
  R2_PUBLIC_BASE_URL_PROP: "LL_R2_PUBLIC_BASE_URL",
  TXN_SHEET: "Media_Transactions",
  MAX_BYTES: 8 * 1024 * 1024,
};

function adminMediaConfig_() {
  const props = PropertiesService.getScriptProperties();
  return {
    accountId: String(props.getProperty(ADMIN_MEDIA.R2_ACCOUNT_ID_PROP) || "").trim(),
    accessKeyId: String(props.getProperty(ADMIN_MEDIA.R2_ACCESS_KEY_PROP) || "").trim(),
    secretAccessKey: String(props.getProperty(ADMIN_MEDIA.R2_SECRET_KEY_PROP) || "").trim(),
    bucket: String(props.getProperty(ADMIN_MEDIA.R2_BUCKET_PROP) || "").trim(),
    publicBaseUrl: String(props.getProperty(ADMIN_MEDIA.R2_PUBLIC_BASE_URL_PROP) || "")
      .trim()
      .replace(/\/+$/, ""),
  };
}

function adminMediaPublicStatus_() {
  const cfg = adminMediaConfig_();
  const mediaConfigured = !!(
    cfg.accountId &&
    cfg.accessKeyId &&
    cfg.secretAccessKey &&
    cfg.bucket &&
    cfg.publicBaseUrl
  );

  return {
    mediaConfigured,
    mediaProvider: "R2",
    mediaBucket: cfg.bucket,
    mediaPublicBaseUrl: cfg.publicBaseUrl,
    // Legacy fields retained so older frontend builds degrade gracefully.
    mediaRepo: cfg.bucket ? `Cloudflare R2 / ${cfg.bucket}` : "",
    mediaBranch: cfg.publicBaseUrl,
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

function adminR2Hex_(bytes) {
  return (bytes || [])
    .map((value) => ((Number(value) + 256) % 256).toString(16).padStart(2, "0"))
    .join("");
}

function adminR2Bytes_(value) {
  if (Array.isArray(value)) return value;
  return Utilities.newBlob(String(value == null ? "" : value)).getBytes();
}

function adminR2Sha256Hex_(value) {
  return adminR2Hex_(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, adminR2Bytes_(value))
  );
}

function adminR2HmacBytes_(keyBytes, value) {
  return Utilities.computeHmacSha256Signature(
    adminR2Bytes_(value),
    keyBytes
  );
}

function adminR2EncodePathPart_(value) {
  return encodeURIComponent(String(value || "")).replace(/[!'()*]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function adminR2CanonicalUri_(cfg, objectKey) {
  const keyPath = String(objectKey || "")
    .split("/")
    .map(adminR2EncodePathPart_)
    .join("/");
  return `/${adminR2EncodePathPart_(cfg.bucket)}/${keyPath}`;
}

function adminR2SignedHeaders_(cfg, method, objectKey, payloadBytes) {
  const now = new Date();
  const amzDate = Utilities.formatDate(now, "GMT", "yyyyMMdd'T'HHmmss'Z'");
  const dateStamp = Utilities.formatDate(now, "GMT", "yyyyMMdd");
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const payloadHash = adminR2Sha256Hex_(payloadBytes || []);
  const canonicalUri = adminR2CanonicalUri_(cfg, objectKey);
  const canonicalHeaders =
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    String(method || "GET").toUpperCase(),
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    adminR2Sha256Hex_(canonicalRequest),
  ].join("\n");

  const kDate = adminR2HmacBytes_(adminR2Bytes_(`AWS4${cfg.secretAccessKey}`), dateStamp);
  const kRegion = adminR2HmacBytes_(kDate, "auto");
  const kService = adminR2HmacBytes_(kRegion, "s3");
  const kSigning = adminR2HmacBytes_(kService, "aws4_request");
  const signature = adminR2Hex_(adminR2HmacBytes_(kSigning, stringToSign));

  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${credentialScope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
  };
}

function adminR2ValidateConfig_(cfg) {
  if (!cfg.accountId) throw new Error("Paste the Cloudflare R2 Account ID.");
  if (!cfg.accessKeyId) throw new Error("Paste the R2 Access Key ID.");
  if (!cfg.secretAccessKey) throw new Error("Paste the R2 Secret Access Key.");
  if (!cfg.bucket) throw new Error("Enter the R2 bucket name.");
  if (!/^https:\/\//i.test(cfg.publicBaseUrl || "")) {
    throw new Error("Public media URL must start with https://");
  }

  const objectKey = `__lakeshore_legends_connection_test_${Date.now()}.txt`;
  const bytes = adminR2Bytes_("Lakeshore Legends R2 connection test");
  adminR2Request_(cfg, "PUT", objectKey, bytes, "text/plain");
  adminR2Request_(cfg, "DELETE", objectKey, [], "text/plain");
  return true;
}

function adminR2Request_(cfg, method, objectKey, payloadBytes, contentType) {
  const bytes = payloadBytes || [];
  const signed = adminR2SignedHeaders_(cfg, method, objectKey, bytes);
  const options = {
    method: String(method || "GET").toLowerCase(),
    headers: signed.headers,
    muteHttpExceptions: true,
  };

  if (String(method || "").toUpperCase() === "PUT") {
    options.payload = bytes;
    options.contentType = contentType || "application/octet-stream";
  }

  const response = UrlFetchApp.fetch(signed.url, options);
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) {
    const body = String(response.getContentText() || "").replace(/\s+/g, " ").slice(0, 280);
    throw new Error(
      `Cloudflare R2 ${String(method || "").toUpperCase()} failed (${code})${body ? `: ${body}` : "."}`
    );
  }
  return response;
}

function adminR2PutObject_(cfg, objectKey, base64, mimeType) {
  const bytes = Utilities.base64Decode(String(base64 || "").replace(/\s+/g, ""));
  adminR2Request_(cfg, "PUT", objectKey, bytes, mimeType || "application/octet-stream");
  return { bytes: bytes.length };
}

function adminR2DeleteObject_(cfg, objectKey) {
  if (!objectKey) return false;
  adminR2Request_(cfg, "DELETE", objectKey, [], "application/octet-stream");
  return true;
}

function adminR2PublicUrl_(cfg, objectKey) {
  const path = String(objectKey || "")
    .split("/")
    .map(adminR2EncodePathPart_)
    .join("/");
  return `${cfg.publicBaseUrl}/${path}?v=${Date.now()}`;
}

function adminR2KeyFromPublicUrl_(cfg, publicUrlRaw) {
  const publicUrl = String(publicUrlRaw || "").trim();
  if (!publicUrl || !cfg.publicBaseUrl) return "";
  const base = cfg.publicBaseUrl.replace(/\/+$/, "");
  if (publicUrl.indexOf(`${base}/`) !== 0) return "";
  const remainder = publicUrl.slice(base.length + 1).split("?")[0];
  try {
    return remainder
      .split("/")
      .map((part) => decodeURIComponent(part))
      .join("/");
  } catch (_) {
    return remainder;
  }
}

function adminMediaExtension_(mimeTypeRaw, fileNameRaw) {'''

gs = sub_once(gs, media_block, media_replacement, "media backend block", re.S)

configure_pattern = r'''function adminConfigureMedia_\(args\) \{.*?\n\}\n\nfunction adminUploadMedia_\(args\) \{'''
configure_replacement = r'''function adminConfigureMedia_(args) {
  const verified = verifyTeacher_(args || {});
  const cfg = {
    accountId: String(args.accountId || "").trim(),
    accessKeyId: String(args.accessKeyId || "").trim(),
    secretAccessKey: String(args.secretAccessKey || "").trim(),
    bucket: String(args.bucket || "").trim(),
    publicBaseUrl: String(args.publicBaseUrl || "").trim().replace(/\/+$/, ""),
  };

  adminR2ValidateConfig_(cfg);

  const props = PropertiesService.getScriptProperties();
  props.setProperty(ADMIN_MEDIA.R2_ACCOUNT_ID_PROP, cfg.accountId);
  props.setProperty(ADMIN_MEDIA.R2_ACCESS_KEY_PROP, cfg.accessKeyId);
  props.setProperty(ADMIN_MEDIA.R2_SECRET_KEY_PROP, cfg.secretAccessKey);
  props.setProperty(ADMIN_MEDIA.R2_BUCKET_PROP, cfg.bucket);
  props.setProperty(ADMIN_MEDIA.R2_PUBLIC_BASE_URL_PROP, cfg.publicBaseUrl);

  return {
    ok: true,
    teacherToken: verified.token,
    ...adminMediaPublicStatus_(),
    now: new Date().toISOString(),
  };
}

function adminUploadMedia_(args) {'''
gs = sub_once(gs, configure_pattern, configure_replacement, "configure media function", re.S)

upload_pattern = r'''function adminUploadMedia_\(args\) \{.*?\n\}\n\nfunction adminUpdateCompanion_\(args\) \{'''
upload_replacement = r'''function adminUploadMedia_(args) {
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
  if (!adminMediaPublicStatus_().mediaConfigured) {
    throw new Error("Cloudflare R2 image storage is not connected yet.");
  }

  const ext = adminMediaExtension_(mimeType, fileName);
  const folder = kind === "PORTRAIT" ? "portraits" : "companions";
  const objectKey = `${folder}/${studentId}.${ext}`;
  const replaced = kind === "PORTRAIT"
    ? !!norm_(student.portraitUrl || "")
    : !!norm_(student.companionUrl || "");

  adminR2PutObject_(cfg, objectKey, base64, mimeType);
  const publicUrl = adminR2PublicUrl_(cfg, objectKey);

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
    replaced ? "REPLACE" : "UPLOAD",
    objectKey,
    publicUrl,
    `R2:${cfg.bucket}`,
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
    repoPath: objectKey,
    mediaProvider: "R2",
    mediaBucket: cfg.bucket,
    replaced,
    now: new Date().toISOString(),
  };
}

function adminUpdateCompanion_(args) {'''
gs = sub_once(gs, upload_pattern, upload_replacement, "upload media function", re.S)

companion_pattern = r'''function adminUpdateCompanion_\(args\) \{.*?\n\}\n\nfunction adminReplaceStudentIdInSheet_'''
companion_replacement = r'''function adminUpdateCompanion_(args) {
  const verified = verifyTeacher_(args || {});
  const studentId = normId_(args.studentId);
  if (!studentId) throw new Error("Missing studentId.");

  const loaded = loadPlayerStateIndex_();
  const prior = loaded.index.get(studentId);
  const priorUrl = prior ? norm_(prior.companionUrl || "") : "";
  const nextUrl = norm_(args.companionUrl || "");
  const cfg = adminMediaConfig_();

  if (!nextUrl && priorUrl && adminMediaPublicStatus_().mediaConfigured) {
    const objectKey = adminR2KeyFromPublicUrl_(cfg, priorUrl);
    if (objectKey) adminR2DeleteObject_(cfg, objectKey);
  }

  const result = adminWriteCompanionState_(
    studentId,
    nextUrl,
    args.companionStatus || "Active"
  );

  const students = loadStudentsMap_();
  const student = students.get(studentId);
  appendRowFast_(ensureMediaTxnSheet_(), [
    new Date(),
    studentId,
    student ? student.name || "" : "",
    "COMPANION",
    !nextUrl && priorUrl ? "REMOVE" : "UPDATE_STATE",
    "",
    result.companionUrl,
    cfg.bucket ? `R2:${cfg.bucket}` : "",
    `Status=${result.companionStatus}`,
  ]);

  return {
    ok: true,
    teacherToken: verified.token,
    ...result,
  };
}

function adminReplaceStudentIdInSheet_'''
gs = sub_once(gs, companion_pattern, companion_replacement, "companion update function", re.S)

gs_path.write_text(gs, encoding="utf-8")

# ------------------------------------------------------------------
# Frontend API
# ------------------------------------------------------------------
api_path = Path("src/pages/admin/adminApi.ts")
api = api_path.read_text(encoding="utf-8")
api = replace_once(api, 'export const ADMIN_API_VERSION = "2026-09-01.6";', 'export const ADMIN_API_VERSION = "2026-09-01.7";', "frontend API version")
api = replace_once(
    api,
    '  mediaRepo?: string;\n  mediaBranch?: string;\n',
    '  mediaProvider?: string;\n  mediaBucket?: string;\n  mediaPublicBaseUrl?: string;\n  mediaRepo?: string;\n  mediaBranch?: string;\n',
    "system status media fields",
)
api = replace_once(
    api,
    '  mediaConfigured?: boolean;\n  mediaRepo?: string;\n  mediaBranch?: string;\n  [key: string]: any;\n};\n\nexport type AdminCompanionUpdateResult',
    '  mediaConfigured?: boolean;\n  mediaProvider?: string;\n  mediaBucket?: string;\n  mediaPublicBaseUrl?: string;\n  mediaRepo?: string;\n  mediaBranch?: string;\n  [key: string]: any;\n};\n\nexport type AdminCompanionUpdateResult',
    "configure result media fields",
)
api = sub_once(
    api,
    r'''export async function adminConfigureMedia\(args: \{\n  token: string;\n  branch\?: string;\n\}\) \{''',
    '''export async function adminConfigureMedia(args: {\n  accountId: string;\n  accessKeyId: string;\n  secretAccessKey: string;\n  bucket: string;\n  publicBaseUrl: string;\n}) {''',
    "adminConfigureMedia signature",
)
api_path.write_text(api, encoding="utf-8")

# ------------------------------------------------------------------
# Admin page handler and props
# ------------------------------------------------------------------
page_path = Path("src/pages/admin/AdminPage.tsx")
page = page_path.read_text(encoding="utf-8")
page = sub_once(
    page,
    r'''const handleConfigureMedia = async \(args: \{\n    token: string;\n    branch\?: string;\n  \}\): Promise<AdminConfigureMediaResult> => \{''',
    '''const handleConfigureMedia = async (args: {\n    accountId: string;\n    accessKeyId: string;\n    secretAccessKey: string;\n    bucket: string;\n    publicBaseUrl: string;\n  }): Promise<AdminConfigureMediaResult> => {''',
    "AdminPage configure handler signature",
)
page = page.replace('mediaRepo={systemStatus?.mediaRepo}', 'mediaBucket={systemStatus?.mediaBucket || systemStatus?.mediaRepo}')
page = page.replace('mediaBranch={systemStatus?.mediaBranch}', 'mediaPublicBaseUrl={systemStatus?.mediaPublicBaseUrl || systemStatus?.mediaBranch}')
page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------------
# Hero Image Manager R2 setup form
# ------------------------------------------------------------------
hero_path = Path("src/pages/admin/components/HeroImageManagerPanel.tsx")
hero = hero_path.read_text(encoding="utf-8")
hero = replace_once(hero, '  mediaRepo?: string;\n  mediaBranch?: string;\n  onConfigureMedia: (args: {\n    token: string;\n    branch?: string;\n  }) => Promise<AdminConfigureMediaResult>;\n', '  mediaBucket?: string;\n  mediaPublicBaseUrl?: string;\n  onConfigureMedia: (args: {\n    accountId: string;\n    accessKeyId: string;\n    secretAccessKey: string;\n    bucket: string;\n    publicBaseUrl: string;\n  }) => Promise<AdminConfigureMediaResult>;\n', "Hero props")
hero = replace_once(hero, '  mediaRepo,\n  mediaBranch,\n', '  mediaBucket,\n  mediaPublicBaseUrl,\n', "Hero destructured media props")
hero = replace_once(hero, '  const [token, setToken] = useState("");\n  const [branch, setBranch] = useState(mediaBranch || "main");\n', '  const [accountId, setAccountId] = useState("");\n  const [accessKeyId, setAccessKeyId] = useState("");\n  const [secretAccessKey, setSecretAccessKey] = useState("");\n  const [bucket, setBucket] = useState(mediaBucket || "lakeshore-legends-media");\n  const [publicBaseUrl, setPublicBaseUrl] = useState(mediaPublicBaseUrl || "");\n', "Hero media state")
hero = sub_once(
    hero,
    r'''  const connectMedia = async \(\) => \{.*?\n  \};\n\n  const uploadMatched''',
    '''  const connectMedia = async () => {\n    if (\n      !accountId.trim() ||\n      !accessKeyId.trim() ||\n      !secretAccessKey.trim() ||\n      !bucket.trim() ||\n      !publicBaseUrl.trim()\n    ) return;\n\n    setConnecting(true);\n    setConnectionError("");\n\n    try {\n      await onConfigureMedia({\n        accountId: accountId.trim(),\n        accessKeyId: accessKeyId.trim(),\n        secretAccessKey: secretAccessKey.trim(),\n        bucket: bucket.trim(),\n        publicBaseUrl: publicBaseUrl.trim(),\n      });\n      setAccessKeyId("");\n      setSecretAccessKey("");\n    } catch (err: any) {\n      setConnectionError(err?.message || "Could not connect image storage.");\n    } finally {\n      setConnecting(false);\n    }\n  };\n\n  const uploadMatched''',
    "Hero connectMedia",
    re.S,
)

old_setup = '''              <div className="font-black text-amber-100">Connect image storage once</div>\n              <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-100/65">\n                Hero and companion images are stored with the website so they deploy automatically. Paste a GitHub fine-grained token with Contents read/write access to the LakeshoreLegends repository. The token is stored only in Apps Script properties, never in the browser or spreadsheet.\n              </p>\n              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">\n                <input\n                  type="password"\n                  value={token}\n                  onChange={(event) => setToken(event.target.value)}\n                  placeholder="GitHub token"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <input\n                  value={branch}\n                  onChange={(event) => setBranch(event.target.value)}\n                  placeholder="main"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <button\n                  type="button"\n                  onClick={connectMedia}\n                  disabled={connecting || !token.trim()}\n                  className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"\n                >\n                  {connecting ? "Connecting..." : "Connect Media"}\n                </button>\n              </div>'''
new_setup = '''              <div className="font-black text-amber-100">Connect Cloudflare R2 once</div>\n              <p className="mt-1 max-w-3xl text-sm leading-6 text-amber-100/65">\n                Hero and companion images are stored in Cloudflare R2, so teacher uploads do not create Git commits or trigger Netlify deploys. R2 credentials are stored only in Apps Script properties and are never written to the spreadsheet or returned to the browser.\n              </p>\n              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">\n                <input\n                  value={accountId}\n                  onChange={(event) => setAccountId(event.target.value)}\n                  placeholder="R2 Account ID"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <input\n                  type="password"\n                  value={accessKeyId}\n                  onChange={(event) => setAccessKeyId(event.target.value)}\n                  placeholder="Access Key ID"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <input\n                  type="password"\n                  value={secretAccessKey}\n                  onChange={(event) => setSecretAccessKey(event.target.value)}\n                  placeholder="Secret Access Key"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <input\n                  value={bucket}\n                  onChange={(event) => setBucket(event.target.value)}\n                  placeholder="lakeshore-legends-media"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n                <input\n                  value={publicBaseUrl}\n                  onChange={(event) => setPublicBaseUrl(event.target.value)}\n                  placeholder="https://...r2.dev"\n                  className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600"\n                />\n              </div>\n              <button\n                type="button"\n                onClick={connectMedia}\n                disabled={\n                  connecting ||\n                  !accountId.trim() ||\n                  !accessKeyId.trim() ||\n                  !secretAccessKey.trim() ||\n                  !bucket.trim() ||\n                  !publicBaseUrl.trim()\n                }\n                className="mt-3 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950 disabled:opacity-50"\n              >\n                {connecting ? "Connecting..." : "Connect R2 Media"}\n              </button>'''
hero = replace_once(hero, old_setup, new_setup, "Hero R2 setup form")
hero = replace_once(hero, '          {mediaRepo && <span>{mediaRepo}</span>}\n          {mediaBranch && <span>• branch {mediaBranch}</span>}\n', '          <span>Cloudflare R2</span>\n          {mediaBucket && <span>• bucket {mediaBucket}</span>}\n          {mediaPublicBaseUrl && <span>• {mediaPublicBaseUrl}</span>}\n', "Hero connected badge")
hero_path.write_text(hero, encoding="utf-8")

print("R2 media migration patch applied")
