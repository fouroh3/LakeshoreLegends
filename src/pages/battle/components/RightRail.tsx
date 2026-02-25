// src/pages/battle/components/RightRail.tsx
import type { Student } from "../../../types";
import type { BossState } from "../../../bossApi";
import BossPanel from "./BossPanel";
import StudentActionPanel from "./StudentActionPanel";
import BattleGuildPanel from "./BattleGuildPanel";

const panel =
  "rounded-2xl border border-zinc-800/60 bg-zinc-950/30 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.35)]";

export default function RightRail(props: {
  // Boss
  hasBossConfigured: boolean;
  bossName: string;
  boss: BossState | null;
  bossErr: string | null;
  bossSubmitting: boolean;
  bossDamage: string;
  setBossDamage: (v: string) => void;
  bossNote: string;
  setBossNote: (v: string) => void;
  onSubmitBossAttack: () => void;
  bossSubmitErr: string | null;

  // Guild/action context
  isTeacher: boolean;
  studentHealMode: boolean;
  studentAttackMode: boolean;
  guildAttacksOpen: boolean;
  groupAction?: "ATTACK" | "HEAL";
  setGroupAction?: (v: "ATTACK" | "HEAL") => void;

  // Student actions
  selectedCount: number;
  studentControlsDisabled: boolean;
  delta: number;
  setDelta: (n: number) => void;
  note: string;
  setNote: (s: string) => void;
  selectedStudents: Student[];
  selectedSkills: string[];
  submitting: boolean;
  onSubmit: () => void;
  banner: { type: "ok" | "err"; msg: string } | null;
}) {
  const {
    hasBossConfigured,
    bossName,
    boss,
    bossErr,
    bossSubmitting,
    bossDamage,
    setBossDamage,
    bossNote,
    setBossNote,
    onSubmitBossAttack,
    bossSubmitErr,
    isTeacher,
    studentHealMode,
    studentAttackMode,
    guildAttacksOpen,
    groupAction,
    setGroupAction,
    selectedCount,
    studentControlsDisabled,
    delta,
    setDelta,
    note,
    setNote,
    selectedStudents,
    selectedSkills,
    submitting,
    onSubmit,
    banner,
  } = props;

  return (
    <div className="min-h-0">
      <div className="h-[22px] mb-2" />

      <div className={[panel, "flex flex-col gap-2"].join(" ")}>
        {/* Optional Guild panel (top) */}
        <BattleGuildPanel
          isTeacher={isTeacher}
          groupAction={groupAction}
          setGroupAction={setGroupAction}
          guildAttacksOpen={guildAttacksOpen}
        />

        {/* Boss */}
        <BossPanel
          hasBossConfigured={hasBossConfigured}
          bossName={bossName}
          boss={boss}
          bossErr={bossErr}
          bossSubmitting={bossSubmitting}
          bossDamage={bossDamage}
          setBossDamage={setBossDamage}
          bossNote={bossNote}
          setBossNote={setBossNote}
          onSubmitBossAttack={onSubmitBossAttack}
          bossSubmitErr={bossSubmitErr}
          studentHealMode={studentHealMode}
          studentAttackMode={studentAttackMode}
          guildAttacksOpen={guildAttacksOpen}
          isTeacher={isTeacher}
        />

        {/* Student Actions */}
        <StudentActionPanel
          selectedCount={selectedCount}
          studentControlsDisabled={studentControlsDisabled}
          delta={delta}
          setDelta={setDelta}
          note={note}
          setNote={setNote}
          selectedStudents={selectedStudents}
          selectedSkills={selectedSkills}
          submitting={submitting}
          onSubmit={onSubmit}
          banner={banner}
        />
      </div>
    </div>
  );
}
