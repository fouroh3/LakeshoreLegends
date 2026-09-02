from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    '''      setNotice({
        type: "ok",
        msg: `Moved student to ${args.homeroom}. New StudentID: ${nextId}. All linked game state migrated automatically.`,
      });
      await Promise.all([reloadStudents(), reloadSystemStatus()]);
      return result;''',
    '''      setNotice({
        type: "ok",
        msg: `Moved student to ${args.homeroom}. New StudentID: ${nextId}. All linked game state migrated automatically.`,
      });

      // Do not immediately replace the backend-confirmed move with the
      // published Master CSV; Google can briefly publish the old homeroom/ID.
      // The local student already contains the authoritative moved identity
      // while preserving the rest of the migrated player data.
      await reloadSystemStatus();
      return result;''',
    "move refresh",
)

s = replace_once(
    s,
    '''      setStudents((prev) => prev.filter((row) => normId(row.id) !== id));
      await Promise.all([reloadStudents(), reloadSystemStatus()]);
      setNotice({''',
    '''      setStudents((prev) => prev.filter((row) => normId(row.id) !== id));

      // Archive is confirmed by the backend. Avoid an immediate published-CSV
      // reload that can briefly re-add the archived student while Google
      // propagation catches up.
      await reloadSystemStatus();
      setNotice({''',
    "archive refresh",
)

p.write_text(s, encoding="utf-8")

p = Path("src/pages/admin/components/StudentManagePanel.tsx")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    '''              <FieldLabel>Homeroom</FieldLabel>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-zinc-300">
                {clean(editingStudent.homeroom)}
              </div>''',
    '''              <FieldLabel>Homeroom</FieldLabel>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-3 text-sm text-zinc-300">
                {clean(editingStudent.homeroom)}
              </div>
              <div className="mt-1 text-[11px] leading-4 text-zinc-500">
                Use Move Homeroom below to change classes safely.
              </div>''',
    "edit homeroom note",
)

s = replace_once(
    s,
    '''                      >
                        Move
                      </button>''',
    '''                      >
                        Move Homeroom
                      </button>''',
    "move button label",
)

p.write_text(s, encoding="utf-8")
