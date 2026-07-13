// src/pages/battle/components/BattleStudentCard.tsx
import React, { useMemo } from "react";
import type { Student } from "../../../types";
import type { HpStateRow } from "../battleTypes";
import { hpBarColorFromPct } from "../../../utils/hpColor";
import { fullName, hpStatus, skillsToArray, normId } from "../battleUtils";
import { Eye } from "lucide-react";

const guildGlowMap: Record<string, string> = {
  Scouts:
    "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
  Guardians:
    "shadow-[0_0_0_1px_rgba(34,197,94,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(34,197,94,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
  Blades:
    "shadow-[0_0_0_1px_rgba(239,68,68,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(239,68,68,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
  Shadows:
    "shadow-[0_0_0_1px_rgba(168,85,247,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(168,85,247,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
  Scholars:
    "shadow-[0_0_0_1px_rgba(234,179,8,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(234,179,8,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
  Diplomats:
    "shadow-[0_0_0_1px_rgba(59,130,246,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_18px_34px_rgba(0,0,0,0.34)]",
};

const tileBase =
  "relative flex h-full flex-col overflow-hidden rounded-[20px] border p-3 text-left transition bg-[linear-gradient(145deg,rgba(18,24,34,0.72),rgba(7,9,15,0.96))]";
const tileHover = "hover:-translate-y-[2px] hover:border-cyan-300/18 hover:bg-zinc-950/45";
const tileSelected =
  "border-cyan-300/70 bg-cyan-400/[0.07] ring-2 ring-cyan-300/35";
const tileUnselected = "border-zinc-800/70";

function StatPill({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg border px-2 py-1",
        muted
          ? "border-zinc-900 bg-zinc-950/15"
          : "border-zinc-800/70 bg-black/20",
      ].join(" ")}
    >
      <span
        className={[
          "text-[9px] leading-none tracking-wide",
          muted ? "text-zinc-600" : "text-zinc-500",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "text-[11px] font-semibold leading-none tabular-nums",
          muted ? "text-zinc-600" : "text-zinc-100",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function TileSkills({ student, muted }: { student: Student; muted?: boolean }) {
  const skills = useMemo(() => {
    const baseSkills = skillsToArray(student.skills);

    const hasCompanion = !!String(student.companionUrl || "").trim();
    const companionStatus = String(student.companionStatus || "")
      .trim()
      .toLowerCase();

    const companionIsActive = hasCompanion && companionStatus === "active";

    return [
      ...baseSkills,
      ...(companionIsActive ? ["Companion Bond"] : []),
    ];
  }, [student.skills, student.companionUrl, student.companionStatus]);

  if (skills.length === 0) return null;

  const top = skills.slice(0, 3);
  const extra = skills.length - top.length;

  return (
    <div className="mt-2 flex min-h-[22px] flex-wrap content-start gap-1 overflow-hidden">
      {top.map((sk) => (
        <span
          key={sk}
          className={[
            "inline-flex h-[18px] max-w-[86px] items-center truncate rounded-md border px-1.5 text-[9px] leading-none",
            muted
              ? "border-zinc-900 bg-zinc-950/10 text-zinc-600"
              : "border-zinc-800/70 bg-zinc-950/35 text-zinc-300",
          ].join(" ")}
          title={sk}
        >
          {sk}
        </span>
      ))}

      {extra > 0 && (
        <span
          className={[
            "inline-flex h-[18px] items-center rounded-md border px-1.5 text-[9px] leading-none",
            muted
              ? "border-zinc-900 bg-zinc-950/10 text-zinc-700"
              : "border-zinc-800/70 bg-zinc-950/35 text-zinc-400",
          ].join(" ")}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

type Props = {
  student: Student;
  hp: HpStateRow;
  selected: boolean;
  onToggle: () => void;
  onOpenProfile: (student: Student) => void;
};

function BattleStudentCardInner({
  student,
  hp,
  selected,
  onToggle,
  onOpenProfile,
}: Props) {
  const id = normId(student.id);
  const pct = Math.max(0, Math.min(1, hp.currentHP / Math.max(1, hp.baseHP)));
  const status = hpStatus(hp.currentHP, hp.baseHP);

  const isDead = hp.currentHP <= 0;
  const muted = isDead;

  const guild = (student as any).guild ?? "";
  const glow =
    guildGlowMap[guild] ??
    "shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_14px_28px_rgba(0,0,0,0.28)] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.16),0_18px_34px_rgba(0,0,0,0.34)]";

  const barColor = hpBarColorFromPct(pct);
  const lowHpPulse = !isDead && pct > 0 && pct <= 0.25;

  return (
    <button
      key={id}
      type="button"
      onClick={onToggle}
      className={[
        tileBase,
        tileHover,
        selected ? tileSelected : tileUnselected,
        glow,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 z-0 rounded-[20px]">
        <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),transparent)]" />
        <div className="absolute -inset-10 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),rgba(0,0,0,0)_60%)] opacity-60" />
        <div className="absolute inset-0 rounded-[20px] bg-gradient-to-t from-black/30 via-transparent to-transparent" />
      </div>

      {isDead && (
        <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center rounded-[20px] bg-zinc-950/65">
          <div className="text-4xl leading-none">💀</div>
          <div className="mt-1 text-base font-extrabold tracking-widest text-zinc-100">
            DEAD
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-semibold leading-[14px] text-zinc-100">
            {fullName(student)}
          </div>

          <div
            className={[
              "mt-0.5 truncate text-[10px] leading-[12px]",
              muted ? "text-zinc-700" : "text-zinc-400",
            ].join(" ")}
          >
            {guild || "—"}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(student);
            }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-800/70 bg-zinc-950/70 text-zinc-400 transition hover:border-cyan-300/40 hover:bg-cyan-500/[0.10] hover:text-cyan-200 active:scale-[0.97]"
            title="Open character profile"
            aria-label="Open character profile"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] leading-[12px] ${status.pillClass}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-1.5">
        <div
          className={[
            "mb-1 flex items-center justify-between text-[10px]",
            muted ? "text-zinc-700" : "text-zinc-500",
          ].join(" ")}
        >
          <span>HP</span>
          <span
            className={[
              "tabular-nums",
              muted ? "text-zinc-700" : "text-zinc-200",
            ].join(" ")}
          >
            {hp.currentHP}/{hp.baseHP}
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full border border-zinc-800/65 bg-zinc-900/70">
          <div
            className={[
              "h-full transition-[width] duration-300",
              lowHpPulse ? "animate-pulse" : "",
            ].join(" ")}
            style={{
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: isDead ? "rgba(113,113,122,1)" : barColor,
            }}
          />
        </div>
      </div>

      <div className="relative z-10 mt-2 grid grid-cols-2 gap-1.5">
        <StatPill label="Strength" value={(student as any).str} muted={muted} />
        <StatPill
          label="Dexterity"
          value={(student as any).dex}
          muted={muted}
        />
        <StatPill
          label="Constitution"
          value={(student as any).con}
          muted={muted}
        />
        <StatPill
          label="Intelligence"
          value={(student as any).int}
          muted={muted}
        />
        <StatPill label="Wisdom" value={(student as any).wis} muted={muted} />
        <StatPill label="Charisma" value={(student as any).cha} muted={muted} />
      </div>

      <div className="relative z-10 mt-2">
        <TileSkills student={student} muted={muted} />
      </div>
    </button>
  );
}

export default React.memo(BattleStudentCardInner, (a, b) => {
  return (
    a.selected === b.selected &&
    a.student === b.student &&
    a.hp.baseHP === b.hp.baseHP &&
    a.hp.currentHP === b.hp.currentHP
  );
});
