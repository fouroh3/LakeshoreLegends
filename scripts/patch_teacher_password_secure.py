from pathlib import Path
import subprocess
import tempfile

GS = Path("docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs")
s = GS.read_text(encoding="utf-8")

start = s.find("function teacherPasscode_() {")
end = s.find("function teacherTokenKey_", start)
if start < 0 or end < 0:
    raise SystemExit("Teacher auth block not found")

auth = '''const TEACHER_DEFAULT_PASSCODE_SHA256 =\n  "814f916ced42a28c6a205612ebcf28d7d90ca0e7c3354b83cee4a5f28862b06d";\n\nfunction sha256Hex_(value) {\n  const bytes = Utilities.computeDigest(\n    Utilities.DigestAlgorithm.SHA_256,\n    String(value ?? ""),\n    Utilities.Charset.UTF_8\n  );\n\n  return bytes\n    .map((b) => ((b + 256) % 256).toString(16).padStart(2, "0"))\n    .join("");\n}\n\nfunction teacherPasscodeMatches_(passcode) {\n  const configuredHash =\n    PropertiesService.getScriptProperties().getProperty(\n      "LL_TEACHER_PASSCODE_SHA256"\n    ) || TEACHER_DEFAULT_PASSCODE_SHA256;\n\n  return sha256Hex_(norm_(passcode || "")) === configuredHash;\n}\n\n'''

s = s[:start] + auth + s[end:]
s = s.replace(
    "if (passcode && passcode === teacherPasscode_()) {",
    "if (passcode && teacherPasscodeMatches_(passcode)) {",
    1,
)

if "teacherPasscode_" in s:
    raise SystemExit("Old teacher passcode helper still present")
if "teacherPasscodeMatches_(passcode)" not in s:
    raise SystemExit("Teacher passcode verifier not patched")

GS.write_text(s, encoding="utf-8")

with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as tmp:
    tmp.write(s)
    path = tmp.name
subprocess.run(["node", "--check", path], check=True)
print("Teacher password patch applied and Apps Script syntax passed.")
