# Skill Snapshot Backend Addition

The dashboard now looks for this endpoint so purchased skills can appear without opening each student individually:

```txt
GET ?action=skillsnapshot
```

Add this helper beside the other skill store helpers:

```js
function skillSnapshot_() {
  const sh = ensurePurchasedSkillsSheet_();
  const values = sh.getDataRange().getValues();
  const byStudent = new Map();

  for (let r = 1; r < values.length; r++) {
    const studentId = normId_(values[r][1]);
    if (!studentId) continue;

    const skillName = String(values[r][3] || "").trim();
    const skillId = normalizeSkillId_(values[r][2] || skillName);
    const canonicalName = skillName || canonicalSkillName_(skillId);
    if (!skillId || !canonicalName) continue;

    const existing = byStudent.get(studentId) || {
      studentId,
      ids: new Set(),
      skills: [],
    };

    if (!existing.ids.has(skillId)) {
      existing.ids.add(skillId);
      existing.skills.push(canonicalName);
    }

    byStudent.set(studentId, existing);
  }

  return {
    ok: true,
    purchasedSkills: Array.from(byStudent.values()).map((row) => ({
      studentId: row.studentId,
      skills: row.skills,
    })),
    now: new Date().toISOString(),
  };
}
```

Add this to `doGet`:

```js
case "skillsnapshot":
  return jsonOut_(skillSnapshot_());
```

After this is deployed, the dashboard will merge purchased skills into the normal `skills` list automatically. The dashboard refreshes the snapshot on load and during the existing background refresh cycle.
