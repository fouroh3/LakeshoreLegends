// src/pages/battle/components/BattleStudentCard.tsx
import React, { useMemo } from "react";
import type { Student } from "../../../types";
import type { HpStateRow } from "../battleTypes";
import { hpBarColorFromPct } from "../../../utils/hpColor";
import { fullName, hpStatus, skillsToArray, normId } from "../battleUtils";
import { Eye } from "lucide-react";

const guildGlowMap: Record<string, string> = {
  Scouts:
    "shadow-[0_0_8px_rgba(34,211,238,0.15)] hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]",
  Guardians:
    "shadow-[0_0_8px_rgba(34,197,94,0.15)] hover:shadow-[0_0_14px_rgba(34,197,94,0.35)]",
  Blades:
    "shadow-[0_0_8px_rgba(239,68,68,0.15)] hover:shadow-[0_0_14px_rgba(239,68,68,0.35)]",
  Shadows:
    "shadow-[0_0_8px_rgba(168,85,247,0.15)] hover:shadow-[0_0_14px_rgba(168,85,247,0.35)]",
  Scholars:
    "shadow-[0_0_8px_rgba(234,179,8,0.15)] hover:shadow-[0_0_14px_rgba(234,179,8,0.35)]",
  Diplomats:
    "shadow-[0_0_8px_rgba(59,130,246,0.15)] hover:shadow-[0_0_14px_rgba(59,130,246,0.35)]",
};

const tileBase =
  "relative text-left rounded-2xl transition p-3 h-full flex flex-col overflow-hidden bg-zinc-950/25 shadow-[0_10px_40px_rgb(0,0,0,0.45)]";
const tileHover = "hover:border hover:border-zinc-800/70 hover:bg-zinc-950/30";
const tileSelected =
  "ring-2 ring-cyan-300/35 bg-cyan-400/5 border border-cyan-300/70";
const tileUnselected = "border border-transparent";

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
        "flex items-center justify-between rounded-lg px-2 py-1 border",
        muted
          ? "border-zinc-900 bg-zinc-950/15"
          : "border-zinc-800/70 bg-zinc-950/30",
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
          "text-[11px] leading-none font-semibold tabular-nums",
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

  const top = skills.slice(0, 5);
  const extra = skills.length - top.length;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5 min-h-[42px]">
      {top.map((sk) => (
        <span
          key={sk}
          className={[
            "rounded-full border px-1.5 py-0.5 text-[9px] whitespace-nowrap",
            muted
              ? "border-zinc-900 bg-zinc-950/10 text-zinc-600"
              : "border-zinc-800/70 bg-zinc-950/35 text-zinc-200",
          ].join(" ")}
          title={sk}
        >
          {sk}
        </span>
      ))}

      {extra > 0 && (
        <span
          className={[
            "rounded-full border px-1.5 py-0.5 text-[9px] whitespace-nowrap",
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
    "shadow-[0_0_8px_rgba(34,211,238,0.15)] hover:shadow-[0_0_14px_rgba(34,211,238,0.35)]";

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
      <div className="pointer-events-none absolute inset-0 z-0 rounded-2xl">
        <div className="absolute -inset-10 opacity-70 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),rgba(0,0,0,0)_60%)]" />
        <div className="absolute inset-0 opacity-90 bg-gradient-to-br from-zinc-900/35 via-zinc-950/10 to-black/0 rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent rounded-2xl" />
      </div>

      {isDead && (
        <div className="pointer-events-none absolute inset-0 z-50 rounded-2xl bg-zinc-950/60 flex flex-col items-center justify-center">
          <div className="text-4xl leading-none">💀</div>
          <div className="mt-1 text-base font-extrabold tracking-widest text-zinc-100">
            DEAD
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] leading-[14px] font-semibold text-zinc-100 truncate">
            {fullName(student)}
          </div>

          <div
            className={[
              "mt-0.5 text-[10px] leading-[12px] truncate",
              muted ? "text-zinc-700" : "text-zinc-400",
            ].join(" ")}
          >
            {guild || "—"}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProfile(student);
            }}
            className={[
              "flex h-5 w-5 items-center justify-center rounded-full border border-zinc-800/70 bg-zinc-950/70 text-zinc-400 transition active:scale-[0.97]",
              glow,
              "hover:border-cyan-300/40 hover:bg-cyan-500/[0.10] hover:text-cyan-200",
            ].join(" ")}
            title="Open character profile"
            aria-label="Open character profile"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] leading-[12px] shrink-0 ${status.pillClass}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-1.5">
        <div
          className={[
            "flex items-center justify-between text-[10px] mb-1",
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

        <div className="h-2 w-full rounded-full bg-zinc-900/70 border border-zinc-800/65 overflow-hidden">
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
