# Admin Student Import + Guild Manager Backend

The frontend now has a separate global admin route:

```txt
/admin
```

It calls these Apps Script actions:

```txt
POST ?action=adminimportstudents
POST ?action=adminassignguildbatch
```

Both actions reuse the existing teacher auth system. They require `teacherToken` in the JSON body.

## Where to paste this

Paste this block in the main Apps Script after the Regular Battle Teacher Console auth helpers are defined, ideally after `verifyTeacher_(args)` and before `doGet(e)` / `doPost(e)`.

```js
// =========================================================
// Global Teacher Admin: Student Import + Guild Manager
// =========================================================
const ADMIN_GUILDS = [
  "Scouts",
  "Guardians",
  "Blades",
  "Shadows",
  "Scholars",
  "Diplomats",
];

function adminRosterName_(first, last) {
  const f = norm_(first || "");
  const l = norm_(last || "");
  if (l && f) return `${l}, ${f}`;
  return l || f || "";
}

function adminDisplayName_(first, last) {
  return [norm_(first || ""), norm_(last || "")].filter(Boolean).join(" ");
}

function adminClassSheet_(homeroomRaw) {
  const homeroom = norm_(homeroomRaw || "");
  if (!homeroom) throw new Error("Missing homeroom.");

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(homeroom);
  if (!sh) throw new Error(`Missing class sheet: ${homeroom}`);

  return sh;
}

function adminHeaderMapForSheet_(sh) {
  const lastCol = Math.max(sh.getLastColumn() || 1, 1);
  const headers = sh
    .getRange(1, 1, 1, lastCol)
    .getValues()[0]
    .map((h) => String(h || "").trim());

  return {
    headers,
    map: headerMap_(headers),
  };
}

function adminFindFirstEmptyRosterRow_(sh, nameCol) {
  const lastRow = Math.max(sh.getLastRow(), 2);
  const values = sh.getRange(2, nameCol, Math.max(1, lastRow - 1), 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (!norm_(values[i][0])) return i + 2;
  }

  return lastRow + 1;
}

function adminGeneratedIdForClassRow_(homeroom, rowNumber) {
  return `${homeroom}-${String(Math.max(1, rowNumber - 1)).padStart(3, "0")}`;
}

function adminWriteIfColumnExists_(sh, row, colIndexZeroBased, value) {
  if (colIndexZeroBased == null || colIndexZeroBased < 0) return;
  sh.getRange(row, colIndexZeroBased + 1).setValue(value);
}

function adminImportStudents_(args) {
  const verified = verifyTeacher_(args || {});
  const students = Array.isArray(args.students) ? args.students : [];

  if (!students.length) throw new Error("No students were provided.");

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const imported = [];
    const nowIso = new Date().toISOString();

    students.forEach((student, index) => {
      const first = norm_(student && student.first);
      const last = norm_(student && student.last);
      const homeroom = norm_(student && student.homeroom);
      const guild = norm_(student && student.guild);

      if (!first || !last || !homeroom) {
        throw new Error(`Import row ${index + 1} is missing first, last, or homeroom.`);
      }

      if (guild && ADMIN_GUILDS.indexOf(guild) === -1) {
        throw new Error(`Import row ${index + 1} has an invalid guild: ${guild}`);
      }

      const sh = adminClassSheet_(homeroom);
      const { map } = adminHeaderMapForSheet_(sh);

      const iName = idx_(map, "Name", "StudentName", "Student Name");
      const iFirst = idx_(map, "First", "FirstName", "First Name");
      const iLast = idx_(map, "Last", "LastName", "Last Name");
      const iHr = idx_(map, "Homeroom", "HR", "Class");
      const iId = idx_(map, "StudentID", "Student Id", "ID");
      const iGuild = idx_(map, "Guild");
      const iStatus = idx_(map, "Status");
      const iUpdated = idx_(map, "UpdatedAt", "Updated");

      if (iName < 0) {
        throw new Error(`${homeroom} is missing a Name column.`);
      }

      const row = adminFindFirstEmptyRosterRow_(sh, iName + 1);
      const studentId = adminGeneratedIdForClassRow_(homeroom, row);

      adminWriteIfColumnExists_(sh, row, iName, adminRosterName_(first, last));
      adminWriteIfColumnExists_(sh, row, iFirst, first);
      adminWriteIfColumnExists_(sh, row, iLast, last);
      adminWriteIfColumnExists_(sh, row, iHr, homeroom);
      adminWriteIfColumnExists_(sh, row, iId, studentId);
      adminWriteIfColumnExists_(sh, row, iGuild, guild || "");
      adminWriteIfColumnExists_(sh, row, iStatus, "Active");
      adminWriteIfColumnExists_(sh, row, iUpdated, nowIso);

      imported.push({
        studentId,
        first,
        last,
        name: adminDisplayName_(first, last),
        homeroom,
        guild: guild || "",
      });
    });

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      teacherToken: verified.token,
      imported: imported.length,
      students: imported,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}

function adminResolveClassRowForStudentId_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  if (!studentId) throw new Error("Missing studentId.");

  const parts = studentId.match(/^(8-\d+)-(\d+)$/);
  if (!parts) throw new Error(`Invalid generated student ID: ${studentId}`);

  const homeroom = parts[1];
  const rowNumber = Number(parts[2]) + 1;
  const sh = adminClassSheet_(homeroom);

  return {
    sh,
    homeroom,
    rowNumber,
    studentId,
  };
}

function adminAssignGuildBatch_(args) {
  const verified = verifyTeacher_(args || {});
  const studentIds = Array.isArray(args.studentIds) ? args.studentIds.map(normId_).filter(Boolean) : [];
  const guild = norm_(args.guild || "");

  if (!studentIds.length) throw new Error("No students selected.");
  if (ADMIN_GUILDS.indexOf(guild) === -1) throw new Error(`Invalid guild: ${guild}`);

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const nowIso = new Date().toISOString();
    let updated = 0;

    studentIds.forEach((studentId) => {
      const resolved = adminResolveClassRowForStudentId_(studentId);
      const { map } = adminHeaderMapForSheet_(resolved.sh);
      const iGuild = idx_(map, "Guild");
      const iUpdated = idx_(map, "UpdatedAt", "Updated");

      if (iGuild < 0) {
        throw new Error(`${resolved.homeroom} is missing a Guild column.`);
      }

      resolved.sh.getRange(resolved.rowNumber, iGuild + 1).setValue(guild);
      adminWriteIfColumnExists_(resolved.sh, resolved.rowNumber, iUpdated, nowIso);
      updated++;
    });

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      teacherToken: verified.token,
      updated,
      guild,
      studentIds,
      now: nowIso,
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}
```

## Add routes to doPost

Find this part in `doPost`:

```js
case "purchaseskill":
  return jsonOut_(purchaseSkill_(body));

      default:
```

Replace it with this:

```js
case "purchaseskill":
  return jsonOut_(purchaseSkill_(body));

case "adminimportstudents":
  return jsonOut_(adminImportStudents_(body));

case "adminassignguildbatch":
  return jsonOut_(adminAssignGuildBatch_(body));

      default:
```

## Notes

The frontend already previews the generated student IDs before import. The backend generates the actual ID from the row where the student lands. If the class sheet does not have a `StudentID` column, that is okay; Master can still generate the ID from the homeroom + row number formula.

This first backend assumes the class tabs are named `8-1`, `8-2`, etc. It writes to those class tabs because `Master` is your roll-up/database view, not the safest place to directly edit roster rows.
