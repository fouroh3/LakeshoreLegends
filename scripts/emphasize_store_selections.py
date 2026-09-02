from pathlib import Path

# Store mode cards
p = Path('src/pages/store/components/StoreModeTabs.tsx')
s = p.read_text()

old = '''function modeButtonClass(active: boolean) {
  return [
    "group relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300",
    active
      ? "border-cyan-300/30 bg-cyan-400/[0.10] shadow-[0_0_28px_rgba(34,211,238,0.14)]"
      : "border-white/[0.05] bg-white/[0.035] hover:border-white/[0.09] hover:bg-white/[0.055]",
  ].join(" ");
}'''
new = '''function modeButtonClass(active: boolean, tone: "cyan" | "violet") {
  const activeClass =
    tone === "cyan"
      ? "border-cyan-200/70 bg-[linear-gradient(180deg,rgba(34,211,238,0.20),rgba(8,25,35,0.94))] ring-2 ring-cyan-300/25 shadow-[0_0_36px_rgba(34,211,238,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.008]"
      : "border-violet-200/70 bg-[linear-gradient(180deg,rgba(139,92,246,0.22),rgba(23,14,43,0.94))] ring-2 ring-violet-300/25 shadow-[0_0_36px_rgba(139,92,246,0.22),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.008]";

  return [
    "group relative overflow-hidden rounded-[22px] border px-4 py-4 text-left transition-all duration-300",
    active
      ? activeClass
      : "border-white/[0.05] bg-white/[0.025] opacity-80 hover:border-white/[0.11] hover:bg-white/[0.05] hover:opacity-100",
  ].join(" ");
}'''
if old not in s:
    raise SystemExit('StoreModeTabs modeButtonClass anchor not found')
s = s.replace(old, new, 1)
s = s.replace('className={modeButtonClass(mode === "attributes")}', 'className={modeButtonClass(mode === "attributes", "cyan")}', 1)
s = s.replace('className={modeButtonClass(mode === "skills")}', 'className={modeButtonClass(mode === "skills", "violet")}', 1)

old = '''            <div className="mt-1 text-xl font-semibold text-white">
              Spend XP
            </div>'''
new = '''            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold text-white">Spend XP</div>
              {mode === "attributes" ? (
                <span className="inline-flex items-center rounded-full border border-cyan-200/40 bg-cyan-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.38)]">
                  ✓ Selected
                </span>
              ) : null}
            </div>'''
if old not in s:
    raise SystemExit('Spend XP heading anchor not found')
s = s.replace(old, new, 1)

old = '''            <div className="mt-1 text-xl font-semibold text-white">
              Spend Skill Tokens
            </div>'''
new = '''            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold text-white">Spend Skill Tokens</div>
              {mode === "skills" ? (
                <span className="inline-flex items-center rounded-full border border-violet-200/40 bg-violet-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_18px_rgba(139,92,246,0.38)]">
                  ✓ Selected
                </span>
              ) : null}
            </div>'''
if old not in s:
    raise SystemExit('Spend Skill Tokens heading anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Skill cards
p = Path('src/pages/store/components/SkillTrainingPanel.tsx')
s = p.read_text()
old = '''                  isSelected
                    ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} ring-1 ring-cyan-300/15`
                    : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.09]",
                  owned ? "opacity-70" : "",'''
new = '''                  isSelected
                    ? "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(17,83,96,0.58),rgba(6,25,34,0.96))] ring-2 ring-cyan-300/30 shadow-[0_0_30px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.012]"
                    : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.10] hover:bg-white/[0.045]",
                  owned && !isSelected ? "opacity-65" : "",'''
if old not in s:
    raise SystemExit('Skill selected class anchor not found')
s = s.replace(old, new, 1)

old = '''                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${guildTheme.accent}`}
                />'''
new = '''                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${
                    isSelected ? "from-transparent via-cyan-200 to-transparent" : guildTheme.accent
                  }`}
                />'''
if old not in s:
    raise SystemExit('Skill top accent anchor not found')
s = s.replace(old, new, 1)

old = '''                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">
                    {owned ? "Owned" : "Available"}
                  </div>'''
new = '''                  <div
                    className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      isSelected ? "text-cyan-100" : "text-white/36"
                    }`}
                  >
                    {owned ? "Owned" : isSelected ? "✓ Selected" : "Available"}
                  </div>'''
if old not in s:
    raise SystemExit('Skill status anchor not found')
s = s.replace(old, new, 1)

old = '''                        : isSelected
                        ? "border-cyan-300/20 bg-cyan-400/[0.12] text-cyan-100"'''
new = '''                        : isSelected
                        ? "border-cyan-200/50 bg-cyan-300 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.34)]"'''
if old not in s:
    raise SystemExit('Skill cost selected class anchor not found')
s = s.replace(old, new, 1)
p.write_text(s)

# Attribute cards
p = Path('src/pages/store/components/AttributeGrid.tsx')
s = p.read_text()
old = '''                isSelected
                  ? `${guildTheme.border} ${guildTheme.softPanel} ${guildTheme.cardGlow} scale-[1.01] shadow-[0_12px_24px_rgba(0,0,0,0.26)]`
                  : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.08]",'''
new = '''                isSelected
                  ? "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(17,83,96,0.58),rgba(6,25,34,0.96))] ring-2 ring-cyan-300/30 scale-[1.018] shadow-[0_0_32px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.10] hover:bg-white/[0.045]",'''
if old not in s:
    raise SystemExit('Attribute selected class anchor not found')
s = s.replace(old, new, 1)

old = '''              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${guildTheme.accent}`}
              />

              <div className="relative flex items-center gap-2">'''
new = '''              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${
                  isSelected ? "from-transparent via-cyan-200 to-transparent" : guildTheme.accent
                }`}
              />

              {isSelected ? (
                <div className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/50 bg-cyan-300 text-[14px] font-black text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)]">
                  ✓
                </div>
              ) : null}

              <div className="relative flex items-center gap-2 pr-8">'''
if old not in s:
    raise SystemExit('Attribute header accent anchor not found')
s = s.replace(old, new, 1)

s = s.replace('''              <button
                type="button"
                className={`mt-3 xl:mt-4 h-10 xl:h-11 w-full rounded-xl text-xs xl:text-sm font-semibold transition ${''', '''              <div
                className={`mt-3 xl:mt-4 flex h-10 xl:h-11 w-full items-center justify-center rounded-xl text-xs xl:text-sm font-semibold transition ${''', 1)
s = s.replace('''                    ? "bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)]"''', '''                    ? "bg-cyan-300 text-slate-950 ring-2 ring-cyan-100/30 shadow-[0_0_24px_rgba(34,211,238,0.40)]"''', 1)
s = s.replace('''                {isSelected ? "Selected" : "Select"}
              </button>''', '''                {isSelected ? "✓ Selected" : "Select"}
              </div>''', 1)
p.write_text(s)

print('Strengthened Store selected states')
