// src/pages/battle/components/BattleBossPanel.tsx
import type { BossState } from "../../../bossApi";
import BossPanel from "./BossPanel";

export default function BattleBossPanel(props: {
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

  studentHealMode: boolean;
  studentAttackMode: boolean;
  guildAttacksOpen: boolean;
  isTeacher: boolean;
}) {
  return <BossPanel {...props} />;
}
