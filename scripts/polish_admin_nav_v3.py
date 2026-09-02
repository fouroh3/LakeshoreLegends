from pathlib import Path
import re

p = Path("src/pages/admin/AdminPage.tsx")
s = p.read_text()

# useRef for viewport-aware sidebar sizing.
s = s.replace(
    "  useMemo,\n  useState,\n  type ReactNode,",
    "  useMemo,\n  useRef,\n  useState,\n  type ReactNode,",
    1,
)

nav_block = r'''type NavTone = "cyan" | "sky" | "violet" | "amber" | "emerald";

const NAV_TONES: Record<
  NavTone,
  {
    active: string;
    icon: string;
    rail: string;
    dot: string;
    label: string;
    divider: string;
    group: string;
  }
> = {
  cyan: {
    active:
      "border-cyan-300/35 bg-cyan-300/[0.12] shadow-[0_10px_28px_rgba(34,211,238,0.11)]",
    icon: "border-cyan-300/25 bg-cyan-300/12 text-cyan-50",
    rail: "bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.70)]",
    dot: "bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.70)]",
    label: "text-cyan-100/90",
    divider: "bg-cyan-300/20",
    group: "border-cyan-300/12 bg-cyan-300/[0.025]",
  },
  sky: {
    active:
      "border-sky-300/35 bg-sky-300/[0.11] shadow-[0_10px_28px_rgba(125,211,252,0.10)]",
    icon: "border-sky-300/25 bg-sky-300/12 text-sky-50",
    rail: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.65)]",
    dot: "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.65)]",
    label: "text-sky-100/90",
    divider: "bg-sky-300/20",
    group: "border-sky-300/12 bg-sky-300/[0.025]",
  },
  violet: {
    active:
      "border-violet-300/35 bg-violet-300/[0.11] shadow-[0_10px_28px_rgba(196,181,253,0.10)]",
    icon: "border-violet-300/25 bg-violet-300/12 text-violet-50",
    rail: "bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.65)]",
    dot: "bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.65)]",
    label: "text-violet-100/90",
    divider: "bg-violet-300/20",
    group: "border-violet-300/12 bg-violet-300/[0.025]",
  },
  amber: {
    active:
      "border-amber-300/35 bg-amber-300/[0.10] shadow-[0_10px_28px_rgba(252,211,77,0.09)]",
    icon: "border-amber-300/25 bg-amber-300/12 text-amber-50",
    rail: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.60)]",
    dot: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.60)]",
    label: "text-amber-100/90",
    divider: "bg-amber-300/20",
    group: "border-amber-300/12 bg-amber-300/[0.025]",
  },
  emerald: {
    active:
      "border-emerald-300/35 bg-emerald-300/[0.10] shadow-[0_10px_28px_rgba(110,231,183,0.09)]",
    icon: "border-emerald-300/25 bg-emerald-300/12 text-emerald-50",
    rail: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.60)]",
    dot: "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.60)]",
    label: "text-emerald-100/90",
    divider: "bg-emerald-300/20",
    group: "border-emerald-300/12 bg-emerald-300/[0.025]",
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
    <section
      className={`relative overflow-hidden rounded-[22px] border p-2.5 ${cfg.group}`}
    >
      <div className="flex items-center gap-2 px-1.5 pb-2 pt-0.5">
        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
        <span
          className={`text-[10px] font-black uppercase tracking-[0.22em] ${cfg.label}`}
        >
          {title}
        </span>
        <span className={`h-px flex-1 ${cfg.divider}`} />
      </div>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}
'''

pattern = r'type NavTone = "cyan" \| "sky" \| "violet" \| "amber" \| "emerald";.*?\nfunction SectionButton\(\{'
match = re.search(pattern, s, flags=re.S)
if not match:
    raise SystemExit("nav component block not found")
s = s[:match.start()] + nav_block + "\nfunction SectionButton({" + s[match.end():]

# Make individual destinations compact and clearly subordinate to category cards.
s = s.replace(
    '"group relative w-full overflow-hidden rounded-[18px] border px-3 py-3 text-left transition-all duration-200",',
    '"group relative w-full overflow-hidden rounded-[16px] border px-2.5 py-2.5 text-left transition-all duration-200",',
    1,
)
s = s.replace(
    '"border-white/[0.06] bg-white/[0.025] hover:-translate-y-px hover:border-white/10 hover:bg-white/[0.055]",',
    '"border-white/[0.055] bg-black/10 hover:translate-x-[2px] hover:border-white/10 hover:bg-white/[0.055]",',
    1,
)
s = s.replace('"absolute inset-y-3 left-0 w-[3px]', '"absolute inset-y-2.5 left-0 w-[3px]', 1)
s = s.replace('<div className="flex items-center gap-3">', '<div className="flex items-center gap-2.5">', 1)
s = s.replace(
    '"flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition-all duration-200",',
    '"flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border transition-all duration-200",',
    1,
)
s = s.replace(
    '"mt-0.5 line-clamp-2 text-[11px] leading-[1.35] transition-colors",',
    '"mt-0.5 line-clamp-2 text-[10.5px] leading-[1.3] transition-colors",',
    1,
)

# Viewport-aware sizing: the menu bottom is always visible, even before sticky engages.
notice_anchor = '''  const [notice, setNotice] = useState<{
    type: "ok" | "err";
    msg: string;
  } | null>(null);
'''
if notice_anchor not in s:
    raise SystemExit("notice state anchor not found")
s = s.replace(
    notice_anchor,
    notice_anchor + '  const sidebarRef = useRef<HTMLElement | null>(null);\n',
    1,
)

effect_anchor = '''  }, [notice]);

  const reloadStudents = async () => {
'''
sidebar_effect = '''  }, [notice]);

  useEffect(() => {
    let frame = 0;

    const sizeSidebar = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sidebar = sidebarRef.current;
        if (!sidebar) return;

        if (window.innerWidth < 1024) {
          sidebar.style.maxHeight = "";
          return;
        }

        const top = Math.max(16, sidebar.getBoundingClientRect().top);
        const available = Math.max(360, window.innerHeight - top - 16);
        sidebar.style.maxHeight = `${available}px`;
      });
    };

    sizeSidebar();
    window.addEventListener("scroll", sizeSidebar, { passive: true });
    window.addEventListener("resize", sizeSidebar);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sizeSidebar);
      window.removeEventListener("resize", sizeSidebar);
    };
  }, []);

  const reloadStudents = async () => {
'''
if effect_anchor not in s:
    raise SystemExit("effect anchor not found")
s = s.replace(effect_anchor, sidebar_effect, 1)

sidebar_pattern = r'''        <div className="grid gap-5 lg:grid-cols-\[292px_minmax\(0,1fr\)\] xl:gap-6">\n          <aside className="self-start.*?</aside>'''
new_sidebar = '''        <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)] xl:gap-6">
          <aside
            ref={sidebarRef}
            className="self-start rounded-[28px] border border-white/[0.09] bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_30%),rgba(8,8,10,0.90)] p-2.5 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl lg:sticky lg:top-4 lg:overflow-y-auto lg:overscroll-contain"
          >
            <nav aria-label="Global Manager sections" className="space-y-2.5">
              <NavGroup title="Overview" tone="cyan">
                <SectionButton
                  active={section === "overview"}
                  title="Control Center"
                  detail="What needs attention right now."
                  icon={<LayoutDashboard size={17} />}
                  tone="cyan"
                  onClick={() => setSection("overview")}
                />
              </NavGroup>

              <NavGroup title="Players" tone="sky">
                <SectionButton
                  active={section === "students"}
                  title="Roster & Demographics"
                  detail="Import, rename, move, or archive."
                  icon={<Users size={17} />}
                  tone="sky"
                  onClick={() => setSection("students")}
                />
                <SectionButton
                  active={section === "heroImages"}
                  title="Hero Images"
                  detail="Bulk-match and upload portraits."
                  icon={<ImageIcon size={17} />}
                  tone="sky"
                  onClick={() => setSection("heroImages")}
                />
              </NavGroup>

              <NavGroup title="Characters" tone="violet">
                <SectionButton
                  active={section === "companions"}
                  title="Companions"
                  detail="Images and living/fallen state."
                  icon={<PawPrint size={17} />}
                  tone="violet"
                  onClick={() => setSection("companions")}
                />
                <SectionButton
                  active={section === "abilities"}
                  title="Attributes & Skills"
                  detail="Stats, bonuses, skills, and grants."
                  icon={<SlidersHorizontal size={17} />}
                  tone="violet"
                  onClick={() => setSection("abilities")}
                />
                <SectionButton
                  active={section === "inventory"}
                  title="Inventory & Cards"
                  detail="Give or remove cards in bulk."
                  icon={<PackageOpen size={17} />}
                  tone="violet"
                  onClick={() => setSection("inventory")}
                />
              </NavGroup>

              <NavGroup title="Groups & Rewards" tone="amber">
                <SectionButton
                  active={section === "guilds"}
                  title="Guilds"
                  detail="Assign and move students in bulk."
                  icon={<Shield size={17} />}
                  tone="amber"
                  onClick={() => setSection("guilds")}
                />
                <SectionButton
                  active={section === "currency"}
                  title="XP & Skill Tokens"
                  detail="Balances, rewards, and corrections."
                  icon={<Coins size={17} />}
                  tone="amber"
                  onClick={() => setSection("currency")}
                />
                <SectionButton
                  active={section === "store"}
                  title="Store"
                  detail="Open/close, PIN, costs, and limits."
                  icon={<ShoppingBag size={17} />}
                  tone="amber"
                  onClick={() => setSection("store")}
                />
              </NavGroup>

              <NavGroup title="System" tone="emerald">
                <SectionButton
                  active={section === "system"}
                  title="Data Health"
                  detail="Integrity checks and connections."
                  icon={<Database size={17} />}
                  tone="emerald"
                  onClick={() => setSection("system")}
                />
              </NavGroup>
            </nav>
          </aside>'''

match = re.search(sidebar_pattern, s, flags=re.S)
if not match:
    raise SystemExit("sidebar block not found")
s = s[:match.start()] + new_sidebar + s[match.end():]

p.write_text(s)
print("Patched AdminPage sidebar v3")
