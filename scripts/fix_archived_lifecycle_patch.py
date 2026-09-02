from pathlib import Path

p = Path("scripts/patch_archived_student_lifecycle.py")
s = p.read_text(encoding="utf-8")
old = '''      message: `Teacher Admin: delete archived media ${studentId || ""}`,
      sha,
      branch: cfg.branch,
    }).replace('${studentId || ""}', ''),'''
new = '''      message: "Teacher Admin: delete archived player media",
      sha,
      branch: cfg.branch,
    }),'''
if old not in s:
    raise SystemExit("Media delete message block not found")
p.write_text(s.replace(old, new, 1), encoding="utf-8")
print("Fixed archived media delete message")
