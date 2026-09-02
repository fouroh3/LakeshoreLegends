from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Missing patch target: {label}")
    return text.replace(old, new, 1)


p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    '  const [busy, setBusy] = useState(false);\n',
    '  const [busy, setBusy] = useState(false);\n  const [archivedRefreshKey, setArchivedRefreshKey] = useState(0);\n',
    "archived refresh state",
)

s = replace_once(
    s,
    '''      setStudents((prev) => prev.filter((row) => normId(row.id) !== id));\n\n      // Archive is confirmed by the backend. Avoid an immediate published-CSV\n      // reload that can briefly re-add the archived student while Google\n      // propagation catches up.\n      await reloadSystemStatus();''',
    '''      setStudents((prev) => prev.filter((row) => normId(row.id) !== id));\n      setArchivedRefreshKey((value) => value + 1);\n\n      // Archive is confirmed by the backend. Avoid an immediate published-CSV\n      // reload that can briefly re-add the archived student while Google\n      // propagation catches up.\n      await reloadSystemStatus();''',
    "archive panel signal",
)

s = replace_once(
    s,
    '                  <ArchivedStudentsPanel onRosterChanged={reloadStudents} />',
    '''                  <ArchivedStudentsPanel\n                    refreshKey={archivedRefreshKey}\n                    onRosterChanged={reloadStudents}\n                  />''',
    "archived panel props",
)

p.write_text(s, encoding="utf-8")

p = Path("src/pages/admin/components/ArchivedStudentsPanel.tsx")
s = p.read_text(encoding="utf-8")

s = replace_once(
    s,
    '''export default function ArchivedStudentsPanel({\n  onRosterChanged,\n}: {\n  onRosterChanged: () => Promise<void>;\n}) {''',
    '''export default function ArchivedStudentsPanel({\n  refreshKey,\n  onRosterChanged,\n}: {\n  refreshKey: number;\n  onRosterChanged: () => Promise<void>;\n}) {''',
    "archived panel prop type",
)

s = replace_once(
    s,
    '''  useEffect(() => {\n    void load();\n  }, []);''',
    '''  useEffect(() => {\n    setNotice("");\n    void load();\n  }, [refreshKey]);\n\n  useEffect(() => {\n    if (!notice) return;\n\n    const timer = window.setTimeout(() => {\n      setNotice("");\n    }, 4000);\n\n    return () => window.clearTimeout(timer);\n  }, [notice]);''',
    "archived panel refresh/autoclear",
)

p.write_text(s, encoding="utf-8")
