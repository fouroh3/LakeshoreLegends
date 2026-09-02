from pathlib import Path

app = Path('docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs')
front = Path('src/pages/admin/adminApi.ts')
s = app.read_text()
f = front.read_text()

if 'const ADMIN_API_VERSION = "2026-09-01.8";' not in s:
    raise SystemExit('Apps Script API version anchor not found')
s = s.replace('const ADMIN_API_VERSION = "2026-09-01.8";', 'const ADMIN_API_VERSION = "2026-09-01.9";', 1)

if 'export const ADMIN_API_VERSION = "2026-09-01.8";' not in f:
    raise SystemExit('Frontend API version anchor not found')
f = f.replace('export const ADMIN_API_VERSION = "2026-09-01.8";', 'export const ADMIN_API_VERSION = "2026-09-01.9";', 1)

anchor = '''function adminR2DeleteObject_(cfg, objectKey) {
  if (!objectKey) return false;
  adminR2Request_(cfg, "DELETE", objectKey, [], "application/octet-stream");
  return true;
}
'''
if anchor not in s:
    raise SystemExit('R2 delete helper anchor not found')

helper = anchor + r'''

function adminMoveManagedMediaUrl_(publicUrlRaw, newStudentIdRaw) {
  const publicUrl = String(publicUrlRaw || "").trim();
  const newStudentId = normId_(newStudentIdRaw);
  const result = {
    url: publicUrl,
    moved: false,
    oldKey: "",
    newKey: "",
    error: "",
  };

  if (!publicUrl || !newStudentId) return result;

  const cfg = adminMediaConfig_();
  const status = adminMediaPublicStatus_();
  if (!status.mediaConfigured) return result;

  const isCurrentR2Url =
    !!cfg.publicBaseUrl && publicUrl.indexOf(`${cfg.publicBaseUrl}/`) === 0;
  const isPrivateR2Url = /\.r2\.cloudflarestorage\.com(?:\/|$)/i.test(publicUrl);
  if (!isCurrentR2Url && !isPrivateR2Url) return result;

  const parsed = adminR2MediaPathFromUrl_(publicUrl);
  if (!parsed || !parsed.objectKey) return result;

  const keyMatch = parsed.objectKey.match(
    /^(portraits|companions)\/[^/]+(\.[A-Za-z0-9]+)$/i
  );
  if (!keyMatch) return result;

  const folder = keyMatch[1].toLowerCase();
  const extension = keyMatch[2];
  const oldKey = parsed.objectKey;
  const newKey = `${folder}/${newStudentId}${extension}`;

  result.oldKey = oldKey;
  result.newKey = newKey;

  if (oldKey === newKey) {
    result.url = adminR2PublicUrl_(cfg, newKey);
    return result;
  }

  try {
    const response = adminR2Request_(
      cfg,
      "GET",
      oldKey,
      [],
      "application/octet-stream"
    );
    const bytes = response.getContent();
    const headers = response.getAllHeaders ? response.getAllHeaders() : {};
    const rawContentType =
      headers["Content-Type"] || headers["content-type"] || "application/octet-stream";
    const contentType = Array.isArray(rawContentType)
      ? String(rawContentType[0] || "application/octet-stream")
      : String(rawContentType || "application/octet-stream");

    adminR2Request_(cfg, "PUT", newKey, bytes, contentType);
    adminR2DeleteObject_(cfg, oldKey);

    result.url = adminR2PublicUrl_(cfg, newKey);
    result.moved = true;
    return result;
  } catch (err) {
    result.error = String(err && err.message ? err.message : err || "Media move failed.");
    return result;
  }
}
'''
s = s.replace(anchor, helper, 1)

move_anchor = '''    // Only remove the source roster row after all linked state has migrated.
    adminClearReusableRosterRow_(source.sh, source.rowNumber);
'''
if move_anchor not in s:
    raise SystemExit('Homeroom move media insertion anchor not found')

move_block = r'''    // Keep managed R2 media canonical when the StudentID changes. Media
    // migration is deliberately non-fatal: if R2 is temporarily unavailable,
    // the old public URL remains valid and the roster move still completes.
    const destPortraitCol = idx_(destInfo.map, "PortraitURL", "Portrait URL");
    const destCompanionCol = idx_(destInfo.map, "CompanionURL", "Companion URL");
    const copiedPortraitUrl =
      destPortraitCol >= 0
        ? norm_(destination.getRange(destinationRow, destPortraitCol + 1).getValue())
        : "";
    const copiedCompanionUrl = norm_(priorState.companionUrl || "");

    const portraitMediaMove = adminMoveManagedMediaUrl_(
      copiedPortraitUrl,
      newStudentId
    );
    const companionMediaMove = adminMoveManagedMediaUrl_(
      copiedCompanionUrl,
      newStudentId
    );

    if (
      destPortraitCol >= 0 &&
      portraitMediaMove.url &&
      portraitMediaMove.url !== copiedPortraitUrl
    ) {
      destination
        .getRange(destinationRow, destPortraitCol + 1)
        .setValue(portraitMediaMove.url);
    }

    if (
      destCompanionCol >= 0 &&
      companionMediaMove.url &&
      companionMediaMove.url !== copiedCompanionUrl
    ) {
      destination
        .getRange(destinationRow, destCompanionCol + 1)
        .setValue(companionMediaMove.url);
    }

    if (
      companionMediaMove.url &&
      companionMediaMove.url !== copiedCompanionUrl
    ) {
      stateLoaded.sh.getRange(newStateRow, 2).setValue(companionMediaMove.url);
    }

    // Only remove the source roster row after all linked state has migrated.
    adminClearReusableRosterRow_(source.sh, source.rowNumber);
'''
s = s.replace(move_anchor, move_block, 1)

return_anchor = '''      studentId: newStudentId,
      homeroom: newHomeroom,
      reason,
      now: nowIso,
'''
if return_anchor not in s:
    raise SystemExit('Homeroom move return anchor not found')
return_block = '''      studentId: newStudentId,
      homeroom: newHomeroom,
      reason,
      media: {
        portraitMoved: portraitMediaMove.moved,
        companionMoved: companionMediaMove.moved,
        warnings: [portraitMediaMove.error, companionMediaMove.error].filter(Boolean),
      },
      now: nowIso,
'''
s = s.replace(return_anchor, return_block, 1)

app.write_text(s)
front.write_text(f)
print('Patched R2 homeroom-move lifecycle and bumped Admin API to .9')
