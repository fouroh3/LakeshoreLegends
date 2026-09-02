from pathlib import Path
import re

p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text()

new_nav = r'''type NavTone = "cyan" | "sky" | "violet" | "amber" | "emerald";

const NAV_TONES: Record<
  NavTone,
  {
    active: string;
    icon: string;
    iconIdle: string;
    rail: string;
    dot: string;
    label: string;
    divider: string;
    track: string;
  }
> = {
  cyan: {
    active:
      "bg-[linear-gradient(90deg,rgba(34,211,238,0.16),rgba(34,211,238,0.055)_58%,transparent_100%)] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.10),0_12px_28px_rgba(34,211,238,0.045)]",
    icon: "bg-cyan-300/14 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.10)]",
    iconIdle: "bg-cyan-300/[0.055] text-cyan-200/55 group-hover:bg-cyan-300/[0.09] group-hover:text-cyan-100/90",
    rail: "bg-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.70)]",
    dot: "bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.80)]",
    label: "text-cyan-100/90",
    divider: "bg-gradient-to-r from-cyan-300/28 to-transparent",
    track: "bg-cyan-300/16",
  },
  sky: {
    active:
      "bg-[linear-gradient(90deg,rgba(125,211,252,0.145),rgba(125,211,252,0.05)_58%,transparent_100%)] shadow-[inset_0_0_0_1px_rgba(125,211,252,0.09),0_12px_28px_rgba(125,211,252,0.04)]",
    icon: "bg-sky-300/14 text-sky-50 shadow-[0_0_22px_rgba(125,211,252,0.09)]",
    iconIdle: "bg-sky-300/[0.05] text-sky-200/50 group-hover:bg-sky-300/[0.085] group-hover:text-sky-100/90",
    rail: "bg-sky-300 shadow-[0_0_15px_rgba(125,211,252,0.65)]",
    dot: "bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.72)]",
    label: "text-sky-100/88",
    divider: "bg-gradient-to-r from-sky-300/25 to-transparent",
    track: "bg-sky-300/14",
  },
  violet: {
    active:
      "bg-[linear-gradient(90deg,rgba(196,181,253,0.145),rgba(196,181,253,0.05)_58%,transparent_100%)] shadow-[inset_0_0_0_1px_rgba(196,181,253,0.09),0_12px_28px_rgba(196,181,253,0.04)]",
    icon: "bg-violet-300/14 text-violet-50 shadow-[0_0_22px_rgba(196,181,253,0.09)]",
    iconIdle: "bg-violet-300/[0.05] text-violet-200/50 group-hover:bg-violet-300/[0.085] group-hover:text-violet-100/90",
    rail: "bg-violet-300 shadow-[0_0_15px_rgba(196,181,253,0.65)]",
    dot: "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.72)]",
    label: "text-violet-100/88",
    divider: "bg-gradient-to-r from-violet-300/25 to-transparent",
    track: "bg-violet-300/14",
  },
  amber: {
    active:
      "bg-[linear-gradient(90deg,rgba(252,211,77,0.13),rgba(252,211,77,0.045)_58%,transparent_100%)] shadow-[inset_0_0_0_1px_rgba(252,211,77,0.085),0_12px_28px_rgba(252,211,77,0.035)]",
    icon: "bg-amber-300/13 text-amber-50 shadow-[0_0_22px_rgba(252,211,77,0.085)]",
    iconIdle: "bg-amber-300/[0.045] text-amber-200/48 group-hover:bg-amber-300/[0.08] group-hover:text-amber-100/90",
    rail: "bg-amber-300 shadow-[0_0_15px_rgba(252,211,77,0.60)]",
    dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.68)]",
    label: "text-amber-100/88",
    divider: "bg-gradient-to-r from-amber-300/24 to-transparent",
    track: "bg-amber-300/13",
  },
  emerald: {
    active:
      "bg-[linear-gradient(90deg,rgba(110,231,183,0.13),rgba(110,231,183,0.045)_58%,transparent_100%)] shadow-[inset_0_0_0_1px_rgba(110,231,183,0.085),0_12px_28px_rgba(110,231,183,0.035)]",
    icon: "bg-emerald-300/13 text-emerald-50 shadow-[0_0_22px_rgba(110,231,183,0.085)]",
    iconIdle: "bg-emerald-300/[0.045] text-emerald-200/48 group-hover:bg-emerald-300/[0.08] group-hover:text-emerald-100/90",
    rail: "bg-emerald-300 shadow-[0_0_15px_rgba(110,231,183,0.60)]",
    dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.68)]",
    label: "text-emerald-100/88",
    divider: "bg-gradient-to-r from-emerald-300/24 to-transparent",
    track: "bg-emerald-300/13",
  },
};

function NavGroup({
  title,
  tone,
  children,
}: {
  title: string;
  tone: NavTone;
  children: ReactNode;
}) {
  const cfg = NAV_TONES[tone];

  return (
    <section className="relative pl-3">
      <span
        aria-hidden="true"
        className={`absolute bottom-1 left-[3px] top-8 w-px ${cfg.track}`}
      />
      <div className="flex items-center gap-2 px-1 pb-1.5">
        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
        <span
          className={`text-[10px] font-black uppercase tracking-[0.22em] ${cfg.label}`}
        >
          {title}
        </span>
        <span className={`h-px flex-1 ${cfg.divider}`} />
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function SectionButton({
  active,
  title,
  detail,
  icon,
  tone,
  onClick,
}: {
  active: boolean;
  title: string;
  detail: string;
  icon: ReactNode;
  tone: NavTone;
  onClick: () => void;
}) {
  const cfg = NAV_TONES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "group relative w-full overflow-hidden rounded-[14px] px-2 py-2.5 text-left transition-all duration-200",
        active
          ? cfg.active
          : "bg-transparent hover:translate-x-[2px] hover:bg-white/[0.035]",
      ].join(" ")}
    >
      <span
        className={[
          "absolute inset-y-2.5 left-0 w-[3px] rounded-r-full transition-all duration-200",
          cfg.rail,
          active ? "opacity-100" : "opacity-0 group-hover:opacity-30",
        ].join(" ")}
      />

      <div className="flex items-center gap-2.5">
        <div
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] transition-all duration-200",
            active ? cfg.icon : cfg.iconIdle,
          ].join(" ")}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className={[
              "truncate text-[13px] font-black tracking-[-0.01em] transition-colors",
              active ? "text-white" : "text-zinc-300 group-hover:text-white",
            ].join(" ")}
          >
            {title}
          </div>
          <div
            className={[
              "mt-0.5 truncate text-[10.5px] leading-[1.3] transition-colors",
              active ? "text-zinc-300/70" : "text-zinc-600 group-hover:text-zinc-400",
            ].join(" ")}
          >
            {detail}
          </div>
        </div>

        <ChevronRight
          size={14}
          className={[
            "shrink-0 transition-all duration-200",
            active
              ? "translate-x-0 text-white/65"
              : "-translate-x-1 text-zinc-800 opacity-0 group-hover:translate-x-0 group-hover:text-zinc-500 group-hover:opacity-100",
          ].join(" ")}
        />
      </div>
    </button>
  );
}
'''

pattern = r'type NavTone = "cyan" \| "sky" \| "violet" \| "amber" \| "emerald";.*?\nfunction AdminPanel\('
m = re.search(pattern, s, flags=re.S)
if not m:
    raise SystemExit("nav component block not found")
s = s[:m.start()] + new_nav + "\nfunction AdminPanel(" + s[m.end():]

# Make the sidebar fill the actual visible viewport height, not just cap itself.
s = s.replace('          sidebar.style.maxHeight = "";\n          return;', '          sidebar.style.height = "";\n          sidebar.style.maxHeight = "";\n          return;', 1)
s = s.replace('        sidebar.style.maxHeight = `${available}px`;', '        sidebar.style.height = `${available}px`;\n        sidebar.style.maxHeight = `${available}px`;', 1)

# Flatten and darken the outer rail. One continuous surface; color handles grouping.
old_aside = 'className="self-start rounded-[28px] border border-white/[0.09] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_30%),rgba(8,8,10,0.90)] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:sticky lg:top-4 lg:overflow-y-auto lg:overscroll-contain"'
new_aside = 'className="relative self-start overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_0%_8%,rgba(34,211,238,0.085),transparent_26%),radial-gradient(circle_at_0%_48%,rgba(167,139,250,0.065),transparent_30%),radial-gradient(circle_at_0%_78%,rgba(251,191,36,0.05),transparent_26%),radial-gradient(circle_at_0%_100%,rgba(110,231,183,0.05),transparent_24%),rgba(7,7,9,0.94)] p-3 shadow-[0_26px_90px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.045] backdrop-blur-xl lg:sticky lg:top-4 lg:overflow-y-auto lg:overscroll-contain"'
if old_aside not in s:
    raise SystemExit("aside class not found")
s = s.replace(old_aside, new_aside, 1)

# Give the continuous rail a little more breathing room between categories.
s = s.replace('className="space-y-2.5"', 'className="space-y-4 pb-1 pt-1"', 1)

# Add a single spectrum edge accent to the rail (not boxed section borders).
needle = '''          >
            <nav aria-label="Global Manager sections" className="space-y-4 pb-1 pt-1">'''
replacement = '''          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-8 left-0 top-8 w-px bg-[linear-gradient(to_bottom,rgba(34,211,238,0.55),rgba(125,211,252,0.34)_24%,rgba(196,181,253,0.36)_52%,rgba(252,211,77,0.30)_78%,rgba(110,231,183,0.42))]"
            />
            <nav aria-label="Global Manager sections" className="space-y-4 pb-1 pt-1">'''
if needle not in s:
    raise SystemExit("nav opening not found")
s = s.replace(needle, replacement, 1)

p.write_text(s)
print("Patched AdminPage sidebar v4")
