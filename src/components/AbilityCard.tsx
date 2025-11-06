import { Student } from "../types";

function StatBar({
  label,
  value,
  max = 10,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <li className="min-w-0">
      <div className="flex items-center justify-between text-[0.8em] text-zinc-300">
        <span className="truncate">{label}</span>
        <span className="ml-2 shrink-0 tabular-nums">
          {Number.isFinite(value) ? value : 0}/{max}
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out will-change-[width]"
          style={{ width: `${pct}%`, backgroundColor: "var(--bar, #22d3ee)" }}
        />
      </div>
    </li>
  );
}

/* ---------- Avatar (deterministic “expressive tile”) ---------- */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const FACES = [
  "🙂",
  "😴",
  "😐",
  "😒",
  "😉",
  "😁",
  "😬",
  "🤨",
  "🥲",
  "😮‍💨",
  "😶",
  "🙃",
  "😺",
  "🧐",
  "🤖",
];
const BG_HUES = [45, 200, 15, 280, 160, 5, 220, 320, 90, 260, 30, 180];

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url && url.trim()) {
    return (
      <img
        src={url}
        alt=""
        className="size-12 rounded-2xl object-cover bg-zinc-800"
      />
    );
  }
  const h = hash(name);
  const face = FACES[h % FACES.length];
  const hue = BG_HUES[h % BG_HUES.length];
  return (
    <div
      className="size-12 rounded-2xl grid place-items-center text-2xl shadow-inner"
      style={{ backgroundColor: `hsl(${hue}, 95%, 65%)` }}
      aria-hidden
      title={name}
    >
      {face}
    </div>
  );
}

export default function AbilityCard({
  person,
  density,
}: {
  person: Student;
  density: "Comfort" | "Compact" | "Ultra";
}) {
  // 🔧 Normalize skills so TS is happy (string | string[] → string[])
  const skillList = Array.isArray(person.skills)
    ? person.skills
    : String(person.skills ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const top = (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      <div className="shrink-0">
        <Avatar
          name={`${person.first} ${person.last}`}
          url={(person as any).portraitUrl}
        />
      </div>

      {/* Name — First Last, clamps to 2 lines in narrow (compact) cards */}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold leading-snug">
          <span
            className="block break-words"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as any,
              overflow: "hidden",
            }}
          >
            {person.first} {person.last}
          </span>
        </h3>
      </div>

      {/* Homeroom pill */}
      <div className="ml-2 shrink-0">
        <span className="inline-flex items-center justify-center rounded-full bg-zinc-800 px-2 py-1 text-xs font-semibold">
          {person.homeroom}
        </span>
      </div>
    </div>
  );

  const stats = (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-2">
      <StatBar label="Strength" value={person.str ?? 0} />
      <StatBar label="Dexterity" value={person.dex ?? 0} />
      <StatBar label="Constitution" value={person.con ?? 0} />
      <StatBar label="Intelligence" value={person.int ?? 0} />
      <StatBar label="Wisdom" value={person.wis ?? 0} />
      <StatBar label="Charisma" value={person.cha ?? 0} />
    </ul>
  );

  const pills = (
    <div className="flex flex-wrap items-start content-start gap-2 max-h-20 overflow-auto pr-1">
      {skillList.map((sk) => (
        <span
          key={`${person.id}-${sk}`}
          className="rounded-full border border-white/10 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
        >
          {sk}
        </span>
      ))}
    </div>
  );

  // keep consistent stats height; do NOT use `grow` so skills hug the top
  const statsMinH =
    density === "Ultra"
      ? "min-h-[88px]"
      : density === "Compact"
      ? "min-h-[110px]"
      : "min-h-[128px]";

  return (
    <article className="relative flex h-full flex-col rounded-2xl border border-white/5 bg-zinc-900/50 p-5 shadow-sm">
      {top}
      <div className={`mt-3 ${statsMinH} min-w-0`}>{stats}</div>
      <div className="mt-3">{pills}</div>
    </article>
  );
}
