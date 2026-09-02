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
    in_single = in_double = in_template = False
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
        if not in_double and not in_template and ch == "'":
            in_single = not in_single
        elif not in_single and not in_template and ch == '"':
            in_double = not in_double
        elif not in_single and not in_double and ch == '`':
            in_template = not in_template
        elif not in_single and not in_double and not in_template:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return s[start:i+1]
        i += 1
    return s[start:]

for name in [
    'adminMoveStudent_',
    'adminPermanentDeleteStudent_',
    'adminDeleteMediaByPublicUrl_',
    'adminR2PutObject_',
    'adminR2DeleteObject_',
]:
    print('\n' + '=' * 80)
    print(name)
    print('=' * 80)
    print(extract_function(name))
