from pathlib import Path

p = Path('src/pages/store/components/SkillTrainingPanel.tsx')
s = p.read_text()

s = s.replace(
    '        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:mt-5 xl:grid-cols-3">',
    '        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:mt-5">',
    1,
)

old = '''                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">
                      {skill.name}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/36">
                      {owned ? "Owned" : "Available"}
                    </div>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      owned
                        ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100"
                        : isSelected
                        ? "border-cyan-300/20 bg-cyan-400/[0.12] text-cyan-100"
                        : "border-white/[0.06] bg-white/[0.04] text-white/56",
                    ].join(" ")}
                  >
                    {owned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}
                  </span>
                </div>

                <div className="mt-3 text-xs leading-5 text-white/50">
                  {owned
                    ? "This skill is already on this legend."
                    : "Unlock this skill for this legend."}
                </div>'''

new = '''                <div className="min-h-[44px] pr-1">
                  <div className="whitespace-normal break-words text-[15px] font-semibold leading-[1.35] text-white">
                    {skill.name}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/36">
                    {owned ? "Owned" : "Available"}
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      owned
                        ? "border-emerald-300/20 bg-emerald-400/[0.10] text-emerald-100"
                        : isSelected
                        ? "border-cyan-300/20 bg-cyan-400/[0.12] text-cyan-100"
                        : "border-white/[0.06] bg-white/[0.04] text-white/56",
                    ].join(" ")}
                  >
                    {owned ? "Owned" : `${skillCost} Token${skillCost === 1 ? "" : "s"}`}
                  </span>
                </div>'''

if old not in s:
    raise SystemExit('skill card content block not found')

s = s.replace(old, new, 1)
p.write_text(s)
print('Fixed Store skill card readability')
