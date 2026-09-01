from pathlib import Path

p = Path("scripts/patch_global_manager_media.py")
s = p.read_text(encoding="utf-8")
start = s.find('# Add a moved-to field to Player_State while preserving A:J used by Master lookups.')
end = s.find("backend = r'''", start)
if start < 0 or end < 0:
    raise SystemExit("Player_State patch section not found")

replacement = r'''# Add a moved-to field to Player_State while preserving A:J used by Master lookups.
if '"MovedToStudentID"' not in gs:
    ensure_start = gs.find("function ensurePlayerStateSheet_() {")
    ensure_end = gs.find("function ensureInventoryTxnSheet_() {", ensure_start)
    if ensure_start < 0 or ensure_end < 0:
        raise RuntimeError("Player_State ensure block not found")
    ensure_block = gs[ensure_start:ensure_end]
    ensure_block = ensure_block.replace(
        '    "UpdatedAt",\n  ]);',
        '    "UpdatedAt",\n    "MovedToStudentID",\n  ]);',
        1,
    )
    gs = gs[:ensure_start] + ensure_block + gs[ensure_end:]

    load_start = gs.find("function loadPlayerStateIndex_() {")
    load_end = gs.find("function playerStateReservedIds_() {", load_start)
    if load_start < 0 or load_end < 0:
        raise RuntimeError("Player_State load block not found")
    load_block = gs[load_start:load_end]
    load_block = load_block.replace(
        '  const iUpdatedAt = idx_(map, "UpdatedAt", "Updated At");',
        '  const iUpdatedAt = idx_(map, "UpdatedAt", "Updated At");\n  const iMovedTo = idx_(map, "MovedToStudentID", "Moved To Student ID");',
        1,
    )
    load_block = load_block.replace(
        '      updatedAt: norm_(iUpdatedAt >= 0 ? row[iUpdatedAt] : ""),\n      col: {',
        '      updatedAt: norm_(iUpdatedAt >= 0 ? row[iUpdatedAt] : ""),\n      movedToStudentId: normId_(iMovedTo >= 0 ? row[iMovedTo] : ""),\n      col: {',
        1,
    )
    load_block = load_block.replace(
        '        UpdatedAt: iUpdatedAt + 1,\n      },',
        '        UpdatedAt: iUpdatedAt + 1,\n        MovedToStudentID: iMovedTo + 1,\n      },',
        1,
    )
    gs = gs[:load_start] + load_block + gs[load_end:]

    student_start = gs.find("function ensurePlayerStateStudent_(studentIdRaw) {")
    student_end = gs.find("function writePlayerStateBonus_", student_start)
    if student_start < 0 or student_end < 0:
        raise RuntimeError("ensurePlayerStateStudent block not found")
    student_block = gs[student_start:student_end]
    student_block = student_block.replace(
        '    loaded.sh.getRange(newRow, 2, 1, 12).setValues([[',
        '    loaded.sh.getRange(newRow, 2, 1, 13).setValues([[',
        1,
    )
    student_block = student_block.replace(
        '      "",\n      nowIso,\n    ]]);',
        '      "",\n      nowIso,\n      "",\n    ]]);',
        1,
    )
    gs = gs[:student_start] + student_block + gs[student_end:]

'''

p.write_text(s[:start] + replacement + s[end:], encoding="utf-8")
print("Hardened Player_State patch targeting")
