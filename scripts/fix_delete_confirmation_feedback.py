from pathlib import Path

p = Path("src/pages/admin/components/ArchivedStudentsPanel.tsx")
s = p.read_text(encoding="utf-8")

old = '    if (answer !== "DELETE") return;\n'
new = '''    if (answer === null) return;\n\n    if (answer !== "DELETE") {\n      setNotice("");\n      setError("Permanent deletion cancelled. Type DELETE exactly (all caps) to confirm.");\n      return;\n    }\n'''

if old not in s:
    raise RuntimeError("Delete confirmation target not found")

p.write_text(s.replace(old, new, 1), encoding="utf-8")
