# Skill Purchase Backend Wiring

Frontend support has been added for:

- `GET ?action=skillsummary&studentId=...`
- `POST ?action=purchaseskill`

Add the Apps Script helpers below to the main web app script, then add the routing cases shown at the bottom.

## Suggested sheets

### Skill_State

| StudentID | SkillTokens | UpdatedAt |
| --- | ---: | --- |

### Purchased_Skills

| Timestamp | StudentID | SkillId | SkillName | Cost | Source | RequestId |
| --- | --- | --- | --- | ---: | --- | --- |

### Skill_Transactions

| Timestamp | StudentID | Type | SkillId | SkillName | Tokens | BeforeTokens | AfterTokens | Source | RequestId | Note |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |

## Apps Script helpers

```js
const SKILL_STORE = {
  STATE_SHEET: "Skill_State",
  PURCHASED_SHEET: "Purchased_Skills",
  TXN_SHEET: "Skill_Transactions",
  COST_PER_SKILL: 1,
  VALID_SKILLS: [
    "Acrobatics",
    "Animal Handling",
    "Arcana",
    "Athletic",
    "Deception",
    "Defensive",
    "Endurance",
    "History",
    "Insight",
    "Intimidation",
    "Investigation",
    "Medicine",
    "Nature",
    "Perception",
    "Persuasion",
    "Religious",
    "Sleight of Hand",
    "Spontaneous",
    "Stealthy",
    "Survival",
    "Team Player",
  ],
};

function normalizeSkillId_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonicalSkillName_(skillIdOrName) {
  const wanted = normalizeSkillId_(skillIdOrName);
  const found = SKILL_STORE.VALID_SKILLS.find(
    (name) => normalizeSkillId_(name) === wanted
  );
  return found || "";
}

function ensureSkillStateSheet_() {
  const sh = getSheet_(SKILL_STORE.STATE_SHEET);
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, 3).setValues([["StudentID", "SkillTokens", "UpdatedAt"]]);
  }
  return sh;
}

function ensurePurchasedSkillsSheet_() {
  const sh = getSheet_(SKILL_STORE.PURCHASED_SHEET);
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, 7).setValues([[
      "Timestamp",
      "StudentID",
      "SkillId",
      "SkillName",
      "Cost",
      "Source",
      "RequestId",
    ]]);
  }
  return sh;
}

function ensureSkillTxnSheet_() {
  const sh = getSheet_(SKILL_STORE.TXN_SHEET);
  if (sh.getLastRow() < 1) {
    sh.getRange(1, 1, 1, 11).setValues([[
      "Timestamp",
      "StudentID",
      "Type",
      "SkillId",
      "SkillName",
      "Tokens",
      "BeforeTokens",
      "AfterTokens",
      "Source",
      "RequestId",
      "Note",
    ]]);
  }
  return sh;
}

function loadSkillStateIndex_() {
  const sh = ensureSkillStateSheet_();
  const values = sh.getDataRange().getValues();
  const index = new Map();

  for (let r = 1; r < values.length; r++) {
    const studentId = normId_(values[r][0]);
    if (!studentId) continue;
    index.set(studentId, {
      row: r + 1,
      studentId,
      skillTokens: Math.max(0, Math.round(asNum_(values[r][1], 0))),
    });
  }

  return { sh, index };
}

function purchasedSkillIdsForStudent_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  const sh = ensurePurchasedSkillsSheet_();
  const values = sh.getDataRange().getValues();
  const ids = new Set();
  const names = [];

  for (let r = 1; r < values.length; r++) {
    if (normId_(values[r][1]) !== studentId) continue;
    const skillName = String(values[r][3] || "").trim();
    const skillId = normalizeSkillId_(values[r][2] || skillName);
    if (!skillId || ids.has(skillId)) continue;
    ids.add(skillId);
    names.push(skillName || canonicalSkillName_(skillId));
  }

  return { ids, names };
}

function skillSummary_(studentIdRaw) {
  const studentId = normId_(studentIdRaw);
  if (!studentId) throw new Error("Missing studentId.");

  const { index } = loadSkillStateIndex_();
  const state = index.get(studentId);
  const purchased = purchasedSkillIdsForStudent_(studentId);
  const tx = ensureSkillTxnSheet_();
  const values = tx.getDataRange().getValues();
  const recent = [];

  for (let r = values.length - 1; r >= 1 && recent.length < 12; r--) {
    if (normId_(values[r][1]) !== studentId) continue;
    const ts =
      values[r][0] instanceof Date
        ? values[r][0].toISOString()
        : String(values[r][0] || "");
    recent.push({
      timestamp: ts,
      skillName: String(values[r][4] || ""),
      cost: Math.abs(Math.round(asNum_(values[r][5], 0))),
      source: String(values[r][8] || ""),
    });
  }

  return {
    ok: true,
    studentId,
    skillTokens: state ? state.skillTokens : 0,
    purchasedSkills: purchased.names,
    recent,
    now: new Date().toISOString(),
  };
}

function purchaseSkill_(args) {
  const ctl = readXpControl_();
  if (ctl.storeLocked) throw new Error("Store is closed.");
  if (!ctl.storePin) throw new Error("Store PIN is not set.");

  const pin = normPin_(args.pin || "");
  if (!pin || pin !== normPin_(ctl.storePin)) throw new Error("Invalid Store PIN.");

  const studentId = normId_(args.studentId);
  if (!studentId) throw new Error("Missing studentId.");

  const skillName = canonicalSkillName_(args.skillId || args.skillName || "");
  if (!skillName) throw new Error("Invalid skill.");

  const skillId = normalizeSkillId_(skillName);
  const cost = SKILL_STORE.COST_PER_SKILL;
  const requestId = norm_(args.requestId || "");

  if (requestId && idemIsDuplicate_("purchaseSkill", requestId)) {
    return {
      ok: true,
      deduped: true,
      requestId,
      summary: skillSummary_(studentId),
      now: new Date().toISOString(),
    };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(CFG.LOCK_WAIT_MS);

  try {
    const { sh: stateSh, index } = loadSkillStateIndex_();
    const state = index.get(studentId);
    if (!state) throw new Error("Student not found in Skill_State.");

    const purchased = purchasedSkillIdsForStudent_(studentId);
    if (purchased.ids.has(skillId)) throw new Error("Skill already owned.");

    const beforeTokens = state.skillTokens;
    if (beforeTokens < cost) throw new Error("Not enough Skill Tokens.");

    const afterTokens = beforeTokens - cost;
    stateSh.getRange(state.row, 2, 1, 2).setValues([[afterTokens, new Date().toISOString()]]);

    ensurePurchasedSkillsSheet_().appendRow([
      new Date(),
      studentId,
      skillId,
      skillName,
      cost,
      "STORE",
      requestId,
    ]);

    ensureSkillTxnSheet_().appendRow([
      new Date(),
      studentId,
      "SPEND",
      skillId,
      skillName,
      -cost,
      beforeTokens,
      afterTokens,
      "STORE",
      requestId,
      "Skill purchase",
    ]);

    if (requestId) idemMark_("purchaseSkill", requestId);
    setProp_(CFG.PROP_LAST_XP_WRITE_ISO, new Date().toISOString());

    return {
      ok: true,
      studentId,
      skillId,
      skillName,
      cost,
      beforeTokens,
      afterTokens,
      summary: skillSummary_(studentId),
      now: new Date().toISOString(),
    };
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {}
  }
}
```

## Routing changes

Add this to `doGet`:

```js
case "skillsummary": {
  const studentId = norm_(p.studentId || "");
  return jsonOut_(skillSummary_(studentId));
}
```

Add these inside the `ensure` case:

```js
ensureSkillStateSheet_();
ensurePurchasedSkillsSheet_();
ensureSkillTxnSheet_();
```

Add this to `doPost`:

```js
case "purchaseskill":
  return jsonOut_(purchaseSkill_(body));
```

## Giving students Skill Tokens

For now, add rows manually in `Skill_State`:

```text
StudentID | SkillTokens | UpdatedAt
8-1-001   | 2           | 2026-08-31T00:00:00.000Z
```
