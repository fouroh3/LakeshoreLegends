# Admin Currency Manager Backend

The `/admin` Currency Manager uses two teacher-authenticated POST actions:

```txt
POST ?action=admincurrencysnapshot
POST ?action=adminadjustcurrency
```

The UI supports:

- Viewing current XP and Skill Token balances for the whole roster.
- Filtering by homeroom, guild, name, or StudentID.
- Selecting one student or a whole filtered group.
- Adding XP.
- Removing XP.
- Adding Skill Tokens.
- Removing Skill Tokens.
- Requiring a teacher-entered reason for every adjustment.

## Where to paste this

Paste this block with the other Global Teacher Admin helpers, after `verifyTeacher_(args)` is defined and before `doPost(e)`.

```js
// =========================================================
// Global Teacher Admin: Currency Manager
// =========================================================
function adminCurrencySnapshot_(args) {
  const verified = verifyTeacher_(args || {});
  const students = loadStudentsMap_();
  const { index: xpIndex } = loadXpIndex_();
  const { index: skillIndex } = loadSkillStateIndex_();
  const rows = [];

  students.forEach((student, studentId) => {
    const xp = xpIndex.get(studentId);
    const skill = skillIndex.get(studentId);

    rows.push({
      studentId,
      xp: xp ? Math.max(0, Math.round(asNum_(xp.balance, 0))) : 0,
      skillTokens: skill
        ? Math.max(0, Math.round(asNum_(skill.skillTokens, 0)))
        : 0,
    });
  });

  rows.sort((a, b) =>
    String(a.studentId).localeCompare(String(b.studentId), "en", {
      numeric: true,
    })
  );

  return {
    ok: true,
    teacherToken: verified.token,
    rows,
    now: new Date().toISOString(),
  };
}

function adminEnsureCurrencyStateRows_(studentIds, studentsMap) {
  const xpSh = ensureXpStateSheet_();
  const skillSh = ensureSkillStateSheet_();
  let xp = loadXpIndex_();
  let skill = loadSkillStateIndex_();
  let xpChanged = false;
  let skillChanged = false;
  const nowIso = new Date().toISOString();

  studentIds.forEach((studentId) => {
    const student = studentsMap.get(studentId);

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    if (!xp.index.get(studentId)) {
      appendRowFast_(xpSh, [
        student.name || "",
        student.homeroom || "",
        studentId,
        0,
      ]);
      xpChanged = true;
    }

    if (!skill.index.get(studentId)) {
      appendRowFast_(skillSh, [
        studentId,
        student.name || "",
        0,
        nowIso,
      ]);
      skillChanged = true;
    }
  });

  if (xpChanged) {
    xp = loadXpIndex_();
  }

  if (skillChanged) {
    skill = loadSkillStateIndex_();
  }

  return {
    xp,
    skill,
  };
}

function adminAdjustCurrency_(args) {
  const verified = verifyTeacher_(args || {});
  const studentIds = Array.isArray(args.studentIds)
    ? Array.from(new Set(args.studentIds.map(normId_).filter(Boolean)))
    : [];
  const currency = norm_(args.currency || "").toUpperCase();
  const mode = norm_(args.mode || "").toUpperCase();
  const amount = Math.max(0, Math.floor(asNum_(args.amount, 0)));
  const reason = norm_(args.reason || "");

  if (!studentIds.length) {
    throw new Error("No students selected.");
  }

  if (!["XP", "SKILL_TOKENS"].includes(currency)) {
    throw new Error("Currency must be XP or SKILL_TOKENS.");
  }

  if (!["ADD", "REMOVE"].includes(mode)) {
    throw new Error("Mode must be ADD or REMOVE.");
  }

  if (!amount || amount < 1) {
    throw new Error("Amount must be at least 1.");
  }

  if (!reason) {
    throw new Error("A reason is required for teacher currency adjustments.");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const students = loadStudentsMap_();
    const state = adminEnsureCurrencyStateRows_(studentIds, students);
    const plans = [];

    // Validate the entire batch before writing anything.
    studentIds.forEach((studentId) => {
      const student = students.get(studentId);

      if (!student) {
        throw new Error(`Student not found: ${studentId}`);
      }

      if (currency === "XP") {
        const row = state.xp.index.get(studentId);

        if (!row) {
          throw new Error(`XP state missing after seed: ${studentId}`);
        }

        const before = Math.max(0, Math.round(asNum_(row.balance, 0)));

        if (mode === "REMOVE" && before < amount) {
          throw new Error(
            `${student.name || studentId} only has ${before} XP.`
          );
        }

        plans.push({
          studentId,
          student,
          stateRow: row,
          before,
          after: mode === "ADD" ? before + amount : before - amount,
        });

        return;
      }

      const row = state.skill.index.get(studentId);

      if (!row) {
        throw new Error(`Skill Token state missing after seed: ${studentId}`);
      }

      const before = Math.max(0, Math.round(asNum_(row.skillTokens, 0)));

      if (mode === "REMOVE" && before < amount) {
        throw new Error(
          `${student.name || studentId} only has ${before} Skill Tokens.`
        );
      }

      plans.push({
        studentId,
        student,
        stateRow: row,
        before,
        after: mode === "ADD" ? before + amount : before - amount,
      });
    });

    const now = new Date();
    const nowIso = now.toISOString();
    const results = [];

    if (currency === "XP") {
      const txn = ensureXpTxnSheet_();
      const txnRows = [];

      plans.forEach((plan) => {
        state.xp.sh
          .getRange(plan.stateRow.sheetRow, 4)
          .setValue(plan.after);

        txnRows.push([
          now,
          plan.studentId,
          plan.student.name || "",
          plan.student.homeroom || "",
          mode === "ADD" ? "EARN" : "SPEND",
          amount,
          "ADMIN",
          0,
          plan.before,
          plan.after,
          reason,
          "Teacher Admin",
          "",
          "",
        ]);

        results.push({
          studentId: plan.studentId,
          studentName: plan.student.name || "",
          before: plan.before,
          after: plan.after,
        });
      });

      if (txnRows.length) {
        txn
          .getRange(
            txn.getLastRow() + 1,
            1,
            txnRows.length,
            txnRows[0].length
          )
          .setValues(txnRows);
      }
    } else {
      const txn = ensureSkillTxnSheet_();
      const txnRows = [];
      const signedAmount = mode === "ADD" ? amount : -amount;

      plans.forEach((plan) => {
        state.skill.sh
          .getRange(
            plan.stateRow.sheetRow,
            plan.stateRow.col.SkillTokens
          )
          .setValue(plan.after);

        state.skill.sh
          .getRange(
            plan.stateRow.sheetRow,
            plan.stateRow.col.UpdatedAt
          )
          .setValue(nowIso);

        txnRows.push([
          now,
          plan.studentId,
          plan.student.name || "",
          mode === "ADD" ? "EARN" : "SPEND",
          "",
          "",
          signedAmount,
          plan.before,
          plan.after,
          "ADMIN",
          "",
          reason,
        ]);

        results.push({
          studentId: plan.studentId,
          studentName: plan.student.name || "",
          before: plan.before,
          after: plan.after,
        });
      });

      if (txnRows.length) {
        txn
          .getRange(
            txn.getLastRow() + 1,
            1,
            txnRows.length,
            txnRows[0].length
          )
          .setValues(txnRows);
      }
    }

    SpreadsheetApp.flush();
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, nowIso);

    return {
      ok: true,
      teacherToken: verified.token,
      updated: results.length,
      currency,
      mode,
      amount,
      reason,
      results,
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

Add these alongside the other `admin...` routes:

```js
      case "admincurrencysnapshot":
        return jsonOut_(adminCurrencySnapshot_(body));

      case "adminadjustcurrency":
        return jsonOut_(adminAdjustCurrency_(body));
```

## Transaction behavior

XP adjustments are written to `XP_Transactions` with the student's name, homeroom, before/after balance, and teacher reason.

Skill Token adjustments are written to `Skill_Transactions` with the student's name, before/after token balance, signed token change, and teacher reason.

The backend validates the **whole selected group before any balance write happens**, so a bulk removal fails cleanly if even one selected student does not have enough currency.
