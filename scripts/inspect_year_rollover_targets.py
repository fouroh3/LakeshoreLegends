from pathlib import Path

p = Path('docs/LakeshoreLegendsAppsScript-TeacherAdmin-FULL.gs')
s = p.read_text()


def extract_function(name: str) -> str:
    needle = f'function {name}('
    start = s.find(needle)
    if start < 0:
        return f'NOT FOUND: {name}'
    brace = s.find('{', start)
    depth = 0
    quote = None
    escape = False
    i = brace
    while i < len(s):
        ch = s[i]
        if escape:
            escape = False
            i += 1
            continue
        if ch == '\\':
            escape = True
            i += 1
            continue
        if quote:
            if ch == quote:
                quote = None
        elif ch in ('"', "'", '`'):
            quote = ch
        else:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return s[start:i+1]
        i += 1
    return s[start:]

for name in [
    'adminDeleteArchivedStudent_',
    'adminClearReusableRosterRow_',
    'adminSystemStatus_',
    'adminImportStudents_',
    'ensurePlayerStateSheet_',
    'loadPlayerStateIndex_',
    'recomputeGuildTotals_',
    'syncBattleControlDerivedFields_',
    'doPost',
]:
    print('\n' + '='*100)
    print(name)
    print('='*100)
    print(extract_function(name))

# Print constants likely relevant
for needle in ['const ADMIN_PLAYER_STATE =', 'const ADMIN_ABILITIES =', 'const ADMIN_MEDIA =', 'const ADMIN_CLASS_MAX_ROW =']:
    idx = s.find(needle)
    print('\n' + '='*100)
    print(needle)
    print('='*100)
    print(s[idx: idx+1800] if idx >= 0 else 'NOT FOUND')
