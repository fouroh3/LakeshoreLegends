// src/pages/battle/battleTypes.ts
export type GroupAction = "ATTACK" | "HEAL";

export type HpStateRow = {
  studentId: string;
  baseHP: number;
  currentHP: number;
};

export type BattleControlRow = {
  homeroom: string;
  status: string;
  sessionId: string;
  pairedHomeroom?: string;
  bossKey?: string;
  bossInstanceId?: string;
  guildAttacks?: string;
};

export type PendingHp = { expected: number; base: number; ts: number };
export type PendingBoss = { expected: number; max: number; ts: number };

export type HpStatus = { label: string; pillClass: string };
