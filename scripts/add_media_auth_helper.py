from pathlib import Path

p = Path('docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs')
s = p.read_text(encoding='utf-8')

marker = '''// =========================================================\n// Manual run helpers\n// =========================================================\nfunction RUN_seedXpState_DISABLED() {\n'''
replacement = '''// =========================================================\n// Manual run helpers\n// =========================================================\nfunction RUN_authorizeImageStorage() {\n  const response = UrlFetchApp.fetch("https://api.github.com", {\n    method: "get",\n    muteHttpExceptions: true,\n  });\n\n  return {\n    ok: true,\n    status: response.getResponseCode(),\n    message: "External web requests are authorized for image storage.",\n  };\n}\n\nfunction RUN_seedXpState_DISABLED() {\n'''

if marker not in s:
    raise RuntimeError('Manual helper insertion point not found')
if 'function RUN_authorizeImageStorage()' not in s:
    s = s.replace(marker, replacement, 1)
p.write_text(s, encoding='utf-8')
