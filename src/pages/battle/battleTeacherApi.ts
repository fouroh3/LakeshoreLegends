// src/pages/battle/battleTeacherApi.ts

import { HP_API_URL } from "./battleConstants";

export const BATTLE_TEACHER_TOKEN_KEY = "ll:battleTeacherToken";

type BattleTeacherAction =
  | "battleteacherlogin"
  | "battleteacherstart"
  | "battleteacheradvance"
  | "battleteachersetturn"
  | "battleteacherpause"
  | "battleteacherresume"
  | "battleteacherend"
  | "battleteachersync";

export type BattleTeacherResponse = {
  ok?: boolean;
  error?: string;
  teacherToken?: string;
  [key: string]: any;
};

function saveTeacherToken(data: BattleTeacherResponse) {
  if (data?.teacherToken) {
    localStorage.setItem(BATTLE_TEACHER_TOKEN_KEY, data.teacherToken);
  }
}

export function getBattleTeacherToken() {
  return localStorage.getItem(BATTLE_TEACHER_TOKEN_KEY) || "";
}

export function clearBattleTeacherToken() {
  localStorage.removeItem(BATTLE_TEACHER_TOKEN_KEY);
}

async function postTeacherAction(
  action: BattleTeacherAction,
  body: Record<string, any>
): Promise<BattleTeacherResponse> {
  const res = await fetch(
    `${HP_API_URL}?action=${encodeURIComponent(action)}&_=${Date.now()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action,
        ...body,
      }),
    }
  );

  const text = await res.text();
  let data: BattleTeacherResponse | null = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Teacher API returned non-JSON (${res.status}). ${text
        .slice(0, 140)
        .replace(/\s+/g, " ")}`
    );
  }

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Teacher API failed: ${res.status}`);
  }

  saveTeacherToken(data);
  return data;
}

export async function loginBattleTeacher(passcode: string) {
  return postTeacherAction("battleteacherlogin", { passcode });
}

export async function startRegularBattle(args: {
  homeroom: string;
  pairTo?: string;
  quest: string;
  turn?: "BOSS" | "GUILD";
  bossHP?: number | string;
}) {
  return postTeacherAction("battleteacherstart", {
    teacherToken: getBattleTeacherToken(),
    homeroom: args.homeroom,
    pairTo: args.pairTo || "",
    quest: args.quest,
    turn: args.turn || "GUILD",
    bossHP: args.bossHP || "",
  });
}

export async function advanceRegularBattle(args: {
  sessionId: string;
  turn?: "BOSS" | "GUILD";
}) {
  return postTeacherAction("battleteacheradvance", {
    teacherToken: getBattleTeacherToken(),
    sessionId: args.sessionId,
    turn: args.turn || "GUILD",
  });
}

export async function setRegularBattleTurn(args: {
  sessionId: string;
  turn: "BOSS" | "GUILD";
}) {
  return postTeacherAction("battleteachersetturn", {
    teacherToken: getBattleTeacherToken(),
    sessionId: args.sessionId,
    turn: args.turn,
  });
}

export async function pauseRegularBattle(sessionId: string) {
  return postTeacherAction("battleteacherpause", {
    teacherToken: getBattleTeacherToken(),
    sessionId,
  });
}

export async function resumeRegularBattle(sessionId: string) {
  return postTeacherAction("battleteacherresume", {
    teacherToken: getBattleTeacherToken(),
    sessionId,
  });
}

export async function endRegularBattle(sessionId: string) {
  return postTeacherAction("battleteacherend", {
    teacherToken: getBattleTeacherToken(),
    sessionId,
  });
}

export async function syncRegularBattle() {
  return postTeacherAction("battleteachersync", {
    teacherToken: getBattleTeacherToken(),
  });
}
