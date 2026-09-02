# Admin Student Import + Guild Manager Backend

The global teacher admin route is:

```txt
/admin
```

It calls:

```txt
POST ?action=adminimportstudents
POST ?action=adminassignguildbatch
```

Both actions reuse the existing teacher authorization system and require `teacherToken`.

## Important roster rule

`Master` is a derived roll-up and must **not** be edited directly.

The class sheets (`8-1`, `8-2`, etc.) are the roster source of truth. On those sheets:

- Column A (`Name`) is teacher-editable.
- Column B (`Homeroom`) is an `ARRAYFORMULA` output.
- Column C (`StudentID`) is an `ARRAYFORMULA` / derived output.
- Column D (`Guild`) is teacher-editable.

The admin backend below therefore writes the student's name and guild to the class sheet, but **never writes columns B or C**.

The generated StudentID still follows the existing system: the class row determines the numeric suffix, so class row 2 becomes `8-1-001`, row 3 becomes `8-1-002`, etc.

The backend also seeds the student's HP, XP, and Skill Token state so a newly imported student is immediately usable across the dashboard and store.

## Where to paste this

Paste the block below in the main Apps Script after the Regular Battle Teacher Console auth helpers are defined (after `verifyTeacher_(args)` is a good location) and before `doGet(e)` / `doPost(e)`.

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

// These match the ranges currently rolled into Master!A2.
const ADMIN_CLASS_MAX_ROW = {
  "8-1": 49,
  "8-2": 50,
  "8-3": 51,
  "8-4": 50,
  "8-5": 50,
  "8-6": 50,
  "8-7": 50,
  "8-8": 50,
  "8-9": 50,
  "8-10": 50,
};

function adminRosterName_(first, last) {
  const f = norm_(first || "");
  const l = norm_(last || "");

  if (l && f) return `${l}, ${f}`;
  return l || f || "";
}

function adminDisplayName_(first, last) {
  return [norm_(first || ""), norm_(last || "")]
    .filter(Boolean)
    .join(" ");
}

function adminClassSheet_(homeroomRaw) {
  const homeroom = norm_(homeroomRaw || "");

  if (!homeroom) {
    throw new Error("Missing homeroom.");
  }

  if (!ADMIN_CLASS_MAX_ROW[homeroom]) {
    throw new Error(`Unsupported homeroom: ${homeroom}`);
  }

  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(homeroom);

  if (!sh) {
    throw new Error(`Missing class sheet: ${homeroom}`);
  }

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

function adminFindFirstEmptyRosterRow_(sh, homeroom, nameCol) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];

  if (!maxRow || maxRow < 2) {
    throw new Error(`No configured roster capacity for ${homeroom}.`);
  }

  const values = sh
    .getRange(2, nameCol, maxRow - 1, 1)
    .getDisplayValues();

  for (let i = 0; i < values.length; i++) {
    if (!norm_(values[i][0])) {
      return i + 2;
    }
  }

  throw new Error(`${homeroom} has no empty roster rows left.`);
}

function adminGeneratedIdForClassRow_(homeroom, rowNumber) {
  return `${homeroom}-${String(Math.max(1, rowNumber - 1)).padStart(3, "0")}`;
}

function adminExistingRosterNameSet_(sh, homeroom, nameCol) {
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];
  const values = sh
    .getRange(2, nameCol, maxRow - 1, 1)
    .getDisplayValues();

  const out = new Set();

  values.forEach((row) => {
    const name = norm_(row[0]).toLowerCase();
    if (name) out.add(name);
  });

  return out;
}

function adminClearReusableRosterRow_(sh, rowNumber) {
  // Preserve columns B/C because they are ARRAYFORMULA outputs.
  sh.getRange(rowNumber, 1).clearContent();

  const lastCol = Math.max(sh.getLastColumn(), 4);
  if (lastCol >= 4) {
    sh.getRange(rowNumber, 4, 1, lastCol - 3).clearContent();
  }
}

function adminEnsureHpStudent_(student) {
  const sh = ensureHpStateSheet_();
  const existingRow = findRowByIdInCol_(sh, 1, student.studentId);

  if (existingRow >= 2) {
    const { col } = hpHeaderIdx_();
    sh.getRange(existingRow, col.Name).setValue(student.rosterName);
    sh.getRange(existingRow, col.Homeroom).setValue(student.homeroom);
    sh.getRange(existingRow, col.Guild).setValue(student.guild || "");
    return;
  }

  appendRowFast_(sh, [
    student.studentId,
    student.rosterName,
    student.homeroom,
    student.guild || "",
    CFG.MAX_HP_DEFAULT,
    CFG.MAX_HP_DEFAULT,
    new Date().toISOString(),
    0,
  ]);
}

function adminEnsureXpStudent_(student) {
  const sh = ensureXpStateSheet_();
  const values = sh.getDataRange().getValues();
  const map = headerMap_(values[0] || []);
  const iId = idx_(map, "StudentID", "ID");

  if (iId < 0) {
    throw new Error("XP_State is missing StudentID.");
  }

  const existingRow = findRowByIdInCol_(sh, iId + 1, student.studentId);

  if (existingRow >= 2) {
    const iName = idx_(map, "Name");
    const iHr = idx_(map, "Homeroom");

    if (iName >= 0) {
      sh.getRange(existingRow, iName + 1).setValue(student.rosterName);
    }

    if (iHr >= 0) {
      sh.getRange(existingRow, iHr + 1).setValue(student.homeroom);
    }

    return;
  }

  appendRowFast_(sh, [
    student.rosterName,
    student.homeroom,
    student.studentId,
    0,
  ]);
}

function adminEnsureSkillStudent_(student) {
  const sh = ensureSkillStateSheet_();
  const existingRow = findRowByIdInCol_(sh, 1, student.studentId);
  const nowIso = new Date().toISOString();

  if (existingRow >= 2) {
    sh.getRange(existingRow, 2).setValue(student.rosterName);
    return;
  }

  appendRowFast_(sh, [
    student.studentId,
    student.rosterName,
    0,
    nowIso,
  ]);
}

function adminSeedStudentState_(student) {
  adminEnsureHpStudent_(student);
  adminEnsureXpStudent_(student);
  adminEnsureSkillStudent_(student);
}

function adminImportStudents_(args) {
  const verified = verifyTeacher_(args || {});
  const students = Array.isArray(args.students) ? args.students : [];

  if (!students.length) {
    throw new Error("No students were provided.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const imported = [];
    const incomingKeys = new Set();
    const classState = new Map();
    const nowIso = new Date().toISOString();

    students.forEach((student, index) => {
      const first = norm_(student && student.first);
      const last = norm_(student && student.last);
      const homeroom = norm_(student && student.homeroom);
      const guild = norm_(student && student.guild);

      if (!first || !last || !homeroom) {
        throw new Error(
          `Import row ${index + 1} is missing first name, last name, or homeroom.`
        );
      }

      if (guild && ADMIN_GUILDS.indexOf(guild) === -1) {
        throw new Error(
          `Import row ${index + 1} has an invalid guild: ${guild}`
        );
      }

      const rosterName = adminRosterName_(first, last);
      const duplicateKey = `${homeroom}|${rosterName.toLowerCase()}`;

      if (incomingKeys.has(duplicateKey)) {
        throw new Error(
          `Duplicate pasted student in ${homeroom}: ${rosterName}`
        );
      }

      incomingKeys.add(duplicateKey);

      let state = classState.get(homeroom);

      if (!state) {
        const sh = adminClassSheet_(homeroom);
        const { map } = adminHeaderMapForSheet_(sh);
        const iName = idx_(map, "Name", "StudentName", "Student Name");
        const iGuild = idx_(map, "Guild");

        if (iName < 0) {
          throw new Error(`${homeroom} is missing a Name column.`);
        }

        if (iGuild < 0) {
          throw new Error(`${homeroom} is missing a Guild column.`);
        }

        state = {
          sh,
          iName,
          iGuild,
          existingNames: adminExistingRosterNameSet_(
            sh,
            homeroom,
            iName + 1
          ),
        };

        classState.set(homeroom, state);
      }

      if (state.existingNames.has(rosterName.toLowerCase())) {
        throw new Error(
          `${rosterName} already exists in ${homeroom}.`
        );
      }

      const row = adminFindFirstEmptyRosterRow_(
        state.sh,
        homeroom,
        state.iName + 1
      );

      const studentId = adminGeneratedIdForClassRow_(homeroom, row);

      adminClearReusableRosterRow_(state.sh, row);
      state.sh.getRange(row, state.iName + 1).setValue(rosterName);
      state.sh.getRange(row, state.iGuild + 1).setValue(guild || "");

      state.existingNames.add(rosterName.toLowerCase());

      const record = {
        studentId,
        first,
        last,
        name: adminDisplayName_(first, last),
        rosterName,
        homeroom,
        guild: guild || "",
      };

      adminSeedStudentState_(record);
      imported.push(record);
    });

    SpreadsheetApp.flush();

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");

    setProp_(CFG.PROP_LAST_WRITE_ISO, nowIso);
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    recomputeGuildTotals_();

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

  if (!studentId) {
    throw new Error("Missing studentId.");
  }

  const parts = studentId.match(/^(8-\d+)-(\d+)$/);

  if (!parts) {
    throw new Error(`Invalid generated student ID: ${studentId}`);
  }

  const homeroom = parts[1];
  const rowNumber = Number(parts[2]) + 1;
  const maxRow = ADMIN_CLASS_MAX_ROW[homeroom];

  if (!maxRow || rowNumber < 2 || rowNumber > maxRow) {
    throw new Error(`Student ID is outside the ${homeroom} roster range: ${studentId}`);
  }

  const sh = adminClassSheet_(homeroom);
  const { map } = adminHeaderMapForSheet_(sh);
  const iName = idx_(map, "Name", "StudentName", "Student Name");

  if (iName < 0) {
    throw new Error(`${homeroom} is missing a Name column.`);
  }

  const currentName = norm_(sh.getRange(rowNumber, iName + 1).getValue());

  if (!currentName) {
    throw new Error(`No student currently exists at ${studentId}.`);
  }

  return {
    sh,
    map,
    homeroom,
    rowNumber,
    studentId,
    currentName,
  };
}

function adminAssignGuildBatch_(args) {
  const verified = verifyTeacher_(args || {});
  const studentIds = Array.isArray(args.studentIds)
    ? args.studentIds.map(normId_).filter(Boolean)
    : [];
  const guild = norm_(args.guild || "");

  if (!studentIds.length) {
    throw new Error("No students selected.");
  }

  if (guild && ADMIN_GUILDS.indexOf(guild) === -1) {
    throw new Error(`Invalid guild: ${guild}`);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const nowIso = new Date().toISOString();
    const hp = loadHpIndex_();
    let updated = 0;

    studentIds.forEach((studentId) => {
      const resolved = adminResolveClassRowForStudentId_(studentId);
      const iGuild = idx_(resolved.map, "Guild");

      if (iGuild < 0) {
        throw new Error(`${resolved.homeroom} is missing a Guild column.`);
      }

      resolved.sh
        .getRange(resolved.rowNumber, iGuild + 1)
        .setValue(guild || "");

      const hpRow = hp.index.get(studentId);

      if (hpRow) {
        hp.sh
          .getRange(hpRow.sheetRow, hp.col.Guild)
          .setValue(guild || "");
      }

      updated++;
    });

    SpreadsheetApp.flush();

    cacheRemove_(`studentsMap:${CFG.STUDENTS_SHEET}`);
    cacheRemove_("hpAll:v1");

    recomputeGuildTotals_();

    return {
      ok: true,
      teacherToken: verified.token,
      updated,
      guild: guild || "",
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

## Add routes to `doPost`

Find the `purchaseskill` route:

```js
      case "purchaseskill":
        return jsonOut_(purchaseSkill_(body));
```

Immediately after it, add:

```js
      case "adminimportstudents":
        return jsonOut_(adminImportStudents_(body));

      case "adminassignguildbatch":
        return jsonOut_(adminAssignGuildBatch_(body));
```

## What this first admin backend now guarantees

- Imports write to the correct class sheet, never directly to `Master`.
- It does not overwrite the Homeroom or StudentID array formulas.
- Duplicate pasted students are rejected.
- Duplicate existing names in the same homeroom are rejected.
- New students are seeded into `HP_State`, `XP_State`, and `Skill_State` with zero XP / Skill Tokens and full starting HP.
- Guild changes update both the class roster and `HP_State`, then recompute guild totals.
- Sending an empty guild value is supported for future “Unassigned” functionality.
- Student IDs remain compatible with the existing row-based ID system.
