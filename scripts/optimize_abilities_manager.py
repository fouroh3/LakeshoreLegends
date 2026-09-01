from pathlib import Path


def once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


# Preserve base + bonus attributes from Master CSV instead of discarding them.
p = Path("src/types.ts")
s = p.read_text(encoding="utf-8")
s = once(
    s,
    "export type Student = {",
    """export type AttributeValues = {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
};

export type Student = {""",
    "attribute values type",
)
s = once(
    s,
    """  cha: number;

  // gameplay data""",
    """  cha: number;

  // Admin/editor source values from Master. Core stats above remain totals.
  baseAttributes?: AttributeValues;
  bonusAttributes?: AttributeValues;

  // gameplay data""",
    "student source attributes",
)
p.write_text(s, encoding="utf-8")

p = Path("src/data.ts")
s = p.read_text(encoding="utf-8")
s = once(
    s,
    """      cha,

      skills: skills.length""",
    """      cha,
      baseAttributes: {
        str: baseStr,
        dex: baseDex,
        con: baseCon,
        int: baseInt,
        wis: baseWis,
        cha: baseCha,
      },
      bonusAttributes: {
        str: bonusStr,
        dex: bonusDex,
        con: bonusCon,
        int: bonusInt,
        wis: bonusWis,
        cha: bonusCha,
      },

      skills: skills.length""",
    "persist parsed base and bonus attributes",
)
p.write_text(s, encoding="utf-8")

# One established GET snapshot gets purchased/granted skills for everyone.
p = Path("src/pages/admin/adminApi.ts")
s = p.read_text(encoding="utf-8")
s = once(
    s,
    """export type AdminAbilityUpdateResult = AdminAbilitySnapshotResult & {
  updated?: boolean;
};""",
    """export type AdminAbilityUpdateResult = AdminAbilitySnapshotResult & {
  updated?: boolean;
};

export type AdminPurchasedSkillsSnapshotResult = {
  ok?: boolean;
  error?: string;
  purchasedSkills?: Array<{
    studentId: string;
    studentName: string;
    skills: string[];
  }>;
  [key: string]: any;
};""",
    "purchased skills snapshot type",
)
marker = """export async function adminAbilitySnapshot(studentId: string) {
  return postAdminAction<AdminAbilitySnapshotResult>(
    \"adminabilitysnapshot\",
    { studentId }
  );
}
"""
addition = marker + """
export async function adminPurchasedSkillsSnapshot() {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        `${HP_API_URL}?action=skillsnapshot&_=${Date.now()}-${attempt}`,
        { cache: \"no-store\" }
      );
      const text = await res.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(
          `Skill snapshot returned non-JSON (${res.status}). ${text
            .slice(0, 140)
            .replace(/\\s+/g, \" \")}`
        );
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Skill snapshot failed: ${res.status}`);
      }

      return data as AdminPurchasedSkillsSnapshotResult;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err || \"Skill snapshot failed.\"));
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
  }

  throw lastError || new Error(\"Skill snapshot failed.\");
}
"""
s = once(s, marker, addition, "purchased skills snapshot function")
p.write_text(s, encoding="utf-8")

# Abilities Manager: no backend request per student click.
p = Path("src/pages/admin/components/AbilitiesManagerPanel.tsx")
s = p.read_text(encoding="utf-8")
s = once(
    s,
    """  adminAbilitySnapshot,
  type AdminAbilitySnapshotResult,""",
    """  adminPurchasedSkillsSnapshot,
  type AdminAbilitySnapshotResult,""",
    "abilities snapshot import",
)
s = once(
    s,
    """  const [snapshot, setSnapshot] = useState<AdminAbilitySnapshotResult | null>(
    null
  );""",
    """  const [snapshot, setSnapshot] = useState<AdminAbilitySnapshotResult | null>(
    null
  );
  const [purchasedSkillsById, setPurchasedSkillsById] = useState<Record<string, string[]>>({});""",
    "purchased skill cache state",
)
s = once(
    s,
    """  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(\"\");""",
    """  const [skillsLoading, setSkillsLoading] = useState(false);
  const [error, setError] = useState(\"\");""",
    "loading state",
)

start = s.index("  const applySnapshot = (next: AdminAbilitySnapshotResult) => {")
end_marker = "  const purchasedSkills = normalizeSkills(snapshot?.purchasedSkills);"
end = s.index(end_marker, start)
replacement = """  const applySnapshot = (next: AdminAbilitySnapshotResult) => {
    setSnapshot(next);
    setBaseAttributes(normalizeAttributes(next.baseAttributes));
    setBonusAttributes(normalizeAttributes(next.bonusAttributes));
    setRosterSkills(normalizeSkills(next.rosterSkills));
    setGrantSkill(\"\");
  };

  const snapshotFromStudent = (student: Student): AdminAbilitySnapshotResult => {
    const studentId = normId(student.id);
    const base = student.baseAttributes
      ? normalizeAttributes(student.baseAttributes)
      : {
          str: Number(student.str || 0),
          dex: Number(student.dex || 0),
          con: Number(student.con || 0),
          int: Number(student.int || 0),
          wis: Number(student.wis || 0),
          cha: Number(student.cha || 0),
        };
    const bonus = student.bonusAttributes
      ? normalizeAttributes(student.bonusAttributes)
      : { ...EMPTY_ATTRIBUTES };
    const roster = Array.isArray(student.skills)
      ? student.skills
      : String(student.skills || \"\")
          .split(/[;,|]/g)
          .map((value) => value.trim())
          .filter(Boolean);

    return {
      ok: true,
      studentId,
      studentName: fullName(student),
      baseAttributes: base,
      bonusAttributes: bonus,
      rosterSkills: normalizeSkills(roster),
      purchasedSkills: normalizeSkills(purchasedSkillsById[studentId]),
    };
  };

  const selectStudent = (student: Student) => {
    const studentId = normId(student.id);
    setSelectedId(studentId);
    setError(\"\");
    applySnapshot(snapshotFromStudent(student));
  };

  const loadPurchasedSkills = async () => {
    setSkillsLoading(true);

    try {
      const result = await adminPurchasedSkillsSnapshot();
      const next: Record<string, string[]> = {};

      (result.purchasedSkills || []).forEach((row) => {
        const studentId = normId(row.studentId);
        if (studentId) next[studentId] = normalizeSkills(row.skills);
      });

      setPurchasedSkillsById(next);
      setSnapshot((current) =>
        current
          ? {
              ...current,
              purchasedSkills: normalizeSkills(next[normId(current.studentId)]),
            }
          : current
      );
    } catch (err: any) {
      setError(err?.message || \"Could not refresh purchased/granted skills.\");
    } finally {
      setSkillsLoading(false);
    }
  };

  useEffect(() => {
    void loadPurchasedSkills();
  }, []);

"""
s = s[:start] + replacement + s[end:]

s = once(
    s,
    """      await onSave({
        studentId: selectedId,
        baseAttributes,
        bonusAttributes,
        rosterSkills,
        reason: reason.trim(),
      });
      await loadSnapshot(selectedId);
      setReason(\"\");""",
    """      const result = await onSave({
        studentId: selectedId,
        baseAttributes,
        bonusAttributes,
        rosterSkills,
        reason: reason.trim(),
      });
      applySnapshot(result);
      setPurchasedSkillsById((prev) => ({
        ...prev,
        [normId(result.studentId)]: normalizeSkills(result.purchasedSkills),
      }));
      setReason(\"\");""",
    "save uses authoritative response",
)
s = once(
    s,
    """      await onAdjustSkill({
        studentId: selectedId,
        mode,
        skillName,
        reason: reason.trim(),
      });
      await loadSnapshot(selectedId);
      setReason(\"\");""",
    """      const result = await onAdjustSkill({
        studentId: selectedId,
        mode,
        skillName,
        reason: reason.trim(),
      });
      applySnapshot(result);
      setPurchasedSkillsById((prev) => ({
        ...prev,
        [normId(result.studentId)]: normalizeSkills(result.purchasedSkills),
      }));
      setReason(\"\");""",
    "skill change uses authoritative response",
)
s = once(
    s,
    "                onClick={() => setSelectedId(studentId)}",
    "                onClick={() => selectStudent(student)}",
    "instant student selection",
)
s = once(
    s,
    """      ) : loading ? (
        <div className=\"rounded-[24px] border border-white/10 bg-black/20 px-5 py-12 text-center text-sm text-zinc-400\">
          Loading abilities...
        </div>
      ) : snapshot ? (""",
    "      ) : snapshot ? (",
    "remove per-student loading state",
)
s = once(
    s,
    """          <div className=\"rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-cyan-100/80\">
            {visibleStudents.length} shown
          </div>""",
    """          <div className=\"flex items-center gap-2\">
            {skillsLoading && (
              <div className=\"text-[11px] font-semibold text-zinc-500\">Syncing granted skills…</div>
            )}
            <div className=\"rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-cyan-100/80\">
              {visibleStudents.length} shown
            </div>
          </div>""",
    "skill sync indicator",
)
if "loadSnapshot(" in s or "adminAbilitySnapshot" in s or "setLoading(" in s:
    raise RuntimeError("Per-student ability snapshot path still remains")
p.write_text(s, encoding="utf-8")

# Parent keeps its roster cache current from the write response instead of
# waiting for a second published-CSV fetch after each ability change.
p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text(encoding="utf-8")
s = once(
    s,
    """      const result = await adminUpdateAbilities(args);
      await reloadStudents();
      setNotice({""",
    """      const result = await adminUpdateAbilities(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? {
                ...student,
                str: result.baseAttributes.str + result.bonusAttributes.str,
                dex: result.baseAttributes.dex + result.bonusAttributes.dex,
                con: result.baseAttributes.con + result.bonusAttributes.con,
                int: result.baseAttributes.int + result.bonusAttributes.int,
                wis: result.baseAttributes.wis + result.bonusAttributes.wis,
                cha: result.baseAttributes.cha + result.bonusAttributes.cha,
                baseAttributes: result.baseAttributes,
                bonusAttributes: result.bonusAttributes,
                skills: result.rosterSkills,
              }
            : student
        )
      );
      setNotice({""",
    "ability update local authoritative refresh",
)
s = once(
    s,
    """      const result = await adminAdjustSkill(args);
      await reloadStudents();
      setNotice({""",
    """      const result = await adminAdjustSkill(args);
      const id = normId(args.studentId);
      setStudents((prev) =>
        prev.map((student) =>
          normId(student.id) === id
            ? { ...student, purchasedSkills: result.purchasedSkills }
            : student
        )
      );
      setNotice({""",
    "skill adjustment local authoritative refresh",
)
p.write_text(s, encoding="utf-8")
