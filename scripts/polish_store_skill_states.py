from pathlib import Path

# ---------------------------------------------------------
# Attribute selector: remove the floating check that can
# overlap the attribute title. The selected action bar and
# strong selected card treatment remain.
# ---------------------------------------------------------
p = Path('src/pages/store/components/AttributeGrid.tsx')
s = p.read_text()

floating_check = '''              {isSelected ? (\n                <div className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/50 bg-cyan-300 text-[14px] font-black text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.45)]">\n                  ✓\n                </div>\n              ) : null}\n\n'''
if floating_check not in s:
    raise SystemExit('Attribute floating check block not found')
s = s.replace(floating_check, '', 1)
s = s.replace('className="relative flex items-center gap-2 pr-8"', 'className="relative flex items-center gap-2"', 1)
p.write_text(s)

# ---------------------------------------------------------
# Skill selector: create three unmistakable visual states:
# AVAILABLE, OWNED, and SELECTED.
# ---------------------------------------------------------
p = Path('src/pages/store/components/SkillTrainingPanel.tsx')
s = p.read_text()

old_classes = '''                className={[\n                  "group relative overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all duration-300",\n                  isSelected\n                    ? "border-cyan-200/80 bg-[linear-gradient(180deg,rgba(17,83,96,0.58),rgba(6,25,34,0.96))] ring-2 ring-cyan-300/30 shadow-[0_0_30px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.08)] scale-[1.012]"\n                    : "border-white/[0.05] bg-[linear-gradient(180deg,rgba(18,22,31,0.62),rgba(8,10,16,0.78))] hover:border-white/[0.10] hover:bg-white/[0.045]",\n                  owned && !isSelected ? "opacity-65" : "",\n                ].join(" ")}'''
new_classes = '''                className={[\n                  "group relative overflow-hidden rounded-[18px] border px-3.5 py-3.5 text-left transition-all duration-300",\n                  isSelected && !owned\n                    ? "border-cyan-200/85 bg-[linear-gradient(180deg,rgba(17,88,104,0.64),rgba(5,24,33,0.98))] ring-2 ring-cyan-300/35 shadow-[0_0_32px_rgba(34,211,238,0.26),inset_0_1px_0_rgba(255,255,255,0.09)] scale-[1.012]"\n                    : isSelected && owned\n                    ? "border-emerald-200/70 bg-[linear-gradient(180deg,rgba(16,94,72,0.48),rgba(5,29,23,0.98))] ring-2 ring-emerald-300/28 shadow-[0_0_28px_rgba(52,211,153,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] scale-[1.008]"\n                    : owned\n                    ? "border-emerald-300/22 bg-[linear-gradient(180deg,rgba(16,74,58,0.24),rgba(7,20,18,0.88))] hover:border-emerald-300/34 hover:bg-[linear-gradient(180deg,rgba(16,82,63,0.30),rgba(7,22,19,0.92))]"\n                    : "border-cyan-200/[0.10] bg-[linear-gradient(180deg,rgba(17,23,33,0.80),rgba(7,10,16,0.94))] hover:border-cyan-200/24 hover:bg-[linear-gradient(180deg,rgba(20,31,43,0.90),rgba(8,13,21,0.96))] hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]",\n                ].join(" ")}'''
if old_classes not in s:
    raise SystemExit('Skill card class block not found')
s = s.replace(old_classes, new_classes, 1)

old_accent = '''                <div\n                  className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${\n                    isSelected ? "from-transparent via-cyan-200 to-transparent" : guildTheme.accent\n                  }`}\n                />'''
new_accent = '''                <div\n                  className={[\n                    "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",\n                    isSelected && !owned\n                      ? "from-transparent via-cyan-100 to-transparent"\n                      : owned\n                      ? "from-transparent via-emerald-300/70 to-transparent"\n                      : "from-transparent via-cyan-300/30 to-transparent",\n                  ].join(" ")}\n                />\n\n                <div\n                  className={[\n                    "pointer-events-none absolute bottom-0 left-0 top-0 w-[3px] transition-all duration-300",\n                    isSelected && !owned\n                      ? "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.60)]"\n                      : owned\n                      ? "bg-emerald-400/70"\n                      : "bg-cyan-300/18",\n                  ].join(" ")}\n                />'''
if old_accent not in s:
    raise SystemExit('Skill card accent block not found')
s = s.replace(old_accent, new_accent, 1)

old_title = '''                <div className="min-h-[44px] pr-1">\n                  <div className="whitespace-normal break-words text-[15px] font-semibold leading-[1.35] text-white">\n                    {skill.name}\n                  </div>\n                </div>'''
new_title = '''                <div className="min-h-[44px] pr-1 pl-1">\n                  <div\n                    className={[\n                      "whitespace-normal break-words text-[15px] font-semibold leading-[1.35]",\n                      owned && !isSelected ? "text-emerald-50/88" : "text-white",\n                    ].join(" ")}\n                  >\n                    {skill.name}\n                  </div>\n                </div>'''
if old_title not in s:
    raise SystemExit('Skill title block not found')
s = s.replace(old_title, new_title, 1)

old_status = '''                <div className="mt-2 flex items-center justify-between gap-2">\n                  <div\n                    className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${\n                      isSelected ? "text-cyan-100" : "text-white/36"\n                    }`}\n                  >\n                    {owned ? "Owned" : isSelected ? "✓ Selected" : "Available"}\n                  </div>\n\n                  <span\n                    className={[\n                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",\n                      owned\n                        ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100"\n                        : isSelected\n                        ? "border-cyan-200/50 bg-cyan-300 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.34)]"\n                        : "border-white/[0.06] bg-white/[0.04] text-white/56",\n                    ].join(" ")}\n                  >\n                    {owned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}\n                  </span>\n                </div>'''
new_status = '''                <div className="mt-2 flex items-center justify-between gap-2 pl-1">\n                  <div\n                    className={[\n                      "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em]",\n                      owned\n                        ? "text-emerald-200"\n                        : isSelected\n                        ? "text-cyan-100"\n                        : "text-cyan-100/58",\n                    ].join(" ")}\n                  >\n                    <span\n                      className={[\n                        "flex h-4 w-4 items-center justify-center rounded-full border text-[9px] leading-none",\n                        owned\n                          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"\n                          : isSelected\n                          ? "border-cyan-100/40 bg-cyan-300 text-slate-950"\n                          : "border-cyan-300/25 bg-cyan-300/[0.06] text-cyan-200/70",\n                      ].join(" ")}\n                    >\n                      {owned || isSelected ? "✓" : "•"}\n                    </span>\n                    {owned ? "Owned" : isSelected ? "Selected" : "Available"}\n                  </div>\n\n                  <span\n                    className={[\n                      "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold",\n                      owned\n                        ? "border-emerald-300/22 bg-emerald-400/[0.10] text-emerald-100/88"\n                        : isSelected\n                        ? "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.34)]"\n                        : "border-cyan-200/[0.10] bg-cyan-300/[0.04] text-cyan-50/60",\n                    ].join(" ")}\n                  >\n                    {owned\n                      ? "Already owned"\n                      : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}\n                  </span>\n                </div>'''
if old_status not in s:
    raise SystemExit('Skill status block not found')
s = s.replace(old_status, new_status, 1)

p.write_text(s)
print('Polished Store attribute check and skill ownership states')
